import type { Page } from '@playwright/test';

export async function expandSection(page: Page, title: string) {
  if (
    /^(Buscar por código o escanear|Mis productos guardados|Anotar un precio sin buscar el producto|Mis precios guardados)/.test(
      title,
    )
  )
    await expandSection(page, 'Mis productos y precios');
  if (title === 'Elegir supermercado') await expandSection(page, 'Filtrar precios y ofertas');
  const button = page.getByRole('button', { name: title, exact: true });
  if ((await button.getAttribute('aria-expanded')) !== 'true') await button.click();
}
