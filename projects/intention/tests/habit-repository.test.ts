import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { initializeDatabase } from '@/database/schema';
import {
  completeHabit,
  createHabit,
  getHabitDetails,
  listHabits,
  setHabitArchived,
  deleteHabit,
  undoCompletion,
  updateHabit,
} from '@/database/habit-repository';
import type { HabitInput } from '@/types/habit';
import { NodeTestDatabase } from './helpers/node-database';

const input: HabitInput = {
  name: 'Reading',
  intention: 'Become a lifelong learner.',
  meaning: 'Reading represents curiosity and growth.',
  cue: 'After drinking coffee',
  routine: 'Read 10 pages',
  reward: 'Enjoy a cup of tea',
};

describe('SQLite habit repository', () => {
  let db: NodeTestDatabase;

  beforeEach(async () => {
    db = new NodeTestDatabase();
    await initializeDatabase(db);
  });

  afterEach(() => db.close());

  it('creates and lists a habit with separate intention and meaning', async () => {
    const habit = await createHabit(db, input, new Date('2025-01-01T12:00:00Z'));
    const habits = await listHabits(db, false, '2025-01-01');

    expect(habit.intention).toBe(input.intention);
    expect(habit.meaning).toBe(input.meaning);
    expect(habits).toHaveLength(1);
    expect(habits[0].totalCompletions).toBe(0);
  });

  it('edits identity and loop fields while preserving completion history', async () => {
    const habit = await createHabit(db, input);
    await completeHabit(db, habit.id, '2025-01-01', new Date('2025-01-01T18:00:00Z'));

    await updateHabit(db, habit.id, { ...input, name: 'Evening reading', routine: 'Read 15 pages' });
    const details = await getHabitDetails(db, habit.id, '2025-01-02');

    expect(details?.name).toBe('Evening reading');
    expect(details?.routine).toBe('Read 15 pages');
    expect(details?.completionDates).toEqual(['2025-01-01']);
  });

  it('completes once per day and prevents duplicates with a database constraint', async () => {
    const habit = await createHabit(db, input);
    const now = new Date(2025, 0, 1, 14);

    expect(await completeHabit(db, habit.id, '2025-01-01', now)).toBe(true);
    expect(await completeHabit(db, habit.id, '2025-01-01', now)).toBe(false);

    const details = await getHabitDetails(db, habit.id, '2025-01-01');
    expect(details?.statistics.totalCompletions).toBe(1);
    expect(details?.completedToday).toBe(true);
  });

  it('undoes today\'s completion and updates statistics', async () => {
    const habit = await createHabit(db, input);
    const now = new Date(2025, 0, 2, 12);
    await completeHabit(db, habit.id, '2025-01-02', now);

    expect(await undoCompletion(db, habit.id, '2025-01-02')).toBe(true);
    expect(await undoCompletion(db, habit.id, '2025-01-02')).toBe(false);
    expect((await getHabitDetails(db, habit.id, '2025-01-02'))?.statistics.totalCompletions).toBe(0);
  });

  it('rejects future completions', async () => {
    const habit = await createHabit(db, input);
    const now = new Date(2025, 0, 2, 12);

    await expect(completeHabit(db, habit.id, '2025-01-03', now)).rejects.toMatchObject({
      code: 'FUTURE_DATE',
    });
  });

  it('archives and restores without losing history', async () => {
    const habit = await createHabit(db, input);
    await completeHabit(db, habit.id, '2025-01-01', new Date(2025, 0, 1, 12));

    await setHabitArchived(db, habit.id, true);
    expect(await listHabits(db, false, '2025-01-02')).toHaveLength(0);
    expect((await listHabits(db, true, '2025-01-02'))[0].totalCompletions).toBe(1);

    await setHabitArchived(db, habit.id, false);
    const restored = await getHabitDetails(db, habit.id, '2025-01-02');
    expect(restored?.isArchived).toBe(false);
    expect(restored?.completionDates).toEqual(['2025-01-01']);
  });

  it('permanently deletes a habit and cascades its completion history', async () => {
    const habit = await createHabit(db, input);
    await completeHabit(db, habit.id, '2025-01-01', new Date(2025, 0, 1, 12));

    await deleteHabit(db, habit.id);

    expect(await getHabitDetails(db, habit.id, '2025-01-01')).toBeNull();
    const completion = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) AS count FROM completions WHERE habit_id = ?',
      habit.id,
    );
    expect(completion?.count).toBe(0);
  });
});
