import { test, expect, type Page } from '@playwright/test';
import { expandSection } from './helpers/disclosure';

const raw =
  'https://raw.githubusercontent.com/gonsals/gluten-free-supermarkets/main/data/retail-prices.es.json';
function catalog() {
  const now = new Date().toISOString();
  return {
    version: 1,
    generatedAt: now,
    sources: ['mercadona', 'aldi', 'lidl'].map((retailer) => ({
      retailer,
      status: 'ok',
      attemptedAt: now,
    })),
    entries: [
      {
        retailer: 'mercadona',
        sku: '1',
        group: 'category:29@bcn1',
        name: 'Patatas de ensayo Mercadona',
        quantity: '1 kg',
        amountMilli: 1550,
        scope: 'Online · almacén bcn1 (Barcelona)',
        sourceUrl: 'https://tienda.mercadona.es/product/1/patatas',
        isOffer: false,
        conditions: '',
      },
      {
        retailer: 'aldi',
        sku: '2',
        group: 'weekly',
        name: 'Patatas de ensayo Aldi',
        quantity: '3 kg',
        amountMilli: 2850,
        scope: 'Península · sin tienda seleccionada',
        sourceUrl: 'https://www.aldi.es/producto/patatas-2.html',
        isOffer: true,
        conditions: 'Hasta fin de existencias',
      },
      {
        retailer: 'lidl',
        sku: '3',
        group: 'weekly',
        name: 'Patatas de ensayo Lidl',
        quantity: '1 kg',
        amountMilli: 1190,
        scope: 'Zona de precio 1 de Lidl · confirma tu tienda',
        sourceUrl: 'https://www.lidl.es/p/patatas/p3',
        isOffer: true,
        conditions: 'Requiere Lidl Plus',
      },
      {
        retailer: 'mercadona',
        sku: '4',
        group: 'category:120@bcn1',
        name: 'Pasta con patatas de ensayo',
        quantity: '250 g',
        amountMilli: 900,
        scope: 'Online · almacén bcn1 (Barcelona)',
        sourceUrl: 'https://tienda.mercadona.es/product/4/pasta',
        isOffer: false,
        conditions: '',
      },
    ].map((row) => ({
      ...row,
      id: `${row.retailer}:${row.sku}${row.retailer === 'mercadona' ? ':bcn1' : ''}`,
      checkedAt: now,
      startsAt: null as string | null,
      endsAt: new Date(Date.now() + 86400000).toISOString(),
      unitPrice: null,
    })),
  };
}
async function prepare(page: Page) {
  await page.route('https://prices.openfoodfacts.org/api/v1/**', (route) =>
    route.fulfill({
      json: {
        items: [],
        page: 1,
        pages: 1,
        total: 0,
        size: route.request().url().includes('/products?') ? 20 : 50,
      },
    }),
  );
}
async function search(page: Page, text: string, store = '') {
  await page.getByRole('textbox', { name: 'Buscar productos', exact: true }).fill(text);
  if (store) {
    await expandSection(page, 'Filtrar precios y ofertas');
    await page
      .getByRole('textbox', { name: 'Tienda o localidad (opcional)', exact: true })
      .fill(store);
  }
  await page.getByRole('button', { name: 'Buscar precios', exact: true }).click();
}
test('Mercadona, Aldi y Lidl aparecen con precios ordenados, formatos, ámbito y condiciones', async ({
  page,
}) => {
  await prepare(page);
  const requests: string[] = [];
  await page.route(raw, (route) => {
    requests.push(route.request().url());
    return route.fulfill({ json: catalog() });
  });
  await page.goto('/prices');
  await search(page, 'patatas');
  await expect(page.getByText('Patatas de ensayo Lidl', { exact: true })).toBeVisible();
  const prices = page.getByLabel(/€ · (Mercadona|Aldi|Lidl)$/);
  await expect(prices).toHaveCount(3);
  await expect(prices.nth(0)).toContainText('1,19');
  await expect(prices.nth(1)).toContainText('1,55');
  await expect(prices.nth(2)).toContainText('2,85');
  await expect(page.getByText('Formato publicado: 3 kg.', { exact: true })).toBeVisible();
  await expect(page.getByText('Requiere Lidl Plus', { exact: true })).toBeVisible();
  await expandSection(page, 'Detalles de Mercadona');
  await expect(page.getByText('Online · almacén bcn1 (Barcelona)', { exact: true })).toBeVisible();
  expect(requests).toEqual([raw]);
  await page.getByRole('heading', { name: 'Supermercados', exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: test.info().outputPath('supermercados.png') });
  await expandSection(page, 'Filtrar precios y ofertas');
  await page.getByRole('button', { name: 'Solo ofertas', exact: true }).click();
  await expect(prices).toHaveCount(2);
  await expect(page.getByText('Patatas de ensayo Mercadona', { exact: true })).toHaveCount(0);
  await search(page, 'patatas', 'Aldi');
  await expect(prices).toHaveCount(1);
  await expect(prices).toHaveAttribute('aria-label', /Aldi$/);
  expect(requests).toEqual([raw]);
});
test('el catálogo incluido funciona aunque las fuentes remotas fallen, sin alterar su fecha', async ({
  page,
}) => {
  await page.route('https://prices.openfoodfacts.org/api/v1/**', (route) =>
    route.fulfill({ status: 503, json: {} }),
  );
  await page.route(raw, (route) => route.fulfill({ status: 503, json: {} }));
  await page.goto('/prices');
  await search(page, 'huevos', 'Mercadona');
  await expandSection(page, 'Sobre estos precios');
  await expect(page.getByText(/No se ha podido actualizar el catálogo/)).toBeVisible();
  await expandSection(page, 'Filtrar precios y ofertas');
  await page.getByRole('button', { name: 'Incluir precios anteriores', exact: true }).click();
  await page.getByRole('button', { name: /Ver los \d+ precios de Mercadona/ }).click();
  await expect(page.getByText('Huevos grandes L', { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/Web oficial · consultado el/).first()).toBeVisible();
  await expandSection(page, 'Otras aportaciones y mis precios');
  await expect(
    page.getByText('Open Prices no está disponible en este momento.', { exact: true }),
  ).toBeVisible();
});
test('las ofertas futuras o vencidas no aparecen al ampliar el histórico', async ({ page }) => {
  await prepare(page);
  const feed = catalog();
  feed.entries[0].endsAt = '2000-01-01T00:00:00.000Z';
  feed.entries[1].startsAt = '2099-01-01T00:00:00.000Z';
  feed.entries[1].endsAt = '2099-01-02T00:00:00.000Z';
  await page.route(raw, (route) => route.fulfill({ json: feed }));
  await page.goto('/prices');
  await search(page, 'patatas');
  await expect(page.getByText('Patatas de ensayo Lidl', { exact: true })).toBeVisible();
  await expandSection(page, 'Filtrar precios y ofertas');
  await page.getByRole('button', { name: 'Incluir precios anteriores', exact: true }).click();
  await expect(page.getByText('Patatas de ensayo Mercadona', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Patatas de ensayo Aldi', { exact: true })).toHaveCount(0);
});

test('desde inicio busca con un toque y abre todos los precios de una cadena sin salir de la app', async ({
  page,
  context,
}) => {
  await prepare(page);
  const feed = catalog();
  feed.entries = [
    { ...feed.entries[0], name: 'Huevos pequeños Mercadona', quantity: '6 unidades' },
    {
      ...feed.entries[0],
      sku: '5',
      id: 'mercadona:5:bcn1',
      name: 'Huevos grandes Mercadona',
      quantity: '12 unidades',
      amountMilli: 2900,
    },
    { ...feed.entries[1], name: 'Huevos de ensayo Aldi' },
  ].map((p) => ({ ...p, group: p.retailer === 'mercadona' ? 'category:77@bcn1' : p.group }));
  await page.route(raw, (route) => route.fulfill({ json: feed }));
  const navigations: string[] = [];
  page.on('framenavigated', (frame) => {
    if (frame === page.mainFrame()) navigations.push(frame.url());
  });
  await page.goto('/');
  await expect(page.getByRole('textbox')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Solo ofertas', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Huevos', exact: true }).click();
  await expect(page.getByText('Huevos pequeños Mercadona', { exact: true })).toBeVisible();
  await expect(page.getByText('Huevos grandes Mercadona', { exact: true })).not.toBeVisible();
  await expect(page.getByLabel(/^Desde .*€ · /)).toHaveCount(2);
  await expandSection(page, 'Ver los 2 precios de Mercadona');
  await expect(page.getByText('Huevos grandes Mercadona', { exact: true })).toBeVisible();
  await expect(page.getByText('Formato publicado: 12 unidades.', { exact: true })).toBeVisible();
  await expect(page.getByText('2,90 € · Mercadona', { exact: true })).toBeVisible();
  await expect(page.getByText(/Sin precio disponible:.*Lidl/)).toBeVisible();
  await expect(
    page.getByRole('button', {
      name: /Ver .* en |Consultar |Tienda oficial|Ofertas oficiales|Ver precio en la fuente/,
    }),
  ).toHaveCount(0);
  expect(context.pages()).toHaveLength(1);
  expect([...new Set(navigations)]).toEqual([page.url()]);
  expect(new URL(page.url()).pathname).toBe('/');
  await page.getByRole('button', { name: 'Ver los 2 precios de Mercadona', exact: true }).click();
  await page.getByRole('heading', { name: 'Supermercados', exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: test.info().outputPath('comparador-simple.png') });
  await page.getByRole('textbox', { name: 'Buscar productos', exact: true }).fill('');
  await page.getByRole('button', { name: 'Buscar precios', exact: true }).click();
  await expect(
    page.getByText('Escribe entre 2 y 80 caracteres para buscar un producto.', { exact: true }),
  ).toBeVisible();
  await expect(page.getByText('Huevos pequeños Mercadona', { exact: true })).toBeVisible();
});

for (const colorScheme of ['light', 'dark'] as const) {
  test(`buscador y precios accesibles con teclado y texto al 200 % en 320 px (${colorScheme})`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.emulateMedia({ colorScheme });
    await prepare(page);
    await page.route(raw, (route) => route.fulfill({ json: catalog() }));
    await page.goto('/');
    for (const name of ['Inicio', 'Comparar', 'Escanear', 'Biblioteca', 'Ajustes']) {
      const label = page.getByRole('tab', { name, exact: true }).getByText(name, { exact: true });
      expect(
        await label.evaluate(
          (node) =>
            node.getBoundingClientRect().height / parseFloat(getComputedStyle(node).lineHeight),
        ),
      ).toBeLessThanOrEqual(1.05);
    }
    const input = page.getByRole('textbox', { name: 'Buscar productos', exact: true });
    await input.press('Enter');
    await expect(input).toHaveAttribute('aria-invalid', 'true');
    await input.fill('patatas');
    await expect(input).toHaveCSS('outline-style', 'solid');
    await input.press('Enter');
    await expect(page.getByLabel(/^Desde .*€ · /)).toHaveCount(3);
    await expect(input).not.toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByText('3 supermercados con precios', { exact: true })).toHaveAttribute(
      'aria-live',
      'polite',
    );
    await page.getByRole('button', { name: 'Buscar precios', exact: true }).focus();
    await page.keyboard.press('Tab');
    const filters = page.getByRole('button', { name: 'Filtrar precios y ofertas', exact: true });
    await expect(filters).toBeFocused();
    await expect(filters).toHaveCSS('outline-width', '3px');
    await page.keyboard.press('Enter');
    await expect(filters).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Enter');
    await expect(filters).toHaveAttribute('aria-expanded', 'false');
    await page.evaluate(() => {
      const sizes = [...document.querySelectorAll<HTMLElement>('body *')]
        .filter((element) =>
          [...element.childNodes].some(
            (node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim(),
          ),
        )
        .map((element) => {
          const style = getComputedStyle(element);
          const font = parseFloat(style.fontSize);
          return { element, font, line: parseFloat(style.lineHeight) || font * 1.4 };
        });
      for (const { element, font, line } of sizes) {
        element.style.fontSize = `${font * 2}px`;
        element.style.lineHeight = `${line * 2}px`;
      }
    });
    const details = page.getByRole('button', { name: 'Detalles de Lidl', exact: true });
    await details.scrollIntoViewIfNeeded();
    const bounds = await details.boundingBox();
    expect(bounds!.width).toBeGreaterThanOrEqual(48);
    expect(bounds!.height).toBeGreaterThanOrEqual(48);
    await details.focus();
    await page.keyboard.press('Enter');
    await expect(details).toHaveAttribute('aria-expanded', 'true');
    await expect(
      page.getByText('Zona de precio 1 de Lidl · confirma tu tienda', { exact: true }),
    ).toBeVisible();
    await expect(page.getByText('Requiere Lidl Plus', { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
      false,
    );
    await page.getByLabel(/€ · Lidl$/).scrollIntoViewIfNeeded();
    await page.screenshot({
      path: test.info().outputPath(`precios-accesibles-${colorScheme}.png`),
    });
  });
}
