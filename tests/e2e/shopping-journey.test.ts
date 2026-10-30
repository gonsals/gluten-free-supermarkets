import { test, expect, type Page, type Route } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { items, privateRows, expected, groupName, seedCopy, publicRows } from './fixtures/shopping';

async function network(page: Page, prices?: (route: Route) => Promise<void>) {
  const off: string[] = [],
    publicRequests: string[] = [],
    unexpected: string[] = [];
  await page.context().route(/^https?:\/\//, async (route) => {
    const url = new URL(route.request().url());
    if (url.origin === 'http://127.0.0.1:4173') {
      await route.continue();
      return;
    }
    if (url.hostname === 'world.openfoodfacts.org' && url.pathname.startsWith('/api/v2/product/')) {
      const item = Object.values(items).find(
        (item) =>
          url.pathname.endsWith('/' + item.code + '.json') ||
          url.pathname.endsWith('/' + item.code),
      );
      if (item) {
        off.push(item.code);
        await route.fulfill({
          json: {
            status: 1,
            code: item.code,
            product: {
              code: item.code,
              product_name: item.name,
              brands: 'Ensayo CAL-01',
              labels_tags: ['en:no-gluten'],
              allergens_tags: [],
              traces_tags: ['en:milk'],
              ingredients_text: 'Ingredientes de prueba',
            },
          },
        });
        return;
      }
    }
    if (url.hostname === 'prices.openfoodfacts.org' && url.pathname === '/api/v1/prices') {
      publicRequests.push(url.toString());
      if (prices) await prices(route);
      else await route.abort();
      return;
    }
    unexpected.push(url.origin + url.pathname);
    await route.abort();
  });
  return { off, publicRequests, unexpected };
}
async function restore(page: Page, buffer: Buffer) {
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Restaurar una copia', exact: true }).click();
  await (
    await chooser
  ).setFiles({ name: 'cal01-sintetica.json', mimeType: 'application/json', buffer });
  return page.getByRole('dialog', { name: 'Restaurar biblioteca local', exact: true });
}
async function seed(page: Page, old = false, abroad = false) {
  await page.goto('/settings');
  const copy = seedCopy(old, abroad);
  const dialog = await restore(page, Buffer.from(JSON.stringify(copy)));
  await dialog.getByRole('button', { name: 'Sustituir y restaurar', exact: true }).click();
  await expect(page.getByText(/Copia restaurada en este dispositivo/)).toBeVisible();
  return copy;
}
async function backup(page: Page) {
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar mis datos', exact: true }).click();
  return readFile((await (await download).path())!);
}
async function totals(page: Page, amount: string, difference?: string) {
  await expect(
    page.getByText(
      `Menor total de las cestas completas de esta muestra: ${amount}\u00a0€ · Ensayo B`,
      { exact: true },
    ),
  ).toBeVisible();
  if (difference)
    await expect(
      page.getByText(
        `Diferencia estimada frente a la siguiente cesta completa: ${difference}\u00a0€. No es ahorro de una compra realizada.`,
        { exact: true },
      ),
    ).toBeVisible();
}

