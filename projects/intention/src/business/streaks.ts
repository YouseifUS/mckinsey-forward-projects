import { addCalendarDays, isValidDateKey, toLocalDateKey } from './dates';
import type { HabitStatistics } from '@/types/habit';

function normalizeDates(completionDates: string[], todayKey: string): string[] {
  return [...new Set(completionDates)]
    .filter((date) => isValidDateKey(date) && date <= todayKey)
    .sort();
}

export function calculateTotalCompletions(
  completionDates: string[],
  todayKey = toLocalDateKey(),
): number {
  return normalizeDates(completionDates, todayKey).length;
}

export function calculateCurrentStreak(
  completionDates: string[],
  todayKey = toLocalDateKey(),
): number {
  const dates = new Set(normalizeDates(completionDates, todayKey));
  let cursor = dates.has(todayKey) ? todayKey : addCalendarDays(todayKey, -1);

  if (!dates.has(cursor)) return 0;

  let streak = 0;
  while (dates.has(cursor)) {
    streak += 1;
    cursor = addCalendarDays(cursor, -1);
  }
  return streak;
}

export function calculateLongestStreak(
  completionDates: string[],
  todayKey = toLocalDateKey(),
): number {
  const dates = normalizeDates(completionDates, todayKey);
  if (dates.length === 0) return 0;

  let longest = 1;
  let current = 1;

  for (let index = 1; index < dates.length; index += 1) {
    if (dates[index] === addCalendarDays(dates[index - 1], 1)) {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 1;
    }
  }

  return longest;
}

export function calculateHabitStatistics(
  completionDates: string[],
  todayKey = toLocalDateKey(),
): HabitStatistics {
  return {
    currentStreak: calculateCurrentStreak(completionDates, todayKey),
    longestStreak: calculateLongestStreak(completionDates, todayKey),
    totalCompletions: calculateTotalCompletions(completionDates, todayKey),
  };
}
