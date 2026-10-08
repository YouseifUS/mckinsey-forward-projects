import { DatabaseSync } from 'node:sqlite';
import type { DatabaseClient, DatabaseValue } from '@/database/client';

function bind(params: DatabaseValue[]) {
  return params.map((value) => (typeof value === 'boolean' ? Number(value) : value));
}

export class NodeTestDatabase implements DatabaseClient {
  private readonly database = new DatabaseSync(':memory:');

  async execAsync(source: string): Promise<void> {
    this.database.exec(source);
  }

  async runAsync(source: string, ...params: DatabaseValue[]) {
    const result = this.database.prepare(source).run(...bind(params));
    return {
      changes: Number(result.changes),
      lastInsertRowId: Number(result.lastInsertRowid),
    };
  }

  async getAllAsync<T>(source: string, ...params: DatabaseValue[]): Promise<T[]> {
    const statement = this.database.prepare(source);
    return statement.all(...bind(params)) as T[];
  }

  async getFirstAsync<T>(source: string, ...params: DatabaseValue[]): Promise<T | null> {
    const statement = this.database.prepare(source);
    return (statement.get(...bind(params)) as T | undefined) ?? null;
  }

  close() {
    this.database.close();
  }
}
