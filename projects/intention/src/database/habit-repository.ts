import { isValidReminderTime } from '@/business/reminder-time';
import type { DatabaseClient } from './client';
import { calculateHabitStatistics } from '@/business/streaks';
import { isFutureDateKey, isValidDateKey, toLocalDateKey } from '@/business/dates';
import { createId } from '@/utils/id';
import type { Habit, HabitDetails, HabitInput, HabitSummary } from '@/types/habit';

type HabitRow = {
  id: string;
  name: string;
  intention: string;
  meaning: string;
  cue: string;
  routine: string;
  reward: string;
  reminder_time: string | null;
  created_at: string;
  updated_at: string;
  is_archived: number;
};

type CompletionRow = {
  habit_id: string;
  completion_date: string;
};

const FIELD_LABELS: Record<Exclude<keyof HabitInput, 'reminderTime'>, string> = {
  name: 'اسم العادة',
  intention: 'النية',
  meaning: 'المعنى الشخصي',
  cue: 'الإشارة',
  routine: 'الروتين',
  reward: 'المكافأة',
};

export class HabitRepositoryError extends Error {
  constructor(
    message: string,
    public readonly code: 'INVALID_INPUT' | 'INVALID_DATE' | 'FUTURE_DATE' | 'NOT_FOUND',
  ) {
    super(message);
    this.name = 'HabitRepositoryError';
  }
}

function toHabit(row: HabitRow): Habit {
  return {
    id: row.id,
    name: row.name,
    intention: row.intention,
    meaning: row.meaning,
    cue: row.cue,
    routine: row.routine,
    reward: row.reward,
    reminderTime: row.reminder_time,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isArchived: row.is_archived === 1,
  };
}

function cleanInput(input: HabitInput): HabitInput {
  const cleaned = {
    name: input.name.trim(),
    intention: input.intention.trim(),
    meaning: input.meaning.trim(),
    cue: input.cue.trim(),
    routine: input.routine.trim(),
    reward: input.reward.trim(),
  };

  const missingField = (Object.keys(cleaned) as (keyof typeof cleaned)[]).find(
    (field) => cleaned[field].length === 0,
  );
  if (missingField) {
    throw new HabitRepositoryError(`${FIELD_LABELS[missingField]} مطلوب.`, 'INVALID_INPUT');
  }
  const reminderTime = input.reminderTime ?? null;
  if (reminderTime !== null && !isValidReminderTime(reminderTime)) {
    throw new HabitRepositoryError('وقت التذكير غير صحيح.', 'INVALID_INPUT');
  }
  return { ...cleaned, reminderTime };
}

