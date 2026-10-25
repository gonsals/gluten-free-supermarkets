import { test, expect } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const code = '3274080005003';
const fixture = {
  status: 1,
  product: {
    code,
    product_name: 'Producto de prueba',
    brands: 'Marca de prueba',
    labels_tags: ['en:no-gluten'],
    allergens_tags: [],
    traces_tags: [],
    ingredients_text: 'Ingredientes de prueba',
  },
};
test.beforeEach(async ({ page }) => {
  await page.route('https://world.openfoodfacts.org/api/v2/product/**', (route) =>
    route.fulfill({ json: fixture }),
  );
});
test('consulta, guarda favorito, persiste tras recargar y abre la ficha sin red', async ({
  page,
  context,
}) => {
  await page.goto('/scan');
  await page.getByRole('textbox', { name: 'Código de barras', exact: true }).fill(code);
  await page.getByRole('button', { name: 'Buscar producto', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Figura como sin gluten', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Guardar en favoritos', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Quitar de favoritos', exact: true }),
  ).toBeVisible();
  await page.goto('/library');
  await expect(page.getByRole('button', { name: 'Abrir Producto de prueba' })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Abrir Producto de prueba' }).click();
  await expect(
    page.getByRole('heading', { name: 'Figura como sin gluten', exact: true }),
  ).toBeVisible();
  await page.goBack();
  await page.unroute('https://world.openfoodfacts.org/api/v2/product/**');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  await context.setOffline(true);
  await page.reload();
  await page.getByRole('button', { name: 'Abrir Producto de prueba' }).click();
  await expect(
    page.getByRole('heading', { name: 'Figura como sin gluten', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Actualizar información', exact: true }).click();
  await expect(page.getByText(/No hay conexión con la fuente/)).toBeInViewport();
  await expect(
    page.getByRole('heading', { name: 'Producto de prueba', exact: true }),
  ).toBeVisible();
  await context.setOffline(false);
  await page.screenshot({ path: 'test-results/ficha-mobile.png', fullPage: true });
});
test('datos ausentes y trazas se explican sin inventar una conclusión', async ({ page }) => {
  await page.route('https://world.openfoodfacts.org/api/v2/product/**', (route) =>
    route.fulfill({
      json: {
        status: 1,
        product: { code, product_name: 'Datos incompletos', traces_tags: ['en:gluten'] },
      },
    }),
  );
  await page.goto('/scan');
  await page.getByRole('textbox', { name: 'Código de barras', exact: true }).fill(code);
  await page.getByRole('button', { name: 'Buscar producto', exact: true }).click();
  await expect(page.getByText('Información insuficiente', { exact: true })).toBeVisible();
  await expect(page.getByText(/La fuente declara trazas/)).toBeVisible();
});
test('recupera el escáner tras no encontrado y rechaza código inválido antes de consultar', async ({
  page,
}) => {
  let calls = 0;
  await page.route('https://world.openfoodfacts.org/api/v2/product/**', (route) => {
    calls++;
    return route.fulfill({ json: { status: 0 } });
  });
  await page.goto('/scan');
  await page.getByRole('textbox', { name: 'Código de barras', exact: true }).fill('123');
  await page.getByRole('button', { name: 'Buscar producto', exact: true }).click();
  await expect(page.getByText(/Introduce un código EAN o UPC válido/)).toBeVisible();
  expect(calls).toBe(0);
  await page.getByRole('button', { name: 'Consultar otro producto', exact: true }).click();
  await page.getByRole('textbox', { name: 'Código de barras', exact: true }).fill(code);
  await page.getByRole('button', { name: 'Buscar producto', exact: true }).click();
  await expect(page.getByText(/Este producto no aparece en la fuente/)).toBeVisible();
  await page.getByRole('button', { name: 'Consultar otro producto', exact: true }).click();
  await expect(page.getByText(/Este producto no aparece en la fuente/)).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: 'Código de barras', exact: true })).toHaveValue(
    '',
  );
});

test('la ficha muestra procedencia y trazas y abre la guía sin conexión', async ({
  page,
  context,
}) => {
  await page.route('https://world.openfoodfacts.org/api/v2/product/**', (route) =>
    route.fulfill({
      json: {
        status: 1,
        product: {
          code,
          product_name: 'Ficha incompleta',
          labels_tags: ['en:no-gluten'],
          traces_tags: ['en:gluten'],
        },
      },
    }),
  );
  await page.goto('/scan');
  await page.getByRole('textbox', { name: 'Código de barras', exact: true }).fill(code);
  await page.getByRole('button', { name: 'Buscar producto', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Figura como sin gluten', exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/Información de Open Food Facts/)).toBeVisible();
  await expect(
    page.getByText(/Sin información disponible: ingredientes, alérgenos declarados/),
  ).toBeVisible();
  await expect(page.getByText(/La fuente declara trazas: Gluten/)).toBeVisible();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  await context.setOffline(true);
  await page.getByRole('button', { name: 'Cómo interpretar este resultado', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Cómo leer una ficha', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Datos contradictorios', exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Cómo leer una ficha', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText('No significa que el producto contenga gluten.', { exact: true }),
  ).toBeVisible();
  await context.setOffline(false);
});

test('una jerarquía de etiquetas inválida muestra contradicción y conserva la evidencia', async ({
  page,
}) => {
  await page.route('https://world.openfoodfacts.org/api/v2/product/**', (route) =>
    route.fulfill({
      json: {
        status: 1,
        product: {
          code,
          product_name: 'Formato incorrecto',
          labels_tags: ['en:no-gluten'],
          labels_hierarchy: 'en:no-gluten',
          ingredients_text_es: 'Arroz y sal',
        },
      },
    }),
  );
  await page.goto('/scan');
  await page.getByRole('textbox', { name: 'Código de barras', exact: true }).fill(code);
  await page.getByRole('button', { name: 'Buscar producto', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Datos contradictorios', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Figura como sin gluten', exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText(/Algunos campos recibidos no tienen el formato esperado/),
  ).toBeVisible();
  await expect(page.getByText('Arroz y sal', { exact: true })).toBeVisible();
});
test('anota un precio privado y lo conserva tras recargar', async ({ page }) => {
  await page.goto('/prices');
  await page
    .getByRole('textbox', { name: 'Código de barras del producto', exact: true })
    .fill(code);
  await page.getByRole('textbox', { name: 'Precio en euros', exact: true }).fill('2,49');
  await page
    .getByRole('textbox', { name: 'Supermercado o tienda', exact: true })
    .fill('Tienda de prueba');
  await page
    .getByRole('textbox', { name: 'Sucursal o localidad', exact: true })
    .fill('Madrid, sucursal de prueba');
  await page.getByRole('button', { name: 'Guardar precio privado', exact: true }).click();
  await expect(
    page.getByText('Precio guardado en este dispositivo.', { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText('Tienda de prueba · Madrid, sucursal de prueba', { exact: true }),
  ).toBeVisible();
});

test('exporta la biblioteca y permite cancelar o confirmar su borrado sin dejar datos tras recargar', async ({
  page,
}) => {
  await page.goto('/scan');
  await page.getByRole('textbox', { name: 'Código de barras', exact: true }).fill(code);
  await page.getByRole('button', { name: 'Buscar producto', exact: true }).click();
  await page.getByRole('button', { name: 'Guardar en favoritos', exact: true }).click();
  await page.goto('/prices');
  await page
    .getByRole('textbox', { name: 'Código de barras del producto', exact: true })
    .fill(code);
  await page.getByRole('textbox', { name: 'Precio en euros', exact: true }).fill('2,49');
  await page
    .getByRole('textbox', { name: 'Supermercado o tienda', exact: true })
    .fill('Exportación prueba');
  await page.getByRole('textbox', { name: 'Sucursal o localidad', exact: true }).fill('Madrid');
  await page.getByRole('button', { name: 'Guardar precio privado', exact: true }).click();
  await expect(
    page.getByText('Precio guardado en este dispositivo.', { exact: true }),
  ).toBeVisible();
  await page.goto('/settings');
  const downloadReady = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar mis datos', exact: true }).click();
  const download = await downloadReady;
  expect(download.suggestedFilename()).toBe('sin-gluten-datos.json');
  const exported = JSON.parse(await readFile((await download.path())!, 'utf8'));
  expect(exported.products).toHaveLength(1);
  expect(exported.products[0].barcode).toBe(code);
  expect(exported.favorites[code].deleted).toBe(false);
  expect(exported.history).toHaveLength(1);
  expect(exported.prices[0].amountMinor).toBe(249);
  await page.getByRole('button', { name: 'Borrar todos los datos locales', exact: true }).click();
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await page.goto('/library');
  await expect(page.getByRole('button', { name: 'Favoritos (1)', exact: true })).toBeVisible();
  await page.goto('/settings');
  await page.getByRole('button', { name: 'Borrar todos los datos locales', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar eliminación', exact: true }).click();
  await expect(page.getByText(/Datos locales eliminados/)).toBeVisible();
  await page.reload();
  const emptyDownloadReady = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar mis datos', exact: true }).click();
  const emptyDownload = await emptyDownloadReady;
  const empty = JSON.parse(await readFile((await emptyDownload.path())!, 'utf8'));
  expect(empty.products).toEqual([]);
  expect(empty.favorites).toEqual({});
  expect(empty.history).toEqual([]);
  expect(empty.prices).toEqual([]);
  expect(empty.cache).toEqual({});
});

test('una actualización conserva la versión de las pestañas abiertas y activa la nueva al cerrarlas', async ({
  page,
  context,
}) => {
  await page.goto('/scan');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  const previousCache = await page.evaluate(async () =>
    (await caches.keys()).find((key) => key.startsWith('singluten-shell-')),
  );
  expect(previousCache).toBeTruthy();
  await page.getByRole('textbox', { name: 'Código de barras', exact: true }).fill('3274');
  const file = resolve('dist/sw.js');
  const original = await readFile(file, 'utf8');
  try {
    const workerReady = context.waitForEvent('serviceworker');
    await writeFile(file, original.replace('singluten-shell-', 'singluten-shell-update-test-'));
    await page.evaluate(async () => {
      await (await navigator.serviceWorker.getRegistration())!.update();
    });
    const nextWorker = await workerReady;
    await expect
      .poll(() =>
        page.evaluate(
          async () => (await navigator.serviceWorker.getRegistration())?.waiting?.state,
        ),
      )
      .toBe('installed');
    await expect(page.getByRole('textbox', { name: 'Código de barras', exact: true })).toHaveValue(
      '3274',
    );
    expect(await page.evaluate(() => caches.keys())).toContain(previousCache);
    await page.close();
    await expect.poll(() => nextWorker.evaluate(() => caches.keys())).not.toContain(previousCache);
    const reopened = await context.newPage();
    await reopened.goto('/scan');
    await context.setOffline(true);
    await reopened.reload();
    await expect(
      reopened.getByRole('textbox', { name: 'Código de barras', exact: true }),
    ).toBeVisible();
  } finally {
    await context.setOffline(false);
    await writeFile(file, original);
  }
});
