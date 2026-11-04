import snapshot from '@/data/retail-prices.es.json';
import {
  parseRetailCatalog,
  retailPrices,
  type RetailCatalog,
  type RetailPrice,
} from '../retailCatalog';

const now = Date.parse('2026-11-03T12:00:00Z');
const date = '2026-11-03T10:00:00.000Z';
const row: RetailPrice = {
  id: 'aldi:123',
  retailer: 'aldi',
  sku: '123',
  group: 'weekly',
  name: 'Patatas de ensayo',
  quantity: '3 kg',
  amountMilli: 2990,
  scope: 'Península',
  sourceUrl: 'https://www.aldi.es/producto/patatas-123.html',
  checkedAt: date,
  startsAt: '2026-11-02T23:00:00.000Z',
  endsAt: '2026-11-08T22:59:59.000Z',
  isOffer: true,
  conditions: 'Hasta fin de existencias',
  unitPrice: { amountMilli: 997, unit: 'kg' },
};
const feed = (entries: RetailPrice[] = [row]): RetailCatalog => ({
  version: 1,
  generatedAt: date,
  sources: ['mercadona', 'aldi', 'lidl'].map((r) => ({
    retailer: r as RetailPrice['retailer'],
    status: 'ok',
    attemptedAt: date,
  })),
  entries,
});
const options = { text: 'patatas', store: '', onlyOffers: false, includeOlder: false, now };

test('el catálogo incluido es válido y cada cadena tiene precios reales y fuente oficial', () => {
  const catalog = parseRetailCatalog(snapshot);
  for (const retailer of ['mercadona', 'aldi', 'lidl', 'dia', 'caprabo', 'ametller'])
    expect(catalog.entries.some((p) => p.retailer === retailer)).toBe(true);
});
test('Barcelona no reutiliza precios de Valencia aunque el producto y el importe coincidan', () => {
  const bcn = {
    ...row,
    retailer: 'mercadona' as const,
    group: 'category:77@bcn1',
    name: 'Huevos L',
  };
  const old = { ...bcn, id: 'legacy', group: 'category:77', amountMilli: 800 };
  expect(
    retailPrices(feed([old, bcn]), { ...options, text: 'huevos', store: 'Barcelona' }),
  ).toEqual([bcn]);
});
test('admite SKU alfanumérico de DIA con su envase; exige declarar esa fuente en el catálogo', () => {
  const p: RetailPrice = {
    ...row,
    id: 'dia:504P6',
    retailer: 'dia',
    sku: '504P6',
    group: 'category:milk',
    name: 'Leche pack 6 x 1 L',
    quantity: 'pack 6 x 1 L',
    sourceUrl: 'https://www.dia.es/leche/p/504P6',
  };
  expect(() => parseRetailCatalog(feed([p]))).toThrow();
  const data = feed([p]);
  data.sources.push({ retailer: 'dia', status: 'ok', attemptedAt: date });
  expect(parseRetailCatalog(data).entries[0]).toMatchObject({
    sku: '504P6',
    quantity: 'pack 6 x 1 L',
  });
});
test('conserva SKU sin fabricar GTIN, filtra tienda/acentos y conserva milésimas', () => {
  const catalog = parseRetailCatalog(feed());
  expect(retailPrices(catalog, { ...options, store: 'PENINSULA' })[0]).toMatchObject({
    amountMilli: 2990,
    sku: '123',
  });
  expect(retailPrices(catalog, { ...options, store: 'lidl' })).toHaveLength(0);
  expect(catalog.entries[0]).not.toHaveProperty('barcode');
});
test('no muestra promociones futuras ni caducadas aunque se incluyan precios anteriores', () => {
  const entries = [
    row,
    { ...row, id: 'future', startsAt: '2026-11-04T00:00:00.000Z' },
    { ...row, id: 'expired', endsAt: '2026-11-03T11:59:59.000Z' },
  ];
  expect(retailPrices(feed(entries), { ...options, includeOlder: true })).toEqual([row]);
});
test('encuentra singular al buscar patatas y entiende la variante de escritura Lidel', () => {
  const catalog = feed([{ ...row, name: 'Patata granel', retailer: 'lidl' }]);
  expect(retailPrices(catalog, { ...options, store: 'Lidel' })).toHaveLength(1);
});
test('buscar huevos de Mercadona usa su categoría, sin colar pasta al huevo como huevos baratos', () => {
  const catalog = feed([
    { ...row, retailer: 'mercadona', group: 'category:77@bcn1', name: 'Huevos grandes L' },
    {
      ...row,
      id: 'pasta',
      retailer: 'mercadona',
      group: 'category:120@bcn1',
      name: 'Pasta al huevo',
      amountMilli: 900,
    },
  ]);
  expect(retailPrices(catalog, { ...options, text: 'huevos' }).map((p) => p.name)).toEqual([
    'Huevos grandes L',
  ]);
});
test('datos conservados en fallo no recuperan frescura por la fecha global', () => {
  const old = { ...row, checkedAt: '2026-10-25T10:00:00.000Z' };
  expect(retailPrices(feed([old]), options)).toEqual([]);
  expect(retailPrices(feed([old]), { ...options, includeOlder: true })).toEqual([old]);
});
test('excluye observaciones futuras incluso al ampliar fechas y respeta solo ofertas', () => {
  expect(
    retailPrices(feed([{ ...row, checkedAt: '2026-11-04T10:00:00.000Z' }]), {
      ...options,
      includeOlder: true,
    }),
  ).toEqual([]);
  expect(
    retailPrices(feed([{ ...row, isOffer: false }]), { ...options, onlyOffers: true }),
  ).toEqual([]);
});
test.each([
  { amountMilli: 1.99 },
  { amountMilli: -1000 },
  { sourceUrl: 'https://www.aldi.es.evil.test/producto/x.html' },
  { sourceUrl: 'https://www.aldi.es/producto/x.html?redirect=evil' },
  { retailer: '__proto__' },
  { sourceUrl: 'javascript:alert(1)' },
  { checkedAt: 'ayer' },
  { unitPrice: { amountMilli: 12, unit: 'caja' } },
])('rechaza registros malformados antes de mostrarlos: %j', (extra) => {
  expect(() => parseRetailCatalog(feed([{ ...row, ...extra } as RetailPrice]))).toThrow();
});
test('rechaza duplicados y no incorpora metadatos externos a la lista blanca', () => {
  expect(() => parseRetailCatalog(feed([row, row]))).toThrow();
  const raw = feed([{ ...row, tracking: 'exclude' } as RetailPrice]);
  expect(parseRetailCatalog(raw).entries[0]).not.toHaveProperty('tracking');
});
