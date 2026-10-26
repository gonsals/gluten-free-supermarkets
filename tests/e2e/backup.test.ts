import { test, expect, type Page } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';

const code = '3274080005003';
async function selectCopy(page: Page, contents: Buffer) {
  const selecting = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Restaurar una copia', exact: true }).click();
  await (
    await selecting
  ).setFiles({ name: 'sin-gluten-datos.json', mimeType: 'application/json', buffer: contents });
}
async function downloadCopy(page: Page) {
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar mis datos', exact: true }).click();
  return readFile((await (await downloading).path())!);
}
async function createCopy(page: Page) {
  await page.route('https://world.openfoodfacts.org/api/v2/product/**', (route) =>
    route.fulfill({
      json: {
        status: 1,
        product: {
          code,
          product_name: 'Producto de copia',
          labels_tags: ['en:no-gluten'],
          allergens_tags: [],
          traces_tags: [],
          ingredients_text: 'Arroz',
        },
      },
    }),
  );
  await page.goto('/scan');
  await page.getByRole('textbox', { name: 'Código de barras', exact: true }).fill(code);
  await page.getByRole('button', { name: 'Buscar producto', exact: true }).click();
  await page.getByRole('button', { name: 'Guardar en favoritos', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Quitar de favoritos', exact: true }),
  ).toBeVisible();
  await page.goto('/prices');
  await page
    .getByRole('textbox', { name: 'Código de barras del producto', exact: true })
    .fill(code);
  await page.getByRole('textbox', { name: 'Precio en euros', exact: true }).fill('2,49');
  await page
    .getByRole('textbox', { name: 'Supermercado o tienda', exact: true })
    .fill('Tienda de copia');
  await page.getByRole('textbox', { name: 'Sucursal o localidad', exact: true }).fill('Madrid');
  await page.getByRole('button', { name: 'Guardar precio privado', exact: true }).click();
  await expect(
    page.getByText('Precio guardado en este dispositivo.', { exact: true }),
  ).toBeVisible();
  await page.goto('/settings');
  return downloadCopy(page);
}

test('exporta, cancela y restaura una copia sin red; persisten fichas, favoritos, historial y precios', async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const original = await createCopy(page);
  await writeFile(test.info().outputPath('source-backup.json'), original);
  const json = JSON.parse(original.toString());
  expect(json.format).toBe('sin-gluten-library');
  expect(json.backupVersion).toBe(2);
  await page.getByRole('button', { name: 'Borrar todos los datos locales', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar eliminación', exact: true }).click();
  await expect(page.getByText(/Datos locales eliminados/)).toBeVisible();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  await context.setOffline(true);
  await selectCopy(page, original);
  const dialog = page.getByRole('dialog', { name: 'Restaurar biblioteca local', exact: true });
  await expect(dialog.getByText(/1 consulta, 1 favorito y 1 precio privado/)).toBeVisible();
  await page.screenshot({ path: test.info().outputPath('restore-preview.png') });
  await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click();
  const empty = JSON.parse((await downloadCopy(page)).toString());
  expect(empty.history).toEqual([]);
  await selectCopy(page, original);
  await dialog.getByRole('button', { name: 'Sustituir y restaurar', exact: true }).click();
  await expect(page.getByText(/Copia restaurada en este dispositivo/)).toBeVisible();
  await page.reload();
  const restored = JSON.parse((await downloadCopy(page)).toString());
  expect(restored.history).toHaveLength(1);
  expect(restored.prices).toEqual(json.prices);
  expect(restored.products[0].source.fetchedAt).toBe(json.products[0].source.fetchedAt);
  expect(restored.products[0].source.restoredAt).toBeTruthy();
  expect(restored.cloudOwner).toBeNull();
  await page.getByRole('tab', { name: 'Biblioteca', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Favoritos (1)', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Abrir Producto de copia', exact: true }).click();
  await expect(page.getByText(/Ficha recuperada de una copia el/)).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Figura como sin gluten', exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test('rechaza archivos inválidos y demasiado grandes sin modificar los datos ni bloquear los controles', async ({
  page,
}) => {
  const original = await createCopy(page);
  for (const invalid of [Buffer.from('{"version":99}'), Buffer.alloc(20 * 1024 * 1024 + 1, 32)]) {
    await selectCopy(page, invalid);
    await expect(
      page.getByRole('dialog', { name: 'Restaurar biblioteca local', exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByText(/copia válida y compatible|supera el límite de 20 MB/),
    ).toBeVisible();
    expect(JSON.parse((await downloadCopy(page)).toString()).history).toEqual(
      JSON.parse(original.toString()).history,
    );
  }
});

for (const colorScheme of ['light', 'dark'] as const) {
  test(`resumen de restauración desplazable a 320 × 480 y texto al 200 % (${colorScheme})`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 480 });
    await page.emulateMedia({ colorScheme });
    await page.goto('/settings');
    const original = await downloadCopy(page);
    await selectCopy(page, original);
    const dialog = page.getByRole('dialog', { name: 'Restaurar biblioteca local', exact: true });
    await page.evaluate(() => {
      const texts = [...document.querySelectorAll<HTMLElement>('[role="dialog"] *')].filter(
        (element) =>
          [...element.childNodes].some(
            (node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim(),
          ),
      );
      const sizes = texts.map((element) => ({
        element,
        font: parseFloat(getComputedStyle(element).fontSize),
        line: parseFloat(getComputedStyle(element).lineHeight),
      }));
      for (const { element, font, line } of sizes) {
        element.style.fontSize = `${font * 2}px`;
        element.style.lineHeight = `${(line || font * 1.4) * 2}px`;
      }
    });
    const confirm = dialog.getByRole('button', { name: 'Sustituir y restaurar', exact: true });
    await confirm.scrollIntoViewIfNeeded();
    await expect(confirm).toBeInViewport({ ratio: 1 });
    expect(await dialog.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(
      false,
    );
    await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await expect(dialog).toHaveCount(0);
  });
}
