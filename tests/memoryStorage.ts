import { StorageConflict, type KeyValueStorage } from '@/src/data/local/storage.types';

export class MemoryStorage implements KeyValueStorage {
  values = new Map<string, string>();
  fail = false;
  beforeCommit?: () => void;
  async get(key: string) {
    return this.values.get(key) ?? null;
  }
  async commit(
    values: Record<string, string>,
    removals: string[] = [],
    expected: Record<string, string | null> = {},
  ) {
    this.beforeCommit?.();
    if (this.fail) throw new Error('disk full');
    for (const [key, value] of Object.entries(expected))
      if ((this.values.get(key) ?? null) !== value) throw new StorageConflict();
    Object.entries(values).forEach(([key, value]) => this.values.set(key, value));
    removals.forEach((key) => this.values.delete(key));
  }
}
