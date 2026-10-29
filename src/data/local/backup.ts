import { normalizeBarcode } from '@/src/domain/barcode';
import { isPriceObservation, type PriceObservation } from '@/src/domain/price';
import { assessGluten, isProduct, record, type Product } from '@/src/domain/product';
import { isBasket } from '@/src/domain/basket';
import { isBranches } from '@/src/domain/branches';
import { isAlternativeGroups } from '@/src/domain/alternatives';
import type { LibraryData, ProductSummary } from './library';

export const BACKUP_FORMAT = 'sin-gluten-library';
export const MAX_BACKUP_BYTES = 20 * 1024 * 1024;
export const BACKUP_SIZE_MESSAGE = 'La copia supera el límite de 20 MB.';
const invalid = () => new Error('El archivo no es una copia válida y compatible de SinGluten.');

export interface LibraryBackup {
  exportedAt: string;
  data: LibraryData;
  products: Product[];
}

export function checkBackupSize(bytes: number): void {
  if (!Number.isSafeInteger(bytes) || bytes < 0 || bytes > MAX_BACKUP_BYTES)
    throw new Error(BACKUP_SIZE_MESSAGE);
}

function barcode(value: unknown): value is string {
  try {
    return typeof value === 'string' && normalizeBarcode(value) === value;
  } catch {
    return false;
  }
}
function date(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 19) === value.slice(0, 19)
  );
}
function id(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= 250;
}
function unique(values: string[]): boolean {
  return new Set(values).size === values.length;
}
function select<T extends object, K extends keyof T>(value: T, keys: K[]): Pick<T, K> {
  return Object.fromEntries(keys.map((key) => [key, value[key]])) as Pick<T, K>;
}
function restoredProduct(value: unknown): Product {
  if (!isProduct(value) || !barcode(value.barcode)) throw invalid();
  const { source } = value;
  if (
    source.provider !== 'open_food_facts' ||
    !date(source.fetchedAt) ||
    (source.updatedAt !== null && !date(source.updatedAt)) ||
    source.url !==
      `https://world.openfoodfacts.${source.environment === 'production' ? 'org' : 'net'}/product/${value.barcode}`
  )
    throw invalid();
  const product = select(value, [
    'barcode',
    'name',
    'brands',
    'stores',
    'imageUrl',
    'ingredientsText',
    'allergensText',
    'tracesText',
    'labels',
    'allergens',
    'traces',
    'missingFields',
    'dataIssues',
    'schemaVersion',
  ]);
  return {
    ...product,
    source: select(source, ['provider', 'url', 'environment', 'fetchedAt', 'updatedAt']),
    // A file's saved conclusion is not evidence, even if it claims our current rules version.
    assessment: assessGluten(
      value.labels,
      value.allergens,
      value.traces,
      value.dataIssues.length > 0,
    ),
  };
}
function productSummary(product: Product): ProductSummary {
  return {
    barcode: product.barcode,
    name: product.name ?? 'Producto sin nombre',
    brands: product.brands.join(', '),
    state: product.assessment.state,
    fetchedAt: product.source.fetchedAt,
  };
}

