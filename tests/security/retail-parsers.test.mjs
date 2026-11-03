import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { mercadona, aldi, lidl, money } = require('../../scripts/lib/retail-parsers.cjs');
const checkedAt = '2026-11-03T12:00:00.000Z';
const m = (extra = {}, price = {}) => ({
  id: 77,
  categories: [
    {
      products: [
        {
          id: '12',
          display_name: 'Huevos L',
          published: true,
          status: null,
          share_url: 'https://tienda.mercadona.es/product/12/huevos',
          price_instructions: {
            unit_price: '1.995',
            unit_size: 6,
            size_format: 'ud',
            selling_method: 0,
            reference_price: '0.332',
            reference_format: 'ud',
            ...price,
          },
          ...extra,
        },
      ],
    },
  ],
});
const a = (extra = {}, price = {}) =>
  `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify({
    props: {
      pageProps: {
        apiData: JSON.stringify([
          [
            'OFFER_GET',
            {
              req: { region: 'pen' },
              res: {
                algoliaDataMap: {
                  1: {
                    objectID: '1',
                    name: 'Patatas',
                    productSlug: 'patatas-1',
                    isAvailable: true,
                    salesUnit: '3 kg',
                    currentPrice: {
                      priceValue: 2.85,
                      strikePrice: { strikePriceValue: 4.35 },
                      validFrom: 1793574000,
                      validUntil: 1794178799,
                      ...price,
                    },
                    ...extra,
                  },
                },
              },
            },
          ],
        ]),
      },
    },
  })}</script>`;
const l = (regular, plus, extra = {}) =>
  `<div data-grid-data="${JSON.stringify({
    productId: '12',
    title: 'Patata granel',
    productType: 'RETAIL',
    canonicalPath: '/p/patata/p12',
    regionsPrices: { 1: { currentPrice: regular, currentLidlPlusPrice: { price: plus } } },
    ...extra,
  }).replaceAll('"', '&quot;')}"></div>`;
const lp = {
  price: 1.19,
  currencyCode: 'EUR',
  startDate: '2026-11-01T23:00Z',
  endDate: '2026-11-08T22:59:59Z',
  packaging: { text: '1 kg' },
};

test('minor monetary units are exact; no signs, missing price or unsupported precision', () => {
  assert.equal(money('1.995'), 1995);
  for (const value of [null, '', -1, '1,99', '1.0001', 'NaN', '99999999'])
    assert.equal(money(value), null);
});
test('Mercadona fixed packages use SKU, warehouse scope and exact unit amounts', () => {
  const [row] = mercadona(m(), checkedAt);
  assert.equal(row.amountMilli, 1995);
  assert.equal(row.quantity, '6 ud');
  assert.equal(row.group, 'category:77');
  assert.equal(row.sku, '12');
  assert.match(row.scope, /vlc1/);
  assert.equal(row.barcode, undefined);
  assert.deepEqual(row.unitPrice, { amountMilli: 332, unit: 'ud' });
});
test('variable-weight, unpublished, unavailable and off-origin Mercadona products are excluded', () => {
  for (const price of [{ approx_size: true }, { selling_method: 1 }, { bunch_selector: true }])
    assert.deepEqual(mercadona(m({}, price), checkedAt), []);
  for (const extra of [
    { published: false },
    { unavailable_from: '2026-11-03' },
    { share_url: 'https://evil.test/product/12/huevos' },
  ])
    assert.deepEqual(mercadona(m(extra), checkedAt), []);
});
test('Aldi uses explicit dates and original sales unit; recalls/missing dates cannot become offers', () => {
  const [row] = aldi(a(), checkedAt);
  assert.equal(row.amountMilli, 2850);
  assert.equal(row.quantity, '3 kg');
  assert.equal(row.isOffer, true);
  assert.equal(row.startsAt, '2026-11-01T23:00:00.000Z');
  assert.deepEqual(aldi(a({ isRecall: true }), checkedAt), []);
  assert.deepEqual(aldi(a({}, { validUntil: null }), checkedAt), []);
});
test('Lidl Plus remains a separate conditional price and other regions are never substituted', () => {
  const rows = lidl(l({ ...lp, price: 1.75 }, lp), checkedAt);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].id, 'lidl:12:regular');
  assert.equal(rows[1].id, 'lidl:12:plus');
  assert.match(rows[1].conditions, /Lidl Plus/);
  assert.deepEqual(
    lidl(l(undefined, undefined, { regionsPrices: { 2: { currentPrice: lp } } }), checkedAt),
    [],
  );
});
test('Lidl ambiguous variable or from-prices do not enter as a single precise price', () => {
  assert.deepEqual(lidl(l({ ...lp, discount: { discountText: '-50% 2a ud' } }), checkedAt), []);
  assert.deepEqual(aldi(a({}, { priceTagLabels: { promoText1: '4x1 €' } }), checkedAt), []);
  assert.deepEqual(aldi(a({}, { priceTagLabels: { promoText1: '2ª ud al -50%' } }), checkedAt), []);
  assert.deepEqual(lidl(l({ ...lp, variantsHaveDifferentPrices: true }), checkedAt), []);
  assert.deepEqual(lidl(l({ ...lp, discount: { showFrom: true } }), checkedAt), []);
  assert.deepEqual(lidl(l({ ...lp, currencyCode: 'GBP' }), checkedAt), []);
  assert.throws(() => lidl('<html>No grid</html>', checkedAt));
  assert.throws(() => aldi('<html>No data</html>', checkedAt));
});
