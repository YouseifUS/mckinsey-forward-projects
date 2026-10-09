import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NodeTestDatabase } from './helpers/node-database';
import { initializeDatabase } from '@/database/schema';
import * as repository from '@/database/habit-repository';
import * as actions from '@/services/habit-actions';
import * as reminders from '@/services/habit-reminders';
import { isValidReminderTime, timeFromDate, dateFromTime } from '@/business/reminder-time';

const native = vi.hoisted(() => ({
  platform: { OS: 'android' },
  permission: { granted: true, canAskAgain: true, ios: undefined as undefined | { status: number } },
  requests: new Map<string, any>(),
  order: [] as string[],
  request: vi.fn(),
  schedule: vi.fn(),
  cancel: vi.fn(),
  channel: vi.fn(),
  responseListener: undefined as undefined | ((response: any) => void),
  lastResponse: null as any,
  clear: vi.fn(),
}));
vi.mock('react-native', () => ({ Platform: native.platform }));
vi.mock('expo-notifications', () => ({
  setNotificationHandler: vi.fn(),
  AndroidImportance: { HIGH: 4 },
  IosAuthorizationStatus: { AUTHORIZED: 2, PROVISIONAL: 3, EPHEMERAL: 4 },
  SchedulableTriggerInputTypes: { CALENDAR: 'calendar', DAILY: 'daily' },
  getPermissionsAsync: async () => native.permission,
  requestPermissionsAsync: native.request,
  setNotificationChannelAsync: native.channel,
  scheduleNotificationAsync: native.schedule,
  cancelScheduledNotificationAsync: native.cancel,
  getAllScheduledNotificationsAsync: async () => Array.from(native.requests.values()),
  addNotificationResponseReceivedListener: (callback: (response: any) => void) => {
    native.responseListener = callback;
    return { remove: vi.fn() };
  },
  getLastNotificationResponse: () => native.lastResponse,
  clearLastNotificationResponse: native.clear,
}));

const input = {
  name: 'القراءة', intention: 'أتعلم', meaning: 'نمو', cue: 'القهوة', routine: 'عشر صفحات', reward: 'شاي',
  reminderTime: '21:05',
};

