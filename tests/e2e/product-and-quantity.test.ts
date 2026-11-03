import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { expandSection } from './helpers/disclosure';
import { items, seedCopy } from './fixtures/shopping';

async function seedBasket(page: Page) {
  const initial = seedCopy();
  await page.goto('/settings');
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Restaurar una copia', exact: true }).click();
  await (
    await chooser
  ).setFiles({
    name: 'cantidad-ensayo.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(initial)),
  });
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Sustituir y restaurar', exact: true })
    .click();
  await expect(page.getByText(/Copia restaurada en este dispositivo/)).toBeVisible();
  await page.goto('/basket');
  return initial;
}

test('la ficha conserva gluten, trazas y procedencia visibles y abre ingredientes sin consultar de nuevo', async ({
  page,
}) => {
  let requests = 0;
  await page.route('https://world.openfoodfacts.org/api/v2/product/**', (route) => {
    requests++;
    return route.fulfill({
      json: {
        status: 1,
        product: {
          code: items.rice.code,
          product_name: 'Producto de ensayo',
          brands: 'Marca de ensayo',
          labels_tags: ['en:no-gluten'],
          allergens_tags: [],
          traces_tags: ['en:milk'],
          ingredients_text: 'Ingredientes del ensayo de ficha',
        },
      },
    });
  });
  await page.goto('/scan');
  await page.getByRole('textbox', { name: 'Código de barras', exact: true }).fill(items.rice.code);
  await page.getByRole('button', { name: 'Buscar producto', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Comparar precios y anotar', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Figura como sin gluten', exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/La fuente declara trazas: Leche/)).toBeVisible();
  await expect(page.getByText(/Información de Open Food Facts/)).toBeVisible();
  await expect(page.getByText(/Última consulta:.*No es una certificación/)).toBeVisible();
  const ingredients = page.getByRole('button', { name: 'Ingredientes y etiquetado', exact: true });
  await expect(ingredients).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByText('Ingredientes del ensayo de ficha', { exact: true })).toBeHidden();
  await ingredients.click();
  await expect(page.getByText('Ingredientes del ensayo de ficha', { exact: true })).toBeVisible();
  await ingredients.click();
  await expandSection(page, 'Ver fuente y detalles de la ficha');
  await expect(
    page.getByRole('button', { name: 'Consultar o corregir datos en la fuente', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Actualizar información', exact: true }),
  ).toBeVisible();
  expect(requests).toBe(1);
  await page.getByRole('button', { name: 'Guardar en favoritos', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Quitar de favoritos', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('heading', { name: 'Producto de ensayo', exact: true })
    .scrollIntoViewIfNeeded();
  await page.screenshot({ path: test.info().outputPath('ficha-sencilla.png') });
});

test('un toque cambia envases, persiste al recargar y recalcula el total sin alterar los precios', async ({
  page,
}) => {
  await page.route('https://prices.openfoodfacts.org/**', (route) => route.abort());
  const initial = await seedBasket(page);
  const name = items.rice.name;
  const quantity = page.getByRole('textbox', { name: `Envases de ${name}`, exact: true });
  const plus = page.getByRole('button', { name: `Añadir un envase de ${name}`, exact: true });
  const minus = page.getByRole('button', { name: `Quitar un envase de ${name}`, exact: true });
  await expect(quantity).toHaveValue('3');
  await expect(
    page.getByRole('button', { name: `Guardar cantidad de ${name}`, exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Comparar este producto', exact: true }),
  ).toHaveCount(0);
  await plus.focus();
  await plus.press('Enter');
  await expect(quantity).toHaveValue('4');
  await expect(plus).toBeFocused();
  await page.reload();
  await expect(quantity).toHaveValue('4');
  await page.getByRole('button', { name: 'Comparar total por tienda', exact: true }).click();
  await expect(
    page.getByText(/^Menor total de las cestas completas de esta muestra:/),
  ).toContainText('9,40');
  await page.getByRole('button', { name: 'Editar mi cesta', exact: true }).click();
  await minus.click();
  await expect(quantity).toHaveValue('3');
  await expandSection(page, `Opciones de ${name}`);
  await page.getByRole('button', { name: `Quitar ${name} de la cesta`, exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(quantity).toHaveValue('3');
  await page.goto('/settings');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar mis datos', exact: true }).click();
  const copy = JSON.parse(await readFile((await (await download).path())!, 'utf8'));
  expect(
    copy.basket.find((line: { barcode: string }) => line.barcode === items.rice.code).quantity,
  ).toBe(3);
  expect(copy.prices).toEqual(initial.prices);
});

test('respeta los límites de envases y conserva una edición manual sin sobrescribirla con los botones', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await seedBasket(page);
  const name = items.rice.name;
  const quantity = page.getByRole('textbox', { name: `Envases de ${name}`, exact: true });
  const plus = page.getByRole('button', { name: `Añadir un envase de ${name}`, exact: true });
  const minus = page.getByRole('button', { name: `Quitar un envase de ${name}`, exact: true });
  const save = page.getByRole('button', { name: `Guardar cantidad de ${name}`, exact: true });
  await quantity.fill('5');
  await expect(plus).toBeDisabled();
  await expect(minus).toBeDisabled();
  await expandSection(page, `Opciones de ${name}`);
  await page.getByRole('button', { name: `Opciones de ${name}`, exact: true }).click();
  await expect(quantity).toHaveValue('5');
  await quantity.fill('0');
  await expect(save).toBeDisabled();
  await quantity.fill('99');
  await save.click();
  await expect(quantity).toHaveValue('99');
  await expect(plus).toBeDisabled();
  await minus.click();
  await expect(quantity).toHaveValue('98');
  await quantity.fill('1');
  await save.click();
  await expect(quantity).toHaveValue('1');
  await expect(minus).toBeDisabled();
  await page.addStyleTag({
    content: 'div,span,input,button,a { font-size:26px !important; line-height:1.5 !important; }',
  });
  await plus.scrollIntoViewIfNeeded();
  await expect(plus).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await plus.click();
  await expect(quantity).toHaveValue('2');
  await quantity.scrollIntoViewIfNeeded();
  await page.screenshot({ path: test.info().outputPath('cantidad-sencilla-texto-grande.png') });
});
