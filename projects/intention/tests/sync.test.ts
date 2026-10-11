import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { initializeDatabase } from '@/database/schema';
import { createHabit, completeHabit, undoCompletion, deleteHabit, updateHabit, listHabits, getHabitDetails, getHabit } from '@/database/habit-repository';
import { acknowledge, accountDatabaseName, applyRemote, decodePending, importGuestData, initializeSyncStore, pendingRecords, type CloudRecord } from '@/cloud/sync-store';
import { createSyncEngine, type CloudTransport } from '@/cloud/sync-engine';
import { NodeTestDatabase } from './helpers/node-database';

const opened: NodeTestDatabase[] = [];
afterEach(() => { opened.splice(0).forEach((db) => db.close()); });
const input = { name: 'قراءة', intention: 'تعلم', meaning: 'نمو', cue: 'صباح', routine: 'صفحة', reward: 'شاي' };
async function database(account = true) {
  const db = new NodeTestDatabase(); opened.push(db);
  await initializeDatabase(db);
  if (account) await initializeSyncStore(db);
  return db;
}
function cloud(records = new Map<string, CloudRecord>()): CloudTransport {
  return {
    read: async () => [...records.values()],
    write: async (record) => { records.set(`${record.kind}:${record.id}`, structuredClone(record)); },
  };
}

