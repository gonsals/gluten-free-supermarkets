import snapshot from '@/data/retail-prices.es.json';
import {
  parseRetailCatalog,
  groupRetailPrices,
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
test('arroz genérico compara arroz seco, no el vasito cocido más barato ni sus derivados', () => {
  const rice = {
    ...row,
    id: 'dry',
    name: 'Arroz redondo Hacendado',
    retailer: 'mercadona' as const,
    group: 'category:118@bcn1',
    quantity: '1 kg',
    amountMilli: 1150,
    unitPrice: { amountMilli: 1150, unit: 'kg' },
  };
  const cooked = {
    ...rice,
    id: 'cooked',
    name: 'Arroz cocido integral Sabroz',
    quantity: '0.25 kg',
    amountMilli: 1050,
    unitPrice: { amountMilli: 4200, unit: 'kg' },
  };
  const catalog = feed([
    cooked,
    rice,
    ...[
      'Vasitos de arroz redondo',
      'Vasos de arroz integral',
      'Bebida de arroz',
      'Harina de arroz',
      'Tortitas de arroz',
      'Arroz con leche',
      'Arroz tres delicias',
    ].map((name, index) => ({ ...row, id: `other-${index}`, name, amountMilli: 500 })),
  ]);
  const generic = retailPrices(catalog, { ...options, text: 'arroz' });
  expect(generic).toEqual([rice]);
  expect(groupRetailPrices(generic)[0].prices[0]).toMatchObject({
    amountMilli: 1150,
    quantity: '1 kg',
  });
  expect(retailPrices(catalog, { ...options, text: 'arroz cocido' })).toEqual([cooked]);
  expect(retailPrices(catalog, { ...options, text: 'bebida de arroz' })).toHaveLength(1);
  expect(retailPrices(catalog, { ...options, text: 'arroz con leche' })).toHaveLength(1);
});
test('arroz conserva variedades secas caras y envases pequeños sin imponer un precio máximo', () => {
  const entries = [
    'Arroz bomba premium',
    'Arroz para paella',
    'Arroz risotto',
    'Arroz basmati',
  ].map((name, i) => ({
    ...row,
    id: `rice-${i}`,
    name,
    amountMilli: 6000 + i,
    quantity: i ? '1 kg' : '500 g',
  }));
  expect(retailPrices(feed(entries), { ...options, text: 'arroz' })).toEqual(entries);
});
test('agrupa por cadena sin mezclar formatos, condiciones ni modificar la entrada', () => {
  const larger = { ...row, id: 'large', amountMilli: 3500, quantity: '6 kg' };
  const other = {
    ...row,
    id: 'other',
    retailer: 'lidl' as const,
    amountMilli: 1500,
    conditions: 'Lidl Plus',
  };
  const input = [larger, row, other];
  const groups = groupRetailPrices(input);
  expect(groups.map((g) => g.retailer)).toEqual(['lidl', 'aldi']);
  expect(groups[0].prices[0].conditions).toBe('Lidl Plus');
  expect(groups[1].prices).toEqual([row, larger]);
  expect(groups[1].prices.map((p) => p.quantity)).toEqual(['3 kg', '6 kg']);
  expect(input).toEqual([larger, row, other]);
  expect(groupRetailPrices([])).toEqual([]);
});
test('huevos prioriza huevos enteros y permite buscar claras y codorniz expresamente', () => {
  const eggs = { ...row, name: 'Huevos grandes L' };
  const whites = { ...row, id: 'whites', name: 'Claras de huevo líquidas', amountMilli: 1000 };
  const quail = { ...row, id: 'quail', name: 'Huevos de codorniz', amountMilli: 900 };
  const catalog = feed([whites, quail, eggs]);
  expect(retailPrices(catalog, { ...options, text: 'huevos' })).toEqual([eggs]);
  expect(retailPrices(catalog, { ...options, text: 'claras de huevo' })).toEqual([whites]);
  expect(retailPrices(catalog, { ...options, text: 'huevos de codorniz' })).toEqual([quail]);
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
