import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const code = '3274080005003';
const other = '3017620422003';
async function addCode(page: Page, barcode = code) {
  await page
    .getByRole('textbox', { name: 'Código para añadir a la cesta', exact: true })
    .fill(barcode);
  await page.getByRole('button', { name: 'Añadir código a la cesta', exact: true }).click();
  await expect(
    page.getByText('Cesta guardada en este dispositivo.', { exact: true }),
  ).toBeVisible();
}
async function backup(page: Page) {
  await page.goto('/settings');
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar mis datos', exact: true }).click();
  return JSON.parse((await readFile((await (await downloading).path())!)).toString());
}

test('añade desde ficha y biblioteca, agrupa, edita, conserva offline y recupera la cesta', async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('https://world.openfoodfacts.org/api/v2/product/**', (route) =>
    route.fulfill({
      json: {
        status: 1,
        product: {
          code,
          product_name: 'Arroz para la cesta',
          labels_tags: ['en:no-gluten'],
          allergens_tags: [],
          traces_tags: [],
        },
      },
    }),
  );
  await page.goto('/scan');
  await page.getByRole('textbox', { name: 'Código de barras', exact: true }).fill(code);
  await page.getByRole('button', { name: 'Buscar producto', exact: true }).click();
  await page.getByRole('button', { name: 'Añadir a la cesta', exact: true }).click();
  await expect(page.getByText(/Un envase añadido/)).toBeVisible();
  await page.getByRole('button', { name: 'Guardar en favoritos', exact: true }).click();
  await page.getByRole('tab', { name: 'Biblioteca', exact: true }).click();
  await page
    .getByRole('button', { name: 'Añadir Arroz para la cesta a la cesta', exact: true })
    .click();
  await page.getByRole('button', { name: 'Mi cesta (1)', exact: true }).click();
  const quantity = page.getByRole('textbox', {
    name: 'Envases de Arroz para la cesta',
    exact: true,
  });
  await expect(quantity).toHaveValue('2');
  await quantity.fill('4');
  await page
    .getByRole('button', { name: 'Guardar cantidad de Arroz para la cesta', exact: true })
    .click();
  await expect(
    page.getByText('Cesta guardada en este dispositivo.', { exact: true }),
  ).toBeVisible();
  await expect(quantity).toHaveValue('4');
  await page.goto('/library');
  await page.getByRole('button', { name: 'Historial (1)', exact: true }).click();
  await page.getByRole('button', { name: 'Borrar historial', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar eliminación', exact: true }).click();
  const copy = await backup(page);
  expect(copy).toMatchObject({
    version: 3,
    backupVersion: 3,
    basket: [{ barcode: code, quantity: 4, name: 'Arroz para la cesta' }],
  });
  expect(copy.history).toEqual([]);
  await page.getByRole('button', { name: 'Borrar todos los datos locales', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar eliminación', exact: true }).click();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  await context.setOffline(true);
  const selecting = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Restaurar una copia', exact: true }).click();
  await (
    await selecting
  ).setFiles({
    name: 'cesta.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(copy)),
  });
  await expect(page.getByRole('dialog').getByText(/cesta: 1 producto y 4 envases/)).toBeVisible();
  await page.getByRole('button', { name: 'Sustituir y restaurar', exact: true }).click();
  await expect(page.getByText(/Copia restaurada en este dispositivo/)).toBeVisible();
  await page.goto('/basket');
  await page.reload();
  await expect(quantity).toHaveValue('4');
  await expect(page.getByText(/Sin precio privado anotado/)).toBeVisible();
  await page
    .getByRole('button', { name: 'Ver ficha e información sobre gluten', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Figura como sin gluten', exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test('código sin ficha, validación de envases y cancelación/eliminación de cesta', async ({
  page,
}) => {
  await page.goto('/basket');
  await addCode(page);
  await expect(page.getByText(/Sin ficha guardada/)).toBeVisible();
  const quantity = page.getByRole('textbox', { name: `Envases de Producto ${code}`, exact: true });
  const save = page.getByRole('button', {
    name: `Guardar cantidad de Producto ${code}`,
    exact: true,
  });
  for (const value of ['0', '100', '1.5']) {
    await quantity.fill(value);
    await expect(save).toBeDisabled();
  }
  await quantity.fill('99');
  await save.click();
  await expect(quantity).toHaveValue('99');
  await addCode(page, other);
  await page.getByRole('button', { name: 'Vaciar cesta', exact: true }).click();
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(quantity).toHaveValue('99');
  await page
    .getByRole('button', { name: `Quitar Producto ${code} de la cesta`, exact: true })
    .click();
  await page.getByRole('button', { name: 'Confirmar eliminación', exact: true }).click();
  await expect(quantity).toHaveCount(0);
  await page.getByRole('button', { name: 'Vaciar cesta', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar eliminación', exact: true }).click();
  await expect(page.getByText(/Tu cesta está vacía/)).toBeVisible();
});

test('dos pestañas no borran cambios posteriores a abrir la confirmación', async ({
  page,
  context,
}) => {
  await page.goto('/basket');
  await addCode(page);
  await page.getByRole('button', { name: 'Vaciar cesta', exact: true }).click();
  const second = await context.newPage();
  await second.goto('/basket');
  await addCode(second, other);
  await page.getByRole('button', { name: 'Confirmar eliminación', exact: true }).click();
  await expect(page.getByText(/La biblioteca ha cambiado en otra ventana/)).toBeVisible();
  const copy = await backup(second);
  expect(copy.basket).toHaveLength(2);
  await second.close();
});

test('actualiza IndexedDB y esquema v1 preservando precios; el cliente antiguo ya no puede abrir v1', async ({
  page,
}) => {
  await page.route('**/seed-v1', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Seed</title>' }),
  );
  await page.goto('/seed-v1');
  await page.evaluate(async (barcode) => {
    await new Promise<void>((resolve, reject) => {
      const opening = indexedDB.open('sin-gluten', 1);
      opening.onupgradeneeded = () => opening.result.createObjectStore('kv');
      opening.onerror = () => reject(opening.error);
      opening.onsuccess = () => {
        const db = opening.result;
        const tx = db.transaction('kv', 'readwrite');
        tx.objectStore('kv').put(
          JSON.stringify({
            version: 1,
            history: [],
            favorites: {},
            cache: {},
            cloudOwner: null,
            prices: [
              {
                id: 'v1-price',
                barcode,
                store: 'Tienda anterior',
                location: 'Madrid',
                amountMinor: 249,
                currency: 'EUR',
                observedAt: '2026-10-25T00:00:00Z',
                createdAt: '2026-10-25T00:00:00Z',
                quantity: 1,
                unit: 'unit',
                offerEndsAt: null,
                notes: '',
              },
            ],
          }),
          'library:production:v1',
        );
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };
    });
  }, code);
  await page.goto('/basket');
  await expect(page.getByText(/Tu cesta está vacía/)).toBeVisible();
  const copy = await backup(page);
  expect(copy.version).toBe(3);
  expect(copy.prices).toHaveLength(1);
  expect(copy.prices[0].store).toBe('Tienda anterior');
  expect(
    await page.evaluate(
      () =>
        new Promise<string>((resolve) => {
          const old = indexedDB.open('sin-gluten', 1);
          old.onerror = (event) => {
            event.preventDefault();
            resolve(old.error?.name ?? 'error');
          };
          old.onsuccess = () => {
            old.result.close();
            resolve('opened');
          };
        }),
    ),
  ).toBe('VersionError');
});

test('una pestaña antigua bloquea la actualización con salida explícita, sin sobrescribir sus datos', async ({
  page,
  context,
}) => {
  await page.route('**/hold-v1', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Old client</title>' }),
  );
  await page.goto('/hold-v1');
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        const opening = indexedDB.open('sin-gluten', 1);
        opening.onupgradeneeded = () => opening.result.createObjectStore('kv');
        opening.onsuccess = () => {
          // Keep the old connection alive, matching the previous client's behavior.
          (window as Window & { legacyDatabase?: IDBDatabase }).legacyDatabase = opening.result;
          resolve();
        };
      }),
  );
  const current = await context.newPage();
  await current.goto('/basket');
  await expect(current.getByText(/Cierra las otras pestañas/)).toBeVisible();
  await expect(
    current.getByRole('button', { name: 'Añadir código a la cesta', exact: true }),
  ).toBeDisabled();
  await current.getByRole('button', { name: 'Reintentar abrir biblioteca', exact: true }).click();
  await expect(current.getByText(/Cierra las otras pestañas/)).toBeVisible();
  await page.close();
  // Returning to the app refreshes the library, so the retry button may disappear.
  await current.bringToFront();
  await expect(current.getByText(/Tu cesta está vacía/)).toBeVisible();
  await addCode(current);
  await current.close();
});

for (const colorScheme of ['light', 'dark'] as const) {
  test(`cesta accesible a 320 × 480 y fuente ampliada (${colorScheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme });
    await page.setViewportSize({ width: 320, height: 480 });
    await page.goto('/basket');
    await addCode(page);
    await page.addStyleTag({
      content:
        'div,span,input,button,a { font-size: 26px !important; line-height: 1.5 !important; }',
    });
    await page.getByRole('button', { name: 'Vaciar cesta', exact: true }).click();
    const confirm = page
      .getByRole('dialog')
      .getByRole('button', { name: 'Confirmar eliminación', exact: true });
    await confirm.scrollIntoViewIfNeeded();
    await expect(confirm).toBeInViewport();
    await page.screenshot({ path: test.info().outputPath(`basket-${colorScheme}.png`) });
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  });
}
