import { openDB } from 'idb';
import type { KeyValueStorage } from './storage.types';

let database: ReturnType<typeof openDB> | undefined;
function getDatabase() {
  database ??= openDB('sin-gluten', 1, {
    upgrade(db) {
      db.createObjectStore('kv');
    },
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
  async commit(values, removals = []) {
    const tx = (await getDatabase()).transaction('kv', 'readwrite');
    for (const [key, value] of Object.entries(values)) await tx.store.put(value, key);
    for (const key of removals) await tx.store.delete(key);
    await tx.done;
  },
};
