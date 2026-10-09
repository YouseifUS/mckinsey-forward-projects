import * as repository from '@/database/habit-repository';
import type { DatabaseClient } from '@/database/client';
import type { HabitInput } from '@/types/habit';
import { cancelHabitReminder, reconcileHabitReminders, requestReminderPermission, syncHabitReminder } from './habit-reminders';

// Keep foreground reconciliation and user changes from racing each other.
let pending: Promise<unknown> = Promise.resolve();
function serialize<T>(action: () => Promise<T>): Promise<T> {
  const result = pending.then(action);
  pending = result.catch(() => {});
  return result;
}

async function requirePermission(input: HabitInput, archived = false) {
  if (!archived && input.reminderTime && !(await requestReminderPermission())) {
    throw new Error('فعّل إذن الإشعارات من إعدادات الجهاز، أو اقفل التذكير واحفظ العادة.');
  }
}

export function createHabit(db: DatabaseClient, input: HabitInput) {
  return serialize(async () => {
    await requirePermission(input);
    const habit = await repository.createHabit(db, input);
    try { await syncHabitReminder(habit); }
    catch (error) {
      try { await cancelHabitReminder(habit.id); }
      finally { await repository.deleteHabit(db, habit.id); }
      throw error;
    }
    return habit;
  });
}

export function updateHabit(db: DatabaseClient, id: string, input: HabitInput) {
  return serialize(async () => {
    const previous = await repository.getHabit(db, id);
    if (!previous) throw new Error('العادة غير موجودة.');
    await requirePermission(input, previous.isArchived);
    const habit = await repository.updateHabit(db, id, input);
    try { await syncHabitReminder(habit); }
    catch (error) {
      await repository.updateHabit(db, id, previous);
      await syncHabitReminder(previous).catch(() => {});
      throw error;
    }
    return habit;
  });
}

export function setHabitArchived(db: DatabaseClient, id: string, archived: boolean) {
  return serialize(async () => {
    const previous = await repository.getHabit(db, id);
    if (!previous) throw new Error('العادة غير موجودة.');
    await requirePermission(previous, archived);
    await repository.setHabitArchived(db, id, archived);
    try { await syncHabitReminder({ ...previous, isArchived: archived }); }
    catch (error) {
      await repository.setHabitArchived(db, id, previous.isArchived);
      await syncHabitReminder(previous).catch(() => {});
      throw error;
    }
  });
}

export function deleteHabit(db: DatabaseClient, id: string) {
  return serialize(async () => {
    const previous = await repository.getHabit(db, id);
    await cancelHabitReminder(id);
    try { await repository.deleteHabit(db, id); }
    catch (error) {
      if (previous) await syncHabitReminder(previous).catch(() => {});
      throw error;
    }
  });
}

export function refreshHabitReminders(db: DatabaseClient) {
  return serialize(async () => {
    await reconcileHabitReminders(await repository.listHabits(db));
  });
}
