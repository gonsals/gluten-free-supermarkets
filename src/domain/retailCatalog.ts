import { fold } from './comparison';

export type Retailer = 'mercadona' | 'aldi' | 'lidl';
export interface RetailPrice {
  id: string;
  retailer: Retailer;
  sku: string;
  group: string;
  name: string;
  quantity: string;
  amountMilli: number;
  scope: string;
  sourceUrl: string;
  checkedAt: string;
  startsAt: string | null;
  endsAt: string | null;
  isOffer: boolean;
  conditions: string;
  unitPrice: { amountMilli: number; unit: string } | null;
}
export interface RetailCatalog {
  version: 1;
  generatedAt: string;
  sources: { retailer: Retailer; status: 'ok' | 'failed'; attemptedAt: string }[];
  entries: RetailPrice[];
}
export const retailerNames: Record<Retailer, string> = {
  mercadona: 'Mercadona',
  aldi: 'Aldi',
  lidl: 'Lidl',
};
const hosts: Record<Retailer, string> = {
  mercadona: 'tienda.mercadona.es',
  aldi: 'www.aldi.es',
  lidl: 'www.lidl.es',
};
export const RETAIL_MAX_AGE = 3 * 24 * 60 * 60 * 1000;
export const retailStore = (value: string): string => fold(value).replace(/\blidel\b/g, 'lidl');
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('invalid_catalog');
  return value as Record<string, unknown>;
}
function string(value: unknown, max = 300, empty = false): string {
  if (
    typeof value !== 'string' ||
    (!empty && !value.trim()) ||
    value.length > max ||
    /[\u0000-\u001f\u007f<>]/.test(value)
  )
    throw new Error('invalid_catalog');
  return value;
}
function date(value: unknown): string {
  const s = string(value, 30);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(s) || !Number.isFinite(Date.parse(s)))
    throw new Error('invalid_catalog');
  return s;
}
function retailer(value: unknown): Retailer {
  if (typeof value !== 'string' || !Object.hasOwn(hosts, value)) throw new Error('invalid_catalog');
  return value as Retailer;
}
function money(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0 || value > 100000000)
    throw new Error('invalid_catalog');
  return value;
}
export function parseRetailCatalog(input: unknown): RetailCatalog {
  const data = record(input);
  if (
    data.version !== 1 ||
    !Array.isArray(data.entries) ||
    data.entries.length > 5000 ||
    !Array.isArray(data.sources) ||
    data.sources.length !== 3
  )
    throw new Error('invalid_catalog');
  const sources = data.sources.map((input): RetailCatalog['sources'][number] => {
    const s = record(input);
    if (s.status !== 'ok' && s.status !== 'failed') throw new Error('invalid_catalog');
    return { retailer: retailer(s.retailer), status: s.status, attemptedAt: date(s.attemptedAt) };
  });
  if (new Set(sources.map((s) => s.retailer)).size !== 3) throw new Error('invalid_catalog');
  const ids = new Set<string>();
  const entries = data.entries.map((input): RetailPrice => {
    const p = record(input),
      r = retailer(p.retailer);
    const sku = string(p.sku, 80),
      id = string(p.id, 120),
      sourceUrl = string(p.sourceUrl, 500),
      group = string(p.group, 30);
    if (!(r === 'mercadona' ? /^category:\d+$/.test(group) : group === 'weekly'))
      throw new Error('invalid_catalog');
    if (
      !/^[\w-]+$/.test(sku) ||
      ![`${r}:${sku}`, `${r}:${sku}:regular`, `${r}:${sku}:plus`].includes(id) ||
      ids.has(id)
    )
      throw new Error('invalid_catalog');
    ids.add(id);
    const url = new URL(sourceUrl);
    const path =
      r === 'mercadona'
        ? /^\/product\/\d+\/[\w-]+$/
        : r === 'aldi'
          ? /^\/producto\/[\w-]+\.html$/
          : /^\/p\/[\w-]+\/p\d+$/;
    if (
      url.protocol !== 'https:' ||
      url.host !== hosts[r] ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      !path.test(url.pathname)
    )
      throw new Error('invalid_catalog');
    const startsAt = p.startsAt === null ? null : date(p.startsAt);
    const endsAt = p.endsAt === null ? null : date(p.endsAt);
    if ((startsAt && endsAt && startsAt > endsAt) || typeof p.isOffer !== 'boolean')
      throw new Error('invalid_catalog');
    let unitPrice: RetailPrice['unitPrice'] = null;
    if (p.unitPrice !== null) {
      const u = record(p.unitPrice),
        unit = string(u.unit, 10);
      if (!['kg', 'l', 'ud', 'dz', 'unidad'].includes(unit)) throw new Error('invalid_catalog');
      unitPrice = { amountMilli: money(u.amountMilli), unit };
    }
    return {
      id,
      retailer: r,
      sku,
      group,
      name: string(p.name),
      quantity: string(p.quantity, 300, true),
      amountMilli: money(p.amountMilli),
      scope: string(p.scope),
      sourceUrl,
      checkedAt: date(p.checkedAt),
      startsAt,
      endsAt,
      isOffer: p.isOffer,
      conditions: string(p.conditions, 500, true),
      unitPrice,
    };
  });
  return { version: 1, generatedAt: date(data.generatedAt), sources, entries };
}
export function retailPrices(
  catalog: RetailCatalog,
  options: {
    text: string;
    store: string;
    onlyOffers: boolean;
    includeOlder: boolean;
    now?: number;
  },
): RetailPrice[] {
  const now = options.now ?? Date.now();
  const words = fold(options.text)
    .split(' ')
    .filter(Boolean)
    .map((word) => (word.length > 4 && word.endsWith('s') ? word.slice(0, -1) : word));
  if (!words.length) return [];
  return catalog.entries
    .filter((p) => {
      const age = now - Date.parse(p.checkedAt);
      return (
        words.every((word) => fold(p.name).includes(word)) &&
        retailStore(`${retailerNames[p.retailer]} ${p.scope}`).includes(
          retailStore(options.store),
        ) &&
        age >= 0 &&
        (options.includeOlder || age <= RETAIL_MAX_AGE) &&
        (!p.startsAt || Date.parse(p.startsAt) <= now) &&
        (!p.endsAt || Date.parse(p.endsAt) >= now) &&
        (!options.onlyOffers || p.isOffer)
      );
    })
    .sort((a, b) => a.amountMilli - b.amountMilli || a.id.localeCompare(b.id));
}
