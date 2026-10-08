import { useSQLiteContext } from 'expo-sqlite';
import type { DatabaseClient } from './client';

export function useDatabase(): DatabaseClient {
  return useSQLiteContext() as unknown as DatabaseClient;
}
