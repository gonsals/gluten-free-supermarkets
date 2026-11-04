import { BARCODE, OTHER_BARCODE, product } from '@/tests/fixtures';
import { MemoryStorage } from '@/tests/memoryStorage';
import { LibraryRepository } from '../library';
import { parseLibraryBackup } from '../backup';

const key = 'library:test:v1';

test('la migración v1 conserva todo y no publica una versión migrada si falla el disco', async () => {
  const storage = new MemoryStorage();
  const source = new LibraryRepository(storage, 'test');
  await source.saveProduct(product());
  await source.toggleFavorite(product());
  const old = { ...source.getSnapshot().data, version: 1 } as Record<string, unknown>;
  delete old.basket;
  delete old.revision;
  const raw = JSON.stringify(old);
  storage.values.set(key, raw);
  const repo = new LibraryRepository(storage, 'test');
  storage.fail = true;
  await repo.load();
  expect(repo.getSnapshot().ready).toBe(false);
  expect(storage.values.get(key)).toBe(raw);
  storage.fail = false;
  await repo.refresh();
  expect(repo.getSnapshot().data).toMatchObject({
    version: 4,
    basket: [],
    history: old.history,
    favorites: old.favorites,
    prices: old.prices,
  });
  expect(await repo.getProduct(BARCODE)).toEqual(product());
});

test('agrupa el mismo GTIN, edita envases, persiste y conserva fichas al limpiar historial', async () => {
  const storage = new MemoryStorage();
  const repo = new LibraryRepository(storage, 'test');
  await repo.saveProduct(product());
  await repo.addToBasket(BARCODE, product());
  await repo.addToBasket('0' + BARCODE);
  expect(repo.getSnapshot().data.basket).toHaveLength(1);
  expect(repo.getSnapshot().data.basket[0].quantity).toBe(2);
  await repo.setBasketQuantity(BARCODE, 5, 2);
  await repo.clearHistory();
  expect(await repo.getProduct(BARCODE)).toEqual(product());
  const reloaded = new LibraryRepository(storage, 'test');
  await reloaded.load();
  expect(reloaded.getSnapshot().data.basket[0]).toMatchObject({
    barcode: BARCODE,
    quantity: 5,
    name: product().name,
  });
  await reloaded.removeFromBasket(BARCODE, 5);
  expect(reloaded.getSnapshot().data.basket).toEqual([]);
});

test.each([0, -1, 1.5, 100, NaN, Infinity])(
  'rechaza cantidad inválida %s sin modificar la cesta',
  async (quantity) => {
    const repo = new LibraryRepository(new MemoryStorage(), 'test');
    await repo.addToBasket(BARCODE);
    const before = repo.getSnapshot().data;
    await expect(repo.setBasketQuantity(BARCODE, quantity, 1)).rejects.toThrow('1 y 99');
    expect(repo.getSnapshot().data).toBe(before);
  },
);

test('límite de líneas y envases, sin ficha ni precio obligatorio', async () => {
  const repo = new LibraryRepository(new MemoryStorage(), 'test');
  for (let index = 0; index < 100; index++) {
    const prefix = String(100000000000 + index);
    const sum = [...prefix].reduce(
      (total, digit, pos) => total + Number(digit) * (pos % 2 ? 3 : 1),
      0,
    );
    await repo.addToBasket(prefix + ((10 - (sum % 10)) % 10));
  }
  await expect(repo.addToBasket(BARCODE)).rejects.toThrow('100 productos');
  const line = repo.getSnapshot().data.basket[0];
  await repo.setBasketQuantity(line.barcode, 99, 1);
  await expect(repo.addToBasket(line.barcode)).rejects.toThrow('99 envases');
  expect(parseLibraryBackup(await repo.exportData()).data.basket).toHaveLength(100);
});

test('copia v2, restauración y borrado incluyen cesta y campos desconocidos no se heredan', async () => {
  const repo = new LibraryRepository(new MemoryStorage(), 'test');
  await repo.addToBasket(BARCODE, product());
  await repo.addToBasket(OTHER_BARCODE);
  const value = JSON.parse(await repo.exportData());
  expect(value).toMatchObject({ version: 4, backupVersion: 4 });
  value.basket[0].injected = 'not saved';
  await repo.clearAll();
  await repo.restoreBackup(JSON.stringify(value), repo.getSnapshot().data);
  expect(repo.getSnapshot().data.basket).toHaveLength(2);
  expect(repo.getSnapshot().data.basket[0]).not.toHaveProperty('injected');
  await repo.clearBasket(repo.getSnapshot().data.basket);
  expect(repo.getSnapshot().data.basket).toEqual([]);
  expect(await repo.getProduct(BARCODE)).not.toBeNull();
  await repo.clearAll();
  expect(await repo.getProduct(BARCODE)).toBeNull();
});

