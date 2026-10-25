import { test, expect, type Page } from '@playwright/test';

async function enlargeText(page: Page) {
  // Exercise text reflow without scaling the viewport or touch targets.
  // Android's actual font_scale is checked separately on the preview APK.
  await page.evaluate(() => {
    const elements = [...document.querySelectorAll<HTMLElement>('body *')].filter((element) =>
      [...element.childNodes].some(
        (node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim(),
      ),
    );
    const sizes = elements.map((element) => {
      const style = getComputedStyle(element);
      const font = parseFloat(style.fontSize);
      return { element, font, line: parseFloat(style.lineHeight) || font * 1.4 };
    });
    for (const { element, font, line } of sizes) {
      element.style.fontSize = `${font * 2}px`;
      element.style.lineHeight = `${line * 2}px`;
    }
  });
}

test('el diálogo tiene nombre, mantiene el foco y devuelve el teclado al botón de origen', async ({
  page,
}) => {
  await page.goto('/settings');
  const trigger = page.getByRole('button', { name: 'Borrar todos los datos locales', exact: true });
  await trigger.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'Borrar biblioteca local', exact: true });
  await expect(dialog).toBeVisible();
  const cancel = dialog.getByRole('button', { name: 'Cancelar', exact: true });
  const confirm = dialog.getByRole('button', { name: 'Confirmar eliminación', exact: true });
  await expect(cancel).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(confirm).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(cancel).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(confirm).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

for (const colorScheme of ['light', 'dark'] as const) {
  test(`texto al 200 %: explicación y acciones del diálogo alcanzables en 320 × 480 (${colorScheme})`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 480 });
    await page.emulateMedia({ colorScheme });
    await page.goto('/settings');
    await page.getByRole('button', { name: 'Borrar todos los datos locales', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Borrar biblioteca local', exact: true });
    await enlargeText(page);
    const heading = dialog.getByRole('heading', { name: 'Borrar biblioteca local', exact: true });
    await heading.scrollIntoViewIfNeeded();
    await expect(heading).toBeInViewport({ ratio: 1 });
    const confirm = dialog.getByRole('button', { name: 'Confirmar eliminación', exact: true });
    await confirm.scrollIntoViewIfNeeded();
    await expect(confirm).toBeInViewport({ ratio: 1 });
    const bounds = await confirm.boundingBox();
    expect(bounds!.y).toBeGreaterThanOrEqual(0);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(480);
    const overflow = await dialog.evaluate((element) => element.scrollWidth > element.clientWidth);
    expect(overflow).toBe(false);
    const cancel = dialog.getByRole('button', { name: 'Cancelar', exact: true });
    await cancel.scrollIntoViewIfNeeded();
    await expect(cancel).toBeInViewport({ ratio: 1 });
    await cancel.click();
    await expect(dialog).toHaveCount(0);
  });
}

test('biblioteca y unidades exponen la selección sin depender del color', async ({ page }) => {
  await page.goto('/library');
  const favorites = page.getByRole('button', { name: 'Favoritos (0)', exact: true });
  const history = page.getByRole('button', { name: 'Historial (0)', exact: true });
  await expect(favorites).toHaveAttribute('aria-pressed', 'true');
  await expect(history).toHaveAttribute('aria-pressed', 'false');
  await history.click();
  await expect(favorites).toHaveAttribute('aria-pressed', 'false');
  await expect(history).toHaveAttribute('aria-pressed', 'true');
  await page.goto('/prices');
  const unit = page.getByRole('button', { name: 'Unidad', exact: true });
  const kg = page.getByRole('button', { name: 'Kilogramos', exact: true });
  await expect(unit).toHaveAttribute('aria-pressed', 'true');
  await kg.click();
  await expect(kg).toHaveAttribute('aria-pressed', 'true');
  await expect(unit).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByRole('button', { name: 'Litros', exact: true })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
});
