import { test, expect, type Page } from '@playwright/test';

const code = '3274080005003';
const today = new Date().toISOString().slice(0, 10);
function quote(id: number, price: number, store: string, overrides = {}) {
  return {
    id,
    type: 'PRODUCT',
    product_code: code,
    price,
    currency: 'EUR',
    date: today,
    price_per: null,
    created: `${today}T08:00:00Z`,
    price_is_discounted: false,
    duplicate_of: null,
    location: {
      id,
      type: 'OSM',
      osm_name: store,
      osm_display_name: `${store}, Madrid, España`,
      osm_address_country_code: 'ES',
    },
    ...overrides,
  };
}
const api = 'https://prices.openfoodfacts.org/api/v1/prices?**';
async function routes(page: Page) {
  await page.route('https://world.openfoodfacts.org/api/v2/product/**', (route) =>
    route.fulfill({
      json: {
        status: 1,
        product: {
          code,
          product_name: 'Producto comparador',
          brands: 'Hacendado',
          stores: 'Mercadona',
          labels_tags: ['en:no-gluten'],
          allergens_tags: [],
          traces_tags: ['en:gluten'],
          ingredients_text: 'Arroz',
        },
      },
    }),
  );
  await page.route(api, (route) =>
    route.fulfill({
      json: {
        items: [
          quote(1, 1.99, 'Tienda económica'),
          quote(2, 3.49, 'Otra tienda'),
          quote(3, 0.5, 'Oferta con tarjeta', { price_is_discounted: true }),
          quote(4, 1, 'Tienda francesa', {
            location: {
              id: 4,
              type: 'OSM',
              osm_name: 'Tienda francesa',
              osm_display_name: 'Paris, France',
              osm_address_country_code: 'FR',
            },
          }),
        ],
        page: 1,
        pages: 1,
        size: 50,
        total: 4,
      },
    }),
  );
}

test('desde la ficha propone el supermercado, permite corregirlo y compara precios públicos sin publicar los privados', async ({
  page,
}) => {
  await routes(page);
  const requests: { method: string; url: string }[] = [];
  page.on('request', (request) => {
    if (request.url().includes('prices.openfoodfacts.org'))
      requests.push({ method: request.method(), url: request.url() });
  });
  await page.goto('/scan');
  await page.getByRole('textbox', { name: 'Código de barras', exact: true }).fill(code);
  await page.getByRole('button', { name: 'Buscar producto', exact: true }).click();
  await page.getByRole('button', { name: 'Comparar precios y anotar', exact: true }).click();
  await expect(
    page.getByRole('textbox', { name: 'Supermercado o tienda', exact: true }),
  ).toHaveValue('Mercadona');
  await expect(page.getByText(/^Menor precio entre los datos comparables:/)).toContainText('1,99');
  await page.getByText(/^Menor precio entre los datos comparables:/).scrollIntoViewIfNeeded();
  await page.screenshot({ path: test.info().outputPath('comparison-mobile.png') });
  await page
    .getByRole('textbox', { name: 'Supermercado o tienda', exact: true })
    .fill('Tienda elegida');
  await page.getByRole('textbox', { name: 'Precio en euros', exact: true }).fill('2,49');
  await page.getByRole('textbox', { name: 'Sucursal o localidad', exact: true }).fill('Madrid');
  await page.getByRole('button', { name: 'Guardar precio privado', exact: true }).click();
  await expect(
    page.getByText('Precio guardado en este dispositivo.', { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByText('Tienda elegida · Madrid', { exact: true }).first()).toBeVisible();
  expect(
    requests.every(
      (request) => request.method === 'GET' && !request.url.includes('Tienda%20elegida'),
    ),
  ).toBe(true);
  await page
    .getByRole('button', { name: 'Incluir ofertas y anotaciones con notas', exact: true })
    .click();
  await expect(page.getByText(/^Menor precio entre los datos comparables:/)).toContainText('0,50');
  await page
    .getByRole('button', { name: 'Ver ficha e información sobre gluten', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Figura como sin gluten', exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/La fuente declara trazas: Gluten/)).toBeVisible();
});

test('el comparador distingue ámbito geográfico, ofertas y filtros sin afirmar cobertura completa', async ({
  page,
}) => {
  await routes(page);
  await page.goto(`/prices/${code}`);
  await expect(page.getByText(/^Menor precio entre los datos comparables:/)).toContainText('1,99');
  await page.getByRole('button', { name: 'Precios públicos solo de España', exact: true }).click();
  await expect(page.getByText(/^Menor precio entre los datos comparables:/)).toContainText('1,00');
  await page
    .getByRole('textbox', { name: 'Filtrar tienda o localidad', exact: true })
    .fill('No existe');
  await expect(page.getByText(/No hay precios que cumplan estos filtros/)).toBeVisible();
  await expect(page.getByText(/No es un catálogo completo ni una tarifa oficial/)).toBeVisible();
});

test('un error de precios públicos deja operativo el formulario y no se presenta como ausencia de producto', async ({
  page,
}) => {
  await routes(page);
  await page.route(api, (route) => route.fulfill({ status: 503, json: {} }));
  await page.goto(`/prices/${code}`);
  await expect(
    page.getByText('Open Prices no está disponible en este momento.', { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Precio en euros', exact: true })).toBeEditable();
  await expect(
    page.getByRole('button', { name: 'Reintentar precios públicos', exact: true }),
  ).toBeVisible();
});

test('el inicio prioriza comparar y conserva el filtro adicional sobre gluten', async ({
  page,
}) => {
  await routes(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Comparar precios', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Comparar precios', exact: true })).toBeVisible();
  await page
    .getByRole('button', { name: 'Solo productos con declaración sin gluten', exact: true })
    .click();
  await expect(page.getByText(/No hay productos guardados que cumplan este filtro/)).toBeVisible();
  await page.getByRole('textbox', { name: 'Código para comparar precios', exact: true }).fill(code);
  await page.getByRole('button', { name: 'Comparar este código', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Dónde sale mejor', exact: true })).toBeVisible();
});