test.each(['duplicate', 'checksum', 'date', 'quantity', 'too-many', 'old-schema'])(
  'rechaza cesta malformada: %s',
  async (problem) => {
    const repo = new LibraryRepository(new MemoryStorage(), 'test');
    await repo.addToBasket(BARCODE);
    const value = JSON.parse(await repo.exportData());
    if (problem === 'duplicate') value.basket.push({ ...value.basket[0], barcode: '0' + BARCODE });
    if (problem === 'checksum') value.basket[0].barcode = '3274080005004';
    if (problem === 'date') value.basket[0].addedAt = '2026-02-30T00:00:00Z';
    if (problem === 'quantity') value.basket[0].quantity = 1.5;
    if (problem === 'too-many') value.basket = Array(101).fill(value.basket[0]);
    if (problem === 'old-schema') {
      value.version = 1;
      value.backupVersion = 1;
    }
    expect(() => parseLibraryBackup(JSON.stringify(value))).toThrow('válida y compatible');
  },
);

test('dos instancias leen el último estado y una edición obsoleta no pisa otra cantidad', async () => {
  const storage = new MemoryStorage();
  const first = new LibraryRepository(storage, 'test');
  const second = new LibraryRepository(storage, 'test');
  await first.load();
  await second.load();
  await first.addToBasket(BARCODE);
  await second.addToBasket(OTHER_BARCODE);
  expect(second.getSnapshot().data.basket).toHaveLength(2);
  await first.setBasketQuantity(BARCODE, 5, 1);
  await expect(second.setBasketQuantity(BARCODE, 2, 1)).rejects.toThrow('ha cambiado');
  expect(second.getSnapshot().data.basket[0].quantity).toBe(5);
});

test('una carrera entre lectura y commit falla sin sobreescribir metadata ni fichas', async () => {
  const storage = new MemoryStorage();
  const repo = new LibraryRepository(storage, 'test');
  await repo.addToBasket(BARCODE);
  const competing = { ...repo.getSnapshot().data, revision: 50 };
  competing.basket = [{ ...competing.basket[0], quantity: 7 }];
  storage.beforeCommit = () => {
    storage.beforeCommit = undefined;
    storage.values.set(key, JSON.stringify(competing));
  };
  await expect(repo.addToBasket(OTHER_BARCODE, product(OTHER_BARCODE))).rejects.toThrow(
    'ha cambiado',
  );
  expect(repo.getSnapshot().data.basket[0].quantity).toBe(7);
  expect(await repo.getProduct(OTHER_BARCODE)).toBeNull();
});

test('restaurar o vaciar con un resumen obsoleto no borra cambios de otra instancia', async () => {
  const storage = new MemoryStorage();
  const first = new LibraryRepository(storage, 'test');
  const second = new LibraryRepository(storage, 'test');
  await first.addToBasket(BARCODE);
  const expected = first.getSnapshot().data;
  const contents = await first.exportData();
  await second.addToBasket(OTHER_BARCODE);
  await expect(first.clearBasket(expected.basket)).rejects.toThrow('ha cambiado');
  await expect(first.restoreBackup(contents, expected)).rejects.toThrow('ha cambiado');
  await expect(first.clearAll(expected)).rejects.toThrow('ha cambiado');
  expect(first.getSnapshot().data.basket).toHaveLength(2);
});

test('fallo al guardar cantidad conserva snapshot y disco, y deja reintentar', async () => {
  const storage = new MemoryStorage();
  const repo = new LibraryRepository(storage, 'test');
  await repo.addToBasket(BARCODE);
  storage.fail = true;
  await expect(repo.setBasketQuantity(BARCODE, 9, 1)).rejects.toMatchObject({
    code: 'storage_error',
  });
  expect(repo.getSnapshot().data.basket[0].quantity).toBe(1);
  storage.fail = false;
  await repo.setBasketQuantity(BARCODE, 9, 1);
  expect(repo.getSnapshot().data.basket[0].quantity).toBe(9);
});
