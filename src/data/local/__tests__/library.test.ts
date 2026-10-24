import { LibraryRepository } from '../library';
import type { KeyValueStorage } from '../storage.types';
import { BARCODE, OTHER_BARCODE, product } from '@/tests/fixtures';

class MemoryStorage implements KeyValueStorage {
  values = new Map<string, string>();
  fail = false;
  async get(key: string) {
    return this.values.get(key) ?? null;
  }
  async commit(values: Record<string, string>, removals: string[] = []) {
    if (this.fail) throw new Error('disk full');
    Object.entries(values).forEach(([key, value]) => this.values.set(key, value));
    removals.forEach((key) => this.values.delete(key));
  }
}
test('historial, favoritos y fichas sobreviven a una nueva instancia', async () => {
  const storage = new MemoryStorage();
  const first = new LibraryRepository(storage, 'test');
  await first.saveProduct(product());
  await first.toggleFavorite(product());
  const second = new LibraryRepository(storage, 'test');
  await second.load();
  expect(second.getSnapshot().data.history).toHaveLength(1);
  expect(second.getSnapshot().data.favorites[BARCODE].deleted).toBe(false);
  expect(await second.getProduct(BARCODE)).toEqual(product());
});
test('escrituras concurrentes no pierden datos y borrar historial conserva favoritos', async () => {
  const storage = new MemoryStorage();
  const repo = new LibraryRepository(storage, 'test');
  await Promise.all([
    repo.saveProduct(product()),
    repo.saveProduct(product(OTHER_BARCODE)),
    repo.toggleFavorite(product()),
  ]);
  expect(repo.getSnapshot().data.history).toHaveLength(2);
  await repo.clearHistory();
  expect(repo.getSnapshot().data.history).toEqual([]);
  expect(await repo.getProduct(BARCODE)).not.toBeNull();
  expect(await repo.getProduct(OTHER_BARCODE)).toBeNull();
});
test('fallar el guardado no publica un estado que no existe en disco y se puede reintentar', async () => {
  const storage = new MemoryStorage();
  const repo = new LibraryRepository(storage, 'test');
  await repo.load();
  storage.fail = true;
  await expect(repo.saveProduct(product())).rejects.toMatchObject({ code: 'storage_error' });
  expect(repo.getSnapshot().data.history).toEqual([]);
  storage.fail = false;
  await repo.saveProduct(product());
  expect(repo.getSnapshot().data.history).toHaveLength(1);
});
test('no sobrescribe un esquema desconocido ni datos corruptos', async () => {
  const storage = new MemoryStorage();
  storage.values.set('library:test:v1', '{"version":99}');
  const repo = new LibraryRepository(storage, 'test');
  await repo.load();
  expect(repo.getSnapshot().ready).toBe(false);
  await expect(repo.saveProduct(product())).rejects.toMatchObject({ code: 'storage_error' });
  expect(storage.values.get('library:test:v1')).toBe('{"version":99}');
});
test('borrar todo incluye las escrituras que estaban pendientes', async () => {
  const storage = new MemoryStorage();
  const repo = new LibraryRepository(storage, 'test');
  await Promise.all([
    repo.saveProduct(product()),
    repo.saveProduct(product(OTHER_BARCODE)),
    repo.clearAll(),
  ]);
  expect(repo.getSnapshot().data.history).toEqual([]);
  expect(await repo.getProduct(BARCODE)).toBeNull();
  expect(await repo.getProduct(OTHER_BARCODE)).toBeNull();
});
test('una biblioteca vinculada a otra cuenta no se mezcla', async () => {
  const storage = new MemoryStorage();
  const repo = new LibraryRepository(storage, 'test');
  await repo.importFavorites('alice', [], []);
  await expect(repo.importFavorites('bob', [], [])).rejects.toThrow('otra cuenta');
});
test('un borrado remoto gana un empate y una ficha antigua no sustituye una nueva', async () => {
  const storage = new MemoryStorage();
  const repo = new LibraryRepository(storage, 'test');
  const newer = {
    ...product(),
    source: { ...product().source, fetchedAt: '2026-10-23T01:00:00Z' },
  };
  await repo.saveProduct(newer);
  await repo.toggleFavorite(newer);
  const favorite = repo.getSnapshot().data.favorites[BARCODE];
  await repo.importFavorites('alice', [{ ...favorite, deleted: true }], [product()]);
  expect(repo.getSnapshot().data.favorites[BARCODE].deleted).toBe(true);
  expect((await repo.getProduct(BARCODE))?.source.fetchedAt).toBe(newer.source.fetchedAt);
});
