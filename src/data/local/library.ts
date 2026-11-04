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
import { StorageConflict, StorageUpgradeBlocked } from './storage.types';
import { normalizeBarcode, sameGtin } from '@/src/domain/barcode';
import {
  isBasket,
  validBasketQuantity,
  MAX_BASKET_LINES,
  type BasketLine,
} from '@/src/domain/basket';
import { BACKUP_FORMAT, parseLibraryBackup } from './backup';
import {
  hasPositiveGlutenEvidence,
  isAlternativeGroups,
  MAX_GROUPS,
  type AlternativeGroup,
} from '@/src/domain/alternatives';
import { requiredPackages } from '@/src/domain/measure';
import {
  isBranches,
  isBranchReference,
  MAX_BRANCHES,
  type StoreBranch,
  type BranchReference,
} from '@/src/domain/branches';

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
  version: 4;
  groups: AlternativeGroup[];
  revision: number;
  basket: BasketLine[];
  branches: StoreBranch[];
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
  version: 4,
  groups: [],
  revision: 0,
  basket: [],
  branches: [],
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
function validData(value: unknown): value is
  | LibraryData
  | (Omit<LibraryData, 'version' | 'groups'> & { version: 3 })
  | (Omit<LibraryData, 'version' | 'branches' | 'groups'> & { version: 2 })
  | (Omit<LibraryData, 'version' | 'revision' | 'basket' | 'branches' | 'groups'> & {
      version: 1;
    }) {
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
    (value.version === 1 ||
      ((value.version === 2 ||
        ((value.version === 3 || (value.version === 4 && isAlternativeGroups(value.groups))) &&
          isBranches(value.branches))) &&
        Number.isSafeInteger(value.revision) &&
        Number(value.revision) >= 0 &&
        isBasket(value.basket))) &&
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
  private raw: string | null | undefined;
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
    this.loadPromise ??= this.refresh().finally(() => {
      this.loadPromise = undefined;
    });
    return this.loadPromise;
  }
  private async readLatest(): Promise<void> {
    let raw = await this.store.get(this.key);
    if (this.snapshot.ready && raw === this.raw) return;
    const value: unknown = raw ? JSON.parse(raw) : fresh();
    if (!validData(value)) throw new AppError('storage_error');
    let data: LibraryData;
    if (value.version !== 4) {
      data = {
        ...value,
        version: 4,
        groups: [],
        revision: value.version === 1 ? 0 : value.revision,
        basket: value.version === 1 ? [] : value.basket,
        branches: value.version === 3 ? value.branches : [],
      };
      const migrated = JSON.stringify(data);
      await this.store.commit({ [this.key]: migrated }, [], { [this.key]: raw });
      raw = migrated;
    } else data = value;
    this.raw = raw;
    this.publish({ ready: true, data, error: null });
  }
  refresh(): Promise<void> {
    const next = this.queue
      .catch(() => undefined)
      .then(async () => {
        try {
          await this.readLatest();
        } catch (error) {
          this.publish({
            ...this.snapshot,
            ready: false,
            error:
              error instanceof StorageUpgradeBlocked
                ? error.message
                : 'No se ha podido actualizar tu biblioteca. Tus datos no se han sobrescrito.',
          });
        }
      });
    this.queue = next;
    return next;
  }
  private async mutate(
    update: (data: LibraryData) => void,
    products: Product[] = [],
    removals: string[] = [],
  ): Promise<void> {
    const next = this.queue
      .catch(() => undefined)
      .then(async () => {
        try {
          await this.readLatest();
        } catch (error) {
          if (error instanceof StorageConflict) throw error;
          throw new AppError('storage_error');
        }
        if (!this.snapshot.ready) throw new AppError('storage_error');
        const data: LibraryData = JSON.parse(JSON.stringify(this.snapshot.data));
        update(data);
        data.revision = this.snapshot.data.revision + 1;
        if (!Number.isSafeInteger(data.revision)) throw new AppError('storage_error');
        const values: Record<string, string> = { [this.key]: JSON.stringify(data) };
        products.forEach((product) => {
          values[this.productKey(product.barcode)] = JSON.stringify(product);
        });
        try {
          await this.store.commit(
            values,
            removals.map((code) => this.productKey(code)),
            { [this.key]: this.raw ?? null },
          );
        } catch (error) {
          if (error instanceof StorageConflict) {
            await this.readLatest();
            throw error;
          }
          throw new AppError('storage_error');
        }
        this.raw = values[this.key];
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
        data.basket.forEach((line) => {
          if (sameGtin(line.barcode, product.barcode)) line.name = product.name;
        });
        const retained = new Set([
          ...data.history.map((x) => x.barcode),
          ...data.basket.map((x) => x.barcode),
          ...Object.keys(data.cache).filter((code) =>
            data.groups.some((g) => g.members.some((m) => sameGtin(m.barcode, code))),
          ),
          ...data.prices.map((x) => x.barcode),
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
          if (
            (!data.favorites[code] || data.favorites[code].deleted) &&
            !data.basket.some((line) => line.barcode === code) &&
            !data.groups.some((g) => g.members.some((m) => sameGtin(m.barcode, code))) &&
            !data.prices.some((price) => price.barcode === code)
          ) {
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
  async addToBasket(input: string, product?: Product | null): Promise<void> {
    const code = normalizeBarcode(input);
    if (product && product.barcode !== code) throw new Error('La ficha no corresponde al código.');
    const products: Product[] = [];
    return this.mutate((data) => {
      const existing = data.basket.find((line) => sameGtin(line.barcode, code));
      if (existing) {
        if (!validBasketQuantity(existing.quantity + 1))
          throw new Error('Puedes añadir hasta 99 envases por producto.');
        existing.quantity++;
      } else {
        if (data.basket.length >= MAX_BASKET_LINES)
          throw new Error(
            'La cesta admite hasta 100 productos distintos. Quita alguno para añadir otro.',
          );
        data.basket.push({
          barcode: code,
          quantity: 1,
          name: product?.name ?? null,
          addedAt: new Date().toISOString(),
        });
      }
      if (product && (!data.cache[code] || data.cache[code] <= product.source.fetchedAt)) {
        data.cache[code] = product.source.fetchedAt;
        products.push(product);
      }
    }, products);
  }
  setBasketQuantity(code: string, quantity: number, expectedQuantity: number): Promise<void> {
    if (!validBasketQuantity(quantity))
      return Promise.reject(new Error('Introduce entre 1 y 99 envases enteros.'));
    return this.mutate((data) => {
      const line = data.basket.find((item) => item.barcode === code);
      if (!line || line.quantity !== expectedQuantity) throw new StorageConflict();
      line.quantity = quantity;
    });
  }
  removeFromBasket(code: string, expectedQuantity: number): Promise<void> {
    return this.mutate((data) => {
      const line = data.basket.find((item) => item.barcode === code);
      if (!line || line.quantity !== expectedQuantity) throw new StorageConflict();
      data.basket = data.basket.filter((item) => item !== line);
    });
  }
  clearBasket(expected: BasketLine[]): Promise<void> {
    return this.mutate((data) => {
      if (JSON.stringify(data.basket) !== JSON.stringify(expected)) throw new StorageConflict();
      data.basket = [];
    });
  }
  saveBranch(branch: StoreBranch, expected: StoreBranch | null = null): Promise<void> {
    if (!isBranches([branch]))
      return Promise.reject(new Error('Revisa nombre, dirección y referencias de la sucursal.'));
    return this.mutate((data) => {
      const current = data.branches.find((item) => item.id === branch.id) ?? null;
      if (JSON.stringify(current) !== JSON.stringify(expected)) throw new StorageConflict();
      if (!current && data.branches.length >= MAX_BRANCHES)
        throw new Error('Puedes guardar hasta 50 sucursales.');
      const next = [...data.branches.filter((item) => item.id !== branch.id), branch];
      if (!isBranches(next))
        throw new Error(
          'Una referencia ya pertenece a otra sucursal. Desvincúlala antes de crear una nueva.',
        );
      data.branches = next;
    });
  }
  saveAlternativeGroup(group: AlternativeGroup, expected: AlternativeGroup | null): Promise<void> {
    if (!isAlternativeGroups([group]))
      return Promise.reject(new Error('Revisa cantidades, unidades y códigos del grupo.'));
    return this.mutate((data) => {
      const current = data.groups.find((g) => g.id === group.id) ?? null;
      if (JSON.stringify(current) !== JSON.stringify(expected)) throw new StorageConflict();
      if (!current && data.groups.length >= MAX_GROUPS)
        throw new Error('Puedes guardar hasta 20 grupos.');
      data.groups = [...data.groups.filter((g) => g.id !== group.id), group];
    });
  }
  deleteAlternativeGroup(expected: AlternativeGroup): Promise<void> {
    return this.mutate((data) => {
      if (
        JSON.stringify(data.groups.find((g) => g.id === expected.id)) !== JSON.stringify(expected)
      )
        throw new StorageConflict();
      data.groups = data.groups.filter((g) => g.id !== expected.id);
    });
  }
  async substituteBasket(
    group: AlternativeGroup,
    barcode: string,
    expectedRevision: number,
  ): Promise<void> {
    const code = Object.keys(this.snapshot.data.cache).find((c) => sameGtin(c, barcode)) ?? barcode;
    const product = await this.getProduct(code);
    if (group.glutenFreeOnly) {
      if (!hasPositiveGlutenEvidence(product))
        throw new Error('La ficha no cumple el filtro de declaración sin gluten. Revisa el grupo.');
    }
    return this.mutate((data) => {
      if (
        data.revision !== expectedRevision ||
        JSON.stringify(data.groups.find((g) => g.id === group.id)) !== JSON.stringify(group)
      )
        throw new StorageConflict();
      const member = group.members.find((m) => m.barcode === barcode);
      const base = data.basket.find((line) => sameGtin(line.barcode, group.members[0].barcode));
      const requirement = member && requiredPackages(group.required, member.pack);
      if (!base || !member || !requirement || !validBasketQuantity(requirement.packages))
        throw new Error(
          'La línea original ya no está en la cesta o la cantidad supera 99 envases.',
        );
      const other = data.basket.find((line) => line !== base && sameGtin(line.barcode, barcode));
      if (other)
        throw new Error(
          'La alternativa ya está en tu cesta. Revisa sus cantidades antes de sustituir.',
        );
      base.barcode = member.barcode;
      base.name = product?.name ?? null;
      base.quantity = requirement.packages;
    });
  }
  assignReference(
    reference: BranchReference,
    branchId: string | null,
    expectedBranchId: string | null,
  ): Promise<void> {
    if (!isBranchReference(reference))
      return Promise.reject(new Error('Referencia de tienda no válida.'));
    return this.mutate((data) => {
      const current =
        data.branches.find((branch) => branch.references.some((ref) => ref.key === reference.key))
          ?.id ?? null;
      if (current !== expectedBranchId) throw new StorageConflict();
      if (branchId && !data.branches.some((branch) => branch.id === branchId))
        throw new StorageConflict();
      data.branches.forEach((branch) => {
        branch.references = branch.references.filter((ref) => ref.key !== reference.key);
      });
      if (branchId)
        data.branches.find((branch) => branch.id === branchId)!.references.push(reference);
      if (!isBranches(data.branches)) throw new Error('Cada sucursal admite hasta 20 referencias.');
    });
  }
  deleteBranch(expected: StoreBranch): Promise<void> {
    return this.mutate((data) => {
      if (
        JSON.stringify(data.branches.find((branch) => branch.id === expected.id)) !==
        JSON.stringify(expected)
      )
        throw new StorageConflict();
      data.branches = data.branches.filter((branch) => branch.id !== expected.id);
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
        await this.readLatest();
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
            backupVersion: 4,
            exportedAt: new Date().toISOString(),
            ...data,
            revision: undefined,
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
        // Metadata and product reads must still belong to the same revision.
        await this.store.commit({}, [], { [this.key]: this.raw ?? null });
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
  async clearAll(expectedData?: LibraryData): Promise<void> {
    const codes: string[] = [];
    return this.mutate(
      (data) => {
        if (expectedData && this.snapshot.data !== expectedData) throw new StorageConflict();
        codes.push(...Object.keys(data.cache));
        Object.assign(data, fresh());
      },
      [],
      codes,
    );
  }
}
