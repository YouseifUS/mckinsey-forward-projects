import type { DatabaseClient } from '@/database/client';
import { createId } from '@/utils/id';
import { notifyDatabaseChanged, transaction, withDatabaseLock } from '@/database/access';
import type { Habit } from '@/types/habit';
import { isValidDateKey } from '@/business/dates';
import { isValidReminderTime } from '@/business/reminder-time';

export type HabitRecord = Habit & { deleted: false };
export type CompletionRecord = { habitId: string; date: string; createdAt: string; deleted: boolean };
export type CloudRecord = { kind: 'habit' | 'completion'; id: string; data: HabitRecord | CompletionRecord | { id: string; deleted: true } };
export type PendingRecord = { kind: CloudRecord['kind']; id: string; payload: string; mutation_id: string };

export const completionKey = (habitId: string, date: string) => `${habitId}_${date}`;
export const accountDatabaseName = (uid: string) => `intention-account-${encodeURIComponent(uid)}.db`;

export async function initializeSyncStore(db: DatabaseClient) {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS sync_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    INSERT OR IGNORE INTO sync_meta VALUES ('applying', '0'), ('sequence', '0');
    CREATE TABLE IF NOT EXISTS sync_outbox (
      kind TEXT NOT NULL, id TEXT NOT NULL, payload TEXT NOT NULL, mutation_id TEXT NOT NULL,
      PRIMARY KEY(kind, id)
    );
    CREATE TABLE IF NOT EXISTS sync_tombstones (kind TEXT, id TEXT, PRIMARY KEY(kind, id));
  `);
  await db.runAsync("INSERT OR IGNORE INTO sync_meta VALUES ('device', ?)", createId('device'));
  const habitPayload = (row: string) => `json_object('id', ${row}.id, 'name', ${row}.name,
    'intention', ${row}.intention, 'meaning', ${row}.meaning, 'cue', ${row}.cue,
    'routine', ${row}.routine, 'reward', ${row}.reward, 'reminderTime', ${row}.reminder_time,
    'createdAt', ${row}.created_at, 'updatedAt', ${row}.updated_at,
    'isArchived', ${row}.is_archived, 'deleted', 0)`;
  for (const [table, kind] of [['habits', 'habit'], ['completions', 'completion']] as const) {
    for (const event of ['INSERT', 'UPDATE', 'DELETE']) {
      const row = event === 'DELETE' ? 'OLD' : 'NEW';
      const id = kind === 'habit' ? `${row}.id` : `${row}.habit_id || '_' || ${row}.completion_date`;
      const payload = kind === 'habit'
        ? event === 'DELETE' ? `json_object('id', ${row}.id, 'deleted', 1)` : habitPayload(row)
        : `json_object('habitId', ${row}.habit_id, 'date', ${row}.completion_date,
          'createdAt', ${row}.created_at, 'deleted', ${event === 'DELETE' ? 1 : 0})`;
      await db.execAsync(`CREATE TRIGGER IF NOT EXISTS sync_${table}_${event}
        AFTER ${event} ON ${table}
        WHEN (SELECT value FROM sync_meta WHERE key = 'applying') = '0'
        BEGIN
          UPDATE sync_meta SET value = CAST(value AS INTEGER) + 1 WHERE key = 'sequence';
          INSERT INTO sync_outbox VALUES ('${kind}', ${id}, ${payload},
            (SELECT value FROM sync_meta WHERE key = 'device') || ':' ||
            (SELECT value FROM sync_meta WHERE key = 'sequence'))
          ON CONFLICT(kind, id) DO UPDATE SET payload = excluded.payload, mutation_id = excluded.mutation_id;
        END;`);
    }
  }
}

export function decodePending(row: PendingRecord): CloudRecord {
  const data = JSON.parse(row.payload);
  data.deleted = Boolean(data.deleted);
  if (row.kind === 'habit' && !data.deleted) data.isArchived = Boolean(data.isArchived);
  return { kind: row.kind, id: row.id, data };
}
export async function pendingRecords(db: DatabaseClient): Promise<PendingRecord[]> {
  return db.getAllAsync<PendingRecord>("SELECT * FROM sync_outbox ORDER BY CASE kind WHEN 'habit' THEN 0 ELSE 1 END, id");
}
export async function acknowledge(db: DatabaseClient, row: PendingRecord) {
  await withDatabaseLock(db, () => db.runAsync(
    'DELETE FROM sync_outbox WHERE kind = ? AND id = ? AND mutation_id = ?', row.kind, row.id, row.mutation_id,
  ));
}

// Treat remote data as untrusted; a malformed document must not erase local data.
export function validateRecord(record: CloudRecord) {
  const d = record.data;
  if (!record.id || record.id.includes('/') || typeof d.deleted !== 'boolean') throw new Error('بيانات المزامنة غير صحيحة.');
  if (record.kind === 'habit') {
    if (!('id' in d) || d.id !== record.id) throw new Error('معرّف العادة غير صحيح.');
    if (d.deleted) return;
    const h = d as HabitRecord;
    if (['name', 'intention', 'meaning', 'cue', 'routine', 'reward'].some((key) =>
      typeof h[key as keyof Habit] !== 'string' || !(h[key as keyof Habit] as string).trim())) throw new Error('العادة غير مكتملة.');
    if (typeof h.isArchived !== 'boolean' || typeof h.createdAt !== 'string' || typeof h.updatedAt !== 'string' ||
      (h.reminderTime !== null && !isValidReminderTime(h.reminderTime))) throw new Error('العادة غير صحيحة.');
  } else {
    const c = d as CompletionRecord;
    if (typeof c.habitId !== 'string' || !isValidDateKey(c.date) || typeof c.createdAt !== 'string' ||
      completionKey(c.habitId, c.date) !== record.id) throw new Error('سجل الإكمال غير صحيح.');
  }
}

export async function applyRemote(db: DatabaseClient, records: CloudRecord[], active = () => true) {
  records.forEach(validateRecord);
  await withDatabaseLock(db, async () => {
    if (!active()) return;
    await transaction(db, async () => {
      await db.runAsync("UPDATE sync_meta SET value = '1' WHERE key = 'applying'");
      // Parents first. Missing documents are never interpreted as deletions.
      for (const record of [...records].sort((a, b) => a.kind === b.kind ? 0 : a.kind === 'habit' ? -1 : 1)) {
        if (await db.getFirstAsync('SELECT 1 FROM sync_outbox WHERE kind = ? AND id = ?', record.kind, record.id)) continue;
        const d = record.data;
        if (d.deleted) {
          await db.runAsync('INSERT OR IGNORE INTO sync_tombstones VALUES (?, ?)', record.kind, record.id);
          if (record.kind === 'habit') await db.runAsync('DELETE FROM habits WHERE id = ?', record.id);
          else {
            const c = d as CompletionRecord;
            await db.runAsync('DELETE FROM completions WHERE habit_id = ? AND completion_date = ?', c.habitId, c.date);
          }
        } else if (record.kind === 'habit') {
          const h = d as HabitRecord;
          await db.runAsync(`INSERT INTO habits
            (id, name, intention, meaning, cue, routine, reward, reminder_time, created_at, updated_at, is_archived)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET name=excluded.name, intention=excluded.intention,
            meaning=excluded.meaning, cue=excluded.cue, routine=excluded.routine, reward=excluded.reward,
            reminder_time=excluded.reminder_time, updated_at=excluded.updated_at, is_archived=excluded.is_archived`,
          h.id, h.name, h.intention, h.meaning, h.cue, h.routine, h.reward, h.reminderTime, h.createdAt, h.updatedAt, h.isArchived);
        } else {
          const c = d as CompletionRecord;
          if (!(await db.getFirstAsync('SELECT 1 FROM habits WHERE id = ?', c.habitId))) continue;
          await db.runAsync('INSERT OR IGNORE INTO completions VALUES (?, ?, ?, ?)', record.id, c.habitId, c.date, c.createdAt);
        }
      }
      await db.runAsync("UPDATE sync_meta SET value = '0' WHERE key = 'applying'");
    });
  });
  if (active()) notifyDatabaseChanged(db);
}

export async function importGuestData(guest: DatabaseClient, account: DatabaseClient) {
  const habits = await guest.getAllAsync<Record<string, string | number | null>>('SELECT * FROM habits');
  const completions = await guest.getAllAsync<Record<string, string>>('SELECT * FROM completions');
  return withDatabaseLock(account, async () => {
    const count = await transaction(account, async () => {
      if (await account.getFirstAsync("SELECT 1 FROM sync_meta WHERE key = 'guest_imported'")) return 0;
      let copied = 0;
      for (const h of habits) {
        if (await account.getFirstAsync("SELECT 1 FROM sync_tombstones WHERE kind = 'habit' AND id = ?", h.id)) continue;
        const result = await account.runAsync(`INSERT OR IGNORE INTO habits
          (id,name,intention,meaning,cue,routine,reward,reminder_time,created_at,updated_at,is_archived)
          VALUES (?,?,?,?,?,?,?,?,?,?,?)`, h.id, h.name, h.intention, h.meaning, h.cue, h.routine, h.reward,
        h.reminder_time, h.created_at, h.updated_at, h.is_archived);
        copied += result.changes;
        if (result.changes) await account.runAsync("UPDATE sync_outbox SET mutation_id = 'import:' || mutation_id WHERE kind = 'habit' AND id = ?", h.id);
      }
      for (const c of completions) {
        if (!(await account.getFirstAsync('SELECT 1 FROM habits WHERE id = ?', c.habit_id))) continue;
        if (await account.getFirstAsync("SELECT 1 FROM sync_tombstones WHERE kind = 'completion' AND id = ?", completionKey(c.habit_id, c.completion_date))) continue;
        const result = await account.runAsync('INSERT OR IGNORE INTO completions VALUES (?, ?, ?, ?)', c.id, c.habit_id, c.completion_date, c.created_at);
        if (result.changes) await account.runAsync("UPDATE sync_outbox SET mutation_id = 'import:' || mutation_id WHERE kind = 'completion' AND id = ?", completionKey(c.habit_id, c.completion_date));
      }
      await account.runAsync("INSERT INTO sync_meta VALUES ('guest_imported', '1')");
      return copied;
    });
    notifyDatabaseChanged(account);
    return count;
  });
}
