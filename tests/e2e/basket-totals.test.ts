import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const code = '3274080005003',
  other = '3017620422003';
const observed = new Date(Date.now() - 86400000).toISOString();
const pageData = (items: unknown[]) => ({
  items,
  page: 1,
  size: 50,
  pages: items.length ? 1 : 0,
  total: items.length,
});
function price(id: string, barcode: string, store: string, amountMinor: number) {
  return {
    id,
    barcode,
    store,
    location: `Calle ${store} 1`,
    amountMinor,
    currency: 'EUR',
    observedAt: observed,
    createdAt: observed,
    quantity: 1,
    unit: 'unit',
    offerEndsAt: null,
    notes: '',
  };
}
async function seed(page: Page, many = 0) {
  const codes = many
    ? Array.from({ length: many }, (_, i) => {
        const prefix = String(100000000000 + i);
        const sum = [...prefix].reduce((s, d, p) => s + Number(d) * (p % 2 ? 3 : 1), 0);
        return prefix + ((10 - (sum % 10)) % 10);
      })
    : [code, other];
  const value = {
    format: 'sin-gluten-library',
    version: 3,
    backupVersion: 3,
    exportedAt: observed,
    history: [],
    favorites: {},
    cache: {},
    products: [],
    cloudOwner: null,
    branches: [],
    basket: codes.map((barcode, i) => ({
      barcode,
      name: i === 0 ? 'Leche' : 'Pasta ' + i,
      quantity: i === 0 ? 2 : 1,
      addedAt: observed,
    })),
    prices: many
      ? []
      : [
          price('a1', code, 'A', 120),
          price('a2', other, 'A', 210),
          price('b1', code, 'B', 105),
          price('c1', code, 'C', 135),
          price('c2', other, 'C', 205),
        ],
  };
  await page.goto('/settings');
  const picker = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Restaurar una copia', exact: true }).click();
  await (
    await picker
  ).setFiles({
    name: 'cesta.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(value)),
  });
  await page.getByRole('button', { name: 'Sustituir y restaurar', exact: true }).click();
  await expect(page.getByText(/Copia restaurada en este dispositivo/)).toBeVisible();
  await page.goto('/basket');
  await page.getByRole('button', { name: 'Comparar total por tienda', exact: true }).click();
  return codes;
}
async function identify(page: Page, name: string) {
  await page
    .getByRole('button', {
      name: `Identificar ${name.toLowerCase()} · calle ${name.toLowerCase()} 1`,
      exact: true,
    })
    .click();
  await page
    .getByRole('textbox', { name: 'Nombre de la sucursal', exact: true })
    .fill('Sucursal ' + name);
  await page
    .getByRole('textbox', { name: 'Dirección concreta de la sucursal', exact: true })
    .fill('Calle ' + name + ' 1, Madrid');
  await page
    .getByRole('button', { name: 'Confirmo que es una sucursal física concreta', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Crear sucursal con esta referencia', exact: true })
    .click();
  await expect(page.getByRole('heading', { name: 'Sucursal ' + name, exact: true })).toBeVisible();
}
async function stores(page: Page) {
  await page
    .getByRole('button', { name: 'Gestionar sucursales y referencias', exact: true })
    .click();
  for (const name of ['A', 'B', 'C']) await identify(page, name);
}
async function copy(page: Page) {
  await page.goto('/settings');
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar mis datos', exact: true }).click();
  return JSON.parse((await readFile((await (await downloading).path())!)).toString());
}

test('identifica sucursales y compara completas sin presentar el subtotal B como menor total', async ({
  page,
}) => {
  await seed(page);
  await expect(page.getByText(/No hay ninguna cesta completa/)).toBeVisible();
  await stores(page);
  await expect(page.getByText(/Menor total.*4,50.*Sucursal A/)).toBeVisible();
  await expect(page.getByText(/siguiente cesta completa: 0,25/)).toBeVisible();
  await expect(
    page.getByText('Cesta incompleta · subtotal: 2,10 €', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Ver desglose de Sucursal B', exact: true }).click();
  await expect(
    page.getByText(/Sin precio para esta sucursal.*No se asigna precio cero/),
  ).toBeVisible();
  const exported = await copy(page);
  expect(exported.version).toBe(4);
  expect(exported.branches).toHaveLength(3);
  expect(exported).not.toHaveProperty('publicPrices');
  await page.goto('/basket-comparison');
  await page.reload();
  await expect(page.getByText(/Menor total.*4,50.*Sucursal A/)).toBeVisible();
});

test('vincula público/privado con confirmación; usa más reciente y permite deshacer sin borrar precios', async ({
  page,
}) => {
  const requests: string[] = [];
  await page.route('https://prices.openfoodfacts.org/api/v1/prices?**', (route) => {
    const barcode = new URL(route.request().url()).searchParams.get('product_code')!;
    requests.push(barcode);
    return route.fulfill({
      json: pageData(
        barcode === code
          ? [
              {
                id: 901,
                type: 'PRODUCT',
                product_code: code,
                currency: 'EUR',
                price: '1.805',
                price_is_discounted: false,
                price_per: null,
                date: new Date().toISOString().slice(0, 10),
                location: {
                  id: 101,
                  type: 'OSM',
                  osm_name: 'A',
                  osm_display_name: 'Calle A 1, Madrid',
                  osm_address_country_code: 'ES',
                },
              },
            ]
          : [],
      ),
    });
  });
  await seed(page);
  await stores(page);
  expect(requests).toEqual([]);
  await page
    .getByRole('button', { name: 'Consultar hasta 10 productos pendientes', exact: true })
    .click();
  await expect(page.getByText(/2\/2 productos consultados correctamente/)).toBeVisible();
  expect(requests).toHaveLength(2);
  await page
    .getByRole('button', { name: 'Identificar Open Prices · ubicación 101', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Vincular a Sucursal A · Calle A 1, Madrid', exact: true })
    .click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Confirmar cambio', exact: true })
    .click();
  await expect(page.getByText(/Menor total.*4,75.*Sucursal C/)).toBeVisible();
  await page.getByRole('button', { name: 'Ver desglose de Sucursal A', exact: true }).click();
  await expect(page.getByText(/Las referencias vinculadas difieren/)).toBeVisible();
  await expect(page.getByText(/2 × 1,805.*3,61/)).toBeVisible();
  await page
    .getByRole('button', { name: 'Desvincular Open Prices · ubicación 101', exact: true })
    .click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Confirmar cambio', exact: true })
    .click();
  await expect(page.getByText(/Menor total.*4,50.*Sucursal A/)).toBeVisible();
  const exported = await copy(page);
  expect(exported.prices).toHaveLength(5);
  expect(
    exported.branches.flatMap((branch: { references: unknown[] }) => branch.references),
  ).toHaveLength(3);
});

test('un error público conserva las cestas privadas y no se presenta como cero precios', async ({
  page,
}) => {
  await page.route('https://prices.openfoodfacts.org/api/v1/prices?**', (route) =>
    route.fulfill({ status: 503, body: 'unavailable' }),
  );
  await seed(page);
  await stores(page);
  await page
    .getByRole('button', { name: 'Consultar hasta 10 productos pendientes', exact: true })
    .click();
  await expect(page.getByText(/2 consultas con error/)).toBeVisible();
  await expect(page.getByText(/Menor total.*4,50.*Sucursal A/)).toBeVisible();
});

test('limita cada acción a 10 productos y una página por código, sin barrer automáticamente la cesta', async ({
  page,
}) => {
  const urls: string[] = [];
  await page.route('https://prices.openfoodfacts.org/api/v1/prices?**', (route) => {
    urls.push(route.request().url());
    return route.fulfill({ json: pageData([]) });
  });
  await seed(page, 11);
  expect(urls).toEqual([]);
  await page
    .getByRole('button', { name: 'Consultar hasta 10 productos pendientes', exact: true })
    .click();
  await expect(page.getByText(/10\/11 productos consultados correctamente/)).toBeVisible();
  expect(urls).toHaveLength(10);
  expect(urls.every((url) => new URL(url).searchParams.get('page') === '1')).toBe(true);
  await page
    .getByRole('button', { name: 'Consultar hasta 10 productos pendientes', exact: true })
    .click();
  await expect(page.getByText(/11\/11 productos consultados correctamente/)).toBeVisible();
  expect(urls).toHaveLength(11);
});

test('cancelar detiene el lote público y conserva las anotaciones privadas', async ({ page }) => {
  const urls: string[] = [];
  let release: () => void = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('https://prices.openfoodfacts.org/api/v1/prices?**', async (route) => {
    urls.push(route.request().url());
    await held;
    await route.fulfill({ json: pageData([]) }).catch(() => undefined);
  });
  await seed(page);
  await page
    .getByRole('button', { name: 'Consultar hasta 10 productos pendientes', exact: true })
    .click();
  await expect.poll(() => urls.length).toBe(1);
  await page
    .getByRole('button', { name: 'Cancelar consulta pública de la cesta', exact: true })
    .click();
  release();
  await expect(page.getByText(/0\/2 productos consultados correctamente/)).toBeVisible();
  await page.getByRole('button', { name: 'Editar mi cesta', exact: true }).click();
  expect(urls).toHaveLength(1);
});

test('identificación y confirmación son alcanzables en pantalla pequeña con texto ampliado', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 480 });
  await seed(page);
  await page
    .getByRole('button', { name: 'Gestionar sucursales y referencias', exact: true })
    .click();
  await identify(page, 'A');
  await page.addStyleTag({
    content: 'div,span,input,button,a { font-size:26px !important; line-height:1.5 !important; }',
  });
  await page.getByRole('button', { name: 'Desvincular a · calle a 1', exact: true }).click();
  const confirm = page
    .getByRole('dialog')
    .getByRole('button', { name: 'Confirmar cambio', exact: true });
  await confirm.scrollIntoViewIfNeeded();
  await expect(confirm).toBeInViewport();
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});
