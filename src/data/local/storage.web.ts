import { openDB } from 'idb';
import { StorageConflict, StorageUpgradeBlocked, type KeyValueStorage } from './storage.types';

let database: ReturnType<typeof openDB> | undefined;
function getDatabase() {
  database ??= new Promise<Awaited<ReturnType<typeof openDB>>>((resolve, reject) => {
    let blocked = false;
    const opening = openDB('sin-gluten', 4, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
      },
      blocked() {
        blocked = true;
        reject(new StorageUpgradeBlocked());
      },
      blocking() {
        // Future upgrades can proceed; this version will subsequently get VersionError.
        void opening.then((db) => db.close());
        database = undefined;
      },
      terminated() {
        database = undefined;
      },
    });
    void opening.then((db) => {
      if (blocked) db.close();
      else resolve(db);
    }, reject);
  }).catch((error) => {
    database = undefined;
    throw error;
  });
  return database;
}
export const storage: KeyValueStorage = {
  async get(key) {
    return (await (await getDatabase()).get('kv', key)) ?? null;
  },
  async commit(values, removals = [], expected = {}) {
    const tx = (await getDatabase()).transaction('kv', 'readwrite');
    try {
      for (const [key, value] of Object.entries(expected))
        if (((await tx.store.get(key)) ?? null) !== value) throw new StorageConflict();
      for (const [key, value] of Object.entries(values)) await tx.store.put(value, key);
      for (const key of removals) await tx.store.delete(key);
      await tx.done;
    } catch (error) {
      try {
        tx.abort();
      } catch {
        /* Transaction may already have aborted. */
      }
      await tx.done.catch(() => undefined);
      throw error;
    }
  },
};
