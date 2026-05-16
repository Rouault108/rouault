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

  test('ヘッダー検索導線で global search dialog が hydration 経由で開くこと', async ({ page }) => {
    const consoleMessages: string[] = [];
    page.on('console', (message) => {
      consoleMessages.push(message.text());
    });

    await page.goto('/');

    const searchTrigger = page.locator('layout-header ui-search-trigger').first();
    await expect(searchTrigger).toBeVisible();

    await page.waitForFunction(() => {
      const dialog = document.querySelector('#global-search-dialog');
      return (
        dialog instanceof HTMLElement &&
        customElements.get('ui-search-dialog') !== undefined &&
        typeof (dialog as { requestOpen?: unknown }).requestOpen === 'function' &&
        typeof (dialog as { captureOpenModality?: unknown }).captureOpenModality === 'function' &&
        typeof (dialog as { searcher?: unknown }).searcher === 'function'
      );
    });

    await searchTrigger.click();
    await expect(page.locator('#global-search-dialog')).toHaveAttribute('opened', '');

    await page.waitForFunction(() => {
      const dialog = document.querySelector('#global-search-dialog');
      if (!(dialog instanceof HTMLElement) || dialog.shadowRoot === null) {
        return false;
      }

      const field = dialog.shadowRoot.querySelector('ui-search-field');
      if (!(field instanceof HTMLElement) || field.shadowRoot === null) {
        return false;
      }

      return field.shadowRoot.activeElement?.matches('input[type="search"]') === true;
    });

    await page.keyboard.press('Escape');
    await expect(page.locator('#global-search-dialog')).not.toHaveAttribute('opened', '');

    await page.keyboard.press('Control+K');
    await expect(page.locator('#global-search-dialog')).toHaveAttribute('opened', '');

    expect(consoleMessages.join('\n')).not.toContain('requestOpen is not a function');
    expect(consoleMessages.join('\n')).not.toContain('captureOpenModality is not a function');
  });

  test('search page component が content hydration 経由で upgrade されること', async ({ page }) => {
    await page.goto('/search/');

    await page.waitForFunction(() => {
      const host = document.querySelector('#main-content search-page');
      return (
        host instanceof HTMLElement &&
        customElements.get('search-page') !== undefined &&
        host.constructor !== HTMLElement &&
        host.shadowRoot?.querySelector('ui-search-field.search-input-control') !== null
      );
    });
  });
});
