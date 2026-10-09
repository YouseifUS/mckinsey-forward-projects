import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { Habit } from '@/types/habit';

const CHANNEL = 'habit-reminders';
const PREFIX = 'habit-reminder:';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function prepareChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'تذكير العادات',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
    });
  }
}

function isAllowed(permission: Notifications.NotificationPermissionsStatus): boolean {
  return permission.ios
    ? [Notifications.IosAuthorizationStatus.AUTHORIZED,
       Notifications.IosAuthorizationStatus.PROVISIONAL,
       Notifications.IosAuthorizationStatus.EPHEMERAL].includes(permission.ios.status)
    : permission.granted;
}

export async function hasReminderPermission(): Promise<boolean> {
  return isAllowed(await Notifications.getPermissionsAsync());
}

export async function requestReminderPermission(): Promise<boolean> {
  // Android 13 needs a channel before the permission prompt can appear.
  await prepareChannel();
  const current = await Notifications.getPermissionsAsync();
  if (isAllowed(current)) return true;
  if (!current.canAskAgain) return false;
  return isAllowed(await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: true, allowBadge: false },
  }));
}

export async function cancelHabitReminder(id: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(`${PREFIX}${id}`);
}

export async function syncHabitReminder(habit: Habit): Promise<void> {
  if (habit.isArchived || !habit.reminderTime) {
    await cancelHabitReminder(habit.id);
    return;
  }
  if (!(await hasReminderPermission())) {
    throw new Error('اسمح لنية بالإشعارات من إعدادات الجهاز عشان نفعّل التذكير.');
  }
  await prepareChannel();
  const [hour, minute] = habit.reminderTime.split(':').map(Number);
  // A stable identifier replaces the previous request when time or name changes.
  await Notifications.scheduleNotificationAsync({
    identifier: `${PREFIX}${habit.id}`,
    content: {
      title: habit.name,
      body: 'حان وقت عادتك. خطوة صغيرة تقرّبك من نيتك.',
      sound: 'default',
      data: { habitId: habit.id, reminderTime: habit.reminderTime },
    },
    trigger: Platform.OS === 'ios'
      ? { type: Notifications.SchedulableTriggerInputTypes.CALENDAR, hour, minute, repeats: true }
      : { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute, channelId: CHANNEL },
  });
}

export async function reconcileHabitReminders(habits: Habit[]): Promise<void> {
  const allowed = await hasReminderPermission();
  const active = new Map(habits.filter((habit) => allowed && !habit.isArchived && habit.reminderTime)
    .map((habit) => [`${PREFIX}${habit.id}`, habit]));
  const pending = await Notifications.getAllScheduledNotificationsAsync();
  const unchanged = new Set<string>();
  for (const request of pending) {
    if (!request.identifier.startsWith(PREFIX)) continue;
    const habit = active.get(request.identifier);
    if (habit && request.content.title === habit.name &&
        request.content.data?.reminderTime === habit.reminderTime) {
      unchanged.add(request.identifier);
    } else {
      await Notifications.cancelScheduledNotificationAsync(request.identifier);
    }
  }
  for (const [identifier, habit] of active) {
    if (!unchanged.has(identifier)) await syncHabitReminder(habit);
  }
}

export function observeReminderTaps(onTap: (id: string) => void): () => void {
  const handle = (response: Notifications.NotificationResponse) => {
    const id = response.notification.request.content.data?.habitId;
    if (typeof id !== 'string' || !response.notification.request.identifier.startsWith(PREFIX)) return;
    onTap(id);
    Notifications.clearLastNotificationResponse();
  };
  const subscription = Notifications.addNotificationResponseReceivedListener(handle);
  const last = Notifications.getLastNotificationResponse();
  if (last) handle(last);
  return () => subscription.remove();
}
