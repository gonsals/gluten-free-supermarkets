import study from '../../../docs/datos/cobertura-madrid-2026-10-30.plan.json';
import {
  summarizeCoverage,
  validateCoveragePlan,
  type CoveragePage,
  type CoveragePlan,
} from '../coverage';
import type { PriceQuote } from '../comparison';

const now = Date.parse('2026-10-30T12:00:00Z');
function plan(): CoveragePlan {
  const value: unknown = JSON.parse(JSON.stringify(study));
  validateCoveragePlan(value);
  return value;
}
function quote(barcode: string, index: number, overrides: Partial<PriceQuote> = {}): PriceQuote {
  return {
    id: `open_prices:${index + 1}`,
    barcode,
    store: 'Tienda A',
    location: 'Calle 1, Madrid, España',
    branchKey: 'open_prices:100',
    amountMilli: 1234,
    observedAt: '2026-10-29T00:00:00Z',
    recordedAt: '2026-10-29T10:00:00Z',
    conditional: false,
    offerEndsAt: null,
    source: 'open_prices',
    sourceUrl: `https://prices.openfoodfacts.org/prices/${index + 1}`,
    countryCode: 'ES',
    ...overrides,
  };
}
function pages(p: CoveragePlan): CoveragePage[] {
  return p.basket.map((i, n) => ({
    barcode: i.barcode,
    page: 1,
    status: 'ok',
    total: 1,
    more: false,
    skipped: 0,
    error: null,
    quotes: [quote(i.barcode, n)],
  }));
}
test('solo la misma referencia con todos los GTIN cubre una cesta; multiplica envases sin redondear antes', () => {
  const p = plan();
  p.basket[0].quantity = 2;
  const s = summarizeCoverage(p, pages(p), now);
  expect(s).toMatchObject({
    products: 10,
    successfulProducts: 10,
    productsWithEligiblePrice: 10,
    coveredPercent: 100,
    completeCandidateBaskets: 1,
    maximumCoveredLinesAtOneReference: 10,
  });
  expect(s.references[0].subtotalMilli).toBe(13574);
  expect(s.marketedGlutenFree).toEqual({ products: 3, withEligiblePrice: 3 });
});
test('diez productos dispersos no se convierten en una cesta de una tienda', () => {
  const p = plan(),
    data = pages(p).map((page, n) => ({
      ...page,
      quotes: page.quotes.map((q) => ({ ...q, branchKey: `open_prices:${n + 1}` })),
    }));
  const s = summarizeCoverage(p, data, now);
  expect(s).toMatchObject({
    productsWithEligiblePrice: 10,
    completeCandidateBaskets: 0,
    maximumCoveredLinesAtOneReference: 1,
    candidateReferences: 10,
  });
  expect(s.references.every((r) => !r.complete && r.subtotalMilli === 1234)).toBe(true);
});
test('una oferta nueva excluida no rescata un precio anterior; páginas adicionales conservan el criterio', () => {
  const p = plan(),
    data = pages(p),
    page = data[0];
  page.more = true;
  page.total = 51;
  data.push({
    ...page,
    page: 2,
    more: false,
    quotes: [
      {
        ...page.quotes[0],
        id: 'open_prices:99',
        observedAt: '2026-10-30T00:00:00Z',
        conditional: true,
      },
    ],
  });
  const s = summarizeCoverage(p, data, now);
  expect(s.productsWithEligiblePrice).toBe(9);
  expect(s.completeCandidateBaskets).toBe(0);
  expect(s.rows[0].zoneExclusions).toEqual([
    { reference: 'open_prices:100', reason: 'conditional' },
  ]);
});
test('separa vacío, registros rechazados, error y no consultado; cobertura desconocida no simula ausencia', () => {
  const p = plan(),
    data = pages(p);
  data[0] = { ...data[0], quotes: [], total: 0 };
  data[1] = { ...data[1], quotes: [], total: 1, skipped: 1 };
  data[2] = { ...data[2], status: 'error', quotes: [], total: null, error: 'timeout' };
  data.pop();
  const s = summarizeCoverage(p, data, now);
  expect(s).toMatchObject({
    successfulProducts: 8,
    providerErrors: 1,
    notAttempted: 1,
    productsWithoutProviderRows: 1,
    productsWithOnlyRejectedRows: 1,
    allProductRequestsSucceeded: false,
  });
  expect(s.rows[2].providerTotal).toBeNull();
  expect(s.rows[0].providerTotal).toBe(0);
  expect(s.completeCandidateBaskets).toBe(0);
});
test('edad, país, ámbito y corte de páginas son dimensiones distintas; el diagnóstico espacial no es un filtro textual', () => {
  const p = plan(),
    data = pages(p);
  data[0].quotes[0].observedAt = '2026-09-01T00:00:00Z';
  data[1].quotes[0].countryCode = 'FR';
  data[2].quotes[0].location = 'Alcobendas, España';
  data[3].more = true;
  data[3].total = 200;
  const s = summarizeCoverage(p, data, now);
  expect(s.productsWithEligiblePrice).toBe(7);
  expect(s.productsWithRecentPriceAnywhere).toBe(9);
  expect(s.productsWithEligibleSpanishPrice).toBe(8);
  expect(s.anyTruncated).toBe(true);
  expect(summarizeCoverage(p, data, now, true).productsWithEligiblePrice).toBe(8);
});
test('cero resultados exitosos no crea una sucursal, un precio cero ni un total completo', () => {
  const p = plan(),
    s = summarizeCoverage(
      p,
      pages(p).map((r) => ({ ...r, quotes: [], total: 0 })),
      now,
    );
  expect(s).toMatchObject({
    successfulProducts: 10,
    productsWithEligiblePrice: 0,
    completeCandidateBaskets: 0,
    candidateReferences: 0,
    allProductRequestsSucceeded: true,
  });
  expect(s.references).toEqual([]);
});
test.each(['duplicate', 'budget', 'coordinates', 'profiles', 'quantity'])(
  'rechaza plan incoherente antes de consultar: %s',
  (problem) => {
    const p = plan();
    if (problem === 'duplicate') p.basket[1].barcode = '0' + p.basket[0].barcode;
    if (problem === 'budget') p.limits.productionRequests = 100 as 40;
    if (problem === 'coordinates') p.diagnostic.lat = NaN;
    if (problem === 'profiles') p.profiles = ['__proto__'];
    if (problem === 'quantity') p.basket[0].quantity = 0;
    expect(() => validateCoveragePlan(p)).toThrow();
  },
);
