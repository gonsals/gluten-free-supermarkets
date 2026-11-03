import type { Page } from '@playwright/test';

export async function expandSection(page: Page, title: string) {
  const button = page.getByRole('button', { name: title, exact: true });
  if ((await button.getAttribute('aria-expanded')) !== 'true') await button.click();
}
