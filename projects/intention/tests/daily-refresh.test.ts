import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { observeDailyRefresh } from '@/services/daily-refresh';

const native = vi.hoisted(() => ({
  listener: undefined as undefined | ((state: string) => void),
  remove: vi.fn(),
}));

vi.mock('react-native', () => ({
  AppState: {
    addEventListener: (_event: string, listener: (state: string) => void) => {
      native.listener = listener;
      return { remove: native.remove };
    },
  },
}));

describe('local-day refresh', () => {
  let stop: (() => void) | undefined;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    native.listener = undefined;
    vi.setSystemTime(new Date(2026, 9, 9, 23, 59, 59));
  });

  afterEach(() => {
    stop?.();
    stop = undefined;
    vi.useRealTimers();
  });

  it('refreshes at local midnight and schedules the following day', () => {
    const refresh = vi.fn();
    stop = observeDailyRefresh(refresh);
    vi.advanceTimersByTime(999);
    expect(refresh).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(refresh).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(24 * 60 * 60 * 1000);
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it('reloads after backgrounding across midnight and resets the pending timer', () => {
    const refresh = vi.fn();
    stop = observeDailyRefresh(refresh);
    native.listener?.('background');
    expect(refresh).not.toHaveBeenCalled();
    vi.setSystemTime(new Date(2026, 9, 10, 8));
    native.listener?.('active');
    expect(refresh).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1000);
    expect(refresh).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(16 * 60 * 60 * 1000 - 1000);
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it('rechecks data on resume even if the local day has not changed', () => {
    const refresh = vi.fn();
    stop = observeDailyRefresh(refresh);
    native.listener?.('inactive');
    expect(refresh).not.toHaveBeenCalled();
    native.listener?.('active');
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(1);
  });

  it('removes timers and listeners when leaving the screen', () => {
    const refresh = vi.fn();
    stop = observeDailyRefresh(refresh);
    stop();
    expect(native.remove).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
    native.listener?.('active');
    vi.advanceTimersByTime(2 * 24 * 60 * 60 * 1000);
    expect(refresh).not.toHaveBeenCalled();
    stop = undefined;
  });

  it.each([
    [new Date(2026, 9, 31, 23, 59, 59), new Date(2026, 10, 1)],
    [new Date(2026, 11, 31, 23, 59, 59), new Date(2027, 0, 1)],
    [new Date(2028, 1, 28, 23, 59, 59), new Date(2028, 1, 29)],
  ])('follows local month/year/leap-day boundaries from %s', (before, after) => {
    vi.setSystemTime(before);
    const refresh = vi.fn();
    stop = observeDailyRefresh(refresh);
    vi.advanceTimersByTime(1000);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(new Date()).toEqual(after);
  });

  it('schedules local midnight correctly across daylight-saving changes', () => {
    const originalTimezone = process.env.TZ;
    process.env.TZ = 'America/New_York';
    try {
      for (const [date, hours] of [
        [new Date(2026, 2, 8), 23],
        [new Date(2026, 10, 1), 25],
      ] as const) {
        vi.setSystemTime(date);
        const refresh = vi.fn();
        stop = observeDailyRefresh(refresh);
        vi.advanceTimersByTime(hours * 60 * 60 * 1000 - 1);
        expect(refresh).not.toHaveBeenCalled();
        vi.advanceTimersByTime(1);
        expect(refresh).toHaveBeenCalledTimes(1);
        expect(new Date().getHours()).toBe(0);
        stop();
        stop = undefined;
      }
    } finally {
      if (originalTimezone === undefined) delete process.env.TZ;
      else process.env.TZ = originalTimezone;
    }
  });
});
