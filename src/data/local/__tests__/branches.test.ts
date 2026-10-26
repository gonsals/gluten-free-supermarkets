import { MemoryStorage } from '@/tests/memoryStorage';
import { BARCODE, product } from '@/tests/fixtures';
import { LibraryRepository } from '../library';
import { parseLibraryBackup } from '../backup';
import { privateReferenceKey } from '@/src/domain/comparison';
import type { StoreBranch } from '@/src/domain/branches';

const reference = { source: 'private' as const, key: privateReferenceKey('Tienda', 'Madrid') };
const branch: StoreBranch = {
  id: 'a',
  name: 'Tienda',
  address: 'Calle Mayor 1, Madrid',
  references: [reference],
};
test('migración v2 conserva cesta y precios; v3 preserva vínculos en copia y borrado', async () => {
  const storage = new MemoryStorage();
  const repo = new LibraryRepository(storage, 'test');
  await repo.addToBasket(BARCODE, product());
  const v2 = { ...repo.getSnapshot().data, version: 2 } as Record<string, unknown>;
  delete v2.branches;
  storage.values.set('library:test:v1', JSON.stringify(v2));
  const migrated = new LibraryRepository(storage, 'test');
  await migrated.load();
  expect(migrated.getSnapshot().data).toMatchObject({
    version: 3,
    basket: v2.basket,
    branches: [],
  });
  await migrated.saveBranch(branch);
  const copy = await migrated.exportData();
  expect(JSON.parse(copy)).toMatchObject({ version: 3, backupVersion: 3 });
  await migrated.clearAll();
  await migrated.restoreBackup(copy, migrated.getSnapshot().data);
  expect(migrated.getSnapshot().data.branches).toEqual([branch]);
  await migrated.clearBasket(migrated.getSnapshot().data.basket);
  expect(migrated.getSnapshot().data.branches).toHaveLength(1);
  await migrated.clearAll();
  expect(migrated.getSnapshot().data.branches).toEqual([]);
});
test('vínculos son únicos, corregibles y cambios externos invalidan confirmaciones', async () => {
  const storage = new MemoryStorage(),
    first = new LibraryRepository(storage, 'test'),
    second = new LibraryRepository(storage, 'test');
  await first.saveBranch(branch);
  await first.saveBranch({ ...branch, id: 'b', name: 'Otra', references: [] });
  await expect(first.saveBranch({ ...branch, id: 'c' })).rejects.toThrow('otra sucursal');
  await second.assignReference(reference, 'b', 'a');
  await expect(first.assignReference(reference, null, 'a')).rejects.toThrow('ha cambiado');
  await expect(first.deleteBranch(branch)).rejects.toThrow('ha cambiado');
  await first.assignReference(reference, null, 'b');
  expect(first.getSnapshot().data.branches.every((store) => store.references.length === 0)).toBe(
    true,
  );
});
test.each(['duplicate', 'scope', 'source', 'old-version'])(
  'rechaza vínculos incoherentes sin alterar datos: %s',
  async (kind) => {
    const repo = new LibraryRepository(new MemoryStorage(), 'test');
    await repo.saveBranch(branch);
    const value = JSON.parse(await repo.exportData());
    if (kind === 'duplicate') value.branches.push({ ...branch, id: 'b' });
    if (kind === 'scope') value.branches[0].address = '';
    if (kind === 'source') value.branches[0].references[0].source = 'other';
    if (kind === 'old-version') {
      value.version = 2;
      value.backupVersion = 2;
    }
    expect(() => parseLibraryBackup(JSON.stringify(value))).toThrow('válida y compatible');
    expect(repo.getSnapshot().data.branches).toEqual([branch]);
  },
);
