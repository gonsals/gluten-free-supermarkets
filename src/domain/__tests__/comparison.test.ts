import { normalizeProduct } from '../product';
import { normalizeStores, storeSuggestions } from '../stores';
import { compareQuotes, privateQuotes, type PriceQuote } from '../comparison';
import { BARCODE, OTHER_BARCODE, product } from '@/tests/fixtures';

test('las tiendas explícitas tienen prioridad, se normalizan y no se infieren desde un nombre de producto', () => {
  const item = normalizeProduct(
    { brands: 'Hacendado', stores: ' Carrefour,carrefour , Mercadona ', product_name: 'ALDI Lidl' },
    BARCODE,
    'production',
  );
  expect(storeSuggestions(item)).toEqual({ stores: ['Carrefour', 'Mercadona'], reason: 'source' });
  expect(
    storeSuggestions(normalizeProduct({ product_name: 'Carrefour' }, BARCODE, 'production')).stores,
  ).toEqual([]);
  expect(normalizeStores(null, ['Mercadona', 3, 'mercadona'])).toEqual(['Mercadona']);
});
test('una marca reconocida sugiere tienda, una marca desconocida o una clave de prototipo no', () => {
  expect(storeSuggestions({ ...product(), brands: ['Hacendado'] })).toEqual({
    stores: ['Mercadona'],
    reason: 'brand',
  });
  expect(
    storeSuggestions({ ...product(), brands: ['Marca', 'constructor', '__proto__'] }).stores,
  ).toEqual([]);
  expect(normalizeStores('constructor,__proto__', null)).toEqual(['constructor', '__proto__']);
});
test('el listado de tiendas recibido queda acotado y conserva compatibilidad con fichas antiguas', () => {
  expect(
    normalizeStores(Array.from({ length: 100 }, (_, i) => 'Tienda' + i).join(','), []),
  ).toHaveLength(20);
  const old = product();
  delete old.stores;
  expect(storeSuggestions(old).stores).toEqual([]);
});

const now = Date.parse('2026-10-26T12:00:00Z');
function quote(id: string, amountMilli = 2490, overrides: Partial<PriceQuote> = {}): PriceQuote {
  return {
    id,
    barcode: BARCODE,
    store: 'Tienda',
    location: 'Madrid',
    branchKey: id,
    amountMilli,
    observedAt: '2026-10-25T00:00:00Z',
    recordedAt: '2026-10-25T12:00:00Z',
    conditional: false,
    offerEndsAt: null,
    source: 'private',
    sourceUrl: null,
    countryCode: null,
    ...overrides,
  };
}
test('ordena por importe exacto sin mezclar códigos; conserva diferencias de milésimas', () => {
  const result = compareQuotes(
    [quote('a', 2495), quote('b', 2490), quote('c', 1000, { barcode: OTHER_BARCODE })],
    { barcode: BARCODE, now },
  );
  expect(result.map((q) => q.id)).toEqual(['b', 'a']);
});
test('una observación nueva cara sustituye una antigua barata de la misma sucursal', () => {
  const result = compareQuotes(
    [
      quote('a', 1000, { branchKey: 'same', observedAt: '2026-10-24T00:00:00Z' }),
      quote('b', 3000, { branchKey: 'same' }),
    ],
    { barcode: BARCODE, now },
  );
  expect(result.map((q) => q.amountMilli)).toEqual([3000]);
});
test('descartar una oferta nueva no resucita el precio antiguo de esa sucursal', () => {
  const result = compareQuotes(
    [
      quote('a', 1000, { branchKey: 'same', observedAt: '2026-10-24T00:00:00Z' }),
      quote('b', 1500, { branchKey: 'same', conditional: true }),
    ],
    { barcode: BARCODE, now },
  );
  expect(result).toEqual([]);
});
test('excluye antiguos, ofertas, futuros y vencidos con los filtros correspondientes', () => {
  const prices = [
    quote('old', 1000, { observedAt: '2020-01-01T00:00:00Z' }),
    quote('offer', 500, { conditional: true }),
    quote('future', 100, { observedAt: '2027-01-01T00:00:00Z' }),
    quote('expired', 200, { offerEndsAt: '2026-10-25T00:00:00Z' }),
    quote('normal'),
  ];
  expect(
    compareQuotes(prices, { barcode: BARCODE, now, recentOnly: true }).map((q) => q.id),
  ).toEqual(['normal']);
  expect(
    compareQuotes(prices, { barcode: BARCODE, now, includeOffers: true }).map((q) => q.id),
  ).toEqual(['offer', 'old', 'normal']);
});
test('el filtro España afecta a los precios públicos y no atribuye un país inventado a los privados', () => {
  const prices = [
    quote('private'),
    quote('es', 1500, { source: 'open_prices', countryCode: 'ES' }),
    quote('fr', 1000, { source: 'open_prices', countryCode: 'FR' }),
    quote('unknown', 500, { source: 'open_prices' }),
  ];
  expect(
    compareQuotes(prices, { barcode: BARCODE, now, publicSpainOnly: true }).map((q) => q.id),
  ).toEqual(['es', 'private']);
  expect(compareQuotes(prices, { barcode: BARCODE, now, location: 'mÁdriD' })).toHaveLength(4);
});
test('convierte céntimos privados a milésimas sin cambiar su carácter privado', () => {
  const quotes = privateQuotes([
    {
      id: 'x',
      barcode: BARCODE,
      store: 'Tienda',
      location: 'Madrid',
      amountMinor: 249,
      currency: 'EUR',
      observedAt: new Date(now).toISOString(),
      createdAt: new Date(now).toISOString(),
      quantity: 0.5,
      unit: 'kg',
      offerEndsAt: null,
      notes: 'Con tarjeta',
    },
  ]);
  expect(quotes[0]).toMatchObject({
    amountMilli: 2490,
    source: 'private',
    sourceUrl: null,
    conditional: true,
    countryCode: null,
  });
});
