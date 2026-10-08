import { describe, expect, it } from 'vitest';
import {
  calculateCurrentStreak,
  calculateHabitStatistics,
  calculateLongestStreak,
  calculateTotalCompletions,
} from '@/business/streaks';

describe('habit statistics', () => {
  it('returns zeros for empty history', () => {
    expect(calculateHabitStatistics([], '2025-04-10')).toEqual({
      currentStreak: 0,
      longestStreak: 0,
      totalCompletions: 0,
    });
  });

  it('keeps yesterday\'s streak active before today is completed', () => {
    const dates = ['2025-04-07', '2025-04-08', '2025-04-09'];
    expect(calculateCurrentStreak(dates, '2025-04-10')).toBe(3);
  });

  it('counts through today when today is completed', () => {
    const dates = ['2025-04-08', '2025-04-09', '2025-04-10'];
    expect(calculateCurrentStreak(dates, '2025-04-10')).toBe(3);
  });

  it('returns zero after both today and yesterday were missed', () => {
    expect(calculateCurrentStreak(['2025-04-08'], '2025-04-10')).toBe(0);
  });

  it('finds the longest historical run without resetting it', () => {
    const dates = [
      '2025-01-01',
      '2025-01-02',
      '2025-01-03',
      '2025-02-10',
      '2025-02-11',
    ];
    expect(calculateLongestStreak(dates, '2025-02-12')).toBe(3);
  });

  it('handles unsorted dates, duplicates and year transitions', () => {
    const dates = ['2025-01-01', '2024-12-31', '2024-12-30', '2025-01-01'];
    expect(calculateLongestStreak(dates, '2025-01-02')).toBe(3);
    expect(calculateTotalCompletions(dates, '2025-01-02')).toBe(3);
  });

  it('handles leap days as consecutive local calendar days', () => {
    const dates = ['2024-02-28', '2024-02-29', '2024-03-01'];
    expect(calculateCurrentStreak(dates, '2024-03-02')).toBe(3);
    expect(calculateLongestStreak(dates, '2024-03-02')).toBe(3);
  });

  it('ignores invalid and future records defensively', () => {
    const dates = ['invalid', '2025-04-09', '2025-04-10', '2099-01-01'];
    expect(calculateHabitStatistics(dates, '2025-04-10')).toEqual({
      currentStreak: 2,
      longestStreak: 2,
      totalCompletions: 2,
    });
  });
});