describe('habit reminder lifecycle', () => {
  let db: NodeTestDatabase;
  beforeEach(async () => {
    vi.clearAllMocks();
    native.platform.OS = 'android';
    native.permission = { granted: true, canAskAgain: true, ios: undefined };
    native.requests.clear();
    native.order = [];
    native.lastResponse = null;
    native.channel.mockImplementation(async () => { native.order.push('channel'); });
    native.request.mockImplementation(async () => { native.order.push('permission'); return native.permission; });
    native.cancel.mockImplementation(async (id: string) => { native.requests.delete(id); });
    native.schedule.mockImplementation(async (request: any) => {
      native.requests.set(request.identifier, request);
      return request.identifier;
    });
    db = new NodeTestDatabase();
    await initializeDatabase(db);
  });
  afterEach(() => db.close());

  it('saves the local time and schedules a daily Android notification with the habit name', async () => {
    const habit = await actions.createHabit(db, input);
    expect((await repository.getHabit(db, habit.id))?.reminderTime).toBe('21:05');
    expect(native.schedule).toHaveBeenCalledWith(expect.objectContaining({
      identifier: `habit-reminder:${habit.id}`,
      content: expect.objectContaining({ title: 'القراءة', sound: 'default', data: { habitId: habit.id, reminderTime: '21:05' } }),
      trigger: { type: 'daily', hour: 21, minute: 5, channelId: 'habit-reminders' },
    }));
  });

  it('uses a repeating calendar trigger on iOS', async () => {
    native.platform.OS = 'ios';
    await actions.createHabit(db, { ...input, reminderTime: '00:00' });
    expect(native.schedule).toHaveBeenCalledWith(expect.objectContaining({
      trigger: { type: 'calendar', hour: 0, minute: 0, repeats: true },
    }));
  });

  it('creates the Android channel before requesting notification permission', async () => {
    native.permission.granted = false;
    native.request.mockImplementation(async () => {
      native.order.push('permission');
      native.permission.granted = true;
      return native.permission;
    });
    await actions.createHabit(db, input);
    expect(native.order.slice(0, 2)).toEqual(['channel', 'permission']);
    expect(native.requests.size).toBe(1);
  });

  it('does not save or schedule a reminder when permission is refused', async () => {
    native.permission.granted = false;
    await expect(actions.createHabit(db, input)).rejects.toThrow('إذن الإشعارات');
    expect(await repository.listHabits(db)).toEqual([]);
    expect(native.schedule).not.toHaveBeenCalled();
  });

  it('does not re-prompt a permanently denied user', async () => {
    native.permission = { granted: false, canAskAgain: false, ios: undefined };
    expect(await reminders.requestReminderPermission()).toBe(false);
    expect(native.request).not.toHaveBeenCalled();
  });

  it('accepts provisional iOS permission and rejects explicit iOS denial', async () => {
    native.platform.OS = 'ios';
    native.permission = { granted: false, canAskAgain: false, ios: { status: 3 } };
    expect(await reminders.hasReminderPermission()).toBe(true);
    native.permission = { granted: true, canAskAgain: false, ios: { status: 1 } };
    expect(await reminders.hasReminderPermission()).toBe(false);
  });

  it('allows habits without reminders without requesting permission', async () => {
    native.permission.granted = false;
    const habit = await actions.createHabit(db, { ...input, reminderTime: null });
    expect(habit.reminderTime).toBeNull();
    expect(native.request).not.toHaveBeenCalled();
    expect(native.schedule).not.toHaveBeenCalled();
  });

  it('replaces the time and name without duplicate reminders or loss of history', async () => {
    const habit = await actions.createHabit(db, input);
    await repository.completeHabit(db, habit.id, '2025-01-01', new Date(2025, 0, 1, 12));
    await actions.updateHabit(db, habit.id, { ...input, name: 'قراءة مسائية', reminderTime: '23:59' });
    expect(native.requests.size).toBe(1);
    const request = native.requests.get(`habit-reminder:${habit.id}`);
    expect(request.content.title).toBe('قراءة مسائية');
    expect(request.trigger).toMatchObject({ hour: 23, minute: 59 });
    expect((await repository.getHabitDetails(db, habit.id))?.completionDates).toEqual(['2025-01-01']);
  });

  it('cancels a disabled reminder even when notification permission has been revoked', async () => {
    const habit = await actions.createHabit(db, input);
    native.permission.granted = false;
    await actions.updateHabit(db, habit.id, { ...input, reminderTime: null });
    expect(native.requests.size).toBe(0);
    expect((await repository.getHabit(db, habit.id))?.reminderTime).toBeNull();
  });

  it('cancels on archive, edits quietly while archived, and reschedules on restore', async () => {
    const habit = await actions.createHabit(db, input);
    await actions.setHabitArchived(db, habit.id, true);
    expect(native.requests.size).toBe(0);
    await actions.updateHabit(db, habit.id, { ...input, reminderTime: '06:30' });
    expect(native.requests.size).toBe(0);
    await actions.setHabitArchived(db, habit.id, false);
    expect(native.requests.get(`habit-reminder:${habit.id}`).trigger).toMatchObject({ hour: 6, minute: 30 });
  });

  it('keeps an archived habit intact if restoring its reminder is denied', async () => {
    const habit = await actions.createHabit(db, input);
    await actions.setHabitArchived(db, habit.id, true);
    native.permission.granted = false;
    await expect(actions.setHabitArchived(db, habit.id, false)).rejects.toThrow();
    expect((await repository.getHabit(db, habit.id))?.isArchived).toBe(true);
    expect(native.requests.size).toBe(0);
  });

  it('cancels on permanent deletion', async () => {
    const habit = await actions.createHabit(db, input);
    await actions.deleteHabit(db, habit.id);
    expect(await repository.getHabit(db, habit.id)).toBeNull();
    expect(native.requests.size).toBe(0);
  });

  it('rolls back a failed create so retrying does not create duplicate habits', async () => {
    native.schedule.mockRejectedValueOnce(new Error('Scheduling failed'));
    await expect(actions.createHabit(db, input)).rejects.toThrow('Scheduling failed');
    expect(await repository.listHabits(db)).toEqual([]);
    await actions.createHabit(db, input);
    expect(await repository.listHabits(db)).toHaveLength(1);
  });

  it('restores previous data and reminder after a failed update', async () => {
    const habit = await actions.createHabit(db, input);
    native.schedule.mockRejectedValueOnce(new Error('Scheduling failed'));
    await expect(actions.updateHabit(db, habit.id, { ...input, name: 'New', reminderTime: '05:00' })).rejects.toThrow();
    expect(await repository.getHabit(db, habit.id)).toMatchObject({ name: input.name, reminderTime: input.reminderTime });
    expect(native.requests.get(`habit-reminder:${habit.id}`).content.title).toBe(input.name);
  });

  it('repairs missing reminders, removes deleted ones, and leaves unchanged schedules intact', async () => {
    const habit = await actions.createHabit(db, input);
    native.requests.set('habit-reminder:deleted', { identifier: 'habit-reminder:deleted', content: {} });
    native.requests.set('unrelated', { identifier: 'unrelated', content: {} });
    native.schedule.mockClear();
    await actions.refreshHabitReminders(db);
    expect(native.schedule).not.toHaveBeenCalled();
    expect(native.requests.has('habit-reminder:deleted')).toBe(false);
    expect(native.requests.has('unrelated')).toBe(true);
    native.requests.delete(`habit-reminder:${habit.id}`);
    await actions.refreshHabitReminders(db);
    expect(native.schedule).toHaveBeenCalledTimes(1);
  });

  it('cancels schedules after permission revocation and restores them after a settings grant without prompting', async () => {
    await actions.createHabit(db, input);
    native.permission.granted = false;
    await actions.refreshHabitReminders(db);
    expect(native.requests.size).toBe(0);
    native.permission.granted = true;
    await actions.refreshHabitReminders(db);
    expect(native.requests.size).toBe(1);
    expect(native.request).not.toHaveBeenCalled();
  });

  it('passes the habit ID for cold and warm notification taps and clears the cold response', () => {
    const response = { notification: { request: { identifier: 'habit-reminder:reading', content: { data: { habitId: 'reading' } } } } };
    native.lastResponse = response;
    const onTap = vi.fn();
    const stop = reminders.observeReminderTaps(onTap);
    expect(onTap).toHaveBeenCalledWith('reading');
    expect(native.clear).toHaveBeenCalled();
    native.responseListener?.(response);
    expect(onTap).toHaveBeenCalledTimes(2);
    stop();
  });
});

describe('reminder time validation', () => {
  it.each(['00:00', '23:59', '09:05'])('accepts %s', (time) => expect(isValidReminderTime(time)).toBe(true));
  it.each(['24:00', '12:60', '9:05', '12:5', '', '09:00 AM'])('rejects %s', (time) => expect(isValidReminderTime(time)).toBe(false));
  it('round trips picker values using local hours', () => {
    expect(timeFromDate(dateFromTime('21:05'))).toBe('21:05');
  });
});
