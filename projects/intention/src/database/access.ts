import type { DatabaseClient } from './client';
const locks = new WeakMap<DatabaseClient, Promise<unknown>>();
const listeners = new WeakMap<DatabaseClient, Set<() => void>>();
// Every local writer and remote apply uses this lock; network calls never hold it.
export function withDatabaseLock<T>(db: DatabaseClient, action: () => Promise<T>): Promise<T> {
  const result = (locks.get(db) ?? Promise.resolve()).then(action);
  locks.set(db, result.catch(() => {}));
  return result;
}
export function notifyDatabaseChanged(db: DatabaseClient) {
  listeners.get(db)?.forEach((listener) => listener());
}
export function observeDatabase(db: DatabaseClient, listener: () => void) {
  const set = listeners.get(db) ?? new Set();
  listeners.set(db, set);
  set.add(listener);
  return () => { set.delete(listener); };
}
export async function transaction<T>(db: DatabaseClient, action: () => Promise<T>): Promise<T> {
  await db.execAsync('BEGIN IMMEDIATE');
  try {
    const result = await action();
    await db.execAsync('COMMIT');
    return result;
  } catch (error) {
    await db.execAsync('ROLLBACK');
    throw error;
  }
}
