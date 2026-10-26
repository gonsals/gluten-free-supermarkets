import * as SQLite from 'expo-sqlite';
import { StorageConflict, type KeyValueStorage } from './storage.types';
import { SCHEMA_GUARD_SQL } from './storagePolicy';

let database: Promise<SQLite.SQLiteDatabase> | undefined;
function getDatabase() {
  database ??= SQLite.openDatabaseAsync('sin-gluten.db')
    .then(async (db) => {
      await db.execAsync(
        'PRAGMA journal_mode = WAL; CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);',
      );
      await db.execAsync(SCHEMA_GUARD_SQL);
      return db;
    })
    .catch((error) => {
      database = undefined;
      throw error;
    });
  return database;
}
export const storage: KeyValueStorage = {
  async get(key) {
    const row = await (
      await getDatabase()
    ).getFirstAsync<{ value: string }>('SELECT value FROM kv WHERE key = ?', key);
    return row?.value ?? null;
  },
  async commit(values, removals = [], expected = {}) {
    const db = await getDatabase();
    await db.withExclusiveTransactionAsync(async (tx) => {
      for (const [key, value] of Object.entries(expected)) {
        const row = await tx.getFirstAsync<{ value: string }>(
          'SELECT value FROM kv WHERE key = ?',
          key,
        );
        if ((row?.value ?? null) !== value) throw new StorageConflict();
      }
      for (const [key, value] of Object.entries(values))
        await tx.runAsync('INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)', key, value);
      for (const key of removals) await tx.runAsync('DELETE FROM kv WHERE key = ?', key);
    });
  },
};
