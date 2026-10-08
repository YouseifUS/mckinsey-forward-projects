export type DatabaseValue = string | number | null | boolean;

export type DatabaseRunResult = {
  changes: number;
  lastInsertRowId?: number;
};

/** The small SQLite surface used by the app, keeping persistence easy to test. */
export interface DatabaseClient {
  execAsync(source: string): Promise<void>;
  runAsync(source: string, ...params: DatabaseValue[]): Promise<DatabaseRunResult>;
  getAllAsync<T>(source: string, ...params: DatabaseValue[]): Promise<T[]>;
  getFirstAsync<T>(source: string, ...params: DatabaseValue[]): Promise<T | null>;
}
