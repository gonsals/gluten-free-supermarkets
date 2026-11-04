import { namedPrices } from '../catalogSearch';
import type { PriceQuote } from '../comparison';
import { BARCODE, OTHER_BARCODE } from '@/tests/fixtures';

const now = Date.parse('2026-11-03T12:00:00Z');
const product = {
  barcode: BARCODE,
  name: 'Huevos de ensayo',
  brands: 'Marca',
  quantity: '6 unidades',
};
const quote = (extra: Partial<PriceQuote> = {}): PriceQuote => ({
  id: 'open_prices:1',
  barcode: BARCODE,
  store: 'Tienda',
  location: 'Madrid',
  branchKey: 'open_prices:1',
  amountMilli: 2000,
  observedAt: '2026-11-03T00:00:00Z',
  recordedAt: '2026-11-03T01:00:00Z',
  conditional: false,
  isOffer: false,
  offerEndsAt: null,
  source: 'open_prices',
  sourceUrl: null,
  countryCode: 'ES',
  ...extra,
});
const options = { text: 'huevos', store: '', onlyOffers: false, includeOlder: false, now };

test('ordena por envase conservando los formatos y referencias de productos distintos', () => {
  const results = namedPrices(
    [product, { ...product, barcode: OTHER_BARCODE, quantity: '12 unidades' }],
    [
      quote({ amountMilli: 1995 }),
      quote({ id: 'open_prices:2', barcode: OTHER_BARCODE, amountMilli: 1500 }),
    ],
    options,
  );
  expect(results.map((r) => r.product.quantity)).toEqual(['12 unidades', '6 unidades']);
  expect(results.map((r) => r.quote.amountMilli)).toEqual([1500, 1995]);
});
test('solo ofertas no resucita una promoción anterior sustituida por un precio normal', () => {
  const prices = [
    quote(),
    quote({
      id: 'old',
      observedAt: '2026-11-02T00:00:00Z',
      conditional: true,
      isOffer: true,
      amountMilli: 1000,
    }),
  ];
  expect(namedPrices([product], prices, { ...options, onlyOffers: true })).toHaveLength(0);
});
test('excluye extranjeros y antiguos por defecto y nunca recupera una oferta privada vencida', () => {
  const old = quote({ observedAt: '2026-01-01T00:00:00Z' });
  expect(namedPrices([product], [old], options)).toHaveLength(0);
  expect(namedPrices([product], [old], { ...options, includeOlder: true })).toHaveLength(1);
  expect(namedPrices([product], [quote({ countryCode: 'FR' })], options)).toHaveLength(0);
  expect(
    namedPrices(
      [product],
      [quote({ source: 'private', isOffer: true, offerEndsAt: '2026-11-01T00:00:00Z' })],
      { ...options, includeOlder: true, onlyOffers: true },
    ),
  ).toHaveLength(0);
});
test('una nota privada no es una oferta y buscar tienda no convierte países desconocidos en España', () => {
  const note = quote({ source: 'private', countryCode: null, conditional: true, isOffer: false });
  expect(namedPrices([product], [note], { ...options, onlyOffers: true })).toHaveLength(0);
  expect(namedPrices([product], [note], { ...options, store: 'madrid' })).toHaveLength(1);
  expect(namedPrices([product], [note], { ...options, store: 'no coincide' })).toHaveLength(0);
});
