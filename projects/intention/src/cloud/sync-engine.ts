import type { DatabaseClient } from '@/database/client';
import { acknowledge, applyRemote, decodePending, pendingRecords, type CloudRecord } from './sync-store';

export interface CloudTransport {
  read(): Promise<CloudRecord[]>;
  write(record: CloudRecord, mutationId: string): Promise<void>;
}
// Single flight per account. All operations and callbacks are tied to that session.
export function createSyncEngine(db: DatabaseClient, transport: CloudTransport, changed: (status: string) => void) {
  let stopped = false;
  let running: Promise<void> | null = null;
  async function cycle() {
    changed('جارٍ مزامنة عاداتك…');
    try {
      // A server read verifies connection; cached/incomplete snapshots cannot wipe data.
      const initial = await transport.read();
      if (stopped) return;
      const pending = await pendingRecords(db);
      for (const row of pending) {
        if (stopped) return;
        await transport.write(decodePending(row), row.mutation_id);
        if (stopped) return;
        await acknowledge(db, row);
      }
      if (stopped) return;
      const records = pending.length ? await transport.read() : initial;
      if (stopped) return;
      await applyRemote(db, records, () => !stopped);
      if (!stopped) changed((await pendingRecords(db)).length ? 'تغييرات محفوظة على الجهاز؛ في انتظار المزامنة.' : 'تمت المزامنة مع حسابك.');
    } catch {
      if (!stopped) changed('بياناتك محفوظة على الجهاز. المزامنة لم تكتمل؛ تحقق من الإنترنت أو إعدادات الحساب وأعد المحاولة.');
    }
  }
  return {
    sync() {
      if (stopped) return Promise.resolve();
      if (!running) running = cycle().finally(() => { running = null; });
      return running;
    },
    stop() { stopped = true; },
  };
}
