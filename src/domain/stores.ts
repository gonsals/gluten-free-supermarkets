import type { Product } from './product';

const key = (value: string) =>
  value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es')
    .replace(/\s+/g, ' ');
const RETAILERS = new Map(
  Object.entries({
    mercadona: 'Mercadona',
    hacendado: 'Mercadona',
    carrefour: 'Carrefour',
    dia: 'DIA',
    eroski: 'Eroski',
    lidl: 'Lidl',
    aldi: 'ALDI',
    consum: 'Consum',
    alcampo: 'Alcampo',
  }),
);
export function normalizeStores(stores: unknown, tags: unknown): string[] {
  const raw = typeof stores === 'string' ? stores.split(',') : [];
  const candidates = raw.some((item) => item.trim()) ? raw : Array.isArray(tags) ? tags : [];
  const result = new Map<string, string>();
  for (const item of candidates) {
    if (typeof item !== 'string') continue;
    const name = item.trim().slice(0, 100);
    if (name) result.set(key(name), RETAILERS.get(key(name)) ?? name);
    if (result.size >= 20) break;
  }
  return [...result.values()];
}
export function storeSuggestions(product: Product | null): {
  stores: string[];
  reason: 'source' | 'brand';
} {
  if (product?.stores?.length) return { stores: product.stores, reason: 'source' };
  return {
    stores: [
      ...new Set(
        (product?.brands ?? [])
          .map((brand) => RETAILERS.get(key(brand)))
          .filter((store): store is string => Boolean(store)),
      ),
    ],
    reason: 'brand',
  };
}
