import type { DatabaseClient } from './client';

const CURRENT_DATABASE_VERSION = 2;

export async function initializeDatabase(db: DatabaseClient): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

  const versionRow = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const currentVersion = versionRow?.user_version ?? 0;

  if (currentVersion > CURRENT_DATABASE_VERSION) {
    throw new Error('قاعدة البيانات دي اتعملت بإصدار أحدث من تطبيق النية.');
  }

  if (currentVersion < 1) {
    await db.execAsync(`
      BEGIN;
      CREATE TABLE IF NOT EXISTS habits (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL CHECK(length(trim(name)) > 0),
        intention TEXT NOT NULL CHECK(length(trim(intention)) > 0),
        meaning TEXT NOT NULL CHECK(length(trim(meaning)) > 0),
        cue TEXT NOT NULL CHECK(length(trim(cue)) > 0),
        routine TEXT NOT NULL CHECK(length(trim(routine)) > 0),
        reward TEXT NOT NULL CHECK(length(trim(reward)) > 0),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        is_archived INTEGER NOT NULL DEFAULT 0 CHECK(is_archived IN (0, 1))
      );

      CREATE TABLE IF NOT EXISTS completions (
        id TEXT PRIMARY KEY NOT NULL,
        habit_id TEXT NOT NULL,
        completion_date TEXT NOT NULL CHECK(
          length(completion_date) = 10 AND
          completion_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
        ),
        created_at TEXT NOT NULL,
        FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE,
        UNIQUE (habit_id, completion_date)
      );

      CREATE INDEX IF NOT EXISTS index_completions_habit_date
      ON completions(habit_id, completion_date);

      PRAGMA user_version = 1;
      COMMIT;
    `);
  }
  if (currentVersion < 2) {
    await db.execAsync(`
      BEGIN;
      ALTER TABLE habits ADD COLUMN reminder_time TEXT DEFAULT NULL CHECK(
        reminder_time IS NULL OR (
          length(reminder_time) = 5 AND
          reminder_time GLOB '[0-2][0-9]:[0-5][0-9]' AND
          substr(reminder_time, 1, 2) <= '23'
        )
      );
      PRAGMA user_version = 2;
      COMMIT;
    `);
  }
}
