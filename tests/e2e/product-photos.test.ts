import { test, expect } from '@playwright/test';
import { expandSection } from './helpers/disclosure';
import { items } from './fixtures/shopping';

const raw =
  'https://raw.githubusercontent.com/gonsals/gluten-free-supermarkets/main/data/retail-prices.es.json';
const first = 'https://prod-mercadona.imgix.net/images/rice-one.jpg?fit=crop&h=300&w=300';
const second = 'https://prod-mercadona.imgix.net/images/rice-two.jpg?fit=crop&h=300&w=300';
const broken = 'https://www.lidl.es/assets/rice-broken.png';
const pixel = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9ioAAAAASUVORK5CYII=',
  'base64',
);

test('cada foto identifica su producto; las fotos plegadas esperan y los fallos conservan el precio', async ({
  page,
}) => {
  const now = new Date().toISOString();
  const row = {
    retailer: 'mercadona',
    sku: '1',
    id: 'mercadona:1:bcn1',
    group: 'category:118@bcn1',
    name: 'Arroz redondo de ensayo',
    quantity: '1 kg',
    amountMilli: 1150,
    scope: 'Referencia online Barcelona',
    sourceUrl: 'https://tienda.mercadona.es/product/1/arroz',
    checkedAt: now,
    startsAt: null,
    endsAt: null,
    isOffer: false,
    conditions: '',
    unitPrice: null,
    imageUrl: first,
  };
  const feed = {
    version: 1,
    generatedAt: now,
    sources: ['mercadona', 'aldi', 'lidl'].map((retailer) => ({
      retailer,
      status: 'ok',
      attemptedAt: now,
    })),
    entries: [
      row,
      {
        ...row,
        sku: '2',
        id: 'mercadona:2:bcn1',
        name: 'Arroz largo de ensayo',
        amountMilli: 1200,
        imageUrl: second,
        sourceUrl: 'https://tienda.mercadona.es/product/2/arroz',
      },
      {
        ...row,
        retailer: 'lidl',
        id: 'lidl:1',
        group: 'weekly',
        name: 'Arroz de ensayo Lidl',
        amountMilli: 1500,
        imageUrl: broken,
        sourceUrl: 'https://www.lidl.es/p/arroz/p1',
      },
      {
        ...row,
        retailer: 'aldi',
        id: 'aldi:1',
        group: 'weekly',
        name: 'Arroz de ensayo Aldi',
        amountMilli: 2000,
        imageUrl: 'https://evil.test/fake.jpg',
        sourceUrl: 'https://www.aldi.es/producto/arroz-1.html',
      },
    ],
  };
  const images: string[] = [];
  await page.route(raw, (route) => route.fulfill({ json: feed }));
  await page.route('https://prices.openfoodfacts.org/api/v1/**', (route) =>
    route.fulfill({ json: { items: [], page: 1, pages: 1, total: 0, size: 20 } }),
  );
  for (const url of [first, second])
    await page.route(url, (route) => {
      images.push(route.request().url());
      return route.fulfill({ contentType: 'image/png', body: pixel });
    });
  await page.route(broken, (route) => route.fulfill({ status: 404, body: '' }));
  let unsafeRequests = 0;
  await page.route('https://evil.test/**', (route) => {
    unsafeRequests++;
    return route.abort();
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Arroz', exact: true }).click();
  await expect(
    page.getByRole('img', { name: 'Foto de Arroz redondo de ensayo', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('img', { name: 'Sin foto de Arroz de ensayo Lidl', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('img', { name: 'Sin foto de Arroz de ensayo Aldi', exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel(/€ · Lidl$/)).toContainText('1,50');
  await expect(page.getByLabel(/€ · Aldi$/)).toContainText('2,00');
  expect(images).toContain(first);
  expect(images).not.toContain(second);
  await expandSection(page, 'Ver los 2 precios de Mercadona');
  await expect(
    page.getByRole('img', { name: 'Foto de Arroz largo de ensayo', exact: true }),
  ).toBeVisible();
  expect(images).toContain(second);
  expect(unsafeRequests).toBe(0);
  expect(new URL(page.url()).pathname).toBe('/');
});

test('la foto pública espera a abrir sus aportaciones y corresponde al mismo código', async ({
  page,
}) => {
  const now = new Date().toISOString();
  const url =
    'https://images.openfoodfacts.org/images/products/001/740/011/2530/front_en.5.400.jpg';
  const code = items.rice.code;
  let downloads = 0;
  await page.route(url, (route) => {
    downloads++;
    return route.fulfill({ contentType: 'image/png', body: pixel });
  });
  await page.route(raw, (route) =>
    route.fulfill({
      json: {
        version: 1,
        generatedAt: now,
        entries: [],
        sources: ['mercadona', 'aldi', 'lidl'].map((retailer) => ({
          retailer,
          status: 'ok',
          attemptedAt: now,
        })),
      },
    }),
  );
  await page.route('https://prices.openfoodfacts.org/api/v1/**', (route) => {
    const products = new URL(route.request().url()).pathname.endsWith('/products');
    return route.fulfill({
      json: {
        items: products
          ? [
              {
                code,
                product_name: 'Arroz comunitario de ensayo',
                source: 'off',
                quantity: '1 kg',
                image_url: url,
              },
            ]
          : [
              {
                id: 1,
                product_code: code,
                type: 'PRODUCT',
                price: 1.3,
                currency: 'EUR',
                price_per: null,
                price_is_discounted: false,
                date: now.slice(0, 10),
                location: {
                  id: 1,
                  type: 'OSM',
                  osm_name: 'Tienda de ensayo',
                  osm_display_name: 'Barcelona',
                  osm_address_country_code: 'ES',
                },
              },
            ],
        page: 1,
        pages: 1,
        total: 1,
        size: products ? 20 : 50,
      },
    });
  });
  await page.goto('/prices');
  await page.getByRole('button', { name: 'Arroz', exact: true }).click();
  await expect(page.getByText('0 supermercados con precios', { exact: true })).toBeVisible();
  expect(downloads).toBe(0);
  await expandSection(page, 'Otras aportaciones y mis precios');
  await expect(
    page.getByRole('img', { name: 'Foto de Arroz comunitario de ensayo', exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/por envase · Tienda de ensayo/)).toContainText('1,30');
  expect(downloads).toBeGreaterThan(0);
});