test('CAL-01: prepara, compara, sustituye y recupera la misma compra offline con sus importes y evidencias', async ({
  page,
  context,
}) => {
  test.setTimeout(90000); // Entire multi-screen purchase + destructive recovery, not an isolated interaction.
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const requests = await network(page);
  for (const [kind, item] of Object.entries(items)) {
    await page.goto('/scan');
    await page.getByRole('textbox', { name: 'Código de barras', exact: true }).fill(item.code);
    await page.getByRole('button', { name: 'Buscar producto', exact: true }).click();
    await expect(page.getByRole('heading', { name: item.name, exact: true })).toBeVisible();
    if (kind !== 'alternative') {
      await page.getByRole('button', { name: 'Añadir a la cesta', exact: true }).click();
      await expect(page.getByText(/Un envase añadido a tu cesta/)).toBeVisible();
    }
  }
  for (const row of privateRows) {
    const item = items[row.item];
    await page.goto('/prices');
    await page
      .getByRole('textbox', { name: 'Código de barras del producto', exact: true })
      .fill(item.code);
    await page
      .getByRole('textbox', { name: 'Precio en euros', exact: true })
      .fill((row.cents / 100).toFixed(2));
    await page
      .getByRole('textbox', { name: 'Supermercado o tienda', exact: true })
      .fill('Ensayo ' + row.shop);
    await page
      .getByRole('textbox', { name: 'Sucursal o localidad', exact: true })
      .fill('Calle ' + row.shop + ' 1');
    await page
      .getByRole('textbox', { name: 'Cantidad del envase (opcional)', exact: true })
      .fill(item.amount);
    await page.getByRole('button', { name: item.unit, exact: true }).click();
    await page.getByRole('button', { name: 'Guardar precio privado', exact: true }).click();
    await expect(
      page.getByText('Precio guardado en este dispositivo.', { exact: true }),
    ).toBeVisible();
  }
  await page.goto('/basket');
  for (const [item, quantity] of [
    [items.rice, '3'],
    [items.milk, '2'],
  ] as const) {
    await page
      .getByRole('textbox', { name: 'Envases de ' + item.name, exact: true })
      .fill(quantity);
    await page
      .getByRole('button', { name: 'Guardar cantidad de ' + item.name, exact: true })
      .click();
    await expect(
      page.getByRole('textbox', { name: 'Envases de ' + item.name, exact: true }),
    ).toHaveValue(quantity);
  }
  await page.getByRole('button', { name: 'Comparar total por tienda', exact: true }).click();
  await expect(page.getByText(/No hay ninguna cesta completa/)).toBeVisible();
  await page
    .getByRole('button', { name: 'Gestionar sucursales y referencias', exact: true })
    .click();
  for (const shop of ['A', 'B', 'C']) {
    await page
      .getByRole('button', {
        name: `Identificar ensayo ${shop.toLowerCase()} · calle ${shop.toLowerCase()} 1`,
        exact: true,
      })
      .click();
    await page
      .getByRole('textbox', { name: 'Nombre de la sucursal', exact: true })
      .fill('Ensayo ' + shop);
    await page
      .getByRole('textbox', { name: 'Dirección concreta de la sucursal', exact: true })
      .fill('Calle ' + shop + ' 1, Madrid');
    await page
      .getByRole('button', { name: 'Confirmo que es una sucursal física concreta', exact: true })
      .click();
    await page
      .getByRole('button', { name: 'Crear sucursal con esta referencia', exact: true })
      .click();
    await expect(page.getByRole('heading', { name: 'Ensayo ' + shop, exact: true })).toBeVisible();
  }
  await totals(page, expected.original.b, expected.original.difference);
  await expect(
    page.getByText(`Total estimado: ${expected.original.a}\u00a0€`, { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(`Cesta incompleta · subtotal: ${expected.original.partialC}\u00a0€`, {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Ver desglose de Ensayo C', exact: true }).click();
  await expect(
    page.getByText(/Sin precio para esta sucursal. No se asigna precio cero/),
  ).toBeVisible();
  await page.goto('/basket');
  await page.getByRole('button', { name: 'Formatos y alternativas', exact: true }).click();
  await page.getByRole('button', { name: 'Crear grupo de alternativas', exact: true }).click();
  await page.getByRole('textbox', { name: 'Nombre del grupo', exact: true }).fill(groupName);
  await page.getByRole('textbox', { name: 'Cantidad que necesito', exact: true }).fill('1,2');
  await page.getByRole('button', { name: 'Solo con declaración sin gluten', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Código del producto 1', exact: true })
    .fill(items.rice.code);
  await page.getByRole('textbox', { name: 'Contenido del producto 1', exact: true }).fill('500');
  await page.getByRole('button', { name: 'Añadir alternativa al grupo', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Código del producto 2', exact: true })
    .fill(items.alternative.code);
  await page.getByRole('textbox', { name: 'Contenido del producto 2', exact: true }).fill('750');
  await page.getByRole('button', { name: 'Confirmar y guardar grupo', exact: true }).click();
  await expect(page.getByText('Figura como sin gluten', { exact: true })).toHaveCount(2);
  await expect(page.getByText(/Trazas declaradas: en:milk/)).toHaveCount(2);
  const choose = page.getByRole('button', {
    name: `Elegir ${items.alternative.code} en Ensayo B`,
    exact: true,
  });
  await expect(choose).toBeEnabled();
  await choose.click();
  await expect(
    page.getByRole('dialog').getByText(/2 envases.*sobrante: 0,3 kg.*4,80/),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await choose.click();
  await page.getByRole('button', { name: 'Sustituir en mi cesta', exact: true }).click();
  await page.getByRole('button', { name: 'Volver a mi cesta', exact: true }).click();
  await expect(
    page.getByRole('textbox', { name: 'Envases de ' + items.alternative.name, exact: true }),
  ).toHaveValue('2');
  await page.getByRole('button', { name: 'Comparar total por tienda', exact: true }).click();
  await totals(page, expected.substituted.b, expected.substituted.difference);
  await expect(
    page.getByText(`Total estimado: ${expected.substituted.a}\u00a0€`, { exact: true }),
  ).toBeVisible();
  await page.goto('/settings');
  const saved = await backup(page),
    original = JSON.parse(saved.toString());
  expect(original.prices).toHaveLength(7);
  expect(original.groups[0]).toMatchObject({
    glutenFreeOnly: true,
    required: { quantity: 1200000, unit: 'kg' },
  });
  expect(original).not.toHaveProperty('publicPrices');
  await page.getByRole('button', { name: 'Borrar todos los datos locales', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar eliminación', exact: true }).click();
  await expect(page.getByText(/Datos locales eliminados/)).toBeVisible();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  await context.setOffline(true);
  let dialog = await restore(page, saved);
  await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click();
  expect(JSON.parse((await backup(page)).toString()).basket).toEqual([]);
  dialog = await restore(page, saved);
  await dialog.getByRole('button', { name: 'Sustituir y restaurar', exact: true }).click();
  await expect(page.getByText(/Copia restaurada en este dispositivo/)).toBeVisible();
  await page.reload();
  const recovered = JSON.parse((await backup(page)).toString());
  for (const key of ['basket', 'branches', 'groups', 'prices', 'history', 'favorites'])
    expect(recovered[key]).toEqual(original[key]);
  expect(recovered.cloudOwner).toBeNull();
  expect(recovered.products).toHaveLength(3);
  for (const product of recovered.products) {
    expect(product.source.restoredAt).toBeTruthy();
    expect(product.source.fetchedAt).toBe(
      original.products.find((p: { barcode: string }) => p.barcode === product.barcode).source
        .fetchedAt,
    );
  }
  await page.goto('/basket-comparison');
  await totals(page, expected.substituted.b, expected.substituted.difference);
  await page.goto('/alternatives');
  await page.getByRole('button', { name: 'Comparar grupo ' + groupName, exact: true }).click();
  await expect(page.getByText('Figura como sin gluten', { exact: true })).toHaveCount(2);
  await expect(page.getByText(/Trazas declaradas: en:milk/)).toHaveCount(2);
  expect(requests.off.sort()).toEqual(
    Object.values(items)
      .map((i) => i.code)
      .sort(),
  );
  expect(requests.publicRequests).toEqual([]);
  expect(requests.unexpected).toEqual([]);
  expect(errors).toEqual([]);
});

test('CAL-01: vincular fuentes conserva precisión y excluye la oferta más reciente sin rescatar el precio anterior', async ({
  page,
}) => {
  const requests = await network(page, async (route) => {
    const code = new URL(route.request().url()).searchParams.get('product_code')!;
    const rows = publicRows(code);
    await route.fulfill({ json: { items: rows, page: 1, size: 50, pages: 1, total: rows.length } });
  });
  const initial = await seed(page, false, true);
  await page.goto('/basket-comparison');
  await totals(page, expected.original.b, expected.original.difference);
  expect(requests.publicRequests).toEqual([]);
  await page
    .getByRole('button', { name: 'Consultar hasta 10 productos pendientes', exact: true })
    .click();
  await expect(page.getByText(/2\/2 productos consultados correctamente/)).toBeVisible();
  await page
    .getByRole('button', { name: 'Gestionar sucursales y referencias', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Identificar Open Prices · ubicación 101', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Vincular a Ensayo A · Calle A 1, Madrid', exact: true })
    .click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Confirmar cambio', exact: true })
    .click();
  await totals(page, expected.original.b);
  await expect(
    page.getByText(`Cesta incompleta · subtotal: ${expected.public.partialA}\u00a0€`, {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Ver desglose de Ensayo A', exact: true }).click();
  await expect(
    page.getByText(/Oferta o notas excluidas por los filtros. No se asigna precio cero/),
  ).toBeVisible();
  await expect(page.getByText(/3 × 1,805.*5,415/)).toBeVisible();
  await page
    .getByRole('button', { name: 'Incluir ofertas y anotaciones con notas', exact: true })
    .click();
  await expect(
    page.getByText(
      `Menor total de las cestas completas de esta muestra: ${expected.public.withOffersA}\u00a0€ · Ensayo A`,
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    page.getByText(
      `Diferencia estimada frente a la siguiente cesta completa: ${expected.public.difference}\u00a0€. No es ahorro de una compra realizada.`,
      { exact: true },
    ),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Precios públicos solo de España', exact: true }).click();
  await expect(
    page.getByText(
      `Menor total de las cestas completas de esta muestra: ${expected.public.abroad}\u00a0€ · Ensayo Francia`,
      { exact: true },
    ),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Precios públicos solo de España', exact: true }).click();
  await page.goto('/settings');
  const copy = JSON.parse((await backup(page)).toString());
  expect(copy.prices).toEqual(initial.prices);
  expect(copy).not.toHaveProperty('publicPrices');
  expect(copy.branches.find((b: { id: string }) => b.id === 'test-A').references).toHaveLength(2);
  expect(requests.publicRequests).toHaveLength(2);
  for (const url of requests.publicRequests)
    expect(new URL(url).searchParams.get('page')).toBe('1');
  expect(requests.unexpected).toEqual([]);
});

test('CAL-01: 429 detiene el lote; los precios antiguos siguen excluidos y la compra privada se recupera offline', async ({
  page,
  context,
}) => {
  const requests = await network(page, (route) => route.fulfill({ status: 429, body: 'limited' }));
  await seed(page, true);
  await page.goto('/basket-comparison');
  await totals(page, expected.original.b);
  await page
    .getByRole('button', { name: 'Consultar hasta 10 productos pendientes', exact: true })
    .click();
  await expect(
    page.getByText(/0\/2 productos consultados correctamente · 1 consultas con error/),
  ).toBeVisible();
  await expect(page.getByText(/La fuente ha limitado las peticiones/)).toBeVisible();
  expect(requests.publicRequests).toHaveLength(1);
  await page.getByRole('button', { name: 'Ver desglose de Ensayo A', exact: true }).click();
  await expect(
    page.getByText(/Observación fuera de los últimos 7 días. No se asigna precio cero/),
  ).toBeVisible();
  await totals(page, expected.original.b);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  await context.setOffline(true);
  await page.reload();
  await totals(page, expected.original.b);
  expect(requests.publicRequests).toHaveLength(1);
  expect(requests.unexpected).toEqual([]);
});

test('CAL-01: editar desde un enlace directo a totales abre siempre la cesta', async ({ page }) => {
  await network(page);
  await seed(page);
  await page.goto('/basket-comparison');
  await page.reload();
  await page.getByRole('button', { name: 'Editar mi cesta', exact: true }).click();
  await expect(page).toHaveURL(/\/basket$/);
  await expect(
    page.getByRole('textbox', { name: 'Envases de ' + items.rice.name, exact: true }),
  ).toHaveValue('3');
});
