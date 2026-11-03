import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { items, seedCopy } from './fixtures/shopping';
import { expandSection } from './helpers/disclosure';

const egg = items.rice.code,
  pack = items.alternative.code,
  milk = items.milk.code;
const today = new Date().toISOString().slice(0, 10);
const product = (code = egg, name = 'Huevos de ensayo', quantity = '6 unidades') => ({
  code,
  product_name: name,
  quantity,
  brands: 'Marca de ensayo',
  source: 'off',
  price_count: 2,
});
const price = (code = egg, id = 1, amount = 1.995, extra = {}) => ({
  id,
  product_code: code,
  type: 'PRODUCT',
  price: amount,
  currency: 'EUR',
  price_per: null,
  date: today,
  created: today + 'T08:00:00Z',
  price_is_discounted: false,
  location: {
    id,
    type: 'OSM',
    osm_name: 'Tienda A',
    osm_display_name: 'Madrid, España',
    osm_address_country_code: 'ES',
  },
  ...extra,
});
const pageBody = (rows: unknown[], size: number, extra = {}) => ({
  items: rows,
  size,
  page: 1,
  pages: 1,
  total: rows.length,
  ...extra,
});
async function search(page: Page, name = 'huevos', store = '') {
  await page.getByRole('textbox', { name: 'Buscar productos', exact: true }).fill(name);
  await page
    .getByRole('textbox', { name: 'Tienda o localidad (opcional)', exact: true })
    .fill(store);
  await page.getByRole('button', { name: 'Buscar precios', exact: true }).click();
}

