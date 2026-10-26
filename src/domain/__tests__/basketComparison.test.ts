import { BARCODE, OTHER_BARCODE } from '@/tests/fixtures';
import { compareBasket } from '../basketComparison';
import { isBranches, referenceOf, type StoreBranch } from '../branches';
import { privateReferenceKey, type PriceQuote } from '../comparison';

const now = Date.parse('2026-10-26T12:00:00Z');
const basket = [
  { barcode: BARCODE, name: 'Leche', quantity: 2, addedAt: new Date(now).toISOString() },
  { barcode: OTHER_BARCODE, name: 'Pasta', quantity: 1, addedAt: new Date(now).toISOString() },
];
function quote(
  store: string,
  code = BARCODE,
  amountMilli = 1200,
  extra: Partial<PriceQuote> = {},
): PriceQuote {
  return {
    id: `${store}:${code}`,
    barcode: code,
    store,
    location: 'Calle ' + store,
    branchKey: privateReferenceKey(store, 'Calle ' + store),
    amountMilli,
    observedAt: '2026-10-25T00:00:00Z',
    recordedAt: '2026-10-25T00:00:00Z',
    conditional: false,
    offerEndsAt: null,
    source: 'private',
    sourceUrl: null,
    countryCode: null,
    ...extra,
  };
}
function branch(name: string, refs = [referenceOf(quote(name))]): StoreBranch {
  return { id: name, name, address: 'Calle ' + name, references: refs };
}
const filters = {
  recentOnly: true,
  includeOffers: false,
  publicSpainOnly: true,
  location: '',
  now,
};

test('totales completos A=4,50 y C=4,75; B=2,10 parcial nunca es la cesta más barata', () => {
  const result = compareBasket(
    basket,
    ['A', 'B', 'C'].map((name) => branch(name)),
    [
      quote('A'),
      quote('A', OTHER_BARCODE, 2100),
      quote('B', BARCODE, 1050),
      quote('C', BARCODE, 1350),
      quote('C', OTHER_BARCODE, 2050),
    ],
    filters,
  );
  expect(result.map((item) => [item.branch.id, item.complete, item.subtotalMilli])).toEqual([
    ['A', true, 4500],
    ['C', true, 4750],
    ['B', false, 2100],
  ]);
  expect(result[2]).toMatchObject({ coveredLines: 1, coveredPackages: 2, totalPackages: 3 });
  expect(result[2].lines[1]).toMatchObject({ amountMilli: null, reason: 'missing', quote: null });
});
test('una localidad o cadena no se asocia automáticamente ni mezcla sucursales homónimas', () => {
  const result = compareBasket(
    basket,
    [branch('A', [])],
    [quote('A'), quote('A', OTHER_BARCODE)],
    filters,
  );
  expect(result[0]).toMatchObject({ complete: false, subtotalMilli: null, coveredLines: 0 });
  expect(isBranches([branch('a'), branch('b', [referenceOf(quote('a'))])])).toBe(false);
  expect(privateReferenceKey('A:B', 'C')).not.toBe(privateReferenceKey('A', 'B:C'));
});
test('referencias vinculadas usan la más reciente y explican discrepancia sin elegir el menor', () => {
  const old = quote('A', BARCODE, 1000);
  const recent = quote('A', BARCODE, 1805, {
    id: 'public',
    source: 'open_prices',
    branchKey: 'open_prices:1',
    countryCode: 'ES',
    observedAt: '2026-10-26T00:00:00Z',
  });
  const result = compareBasket(
    [basket[0]],
    [branch('A', [referenceOf(old), referenceOf(recent)])],
    [old, recent],
    filters,
  );
  expect(result[0].lines[0]).toMatchObject({ conflict: true, amountMilli: 3610, quote: recent });
});
test.each([
  ['conditional', { conditional: true }, 'conditional'],
  ['expired', { offerEndsAt: '2026-10-25T00:00:00Z' }, 'expired'],
  ['old', { observedAt: '2020-01-01T00:00:00Z' }, 'old'],
  ['future', { observedAt: '2027-01-01T00:00:00Z' }, 'future'],
  ['invalid', { amountMilli: NaN }, 'invalid'],
  ['country', { source: 'open_prices', countryCode: 'FR' }, 'country'],
] as const)('excluye %s con motivo y sin precio cero', (_name, extra, reason) => {
  const candidate = quote('A', BARCODE, 1000, extra);
  const result = compareBasket([basket[0]], [branch('A')], [candidate], filters)[0];
  expect(result.lines[0]).toMatchObject({ reason, amountMilli: null });
  expect(result.complete).toBe(false);
});
test('una oferta reciente excluida no resucita precios anteriores ni de otras fuentes vinculadas', () => {
  const older = quote('A', BARCODE, 1000);
  const newer = quote('A', BARCODE, 800, {
    id: 'new',
    conditional: true,
    observedAt: '2026-10-26T00:00:00Z',
  });
  const pub = quote('A', BARCODE, 900, {
    id: 'pub',
    source: 'open_prices',
    branchKey: 'open_prices:1',
    countryCode: 'ES',
  });
  const store = branch('A', [referenceOf(older), referenceOf(pub)]);
  expect(compareBasket([basket[0]], [store], [older, newer, pub], filters)[0].lines[0].reason).toBe(
    'conditional',
  );
  expect(
    compareBasket([basket[0]], [store], [older, newer, pub], { ...filters, includeOffers: true })[0]
      .subtotalMilli,
  ).toBe(1600);
});
test('precisión en milésimas y cantidades; empate de fechas resuelve privado antes que importe', () => {
  const priv = quote('A', BARCODE, 1235);
  const pub = quote('A', BARCODE, 1231, {
    source: 'open_prices',
    branchKey: 'open_prices:1',
    id: 'pub',
    countryCode: 'ES',
  });
  const store = branch('A', [referenceOf(priv), referenceOf(pub)]);
  expect(compareBasket([basket[0]], [store], [pub, priv], filters)[0].subtotalMilli).toBe(2470);
});
test('un fallo público no invalida una cesta privada completa; distingue falta de dato y error', () => {
  const result = compareBasket(basket, [branch('A')], [quote('A')], filters, [
    BARCODE,
    OTHER_BARCODE,
  ])[0];
  expect(result.lines[0].quote).not.toBeNull();
  expect(result.lines[1].reason).toBe('provider');
  expect(compareBasket([], [branch('A')], [], filters)[0].complete).toBe(false);
});
test('filtros no inventan país privado y código equivalente sigue siendo el mismo envase', () => {
  expect(
    compareBasket([basket[0]], [branch('A')], [quote('A', '0' + BARCODE)], {
      ...filters,
      location: 'calle A',
    })[0].complete,
  ).toBe(true);
  expect(compareBasket(basket, [branch('A')], [], { ...filters, location: 'otra ciudad' })).toEqual(
    [],
  );
});
