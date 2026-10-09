import { observeDailyRefresh } from '@/services/daily-refresh';
import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { getHabitDetails } from '@/database/habit-repository';
import { useDatabase } from '@/database/use-database';
import type { HabitDetails } from '@/types/habit';

export function useHabitDetails(id: string | undefined) {
  const db = useDatabase();
  const [habit, setHabit] = useState<HabitDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!id) {
      setError('رابط العادة غير صحيح.');
      setLoading(false);
      return;
    }
    try {
      setError(null);
      const result = await getHabitDetails(db, id);
      setHabit(result);
      if (!result) setError('ملقيناش العادة دي.');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'مقدرناش نحمّل بيانات العادة.');
    } finally {
      setLoading(false);
    }
  }, [db, id]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void reload();
      return observeDailyRefresh(() => void reload());
    }, [reload]),
  );

  return { habit, loading, error, reload };
}