describe('durable SQLite sync and migration', () => {
  it('keeps offline edits and mutation identity across a real database restart', async () => {
    const folder = mkdtempSync(join(tmpdir(), 'neyya-sync-'));
    let db = new NodeTestDatabase(join(folder, 'account.db'));
    try {
      await initializeDatabase(db); await initializeSyncStore(db);
      const habit = await createHabit(db, input);
      await completeHabit(db, habit.id, '2026-10-01');
      const before = await pendingRecords(db);
      db.close(); db = new NodeTestDatabase(join(folder, 'account.db'));
      await initializeDatabase(db); await initializeSyncStore(db);
      expect(await pendingRecords(db)).toEqual(before);
      expect((await getHabitDetails(db, habit.id))?.completionDates).toEqual(['2026-10-01']);
      await createSyncEngine(db, cloud(), () => {}).sync();
      expect(await pendingRecords(db)).toHaveLength(0);
    } finally { db.close(); rmSync(folder, { recursive: true, force: true }); }
  });
  it('preserves v2 guest data and imports archive, time and all history once', async () => {
    const guest = await database(false), account = await database();
    const habit = await createHabit(guest, { ...input, reminderTime: '08:00' });
    await completeHabit(guest, habit.id, '2026-10-01');
    await guest.runAsync('UPDATE habits SET is_archived = 1 WHERE id = ?', habit.id);
    expect(await importGuestData(guest, account)).toBe(1);
    expect(await importGuestData(guest, account)).toBe(0);
    expect(await getHabitDetails(account, habit.id)).toMatchObject({ isArchived: true, reminderTime: '08:00', completionDates: ['2026-10-01'] });
    expect(await getHabitDetails(guest, habit.id)).toMatchObject({ completionDates: ['2026-10-01'] });
    expect((await pendingRecords(account)).every((r) => r.mutation_id.startsWith('import:'))).toBe(true);
    expect(await guest.getFirstAsync('PRAGMA user_version')).toEqual({ user_version: 2 });
  });
  it('rolls back partial migration and allows a safe retry', async () => {
    const guest = await database(false), account = await database();
    await createHabit(guest, input);
    const original = account.runAsync.bind(account);
    let reached!: () => void, release!: () => void;
    const atMarker = new Promise<void>((resolve) => { reached = resolve; });
    const gate = new Promise<void>((resolve) => { release = resolve; });
    account.runAsync = async (sql, ...params) => {
      if (sql.includes("INSERT INTO sync_meta VALUES ('guest_imported'")) {
        reached(); await gate; throw new Error('disk full');
      }
      return original(sql, ...params);
    };
    const importing = importGuestData(guest, account);
    await atMarker;
    // A sync snapshot must not publish data from an uncommitted migration.
    const snapshot = pendingRecords(account);
    release();
    await expect(importing).rejects.toThrow('disk full');
    expect(await snapshot).toEqual([]);
    expect(await listHabits(account)).toHaveLength(0);
    expect(await pendingRecords(account)).toHaveLength(0);
    account.runAsync = original;
    expect(await importGuestData(guest, account)).toBe(1);
  });
  it('does not overwrite existing account habits or revive cloud tombstones during import', async () => {
    const guest = await database(false), account = await database();
    const h = await createHabit(guest, input);
    await applyRemote(account, [{ kind: 'habit', id: h.id, data: { ...h, name: 'حساب', deleted: false } }]);
    await importGuestData(guest, account);
    expect((await getHabit(account, h.id))?.name).toBe('حساب');
    const other = await database();
    await applyRemote(other, [{ kind: 'habit', id: h.id, data: { id: h.id, deleted: true } }]);
    expect(await importGuestData(guest, other)).toBe(0);
  });
  it('captures all local writes atomically, including undo and cascading delete', async () => {
    const db = await database();
    const h = await createHabit(db, input);
    await completeHabit(db, h.id, '2026-10-01');
    await undoCompletion(db, h.id, '2026-10-01');
    expect(decodePending((await pendingRecords(db))[1]).data.deleted).toBe(true);
    await completeHabit(db, h.id, '2026-10-01');
    await deleteHabit(db, h.id);
    expect((await pendingRecords(db)).map((r) => decodePending(r).data.deleted)).toEqual([true, true]);
  });
  it('retains the queue through offline failure and transfers it after reconnect', async () => {
    const a = await database(), b = await database();
    const h = await createHabit(a, input);
    await completeHabit(a, h.id, '2026-10-01');
    const engine = createSyncEngine(a, { read: async () => { throw new Error('offline'); }, write: async () => {} }, () => {});
    await engine.sync();
    expect(await pendingRecords(a)).toHaveLength(2);
    const server = cloud();
    await createSyncEngine(a, server, () => {}).sync();
    expect(await pendingRecords(a)).toHaveLength(0);
    await createSyncEngine(b, server, () => {}).sync();
    expect((await getHabitDetails(b, h.id))?.completionDates).toEqual(['2026-10-01']);
    expect(await pendingRecords(b)).toHaveLength(0);
    await undoCompletion(a, h.id, '2026-10-01');
    await createSyncEngine(a, server, () => {}).sync();
    await createSyncEngine(b, server, () => {}).sync();
    expect((await getHabitDetails(b, h.id))?.completionDates).toEqual([]);
  });
  it('never acknowledges a newer edit or overwrites unsent local edits with a snapshot', async () => {
    const db = await database();
    const h = await createHabit(db, input), [old] = await pendingRecords(db);
    await updateHabit(db, h.id, { ...input, name: 'جديد' });
    await acknowledge(db, old);
    expect(await pendingRecords(db)).toHaveLength(1);
    await applyRemote(db, [{ kind: 'habit', id: h.id, data: { ...h, deleted: false } }]);
    expect((await getHabit(db, h.id))?.name).toBe('جديد');
  });
  it('handles committed writes followed by connection failure without losing pending changes', async () => {
    const db = await database(); await createHabit(db, input);
    const server = cloud(); let fail = true;
    const flaky = { ...server, write: async (r: CloudRecord, id: string) => { await server.write(r, id); if (fail) throw new Error('response lost'); } };
    await createSyncEngine(db, flaky, () => {}).sync();
    expect(await pendingRecords(db)).toHaveLength(1);
    fail = false;
    await createSyncEngine(db, flaky, () => {}).sync();
    expect(await pendingRecords(db)).toHaveLength(0);
    expect(await server.read()).toHaveLength(1);
  });
  it('isolates accounts and drops late responses after logout', async () => {
    const a = await database(), b = await database();
    const h = await createHabit(a, input);
    let resolve!: (r: CloudRecord[]) => void;
    const engine = createSyncEngine(a, { read: () => new Promise((r) => { resolve = r; }), write: async () => { throw new Error('must not write'); } }, () => {});
    const task = engine.sync(); engine.stop(); resolve([]); await task;
    expect(await pendingRecords(a)).toHaveLength(1);
    expect(await listHabits(b)).toHaveLength(0);
    expect(accountDatabaseName('a/b')).not.toBe(accountDatabaseName('a_b'));
    expect((await getHabit(a, h.id))?.name).toBe(input.name);
  });
  it('rejects malformed cloud documents and ignores missing records', async () => {
    const db = await database(); const h = await createHabit(db, input);
    await acknowledge(db, (await pendingRecords(db))[0]);
    await applyRemote(db, []);
    expect(await getHabit(db, h.id)).not.toBeNull();
    await expect(applyRemote(db, [{ kind: 'habit', id: h.id, data: { ...h, name: '', deleted: false } }])).rejects.toThrow();
    expect((await getHabit(db, h.id))?.name).toBe(input.name);
  });
});
