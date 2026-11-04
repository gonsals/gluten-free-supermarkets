import { test, expect } from '@playwright/test';
import { expandSection } from './helpers/disclosure';
const raw =
  'https://raw.githubusercontent.com/gonsals/gluten-free-supermarkets/main/data/retail-prices.es.json';
function catalog() {
  const now = new Date().toISOString();
  const records = [
    [
      'mercadona',
      'Mercadona',
      'category:77@bcn1',
      'https://tienda.mercadona.es/product/1/huevos',
      'Referencia bcn1 (Barcelona)',
    ],
    [
      'dia',
      'DIA',
      'category:eggs',
      'https://www.dia.es/huevos/p/1',
      'Online · sin código postal seleccionado',
    ],
    [
      'caprabo',
      'Caprabo',
      'category:eggs',
      'https://www.capraboacasa.com/es/productdetail/1-huevos/',
      'Online · sin código postal seleccionado',
    ],
    [
      'ametller',
      'Ametller Origen',
      'category:eggs',
      'https://www.ametllerorigen.com/es/huevos/1.html',
      'Online · sin código postal seleccionado',
    ],
    ['aldi', 'Aldi', 'weekly', 'https://www.aldi.es/producto/huevos-1.html', 'Península'],
    ['lidl', 'Lidl', 'weekly', 'https://www.lidl.es/p/huevos/p1', 'Zona de precio 1'],
  ];
  const entries = records.map(([retailer, name, group, sourceUrl, scope], index) => ({
    retailer,
    sku: '1',
    id: `${retailer}:1${retailer === 'mercadona' ? ':bcn1' : ''}`,
    group,
    sourceUrl,
    scope,
    name: `Huevos de ensayo ${name}`,
    quantity: '6 unidades',
    amountMilli: 1800 + index * 100,
    checkedAt: now,
    startsAt: null,
    endsAt: null,
    isOffer: false,
    conditions: 'Confirma tu tienda',
    unitPrice: null,
  }));
  entries.push({
    ...entries[0],
    id: 'mercadona:2',
    sku: '2',
    group: 'category:77',
    name: 'Huevos antiguos de Valencia',
    scope: 'vlc1 (Valencia)',
    amountMilli: 100,
  });
  return {
    version: 1,
    generatedAt: now,
    entries,
    sources: records.map(([retailer]) => ({ retailer, status: 'ok', attemptedAt: now })),
  };
}
test('compara seis cadenas de Barcelona, separa Valencia y permite elegir DIA sin volver a descargar', async ({
  page,
}) => {
  let downloads = 0,
    communityRequests = 0;
  await page.route(raw, (route) => {
    downloads++;
    return route.fulfill({ json: catalog() });
  });
  await page.route('https://prices.openfoodfacts.org/api/v1/**', (route) => {
    communityRequests++;
    return route.fulfill({ json: { items: [], page: 1, pages: 1, total: 0, size: 20 } });
  });
  await page.goto('/prices');
  await page.getByRole('textbox', { name: 'Buscar productos', exact: true }).fill('huevos');
  await page.getByRole('button', { name: 'Buscar precios', exact: true }).click();
  await expect(page.getByText('Huevos de ensayo Ametller Origen', { exact: true })).toBeVisible();
  await expect(
    page.getByLabel(/€ · (Mercadona|DIA|Caprabo|Ametller Origen|Aldi|Lidl)$/),
  ).toHaveCount(6);
  await expect(page.getByText('Huevos antiguos de Valencia', { exact: true })).toHaveCount(0);
  await expandSection(page, 'Detalles de Mercadona');
  await expect(page.getByText('Referencia bcn1 (Barcelona)', { exact: true })).toBeVisible();
  await page.getByText('Huevos de ensayo DIA', { exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: test.info().outputPath('barcelona.png') });
  await expandSection(page, 'Elegir supermercado');
  await page.getByRole('button', { name: 'DIA', exact: true }).click();
  await expandSection(page, 'Sobre estos precios');
  await expect(page.getByLabel(/€ · DIA$/)).toHaveCount(1);
  await expect(page.getByLabel(/€ · Mercadona$/)).toHaveCount(0);
  expect(downloads).toBe(1);
  expect(communityRequests).toBe(1);
});
test('DIA sigue disponible con la copia incluida y las cadenas pendientes se identifican sin precios inventados', async ({
  page,
}) => {
  await page.route(raw, (route) => route.fulfill({ status: 503, json: {} }));
  await page.route('https://prices.openfoodfacts.org/api/v1/**', (route) =>
    route.fulfill({ status: 503, json: {} }),
  );
  await page.goto('/prices');
  await page.getByRole('textbox', { name: 'Buscar productos', exact: true }).fill('huevos');
  await expandSection(page, 'Elegir supermercado');
  await page.getByRole('button', { name: 'DIA', exact: true }).click();
  await expandSection(page, 'Sobre estos precios');
  await expect(page.getByText(/No se ha podido actualizar el catálogo/)).toBeVisible();
  await expect(page.getByLabel(/€ · DIA$/).first()).toBeVisible();
  await expandSection(page, 'Sobre estos precios');
  await expect(page.getByText(/todavía no tienen precios integrados/)).toBeVisible();
  await expect(page.getByRole('button', { name: /^Consultar / })).toHaveCount(0);
});
