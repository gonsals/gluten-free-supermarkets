import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { normalizeProduct } from '../../src/domain/product';

const code = '3274080005003',
  other = '3017620422003';
const date = new Date(Date.now() - 86400000).toISOString();
const group = {
  id: 'rice',
  name: 'Arroz para la semana',
  required: { quantity: 1000000, unit: 'kg' },
  glutenFreeOnly: false,
  members: [
    { barcode: code, pack: { quantity: 500000, unit: 'kg' } },
    { barcode: other, pack: { quantity: 750000, unit: 'kg' } },
  ],
};
async function seed(
  page: Page,
  options: { group?: boolean; mismatch?: boolean; gluten?: boolean } = {},
) {
  const products = [code, other].map((c, i) =>
    normalizeProduct(
      {
        product_name: `Arroz ${i ? '750' : '500'} g`,
        labels_tags: ['en:no-gluten'],
        allergens_tags: options.gluten && i ? ['en:gluten'] : [],
        traces_tags: ['en:milk'],
        ingredients_text: 'Arroz',
      },
      c,
      'production',
      new Date(date),
    ),
  );
  const copy = {
    format: 'sin-gluten-library',
    version: 4,
    backupVersion: 4,
    exportedAt: date,
    history: [],
    favorites: {},
    cache: Object.fromEntries(products.map((p) => [p.barcode, p.source.fetchedAt])),
    products,
    cloudOwner: null,
    basket: [{ barcode: code, name: 'Arroz 500 g', quantity: 2, addedAt: date }],
    groups: options.group ? [{ ...group, glutenFreeOnly: options.gluten ?? false }] : [],
    branches: ['A', 'B'].map((s) => ({
      id: s,
      name: 'Sucursal ' + s,
      address: 'Calle ' + s + ' 1',
      references: [
        {
          key: `private:${JSON.stringify([s.toLowerCase(), 'calle ' + s.toLowerCase() + ' 1'])}`,
          source: 'private',
        },
      ],
    })),
    prices: ['A', 'B'].flatMap((s, i) =>
      [code, other].map((c, n) => ({
        id: s + n,
        barcode: c,
        store: s,
        location: 'Calle ' + s + ' 1',
        amountMinor: n ? 240 - i * 10 : 200 + i * 10,
        currency: 'EUR',
        observedAt: date,
        createdAt: date,
        quantity: n ? (options.mismatch ? 0.5 : 0.75) : 0.5,
        unit: 'kg',
        offerEndsAt: null,
        notes: '',
      })),
    ),
  };
  await page.goto('/settings');
  const picker = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Restaurar una copia', exact: true }).click();
  await (
    await picker
  ).setFiles({
    name: 'formatos.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(copy)),
  });
  await page.getByRole('button', { name: 'Sustituir y restaurar', exact: true }).click();
  await expect(page.getByText(/Copia restaurada en este dispositivo/)).toBeVisible();
  await page.goto('/basket');
  await page.getByRole('button', { name: 'Formatos y alternativas', exact: true }).click();
  if (options.group)
    await page.getByRole('button', { name: 'Comparar grupo ' + group.name, exact: true }).click();
  return copy;
}
async function backup(page: Page) {
  await page.goto('/settings');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar mis datos', exact: true }).click();
  return JSON.parse((await readFile((await (await download).path())!)).toString());
}
test('confirma formatos y muestra precio unitario, desembolso y sobrante; sustitución cancelable y persistente offline', async ({
  page,
  context,
}) => {
  const requests: string[] = [];
  await page.route('https://prices.openfoodfacts.org/**', (r) => {
    requests.push(r.request().url());
    return r.abort();
  });
  await seed(page);
  await page.getByRole('button', { name: 'Crear grupo de alternativas', exact: true }).click();
  await page.getByRole('textbox', { name: 'Nombre del grupo', exact: true }).fill(group.name);
  await page.getByRole('textbox', { name: 'Código del producto 1', exact: true }).fill(code);
  await page.getByRole('textbox', { name: 'Contenido del producto 1', exact: true }).fill('500');
  await page.getByRole('button', { name: 'Añadir alternativa al grupo', exact: true }).click();
  await page.getByRole('textbox', { name: 'Código del producto 2', exact: true }).fill(other);
  await page.getByRole('textbox', { name: 'Contenido del producto 2', exact: true }).fill('750');
  await page.getByRole('button', { name: 'Confirmar y guardar grupo', exact: true }).click();
  await expect(
    page.getByText('Cambios guardados en este dispositivo.', { exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/Menor desembolso observado: 4,00.*Sucursal A.*4,00/)).toBeVisible();
  await expect(page.getByText(/Menor desembolso observado: 4,60.*Sucursal B.*3,067/)).toBeVisible();
  await expect(page.getByText('Sobrante: 0,5 kg.', { exact: true })).toBeVisible();
  const choose = page.getByRole('button', { name: `Elegir ${other} en Sucursal B`, exact: true });
  await choose.click();
  await expect(
    page.getByRole('dialog').getByText(/2 envases.*sobrante: 0,5 kg.*4,60/),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await choose.click();
  await page.getByRole('button', { name: 'Sustituir en mi cesta', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.getByRole('button', { name: 'Volver a mi cesta', exact: true }).click();
  await expect(
    page.getByRole('textbox', { name: 'Envases de Arroz 750 g', exact: true }),
  ).toHaveValue('2');
  const copy = await backup(page);
  expect(copy).toMatchObject({
    version: 4,
    backupVersion: 4,
    groups: [{ ...group, id: expect.any(String) }],
    basket: [{ barcode: other, quantity: 2 }],
  });
  expect(requests).toEqual([]);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  await context.setOffline(true);
  await page.goto('/alternatives');
  await page.reload();
  await page.getByRole('button', { name: 'Comparar grupo ' + group.name, exact: true }).click();
  await expect(page.getByText(/Menor desembolso observado: 4,60/)).toBeVisible();
  await expect(choose).toBeDisabled();
});
test('el filtro sin gluten expone trazas y fuente; excluye contradicciones sin convertir información ausente en aptitud', async ({
  page,
}) => {
  await seed(page, { group: true, gluten: true });
  await expect(page.getByText(/Fuera del filtro: falta una declaración/)).toBeVisible();
  await expect(page.getByText(/Trazas declaradas: en:milk/).first()).toBeVisible();
  await expect(page.getByText(/Fuente: Open Food Facts.*consultada/).first()).toBeVisible();
  await expect(
    page.getByRole('button', { name: `Elegir ${other} en Sucursal B`, exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: `Elegir ${code} en Sucursal A`, exact: true }),
  ).toBeEnabled();
});
test('un formato contradictorio queda excluido y editar/eliminar grupo no cambia la cesta', async ({
  page,
}) => {
  await seed(page, { group: true, mismatch: true });
  await expect(page.getByText(/El formato anotado en el precio contradice/).first()).toBeVisible();
  await expect(
    page.getByRole('button', { name: `Elegir ${other} en Sucursal A`, exact: true }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Editar formatos y alternativas', exact: true }).click();
  await page.getByRole('textbox', { name: 'Contenido del producto 2', exact: true }).fill('0,5');
  await page.getByRole('button', { name: 'Confirmar y guardar grupo', exact: true }).click();
  await expect(
    page.getByText('Cambios guardados en este dispositivo.', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: `Elegir ${other} en Sucursal B`, exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Eliminar grupo', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar eliminación', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Comparar grupo ' + group.name, exact: true }),
  ).toHaveCount(0);
  const copy = await backup(page);
  expect(copy.groups).toEqual([]);
  expect(copy.basket).toMatchObject([{ barcode: code, quantity: 2 }]);
});
test('una confirmación abierta no sobrescribe cambios de otra pestaña', async ({
  page,
  context,
}) => {
  await seed(page, { group: true });
  await page.getByRole('button', { name: `Elegir ${other} en Sucursal B`, exact: true }).click();
  const second = await context.newPage();
  await second.goto('/basket');
  await second.getByRole('textbox', { name: 'Envases de Arroz 500 g', exact: true }).fill('3');
  await second
    .getByRole('button', { name: 'Guardar cantidad de Arroz 500 g', exact: true })
    .click();
  await expect(
    second.getByText('Cesta guardada en este dispositivo.', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Sustituir en mi cesta', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  const copy = await backup(page);
  expect(copy.basket).toMatchObject([{ barcode: code, quantity: 3 }]);
  await second.close();
});
test('anotar multipack conserva cantidad normalizada y precio por litro', async ({ page }) => {
  await seed(page);
  await page.route('https://prices.openfoodfacts.org/**', (r) => r.abort());
  await page.goto('/prices/' + code);
  await page.getByRole('textbox', { name: 'Precio en euros', exact: true }).fill('3,96');
  await page.getByRole('textbox', { name: 'Supermercado o tienda', exact: true }).fill('Mi tienda');
  await page.getByRole('textbox', { name: 'Sucursal o localidad', exact: true }).fill('Calle 1');
  await page
    .getByRole('textbox', { name: 'Cantidad del envase (opcional)', exact: true })
    .fill('330');
  await page.getByRole('textbox', { name: 'Componentes del pack', exact: true }).fill('6');
  await page.getByRole('button', { name: 'Mililitros', exact: true }).click();
  await page.getByRole('button', { name: 'Guardar precio privado', exact: true }).click();
  await expect(
    page.getByText('Precio guardado en este dispositivo.', { exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/1,98 l por envase.*2,00.*\/l/).first()).toBeVisible();
  const copy = await backup(page);
  expect(copy.prices.find((p: { store: string }) => p.store === 'Mi tienda')).toMatchObject({
    quantity: 1.98,
    unit: 'l',
    amountMinor: 396,
  });
});
test('editor y sustitución accesibles con texto ampliado en pantalla pequeña', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 480 });
  await seed(page, { group: true });
  await page.addStyleTag({
    content: 'div,span,input,button,a { font-size:26px !important; line-height:1.5 !important; }',
  });
  await page.getByRole('button', { name: `Elegir ${other} en Sucursal B`, exact: true }).click();
  const confirm = page
    .getByRole('dialog')
    .getByRole('button', { name: 'Sustituir en mi cesta', exact: true });
  await confirm.scrollIntoViewIfNeeded();
  await expect(confirm).toBeInViewport();
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await page.getByRole('button', { name: 'Editar formatos y alternativas', exact: true }).click();
  const save = page.getByRole('button', { name: 'Confirmar y guardar grupo', exact: true });
  await save.scrollIntoViewIfNeeded();
  await expect(save).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});
