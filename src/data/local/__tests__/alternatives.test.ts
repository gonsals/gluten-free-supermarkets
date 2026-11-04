import { MemoryStorage } from '@/tests/memoryStorage';
import { BARCODE, OTHER_BARCODE, product } from '@/tests/fixtures';
import { LibraryRepository } from '../library';
import { parseLibraryBackup } from '../backup';
import { parseMeasure } from '@/src/domain/measure';
import type { AlternativeGroup } from '@/src/domain/alternatives';

const group: AlternativeGroup = {
  id: 'one',
  name: 'Arroz',
  required: parseMeasure('1', 'kg'),
  glutenFreeOnly: false,
  members: [
    { barcode: BARCODE, pack: parseMeasure('500', 'g') },
    { barcode: OTHER_BARCODE, pack: parseMeasure('750', 'g') },
  ],
};
test('migra v3 conservando cesta, sucursales y fichas; copia v4 conserva grupos editables', async () => {
  const store = new MemoryStorage(),
    repo = new LibraryRepository(store, 'test');
  await repo.addToBasket(BARCODE, product());
  const prior = { ...repo.getSnapshot().data, version: 3 } as Record<string, unknown>;
  delete prior.groups;
  store.values.set('library:test:v1', JSON.stringify(prior));
  const current = new LibraryRepository(store, 'test');
  await current.load();
  expect(current.getSnapshot().data).toMatchObject({
    version: 4,
    groups: [],
    basket: prior.basket,
    branches: prior.branches,
  });
  await current.saveAlternativeGroup(group, null);
  const copy = await current.exportData();
  expect(JSON.parse(copy)).toMatchObject({ version: 4, backupVersion: 4, groups: [group] });
  await current.clearAll();
  expect(current.getSnapshot().data.groups).toEqual([]);
  await current.restoreBackup(copy, current.getSnapshot().data);
  expect(current.getSnapshot().data.groups).toEqual([group]);
  expect(await current.getProduct(BARCODE)).not.toBeNull();
});
test('confirma sustitución atómica y rechaza cambios concurrentes, sin sumar una alternativa existente', async () => {
  const repo = new LibraryRepository(new MemoryStorage(), 'test');
  await repo.addToBasket(BARCODE);
  await repo.saveAlternativeGroup(group, null);
  const oldRevision = repo.getSnapshot().data.revision;
  await repo.setBasketQuantity(BARCODE, 3, 1);
  await expect(repo.substituteBasket(group, OTHER_BARCODE, oldRevision)).rejects.toThrow();
  expect(repo.getSnapshot().data.basket[0].quantity).toBe(3);
  await repo.substituteBasket(group, OTHER_BARCODE, repo.getSnapshot().data.revision);
  expect(repo.getSnapshot().data.basket).toMatchObject([{ barcode: OTHER_BARCODE, quantity: 2 }]);
  await repo.addToBasket(BARCODE);
  await expect(
    repo.substituteBasket(group, OTHER_BARCODE, repo.getSnapshot().data.revision),
  ).rejects.toThrow('ya está');
  expect(repo.getSnapshot().data.basket).toHaveLength(2);
});
test('guardado fallido y edición obsoleta no modifican el grupo; borrar grupo conserva cesta', async () => {
  const store = new MemoryStorage(),
    repo = new LibraryRepository(store, 'test');
  await repo.saveAlternativeGroup(group, null);
  const changed = { ...group, name: 'Otro nombre' };
  await repo.saveAlternativeGroup(changed, group);
  await expect(repo.saveAlternativeGroup(group, group)).rejects.toThrow();
  store.fail = true;
  await expect(repo.deleteAlternativeGroup(changed)).rejects.toThrow();
  expect(repo.getSnapshot().data.groups).toEqual([changed]);
  store.fail = false;
  await repo.addToBasket(BARCODE);
  await repo.deleteAlternativeGroup(changed);
  expect(repo.getSnapshot().data.groups).toEqual([]);
  expect(repo.getSnapshot().data.basket).toHaveLength(1);
});
test('no pierde la ficha de una alternativa al borrar historial y exige evidencia para el filtro positivo', async () => {
  const repo = new LibraryRepository(new MemoryStorage(), 'test');
  await repo.saveProduct(product(OTHER_BARCODE));
  await repo.saveAlternativeGroup({ ...group, glutenFreeOnly: true }, null);
  await repo.clearHistory();
  expect(await repo.getProduct(OTHER_BARCODE)).not.toBeNull();
  await repo.addToBasket(BARCODE);
  await expect(
    repo.substituteBasket(
      { ...group, glutenFreeOnly: true },
      BARCODE,
      repo.getSnapshot().data.revision,
    ),
  ).rejects.toThrow('no cumple');
});
test.each(['legacy', 'duplicate', 'dimension', 'quantity', 'marker'])(
  'rechaza copia de grupos inválida: %s',
  async (kind) => {
    const repo = new LibraryRepository(new MemoryStorage(), 'test');
    await repo.saveAlternativeGroup(group, null);
    const v = JSON.parse(await repo.exportData());
    if (kind === 'legacy') {
      v.version = 3;
      v.backupVersion = 3;
    }
    if (kind === 'duplicate') v.groups[0].members.push(v.groups[0].members[0]);
    if (kind === 'dimension') v.groups[0].required.unit = 'l';
    if (kind === 'quantity') v.groups[0].members[0].pack.quantity = 0;
    if (kind === 'marker') v.backupVersion = 3;
    expect(() => parseLibraryBackup(JSON.stringify(v))).toThrow('válida y compatible');
    expect(repo.getSnapshot().data.groups).toEqual([group]);
  },
);
