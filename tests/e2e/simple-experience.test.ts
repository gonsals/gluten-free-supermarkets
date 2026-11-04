import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { expandSection } from './helpers/disclosure';

const code = '3274080005003';

test('muestra primero la comparación y conserva los filtros al cerrar sus opciones', async ({
  page,
}) => {
  await page.route('https://prices.openfoodfacts.org/**', (route) =>
    route.fulfill({
      json: {
        items: [false, true].map((discount, index) => ({
          id: index + 1,
          type: 'PRODUCT',
          product_code: code,
          price: discount ? 1 : 2,
          currency: 'EUR',
          date: new Date().toISOString().slice(0, 10),
          price_per: null,
          price_is_discounted: discount,
          duplicate_of: null,
          location: {
            id: index + 1,
            type: 'OSM',
            osm_name: discount ? 'Oferta' : 'Tienda',
            osm_display_name: 'Madrid',
            osm_address_country_code: 'ES',
          },
        })),
        page: 1,
        pages: 1,
        size: 50,
        total: 2,
      },
    }),
  );
  await page.goto('/');
  await expect(page.getByRole('textbox', { name: 'Buscar productos', exact: true })).toBeVisible();
  await page.screenshot({ path: test.info().outputPath('inicio-simple.png'), fullPage: true });
  await page.getByRole('tab', { name: 'Comparar', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Precio en euros', exact: true })).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Solo productos con declaración sin gluten', exact: true }),
  ).toHaveCount(0);
  await expandSection(page, 'Buscar por código o escanear');
  await page.getByRole('textbox', { name: 'Código para comparar precios', exact: true }).fill(code);
  await page.getByRole('button', { name: 'Comparar este código', exact: true }).click();
  const result = page.getByText(/^Menor precio entre los datos comparables:/);
  await expect(result).toContainText('2,00');
  const filters = page.getByRole('button', { name: 'Cambiar filtros de precios', exact: true });
  await expect(filters).toHaveAttribute('aria-expanded', 'false');
  await expect(
    page.getByRole('button', { name: 'Incluir ofertas y anotaciones con notas', exact: true }),
  ).toHaveCount(0);
  await filters.click();
  await page
    .getByRole('button', { name: 'Incluir ofertas y anotaciones con notas', exact: true })
    .click();
  await expect(result).toContainText('1,00');
  await filters.click();
  await expect(filters).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByText(/Con condiciones · España/)).toBeVisible();
  await expect(page.getByText(/Has ampliado la comparación/)).toBeVisible();
  await filters.click();
  await expect(
    page.getByRole('button', { name: 'Incluir ofertas y anotaciones con notas', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
});

test('conserva el borrador al plegar opciones y exporta el precio con su formato y condiciones', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/prices');
  await expandSection(page, 'Mis productos y precios');
  const form = page.getByRole('button', {
    name: 'Anotar un precio sin buscar el producto',
    exact: true,
  });
  await form.click();
  await page
    .getByRole('textbox', { name: 'Código de barras del producto', exact: true })
    .fill(code);
  await page.getByRole('textbox', { name: 'Precio en euros', exact: true }).fill('2,49');
  await page
    .getByRole('textbox', { name: 'Supermercado o tienda', exact: true })
    .fill('Tienda de ensayo');
  await page
    .getByRole('textbox', { name: 'Sucursal o localidad', exact: true })
    .fill('Calle de ensayo 1');
  await expect(
    page.getByRole('textbox', { name: 'Componentes del pack', exact: true }),
  ).toHaveCount(0);
  await expandSection(page, 'Fecha, formato y condiciones');
  await page
    .getByRole('textbox', { name: 'Cantidad del envase (opcional)', exact: true })
    .fill('500');
  await page.getByRole('button', { name: 'Gramos', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Condiciones o notas (opcional)', exact: true })
    .fill('Solo con tarjeta de ensayo');
  await page.getByRole('button', { name: 'Fecha, formato y condiciones', exact: true }).click();
  await form.click();
  await expect(page.getByRole('textbox', { name: 'Precio en euros', exact: true })).toHaveCount(0);
  await form.click();
  await expect(page.getByRole('textbox', { name: 'Precio en euros', exact: true })).toHaveValue(
    '2,49',
  );
  await expect(page.getByText(/Este precio incluye condiciones/)).toBeVisible();
  await expandSection(page, 'Fecha, formato y condiciones');
  await expect(
    page.getByRole('textbox', { name: 'Cantidad del envase (opcional)', exact: true }),
  ).toHaveValue('500');
  await expect(page.getByRole('button', { name: 'Gramos', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('button', { name: 'Fecha, formato y condiciones', exact: true }).click();
  await page.addStyleTag({
    content: 'div,span,input,button,a { font-size:26px !important; line-height:1.5 !important; }',
  });
  const save = page.getByRole('button', { name: 'Guardar precio', exact: true });
  await save.scrollIntoViewIfNeeded();
  await expect(save).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: test.info().outputPath('precio-simple-texto-ampliado.png') });
  await save.click();
  await expect(
    page.getByText('Precio guardado en este dispositivo.', { exact: true }),
  ).toBeVisible();
  await page.goto('/settings');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar mis datos', exact: true }).click();
  const copy = JSON.parse(await readFile((await (await download).path())!, 'utf8'));
  expect(copy.prices).toHaveLength(1);
  expect(copy.prices[0]).toMatchObject({
    barcode: code,
    amountMinor: 249,
    store: 'Tienda de ensayo',
    location: 'Calle de ensayo 1',
    quantity: 0.5,
    unit: 'kg',
    notes: 'Solo con tarjeta de ensayo',
  });
});
