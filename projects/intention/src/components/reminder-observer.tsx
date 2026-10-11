import { observeDatabase } from '@/database/access';
import { useEffect } from 'react';
import { Alert, AppState } from 'react-native';
import { router } from 'expo-router';
import { useDatabase } from '@/database/use-database';
import { getHabit } from '@/database/habit-repository';
import { refreshHabitReminders } from '@/services/habit-actions';
import { observeReminderTaps } from '@/services/habit-reminders';

export function ReminderObserver() {
  const db = useDatabase();
  useEffect(() => {
    let mounted = true;
    const refresh = () => {
      void refreshHabitReminders(db, () => mounted).catch(() => {
        if (mounted) Alert.alert('التذكير محتاج مراجعة', 'مقدرناش نجهّز كل التذكيرات. افتح تعديل العادة واحفظ وقت التذكير مرة تانية.');
      });
    };
    refresh();
    const stopDatabase = observeDatabase(db, refresh);
    const stateListener = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    const unsubscribe = observeReminderTaps((id) => {
      void getHabit(db, id).then((habit) => {
        if (mounted && habit && !habit.isArchived) router.push({ pathname: '/habit/[id]', params: { id } });
      }).catch(() => {});
    });
    return () => { mounted = false; stopDatabase(); stateListener.remove(); unsubscribe(); };
  }, [db]);
  return null;
}
