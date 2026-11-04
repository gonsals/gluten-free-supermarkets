import { fold } from './comparison';

import {
  retailerNames,
  retailerHosts as hosts,
  knownRetailGroup,
  categoryPages,
  retailStore,
  type Retailer,
} from './retailSources';
export { retailerNames, retailStore, type Retailer } from './retailSources';
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
const categoryWords: [RegExp, number[]][] = [
  [/huevo|clara/, [77]],
  [/leche|bebida vegetal|avena|soja/, [72]],
  [/mantequilla|margarina/, [75]],
  [/arroz/, [118]],
  [/pasta|macarron|espagueti|spaghetti|fideo/, [120]],
  [/legumbre|lenteja|garbanzo|alubia/, [121]],
  [/aceite|vinagre|\bsal\b/, [112]],
  [/fruta|manzana|platano|naranja|mandarina|pera|kiwi|aguacate|limon|uva/, [27]],
  [/verdura|patata|tomate|cebolla|zanahoria|calabac|brocoli|champinon|berenjena|coliflor/, [29]],
  [/pollo|pavo/, [38]],
  [/\bpan\b/, [59, 60]],
  [/queso/, [54]],
  [/atun|sardina|mejillon|conserva/, [122]],
  [/tomate|tomate frito/, [126]],
  [/cereal/, [78]],
  [/galleta/, [80]],
];
export function mercadonaCategories(query: string): number[] {
  return [
    ...new Set(
      categoryWords.filter(([pattern]) => pattern.test(fold(query))).flatMap(([, ids]) => ids),
    ),
  ].slice(0, 3);
}

export const RETAIL_MAX_AGE = 3 * 24 * 60 * 60 * 1000;
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
    data.sources.length < 3 ||
    data.sources.length > Object.keys(hosts).length
  )
    throw new Error('invalid_catalog');
  const sources = data.sources.map((input): RetailCatalog['sources'][number] => {
    const s = record(input);
    if (s.status !== 'ok' && s.status !== 'failed') throw new Error('invalid_catalog');
    return { retailer: retailer(s.retailer), status: s.status, attemptedAt: date(s.attemptedAt) };
  });
  if (
    new Set(sources.map((s) => s.retailer)).size !== sources.length ||
    !['mercadona', 'aldi', 'lidl'].every((r) => sources.some((s) => s.retailer === r))
  )
    throw new Error('invalid_catalog');
  const ids = new Set<string>();
  const entries = data.entries.map((input): RetailPrice => {
    const p = record(input),
      r = retailer(p.retailer);
    const sku = string(p.sku, 80),
      id = string(p.id, 120),
      sourceUrl = string(p.sourceUrl, 500),
      group = string(p.group, 30);
    if (!knownRetailGroup(r, group) || !sources.some((s) => s.retailer === r))
      throw new Error('invalid_catalog');
    if (
      !/^[\w-]+$/.test(sku) ||
      ![
        `${r}:${sku}`,
        `${r}:${sku}:regular`,
        `${r}:${sku}:plus`,
        ...(r === 'mercadona' ? [`${r}:${sku}:bcn1`] : []),
      ].includes(id) ||
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
          : r === 'lidl'
            ? /^\/p\/[\w-]+\/p\d+$/
            : r === 'dia'
              ? /^\/[\w/-]+\/p\/[A-Za-z0-9]+$/
              : r === 'caprabo'
                ? /^\/es\/productdetail\/\d+-[^/?#]+\/$/
                : /^\/es\/[^/?#]+\/\d+\.html$/;
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
  const groups = mercadonaCategories(options.text).map((id) => `category:${id}@bcn1`);
  const otherGroups = categoryPages(options.text);
  const words = fold(options.text)
    .split(' ')
    .filter(Boolean)
    .map((word) => (word.length > 4 && word.endsWith('s') ? word.slice(0, -1) : word));
  if (!words.length) return [];
  return catalog.entries
    .filter((p) => {
      const age = now - Date.parse(p.checkedAt);
      return (
        (p.retailer !== 'mercadona' ||
          (p.group.endsWith('@bcn1') && (!groups.length || groups.includes(p.group)))) &&
        (!otherGroups.some((g) => g.retailer === p.retailer) ||
          otherGroups.some((g) => g.retailer === p.retailer && g.group === p.group)) &&
        words.every((word) => fold(p.name).includes(word)) &&
        // A generic egg search should start with whole hen eggs. Explicit queries
        // such as «claras de huevo» or «huevos de codorniz» still find those products.
        (!(words.length === 1 && words[0] === 'huevo') ||
          !/clara|codorniz|cocid|chocolate|liquid|hilad/.test(fold(p.name))) &&
        // Plain «arroz» means dry rice. A cheaper cooked cup must not become
        // the chain's headline rice price; explicit searches keep finding it.
        (!(words.length === 1 && words[0] === 'arroz') ||
          !/\b(cocid[oa]s?|precocid[oa]s?|vasos?|vasitos?|microondas|bebidas?|harinas?|tortitas?|galletas?|noodles|fideos|cereales|papillas?)\b|\barroz\s+(con\s+leche|(?:tres|3)\s+delicias|a\s+banda|de\s+marisco)\b/.test(
            fold(p.name),
          )) &&
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

/** Minimum published package price per chain, not an equivalent-format ranking. */
export function groupRetailPrices(prices: readonly RetailPrice[]) {
  const groups = new Map<Retailer, RetailPrice[]>();
  for (const price of prices) {
    const rows = groups.get(price.retailer) ?? [];
    rows.push(price);
    groups.set(price.retailer, rows);
  }
  return [...groups.entries()]
    .map(([retailer, rows]) => ({
      retailer,
      prices: rows.sort((a, b) => a.amountMilli - b.amountMilli || a.id.localeCompare(b.id)),
    }))
    .sort(
      (a, b) =>
        a.prices[0].amountMilli - b.prices[0].amountMilli || a.retailer.localeCompare(b.retailer),
    );
}
