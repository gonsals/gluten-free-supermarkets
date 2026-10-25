import { AppError } from '@/src/domain/errors';
import {
  isProduct,
  refreshAssessment,
  type GlutenState,
  type Product,
  record,
  glutenCopy,
} from '@/src/domain/product';
import { isPriceObservation, validatePrice, type PriceObservation } from '@/src/domain/price';
import type { KeyValueStorage } from './storage.types';
import { BACKUP_FORMAT, parseLibraryBackup } from './backup';

export interface ProductSummary {
  barcode: string;
  name: string;
  brands: string;
  state: GlutenState;
  fetchedAt: string;
}
export interface HistoryEntry extends ProductSummary {
  id: string;
  scannedAt: string;
}
export interface Favorite extends ProductSummary {
  updatedAt: number;
  deleted: boolean;
}
export interface LibraryData {
  version: 1;
  history: HistoryEntry[];
  favorites: Record<string, Favorite>;
  cache: Record<string, string>;
  prices: PriceObservation[];
  cloudOwner: string | null;
}
export interface LibrarySnapshot {
  ready: boolean;
  data: LibraryData;
  error: string | null;
}
const fresh = (): LibraryData => ({
  version: 1,
  history: [],
  favorites: {},
  cache: {},
  prices: [],
  cloudOwner: null,
});
export function summary(p: Product): ProductSummary {
  return {
    barcode: p.barcode,
    name: p.name ?? 'Producto sin nombre',
    brands: p.brands.join(', '),
    state: p.assessment.state,
    fetchedAt: p.source.fetchedAt,
  };
}
export function operationId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}-${Math.random().toString(36).slice(2, 10)}`;
}
function validData(value: unknown): value is LibraryData {
  const validSummary = (item: unknown) =>
    record(item) &&
    typeof item.barcode === 'string' &&
    /^\d{8}$|^\d{12,14}$/.test(item.barcode) &&
    typeof item.name === 'string' &&
    typeof item.brands === 'string' &&
    typeof item.state === 'string' &&
    Object.hasOwn(glutenCopy, item.state) &&
    typeof item.fetchedAt === 'string';
  return (
    record(value) &&
    value.version === 1 &&
    Array.isArray(value.history) &&
    value.history.length <= 1000 &&
    value.history.every(
      (x) =>
        validSummary(x) && record(x) && typeof x.id === 'string' && typeof x.scannedAt === 'string',
    ) &&
    record(value.favorites) &&
    Object.values(value.favorites).every(
      (x) =>
        validSummary(x) &&
        record(x) &&
        typeof x.updatedAt === 'number' &&
        typeof x.deleted === 'boolean',
    ) &&
    record(value.cache) &&
    Object.values(value.cache).every((x) => typeof x === 'string') &&
    Array.isArray(value.prices) &&
    value.prices.length <= 1000 &&
    value.prices.every(isPriceObservation) &&
    (value.cloudOwner === null || typeof value.cloudOwner === 'string')
  );
}
export class LibraryRepository {
  private snapshot: LibrarySnapshot = { ready: false, data: fresh(), error: null };
  private listeners = new Set<() => void>();
  private queue: Promise<unknown> = Promise.resolve();
  private loadPromise: Promise<void> | undefined;
  private readonly key: string;
  constructor(
    private store: KeyValueStorage,
    namespace: string,
  ) {
    this.key = `library:${namespace}:v1`;
  }
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  getSnapshot = () => this.snapshot;
  private publish(snapshot: LibrarySnapshot) {
    this.snapshot = snapshot;
    this.listeners.forEach((listener) => listener());
  }
  async load(): Promise<void> {
    if (this.snapshot.ready) return;
    this.loadPromise ??= (async () => {
      try {
        const raw = await this.store.get(this.key);
        const data: unknown = raw ? JSON.parse(raw) : fresh();
        if (!validData(data)) throw new Error('Unsupported local schema');
        this.publish({ ready: true, data, error: null });
      } catch {
        this.publish({
          ...this.snapshot,
          error: 'No se ha podido abrir tu biblioteca. Tus datos no se han sobrescrito.',
        });
        this.loadPromise = undefined;
      }
    })();
    return this.loadPromise;
  }
  private async mutate(
    update: (data: LibraryData) => void,
    products: Product[] = [],
    removals: string[] = [],
  ): Promise<void> {
    const next = this.queue
      .catch(() => undefined)
      .then(async () => {
        await this.load();
        if (!this.snapshot.ready) throw new AppError('storage_error');
        const data: LibraryData = JSON.parse(JSON.stringify(this.snapshot.data));
        update(data);
        const values: Record<string, string> = { [this.key]: JSON.stringify(data) };
        products.forEach((product) => {
          values[this.productKey(product.barcode)] = JSON.stringify(product);
        });
        try {
          await this.store.commit(
            values,
            removals.map((code) => this.productKey(code)),
          );
        } catch {
          throw new AppError('storage_error');
        }
        this.publish({ ready: true, data, error: null });
      });
    this.queue = next;
    return next;
  }
  private productKey(code: string) {
    return `${this.key}:product:${code}`;
  }
  async getProduct(code: string): Promise<Product | null> {
    try {
      const raw = await this.store.get(this.productKey(code));
      const data: unknown = raw ? JSON.parse(raw) : null;
      return isProduct(data) ? refreshAssessment(data) : null;
    } catch {
      throw new AppError('storage_error');
    }
  }
  async saveProduct(product: Product, addHistory = true): Promise<void> {
    const removals: string[] = [];
    return this.mutate(
      (data) => {
        data.cache[product.barcode] = product.source.fetchedAt;
        if (addHistory)
          data.history = [
            { ...summary(product), id: operationId(), scannedAt: new Date().toISOString() },
            ...data.history,
          ].slice(0, 1000);
        if (data.favorites[product.barcode])
          data.favorites[product.barcode] = {
            ...data.favorites[product.barcode],
            ...summary(product),
          };
        const retained = new Set([
          ...data.history.map((x) => x.barcode),
          ...Object.values(data.favorites)
            .filter((x) => !x.deleted)
            .map((x) => x.barcode),
        ]);
        const spare = Object.keys(data.cache)
          .filter((code) => !retained.has(code))
          .sort((a, b) => data.cache[b].localeCompare(data.cache[a]));
        for (const code of spare.slice(100)) {
          delete data.cache[code];
          removals.push(code);
        }
      },
      [product],
      removals,
    );
  }
  async toggleFavorite(product: Product): Promise<void> {
    return this.mutate(
      (data) => {
        const active = Object.values(data.favorites).filter((x) => !x.deleted).length;
        const previous = data.favorites[product.barcode];
        if ((!previous || previous.deleted) && active >= 250)
          throw new Error('Puedes guardar hasta 250 favoritos. Elimina alguno para añadir otro.');
        data.favorites[product.barcode] = {
          ...summary(product),
          updatedAt: Math.max(Date.now(), (previous?.updatedAt ?? 0) + 1),
          deleted: previous ? !previous.deleted : false,
        };
        data.cache[product.barcode] = product.source.fetchedAt;
      },
      [product],
    );
  }
  clearHistory(): Promise<void> {
    const removals: string[] = [];
    return this.mutate(
      (data) => {
        data.history = [];
        for (const code of Object.keys(data.cache))
          if (!data.favorites[code] || data.favorites[code].deleted) {
            delete data.cache[code];
            removals.push(code);
          }
      },
      [],
      removals,
    );
  }
  deleteHistoryEntry(id: string): Promise<void> {
    return this.mutate((data) => {
      data.history = data.history.filter((x) => x.id !== id);
    });
  }
  addPrice(price: PriceObservation): Promise<void> {
    validatePrice(price);
    return this.mutate((data) => {
      data.prices = [price, ...data.prices.filter((x) => x.id !== price.id)].slice(0, 1000);
    });
  }
  deletePrice(id: string): Promise<void> {
    return this.mutate((data) => {
      data.prices = data.prices.filter((x) => x.id !== id);
    });
  }
  async importFavorites(owner: string, favorites: Favorite[], products: Product[]): Promise<void> {
    const newerProducts: Product[] = [];
    return this.mutate((data) => {
      if (data.cloudOwner && data.cloudOwner !== owner)
        throw new Error(
          'Esta biblioteca está vinculada a otra cuenta. Borra o exporta los datos antes de cambiar de cuenta.',
        );
      data.cloudOwner = owner;
      favorites.forEach((item) => {
        const current = data.favorites[item.barcode];
        if (
          !current ||
          current.updatedAt < item.updatedAt ||
          (current.updatedAt === item.updatedAt && item.deleted)
        )
          data.favorites[item.barcode] = item;
      });
      if (Object.values(data.favorites).filter((item) => !item.deleted).length > 250)
        throw new Error('La selección supera el límite de 250 favoritos activos.');
      products.forEach((product) => {
        if (
          !data.cache[product.barcode] ||
          data.cache[product.barcode] < product.source.fetchedAt
        ) {
          data.cache[product.barcode] = product.source.fetchedAt;
          newerProducts.push(product);
        }
      });
    }, newerProducts);
  }
  exportData(): Promise<string> {
    // Reads share the write queue: products and metadata must belong to one snapshot.
    const next = this.queue
      .catch(() => undefined)
      .then(async () => {
        await this.load();
        if (!this.snapshot.ready) throw new AppError('storage_error');
        const data = this.snapshot.data;
        const products = await Promise.all(
          Object.keys(data.cache).map((code) => this.getProduct(code)),
        );
        if (products.some((product) => !product))
          throw new Error('Faltan fichas guardadas. No se ha creado una copia incompleta.');
        const contents = JSON.stringify(
          {
            format: BACKUP_FORMAT,
            backupVersion: 1,
            exportedAt: new Date().toISOString(),
            ...data,
            favorites: Object.fromEntries(
              Object.entries(data.favorites).filter(([, item]) => !item.deleted),
            ),
            cloudOwner: null,
            products,
          },
          null,
          2,
        );
        // Never offer a backup that this version cannot restore.
        parseLibraryBackup(contents);
        return contents;
      });
    this.queue = next;
    return next;
  }
  restoreBackup(contents: string, expectedData: LibraryData): Promise<void> {
    const backup = parseLibraryBackup(contents);
    const restoredAt = new Date().toISOString();
    const products = backup.products.map((product) => ({
      ...product,
      source: { ...product.source, restoredAt },
    }));
    const removals: string[] = [];
    return this.mutate(
      (data) => {
        if (this.snapshot.data !== expectedData)
          throw new Error(
            'La biblioteca ha cambiado. Selecciona de nuevo la copia para revisar la restauración.',
          );
        if (data.cloudOwner)
          throw new Error(
            'Esta biblioteca está vinculada a una cuenta. Exporta y borra primero los datos locales antes de restaurar una copia.',
          );
        removals.push(
          ...Object.keys(data.cache).filter((code) => !Object.hasOwn(backup.data.cache, code)),
        );
        Object.assign(data, backup.data);
      },
      products,
      removals,
    );
  }
  async clearAll(): Promise<void> {
    const codes: string[] = [];
    return this.mutate(
      (data) => {
        codes.push(...Object.keys(data.cache));
        Object.assign(data, fresh());
      },
      [],
      codes,
    );
  }
}
