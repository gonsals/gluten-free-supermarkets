import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { dia, caprabo, ametller, mercadona } = require('../../scripts/lib/retail-parsers.cjs');
const { diaItem, diaPage, capraboPage, ametllerPage } = require('../fixtures/retail-pages.cjs');
const at = '2026-11-04T10:00:00.000Z',
  group = { group: 'category:eggs' };
test('DIA entiende ambas páginas y conserva SKU de multipack sin fabricar un código de barras', () => {
  for (const level of ['l1', 'l2']) {
    const [p] = dia(
      diaPage(
        [diaItem({ sku_id: '1P6', url: '/leche/p/1P6', display_name: 'Leche pack 6 x 1 L' })],
        level,
      ),
      at,
      { group: 'category:milk' },
    );
    assert.equal(p.sku, '1P6');
    assert.equal(p.quantity, 'pack 6 x 1 L');
    assert.equal(p.amountMilli, 2500);
    assert.equal(p.barcode, undefined);
    assert.equal(p.owner, undefined);
  }
});
test('DIA excluye falta de stock, peso variable y precios de socios o promoción ambigua', () => {
  for (const extra of [
    { units_in_stock: 0 },
    { average_weight: 250 },
    { weight: 500 },
    { prices: { ...diaItem().prices, is_club_price: true } },
    { prices: { ...diaItem().prices, is_promo_price: true } },
  ])
    assert.deepEqual(dia(diaPage([diaItem(extra)]), at, group), []);
});
test('Caprabo exige coincidencia entre el importe visible y el metadato de ese producto', () => {
  assert.equal(caprabo(capraboPage(), at, group)[0].amountMilli, 2500);
  assert.deepEqual(caprabo(capraboPage({ price: 2.1 }), at, group), []);
  assert.deepEqual(caprabo(capraboPage({ currency: 'USD' }), at, group), []);
  assert.deepEqual(caprabo(capraboPage({ promo: 'Segunda unidad al 50%' }), at, group), []);
});
test('Ametller conserva formato y fuente, sin imágenes ni datos ajenos al precio', () => {
  const [p] = ametller(ametllerPage(), at, group);
  assert.equal(p.quantity, '6uds.');
  assert.equal(p.image, undefined);
  assert.equal(p.amountMilli, 2500);
  assert.deepEqual(
    ametller(
      ametllerPage({
        offers: { price: 1, priceCurrency: 'EUR', availability: 'https://schema.org/OutOfStock' },
      }),
      at,
      group,
    ),
    [],
  );
  assert.deepEqual(ametller(ametllerPage({ url: 'https://evil.test/p' }), at, group), []);
});
test('Mercadona Barcelona tiene identidad propia; no cambia la etiqueta de una observación de Valencia', () => {
  const payload = {
    id: 77,
    categories: [
      {
        products: [
          {
            id: '1',
            display_name: 'Huevos',
            published: true,
            status: null,
            share_url: 'https://tienda.mercadona.es/product/1/huevos',
            price_instructions: {
              unit_price: '1.8',
              selling_method: 0,
              unit_size: 6,
              size_format: 'ud',
            },
          },
        ],
      },
    ],
  };
  const [old] = mercadona(payload, at),
    [bcn] = mercadona(payload, at, { warehouse: 'bcn1' });
  assert.notEqual(old.id, bcn.id);
  assert.equal(bcn.group, 'category:77@bcn1');
  assert.match(bcn.scope, /Barcelona/);
  assert.match(old.scope, /Valencia/);
  assert.equal(old.id, 'mercadona:1');
});