test('buscar huevos ordena los envases, recupera ofertas con condiciones y filtra tienda sin subir datos', async ({
  page,
}) => {
  const urls: string[] = [];
  await page.route('https://prices.openfoodfacts.org/api/v1/**', (route) => {
    const url = new URL(route.request().url());
    urls.push(url.toString());
    expect(route.request().method()).toBe('GET');
    if (url.pathname.endsWith('/products'))
      return route.fulfill({
        json: pageBody([product(), product(pack, 'Huevos grandes de ensayo', '12 unidades')], 20),
      });
    return route.fulfill({
      json: pageBody(
        [
          price(),
          price(egg, 2, 0.8, { date: '2020-01-01', price_is_discounted: true }),
          price(pack, 3, 1.5, {
            price_is_discounted: true,
            discount_type: 'LOYALTY_PROGRAM',
            location: {
              id: 3,
              type: 'OSM',
              osm_name: 'Tienda oferta',
              osm_display_name: 'Madrid, España',
              osm_address_country_code: 'ES',
            },
          }),
          price(egg, 4, 0.4, {
            location: {
              id: 4,
              type: 'OSM',
              osm_name: 'Tienda extranjera',
              osm_display_name: 'Paris',
              osm_address_country_code: 'FR',
            },
          }),
        ],
        50,
      ),
    });
  });
  await page.goto('/prices');
  await search(page);
  const results = page.getByText(/por envase ·/);
  await expect(results).toHaveCount(2);
  await expect(results.nth(0)).toContainText('1,50');
  await expect(results.nth(1)).toContainText('1,995');
  await expect(page.getByText('Formato: 12 unidades.', { exact: true })).toBeVisible();
  await expect(page.getByText(/Requiere tarjeta o programa de fidelidad/)).toBeVisible();
  await expect(page.getByText(/Oferta observada. Confirma su vigencia/)).toBeVisible();
  expect(urls).toHaveLength(2);
  await page
    .getByRole('heading', { name: 'Precios para «huevos»', exact: true })
    .scrollIntoViewIfNeeded();
  await page.screenshot({ path: test.info().outputPath('busqueda-huevos.png') });
  await expandSection(page, 'Filtrar precios y ofertas');
  await page.getByRole('button', { name: 'Solo ofertas', exact: true }).click();
  await expect(results).toHaveCount(1);
  expect(urls).toHaveLength(2);
  await page.getByRole('button', { name: 'Solo ofertas', exact: true }).click();
  await search(page, 'huevos', 'Tienda A');
  await expect(results).toHaveCount(1);
  await expect(results).toContainText('1,995');
  expect(urls.every((url) => !url.includes('Tienda'))).toBe(true);
  await page.getByRole('button', { name: 'Comparar Huevos de ensayo', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Huevos de ensayo', exact: true })).toBeVisible();
});

test('un fallo público conserva la búsqueda privada y las copias no incorporan el catálogo', async ({
  page,
}) => {
  const initial = seedCopy();
  initial.basket[0].name = 'Huevos privados de ensayo';
  await page.goto('/settings');
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Restaurar una copia', exact: true }).click();
  await (
    await chooser
  ).setFiles({
    name: 'privado.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(initial)),
  });
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Sustituir y restaurar', exact: true })
    .click();
  await expect(page.getByText(/Copia restaurada en este dispositivo/)).toBeVisible();
  const urls: string[] = [];
  await page.route('https://prices.openfoodfacts.org/api/v1/**', (route) => {
    urls.push(route.request().url());
    return route.fulfill({ status: 503, json: {} });
  });
  await page.goto('/prices');
  await search(page, 'huevos', 'Ensayo B');
  await expect(
    page.getByText('Open Prices no está disponible en este momento.', { exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/por envase · Ensayo B/)).toContainText('1,65');
  await expect(page.getByText('Tu anotación privada', { exact: true })).toBeVisible();
  expect(urls).toHaveLength(1);
  expect(urls[0]).not.toContain(egg);
  expect(urls[0]).not.toContain('Ensayo');
  await page.goto('/settings');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar mis datos', exact: true }).click();
  const copy = JSON.parse(await readFile((await (await download).path())!, 'utf8'));
  expect(copy.prices).toEqual(initial.prices);
  expect(copy.products).toEqual([]);
});

test('precios antiguos se abren expresamente y las ofertas oficiales son enlaces separados', async ({
  page,
}) => {
  await page.route('https://prices.openfoodfacts.org/api/v1/**', (route) =>
    route.fulfill({
      json: route.request().url().includes('/products?')
        ? pageBody([product()], 20)
        : pageBody([price(egg, 1, 2.28, { date: '2020-01-01' })], 50),
    }),
  );
  await page.goto('/prices');
  await search(page);
  await expect(page.getByText(/No hay precios recientes que cumplan esta búsqueda/)).toBeVisible();
  await expect(page.getByText(/por envase ·/)).toHaveCount(0);
  await page
    .getByRole('button', { name: 'Ver precios anteriores de esta búsqueda', exact: true })
    .click();
  await expect(page.getByText(/Incluyes precios antiguos/)).toBeVisible();
  await expect(page.getByText(/observado el 2020-01-01/)).toBeVisible();
  await expandSection(page, 'Ver ofertas oficiales de supermercados');
  await expect(
    page.getByRole('button', { name: 'Ofertas oficiales de Lidl', exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/no se incorporan automáticamente al ranking/)).toBeVisible();
});

test('cancelar una búsqueda descarta su respuesta tardía al buscar otro producto', async ({
  page,
}) => {
  let release: () => void = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  const urls: string[] = [];
  await page.route('https://prices.openfoodfacts.org/api/v1/**', async (route) => {
    const url = new URL(route.request().url());
    urls.push(url.toString());
    if (url.searchParams.get('product_name__like') === 'huevos') {
      await held;
      await route.fulfill({ json: pageBody([product()], 20) }).catch(() => {});
      return;
    }
    await route.fulfill({
      json: url.pathname.endsWith('/products')
        ? pageBody([product(milk, 'Leche de ensayo', '1 l')], 20)
        : pageBody([price(milk, 1, 1.2)], 50),
    });
  });
  await page.goto('/prices');
  await search(page);
  await expect(
    page.getByRole('button', { name: 'Cancelar búsqueda de precios', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Cancelar búsqueda de precios', exact: true }).click();
  await search(page, 'leche');
  await expect(page.getByText('Leche de ensayo', { exact: true })).toBeVisible();
  release();
  await expect(
    page.getByRole('heading', { name: 'Precios para «leche»', exact: true }),
  ).toBeVisible();
  await expect(page.getByText('Huevos de ensayo', { exact: true })).toHaveCount(0);
  expect(urls.some((url) => url.includes('product_code__in=' + egg))).toBe(false);
});

test('carga la siguiente página solo al pedirla y conserva los resultados anteriores', async ({
  page,
}) => {
  let catalogCalls = 0;
  await page.route('https://prices.openfoodfacts.org/api/v1/**', (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/products')) {
      catalogCalls++;
      const second = url.searchParams.get('page') === '2';
      return route.fulfill({
        json: pageBody([second ? product(pack, 'Huevos grandes', '12 unidades') : product()], 20, {
          page: second ? 2 : 1,
          pages: 2,
          total: 2,
        }),
      });
    }
    const second = url.searchParams.get('product_code__in') === pack;
    return route.fulfill({
      json: pageBody([price(second ? pack : egg, second ? 2 : 1, second ? 1.5 : 2.5)], 50),
    });
  });
  await page.goto('/prices');
  await search(page);
  await expect(page.getByText(/por envase ·/)).toHaveCount(1);
  expect(catalogCalls).toBe(1);
  await page
    .getByRole('button', { name: 'Buscar más productos coincidentes', exact: true })
    .click();
  await expect(page.getByText(/por envase ·/)).toHaveCount(2);
  await expect(page.getByText(/por envase ·/).first()).toContainText('1,50');
  expect(catalogCalls).toBe(2);
});

test('volver desde otra pestaña tras interrumpir la consulta no afirma que no existan precios', async ({
  page,
}) => {
  let release: () => void = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('https://prices.openfoodfacts.org/api/v1/products?**', async (route) => {
    await held;
    await route.fulfill({ json: pageBody([product()], 20) }).catch(() => {});
  });
  await page.goto('/prices');
  await search(page);
  await expect(
    page.getByRole('button', { name: 'Cancelar búsqueda de precios', exact: true }),
  ).toBeVisible();
  await page.getByRole('tab', { name: 'Biblioteca', exact: true }).click();
  await page.getByRole('tab', { name: 'Comparar', exact: true }).click();
  await expect(
    page.getByText('Búsqueda cancelada. Puedes volver a buscar.', { exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/No hay precios recientes que cumplan esta búsqueda/)).toHaveCount(0);
  release();
});
