import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { listHabits } from '@/database/habit-repository';
import { useDatabase } from '@/database/use-database';
import type { HabitSummary } from '@/types/habit';

export function useHabits(archived = false) {
  const db = useDatabase();
  const [habits, setHabits] = useState<HabitSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setError(null);
      setHabits(await listHabits(db, archived));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'مقدرناش نحمّل عاداتك.');
    } finally {
      setLoading(false);
    }
  }, [archived, db]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void reload();
    }, [reload]),
  );

  return { habits, loading, error, reload };
}
