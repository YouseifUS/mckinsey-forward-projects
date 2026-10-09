import type { Habit } from '@/types/habit';

export async function hasReminderPermission(): Promise<boolean> { return false; }
export async function requestReminderPermission(): Promise<boolean> { return false; }
export async function cancelHabitReminder(_id: string): Promise<void> {}
export async function syncHabitReminder(habit: Habit): Promise<void> {
  if (!habit.isArchived && habit.reminderTime) {
    throw new Error('التذكير متاح في تطبيق الموبايل.');
  }
}
export async function reconcileHabitReminders(_habits: Habit[]): Promise<void> {}
export function observeReminderTaps(_onTap: (id: string) => void): () => void { return () => {}; }