/** Migrate original/v1 backups; require an explicitly marked v2 backup for baskets. */
export function parseLibraryBackup(contents: string): LibraryBackup {
  // Check before parsing; the adapters also bound the actual bytes read from a file.
  checkBackupSize(contents.length);
  checkBackupSize(new TextEncoder().encode(contents).byteLength);
  let value: unknown;
  try {
    value = JSON.parse(contents.replace(/^\uFEFF/, ''), (key, item: unknown) => {
      if (['__proto__', 'prototype', 'constructor'].includes(key)) throw invalid();
      return item;
    });
  } catch {
    throw invalid();
  }
  if (
    !record(value) ||
    (value.version !== 1 && value.version !== 2 && value.version !== 3 && value.version !== 4) ||
    (value.version !== 3 && value.version !== 4 && value.branches !== undefined) ||
    (value.version !== 4 && value.groups !== undefined) ||
    !date(value.exportedAt) ||
    (value.version === 1
      ? value.basket !== undefined ||
        ((value.format !== undefined || value.backupVersion !== undefined) &&
          (value.format !== BACKUP_FORMAT || value.backupVersion !== 1))
      : value.format !== BACKUP_FORMAT ||
        value.backupVersion !== value.version ||
        !isBasket(value.basket) ||
        ((value.version === 3 || value.version === 4) && !isBranches(value.branches)) ||
        (value.version === 4 && !isAlternativeGroups(value.groups))) ||
    !Array.isArray(value.products) ||
    value.products.length > 3000 ||
    !Array.isArray(value.history) ||
    value.history.length > 1000 ||
    !Array.isArray(value.prices) ||
    value.prices.length > 1000 ||
    !record(value.favorites) ||
    Object.keys(value.favorites).length > 10000 ||
    !record(value.cache) ||
    Object.keys(value.cache).length > 3000
  )
    throw invalid();
  const products = value.products.map(restoredProduct);
  const byCode = new Map(products.map((product) => [product.barcode, product]));
  if (byCode.size !== products.length || Object.keys(value.cache).length !== products.length)
    throw invalid();
  const cache: LibraryData['cache'] = {};
  for (const [code, timestamp] of Object.entries(value.cache)) {
    const product = byCode.get(code);
    if (!product || timestamp !== product.source.fetchedAt) throw invalid();
    cache[code] = timestamp;
  }
  const history = value.history.map((item) => {
    if (!record(item) || !barcode(item.barcode) || !id(item.id) || !date(item.scannedAt))
      throw invalid();
    const product = byCode.get(item.barcode);
    if (!product) throw invalid();
    return { ...productSummary(product), id: item.id, scannedAt: item.scannedAt };
  });
  if (!unique(history.map((item) => item.id))) throw invalid();
  const favorites: LibraryData['favorites'] = {};
  for (const [code, item] of Object.entries(value.favorites)) {
    if (
      !barcode(code) ||
      !record(item) ||
      item.barcode !== code ||
      typeof item.deleted !== 'boolean' ||
      typeof item.updatedAt !== 'number' ||
      !Number.isSafeInteger(item.updatedAt) ||
      item.updatedAt < 0
    )
      throw invalid();
    const product = byCode.get(code);
    // Deleted favorites can legitimately outlive their cached product. They are not restored.
    if (item.deleted) continue;
    if (!product) throw invalid();
    favorites[code] = { ...productSummary(product), updatedAt: item.updatedAt, deleted: false };
  }
  if (Object.keys(favorites).length > 250) throw invalid();
  const prices: PriceObservation[] = value.prices.map((item) => {
    if (
      !isPriceObservation(item) ||
      !barcode(item.barcode) ||
      !date(item.observedAt) ||
      !date(item.createdAt) ||
      (item.offerEndsAt !== null && !date(item.offerEndsAt))
    )
      throw invalid();
    return select(item, [
      'id',
      'barcode',
      'store',
      'location',
      'amountMinor',
      'currency',
      'observedAt',
      'createdAt',
      'quantity',
      'unit',
      'offerEndsAt',
      'notes',
    ]);
  });
  if (!unique(prices.map((item) => item.id))) throw invalid();
  const basket =
    value.version !== 1 && isBasket(value.basket)
      ? value.basket.map((line) => ({
          barcode: line.barcode,
          name: byCode.get(line.barcode)?.name ?? line.name,
          quantity: line.quantity,
          addedAt: line.addedAt,
        }))
      : [];
  return {
    exportedAt: value.exportedAt,
    products,
    data: {
      version: 4,
      groups:
        value.version === 4 && isAlternativeGroups(value.groups)
          ? value.groups.map((g) => ({
              id: g.id,
              name: g.name,
              glutenFreeOnly: g.glutenFreeOnly,
              required: { quantity: g.required.quantity, unit: g.required.unit },
              members: g.members.map((m) => ({
                barcode: m.barcode,
                pack: { quantity: m.pack.quantity, unit: m.pack.unit },
              })),
            }))
          : [],
      revision: 0,
      basket,
      branches:
        (value.version === 3 || value.version === 4) && isBranches(value.branches)
          ? value.branches.map((branch) => ({
              id: branch.id,
              name: branch.name,
              address: branch.address,
              references: branch.references.map((ref) => ({ key: ref.key, source: ref.source })),
            }))
          : [],
      history,
      favorites,
      cache,
      prices,
      cloudOwner: null,
    },
  };
}
