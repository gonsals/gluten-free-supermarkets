import { test, expect } from '@playwright/test';
const code = '3274080005003';

test('denegar la cámara permite consultar manualmente sin errores de JavaScript', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
      configurable: true,
      value: () => Promise.reject(new DOMException('Permission denied', 'NotAllowedError')),
    });
  });
  await page.route('https://world.openfoodfacts.org/api/v2/product/**', (route) =>
    route.fulfill({ json: { status: 0 } }),
  );
  await page.goto('/scan');
  await page.getByRole('button', { name: 'Usar cámara', exact: true }).click();
  await expect(page.getByText(/No se ha concedido acceso/)).toBeVisible();
  await page.getByRole('textbox', { name: 'Código de barras', exact: true }).fill(code);
  await page.getByRole('button', { name: 'Buscar producto', exact: true }).click();
  await expect(page.getByText(/Este producto no aparece en la fuente/)).toBeVisible();
  expect(errors).toEqual([]);
});

test('una respuesta tardía de permisos después de cambiar de pestaña no contamina el escáner', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
      configurable: true,
      value: () =>
        new Promise<MediaStream>((_resolve, reject) => {
          Object.defineProperty(window, '__denyCameraPermission', {
            configurable: true,
            value: () => reject(new DOMException('Permission denied', 'NotAllowedError')),
          });
        }),
    });
  });
  await page.goto('/scan');
  const start = page.getByRole('button', { name: 'Usar cámara', exact: true });
  await start.click();
  await expect(start).toBeDisabled();
  await page.getByRole('tab', { name: 'Biblioteca', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Tu biblioteca', exact: true })).toBeVisible();
  await page.evaluate(() => Reflect.get(window, '__denyCameraPermission')());
  await page.getByRole('tab', { name: 'Consultar', exact: true }).click();
  await expect(start).toBeEnabled();
  await expect(page.getByText(/No se ha concedido acceso/)).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: 'Código de barras', exact: true })).toBeEditable();
});

test('cancelar una consulta lenta conserva la entrada manual y descarta el resultado tardío', async ({
  page,
}) => {
  let finish!: () => void;
  const waiting = new Promise<void>((resolve) => {
    finish = resolve;
  });
  await page.route('https://world.openfoodfacts.org/api/v2/product/**', async (route) => {
    await waiting;
    await route.fulfill({ json: { status: 0 } });
  });
  await page.goto('/scan');
  await page.getByRole('textbox', { name: 'Código de barras', exact: true }).fill(code);
  const requested = page.waitForRequest('https://world.openfoodfacts.org/api/v2/product/**');
  await page.getByRole('button', { name: 'Buscar producto', exact: true }).click();
  await requested;
  await page.getByRole('button', { name: 'Cancelar consulta', exact: true }).click();
  finish();
  await expect(page.getByRole('textbox', { name: 'Código de barras', exact: true })).toHaveValue(
    '',
  );
  await expect(page.getByText(/Este producto no aparece en la fuente/)).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Usar cámara', exact: true })).toBeEnabled();
});