export async function createHabit(
  db: DatabaseClient,
  input: HabitInput,
  now = new Date(),
): Promise<Habit> {
  const habit = cleanInput(input);
  const id = createId('habit');
  const timestamp = now.toISOString();

  await db.runAsync(
    `INSERT INTO habits
      (id, name, intention, meaning, cue, routine, reward, reminder_time, created_at, updated_at, is_archived)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
    id,
    habit.name,
    habit.intention,
    habit.meaning,
    habit.cue,
    habit.routine,
    habit.reward,
    habit.reminderTime ?? null,
    timestamp,
    timestamp,
  );

  return (await getHabit(db, id)) as Habit;
}

export async function updateHabit(
  db: DatabaseClient,
  id: string,
  input: HabitInput,
  now = new Date(),
): Promise<Habit> {
  const habit = cleanInput(input);
  const result = await db.runAsync(
    `UPDATE habits SET
      name = ?, intention = ?, meaning = ?, cue = ?, routine = ?, reward = ?, reminder_time = ?, updated_at = ?
     WHERE id = ?`,
    habit.name,
    habit.intention,
    habit.meaning,
    habit.cue,
    habit.routine,
    habit.reward,
    habit.reminderTime ?? null,
    now.toISOString(),
    id,
  );

  if (result.changes === 0) {
    throw new HabitRepositoryError('العادة غير موجودة.', 'NOT_FOUND');
  }
  return (await getHabit(db, id)) as Habit;
}

export async function getHabit(db: DatabaseClient, id: string): Promise<Habit | null> {
  const row = await db.getFirstAsync<HabitRow>('SELECT * FROM habits WHERE id = ?', id);
  return row ? toHabit(row) : null;
}

export async function getHabitDetails(
  db: DatabaseClient,
  id: string,
  todayKey = toLocalDateKey(),
): Promise<HabitDetails | null> {
  const habit = await getHabit(db, id);
  if (!habit) return null;

  const completionRows = await db.getAllAsync<CompletionRow>(
    `SELECT habit_id, completion_date FROM completions
     WHERE habit_id = ? ORDER BY completion_date ASC`,
    id,
  );
  const completionDates = completionRows.map((row) => row.completion_date);

  return {
    ...habit,
    completionDates,
    statistics: calculateHabitStatistics(completionDates, todayKey),
    completedToday: completionDates.includes(todayKey),
  };
}

export async function listHabits(
  db: DatabaseClient,
  archived = false,
  todayKey = toLocalDateKey(),
): Promise<HabitSummary[]> {
  const rows = await db.getAllAsync<HabitRow>(
    'SELECT * FROM habits WHERE is_archived = ? ORDER BY created_at ASC',
    archived ? 1 : 0,
  );
  if (rows.length === 0) return [];

  const completionRows = await db.getAllAsync<CompletionRow>(
    `SELECT c.habit_id, c.completion_date
     FROM completions c
     INNER JOIN habits h ON h.id = c.habit_id
     WHERE h.is_archived = ?
     ORDER BY c.completion_date ASC`,
    archived ? 1 : 0,
  );
  const datesByHabit = new Map<string, string[]>();
  for (const row of completionRows) {
    const dates = datesByHabit.get(row.habit_id) ?? [];
    dates.push(row.completion_date);
    datesByHabit.set(row.habit_id, dates);
  }

  return rows.map((row) => {
    const habit = toHabit(row);
    const dates = datesByHabit.get(habit.id) ?? [];
    return {
      ...habit,
      ...calculateHabitStatistics(dates, todayKey),
      completedToday: dates.includes(todayKey),
    };
  });
}

export async function setHabitArchived(
  db: DatabaseClient,
  id: string,
  isArchived: boolean,
  now = new Date(),
): Promise<void> {
  const result = await db.runAsync(
    'UPDATE habits SET is_archived = ?, updated_at = ? WHERE id = ?',
    isArchived ? 1 : 0,
    now.toISOString(),
    id,
  );
  if (result.changes === 0) {
    throw new HabitRepositoryError('العادة غير موجودة.', 'NOT_FOUND');
  }
}

export async function deleteHabit(db: DatabaseClient, id: string): Promise<void> {
  const result = await db.runAsync('DELETE FROM habits WHERE id = ?', id);
  if (result.changes === 0) {
    throw new HabitRepositoryError('العادة غير موجودة.', 'NOT_FOUND');
  }
}

export async function completeHabit(
  db: DatabaseClient,
  habitId: string,
  completionDate = toLocalDateKey(),
  now = new Date(),
): Promise<boolean> {
  if (!isValidDateKey(completionDate)) {
    throw new HabitRepositoryError('تاريخ الإكمال غير صحيح.', 'INVALID_DATE');
  }
  if (isFutureDateKey(completionDate, toLocalDateKey(now))) {
    throw new HabitRepositoryError('مينفعش تسجّل إكمال ليوم لسه مجاش.', 'FUTURE_DATE');
  }
  if (!(await getHabit(db, habitId))) {
    throw new HabitRepositoryError('العادة غير موجودة.', 'NOT_FOUND');
  }

  const result = await db.runAsync(
    `INSERT OR IGNORE INTO completions (id, habit_id, completion_date, created_at)
     VALUES (?, ?, ?, ?)`,
    createId('completion'),
    habitId,
    completionDate,
    now.toISOString(),
  );
  return result.changes > 0;
}

export async function undoCompletion(
  db: DatabaseClient,
  habitId: string,
  completionDate = toLocalDateKey(),
): Promise<boolean> {
  if (!isValidDateKey(completionDate)) {
    throw new HabitRepositoryError('تاريخ الإكمال غير صحيح.', 'INVALID_DATE');
  }
  if (isFutureDateKey(completionDate)) {
    throw new HabitRepositoryError('مينفعش تعدّل يوم لسه مجاش.', 'FUTURE_DATE');
  }

  const result = await db.runAsync(
    'DELETE FROM completions WHERE habit_id = ? AND completion_date = ?',
    habitId,
    completionDate,
  );
  return result.changes > 0;
}
