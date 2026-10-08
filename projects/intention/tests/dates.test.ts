import { describe, expect, it } from 'vitest';
import {
  addCalendarDays,
  formatArabicNumber,
  isFutureDateKey,
  isValidDateKey,
  toLocalDateKey,
} from '@/business/dates';

describe('local calendar date utilities', () => {
  it('formats local calendar parts instead of a UTC slice', () => {
    const date = new Date(2025, 0, 2, 23, 30);
    expect(toLocalDateKey(date)).toBe('2025-01-02');
  });

  it('handles month, year and leap-year transitions', () => {
    expect(addCalendarDays('2024-02-28', 1)).toBe('2024-02-29');
    expect(addCalendarDays('2024-02-29', 1)).toBe('2024-03-01');
    expect(addCalendarDays('2025-12-31', 1)).toBe('2026-01-01');
  });

  it('moves by calendar day without assuming every day is 24 hours', () => {
    expect(addCalendarDays('2025-03-08', 1)).toBe('2025-03-09');
    expect(addCalendarDays('2025-11-01', 1)).toBe('2025-11-02');
  });

  it('rejects impossible and malformed dates', () => {
    expect(isValidDateKey('2025-02-29')).toBe(false);
    expect(isValidDateKey('2025-2-09')).toBe(false);
    expect(isValidDateKey('not-a-date')).toBe(false);
  });

  it('compares future dates by validated local date keys', () => {
    expect(isFutureDateKey('2025-05-11', '2025-05-10')).toBe(true);
    expect(isFutureDateKey('2025-05-10', '2025-05-10')).toBe(false);
  });

  it('formats interface numbers with Arabic digits', () => {
    expect(formatArabicNumber(12)).toBe('١٢');
  });
});
