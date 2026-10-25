import { BARCODE, OTHER_BARCODE, product } from '@/tests/fixtures';
import type { PriceObservation } from '@/src/domain/price';
import { BACKUP_FORMAT, MAX_BACKUP_BYTES, parseLibraryBackup } from '../backup';
import { LibraryRepository, summary, type LibraryData } from '../library';
import type { KeyValueStorage } from '../storage.types';

const price: PriceObservation = {
  id: 'historical-price',
  barcode: OTHER_BARCODE,
  store: 'Tienda',
  location: 'Madrid',
  amountMinor: 249,
  currency: 'EUR',
  observedAt: '2020-01-01T00:00:00.000Z',
  createdAt: '2020-01-01T00:00:00.000Z',
  quantity: 0.5,
  unit: 'kg',
  offerEndsAt: '2020-01-02T00:00:00.000Z',
  notes: 'Observación antigua',
};
function fixture(): LibraryData & {
  format: string;
  backupVersion: number;
  exportedAt: string;
  products: ReturnType<typeof product>[];
} {
  return {
    format: BACKUP_FORMAT,
    backupVersion: 1,
    version: 1 as const,
    exportedAt: '2026-10-25T00:00:00.000Z',
    cloudOwner: 'not-imported',
    products: [product()],
    cache: { [BARCODE]: product().source.fetchedAt },
    history: [{ ...summary(product()), id: 'scan', scannedAt: '2026-10-23T00:01:00.000Z' }],
    favorites: { [BARCODE]: { ...summary(product()), updatedAt: 100, deleted: false } },
    prices: [price],
  };
}
class Storage implements KeyValueStorage {
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

test('acepta la copia marcada y la exportación original v1, con BOM, sin heredar una cuenta', () => {
  const original: Partial<ReturnType<typeof fixture>> = fixture();
  delete original.format;
  delete original.backupVersion;
  for (const value of [fixture(), original]) {
    const backup = parseLibraryBackup('\uFEFF' + JSON.stringify(value));
    expect(backup.data.cloudOwner).toBeNull();
    expect(backup.data.history).toHaveLength(1);
    expect(backup.data.prices).toEqual([price]);
    expect(backup.products[0].source.fetchedAt).toBe(product().source.fetchedAt);
  }
});

test('recalcula conclusiones y resúmenes aunque una copia falsifique la versión actual de reglas', () => {
  const value = fixture();
  value.products[0].labels = [];
  value.products[0].allergens = ['en:gluten'];
  const backup = parseLibraryBackup(JSON.stringify(value));
  expect(backup.products[0].assessment.state).toBe('declared_gluten');
  expect(backup.data.favorites[BARCODE].state).toBe('declared_gluten');
  expect(backup.data.history[0].state).toBe('declared_gluten');
});

test.each([
  ['JSON truncado', '{'],
  ['versión futura', JSON.stringify({ ...fixture(), version: 2 })],
  ['formato ajeno', JSON.stringify({ ...fixture(), format: 'other-app' })],
  ['versión de copia futura', JSON.stringify({ ...fixture(), backupVersion: 2 })],
  ['estructura parcial', JSON.stringify({ version: 1 })],
  [
    'clave de prototipo',
    JSON.stringify(fixture()).replace('"prices":', '"__proto__":{"polluted":true},"prices":'),
  ],
  [
    'clave constructor',
    JSON.stringify(fixture()).replace('"prices":', '"constructor":{},"prices":'),
  ],
])('rechaza %s antes de restaurar', (_name, text) => {
  expect(() => parseLibraryBackup(text)).toThrow('válida y compatible');
  expect(Object.hasOwn(Object.prototype, 'polluted')).toBe(false);
});

test('limita bytes UTF-8 antes de interpretar el JSON, también con texto multibyte', () => {
  expect(() => parseLibraryBackup(' '.repeat(MAX_BACKUP_BYTES + 1))).toThrow('20 MB');
  expect(() => parseLibraryBackup('é'.repeat(MAX_BACKUP_BYTES / 2 + 1))).toThrow('20 MB');
});

test.each([
  [
    'GTIN inválido',
    (value: ReturnType<typeof fixture>) => {
      value.products[0].barcode = '3274080005004';
    },
  ],
  [
    'URL de otro producto',
    (value: ReturnType<typeof fixture>) => {
      value.products[0].source.url = `https://world.openfoodfacts.org/product/${OTHER_BARCODE}`;
    },
  ],
  [
    'entorno incoherente',
    (value: ReturnType<typeof fixture>) => {
      value.products[0].source.environment = 'staging';
    },
  ],
  [
    'caché incompleta',
    (value: ReturnType<typeof fixture>) => {
      value.products = [];
    },
  ],
  [
    'producto duplicado',
    (value: ReturnType<typeof fixture>) => {
      value.products.push(product());
    },
  ],
  [
    'historial huérfano',
    (value: ReturnType<typeof fixture>) => {
      value.history[0].barcode = OTHER_BARCODE;
    },
  ],
  [
    'fecha imposible',
    (value: ReturnType<typeof fixture>) => {
      value.history[0].scannedAt = '2026-02-30T00:00:00.000Z';
    },
  ],
  [
    'consulta duplicada',
    (value: ReturnType<typeof fixture>) => {
      value.history.push(value.history[0]);
    },
  ],
  [
    'precio duplicado',
    (value: ReturnType<typeof fixture>) => {
      value.prices.push(price);
    },
  ],
  [
    'importe inválido',
    (value: ReturnType<typeof fixture>) => {
      value.prices[0] = { ...price, amountMinor: -1 };
    },
  ],
  [
    'demasiadas consultas',
    (value: ReturnType<typeof fixture>) => {
      value.history = Array(1001).fill(value.history[0]);
    },
  ],
])('rechaza %s y deja intacta la biblioteca', async (_name, change) => {
  const storage = new Storage();
  const repo = new LibraryRepository(storage, 'test');
  await repo.saveProduct(product(OTHER_BARCODE));
  const before = [...storage.values];
  const expected = repo.getSnapshot().data;
  const value = fixture();
  change(value);
  await expect(async () => repo.restoreBackup(JSON.stringify(value), expected)).rejects.toThrow();
  expect([...storage.values]).toEqual(before);
  expect(repo.getSnapshot().data).toBe(expected);
});

test('omite favoritos borrados sin resucitarlos ni exigir una ficha ya purgada', () => {
  const value = fixture();
  value.favorites[OTHER_BARCODE] = {
    ...summary(product(OTHER_BARCODE)),
    updatedAt: 101,
    deleted: true,
  };
  const backup = parseLibraryBackup(JSON.stringify(value));
  expect(Object.keys(backup.data.favorites)).toEqual([BARCODE]);
});

test('restaura en una sola transacción, elimina fichas anteriores y es repetible sin duplicar', async () => {
  const storage = new Storage();
  const repo = new LibraryRepository(storage, 'test');
  await repo.saveProduct(product(OTHER_BARCODE));
  await repo.restoreBackup(JSON.stringify(fixture()), repo.getSnapshot().data);
  expect(await repo.getProduct(OTHER_BARCODE)).toBeNull();
  expect(await repo.getProduct(BARCODE)).toMatchObject(product());
  expect((await repo.getProduct(BARCODE))?.source.restoredAt).toEqual(expect.any(String));
  await repo.restoreBackup(JSON.stringify(fixture()), repo.getSnapshot().data);
  const reloaded = new LibraryRepository(storage, 'test');
  await reloaded.load();
  expect(reloaded.getSnapshot().data.history).toHaveLength(1);
  expect(reloaded.getSnapshot().data.prices).toEqual([price]);
  expect(reloaded.getSnapshot().data.cloudOwner).toBeNull();
  expect(parseLibraryBackup(await reloaded.exportData()).data).toEqual(reloaded.getSnapshot().data);
});

test('si falla la transacción se conserva el estado anterior y permite reintentar', async () => {
  const storage = new Storage();
  const repo = new LibraryRepository(storage, 'test');
  await repo.saveProduct(product(OTHER_BARCODE));
  const expected = repo.getSnapshot().data;
  const before = [...storage.values];
  storage.fail = true;
  await expect(repo.restoreBackup(JSON.stringify(fixture()), expected)).rejects.toMatchObject({
    code: 'storage_error',
  });
  expect(repo.getSnapshot().data).toBe(expected);
  expect([...storage.values]).toEqual(before);
  storage.fail = false;
  await repo.restoreBackup(JSON.stringify(fixture()), expected);
  expect(repo.getSnapshot().data.history[0].barcode).toBe(BARCODE);
});

test('una escritura pendiente invalida el resumen y evita perder cambios posteriores', async () => {
  const repo = new LibraryRepository(new Storage(), 'test');
  await repo.load();
  const expected = repo.getSnapshot().data;
  const saving = repo.saveProduct(product(OTHER_BARCODE));
  const restoring = repo.restoreBackup(JSON.stringify(fixture()), expected);
  await saving;
  await expect(restoring).rejects.toThrow('ha cambiado');
  expect(repo.getSnapshot().data.history[0].barcode).toBe(OTHER_BARCODE);
});

test('no sustituye una biblioteca vinculada ni exporta su identificador de cuenta', async () => {
  const repo = new LibraryRepository(new Storage(), 'test');
  await repo.importFavorites('private-account', [], []);
  await expect(
    repo.restoreBackup(JSON.stringify(fixture()), repo.getSnapshot().data),
  ).rejects.toThrow('vinculada');
  expect(await repo.exportData()).not.toContain('private-account');
});

test('la exportación y el borrado concurrentes producen una copia coherente y restaurable', async () => {
  const repo = new LibraryRepository(new Storage(), 'test');
  await repo.saveProduct(product());
  const copying = repo.exportData();
  const clearing = repo.clearAll();
  const backup = parseLibraryBackup(await copying);
  await clearing;
  expect(backup.data.history).toHaveLength(1);
  expect(backup.products).toHaveLength(1);
  expect(repo.getSnapshot().data.history).toHaveLength(0);
});

test('no genera una copia incompleta si falta una ficha en el almacenamiento', async () => {
  const storage = new Storage();
  const repo = new LibraryRepository(storage, 'test');
  await repo.saveProduct(product());
  storage.values.delete(`library:test:v1:product:${BARCODE}`);
  await expect(repo.exportData()).rejects.toThrow('copia incompleta');
});

test('la exportación omite marcas de favoritos borrados y comprueba su propio contrato', async () => {
  const storage = new Storage();
  const repo = new LibraryRepository(storage, 'test');
  await repo.toggleFavorite(product());
  await repo.toggleFavorite(product());
  expect(JSON.parse(await repo.exportData()).favorites).toEqual({});
  expect(parseLibraryBackup(await repo.exportData()).products).toHaveLength(1);
  const data: LibraryData = JSON.parse(storage.values.get('library:test:v1')!);
  // Existing storage versions accepted unchecked summary IDs. Do not export an unusable backup.
  data.history.push({ ...summary(product()), id: '', scannedAt: new Date().toISOString() });
  storage.values.set('library:test:v1', JSON.stringify(data));
  const damaged = new LibraryRepository(storage, 'test');
  await expect(damaged.exportData()).rejects.toThrow('válida y compatible');
});

test('rechaza más de 250 favoritos activos', () => {
  const value: Omit<ReturnType<typeof fixture>, 'favorites' | 'cache'> &
    Pick<LibraryData, 'favorites' | 'cache'> = {
    ...fixture(),
    favorites: {},
    cache: {},
    products: [],
  };
  for (let index = 0; index < 251; index++) {
    const prefix = String(100000000000 + index);
    const sum = [...prefix].reduce(
      (total, digit, position) => total + Number(digit) * (position % 2 ? 3 : 1),
      0,
    );
    const code = prefix + ((10 - (sum % 10)) % 10);
    const item = product(code);
    value.products.push(item);
    value.cache[code] = item.source.fetchedAt;
    value.favorites[code] = { ...summary(item), updatedAt: 100, deleted: false };
  }
  value.history = [];
  expect(() => parseLibraryBackup(JSON.stringify(value))).toThrow('válida y compatible');
});
