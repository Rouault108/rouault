import { expect, test } from '@playwright/test';

test.describe('App Shell', () => {
  test('skip link が main-content を指していること', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'メインコンテンツへ移動' })).toHaveAttribute(
      'href',
      '#main-content',
    );
    await expect(page.locator('#main-content')).toHaveAttribute('tabindex', '-1');
  });
});
