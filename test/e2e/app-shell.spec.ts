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

    const searchTrigger = page.locator('layout-header [data-search-dialog-trigger]').first();
    await expect(searchTrigger).toBeVisible();

    await page.waitForFunction(() => {
      const dialog = document.querySelector('#global-search-dialog');
      return (
        dialog instanceof HTMLDialogElement &&
        dialog.querySelector('[data-search-dialog-input]') instanceof HTMLInputElement
      );
    });

    await searchTrigger.click();
    await expect(page.locator('#global-search-dialog')).toHaveAttribute('open', '');

    await page.waitForFunction(() => {
      const dialog = document.querySelector('#global-search-dialog');
      if (!(dialog instanceof HTMLDialogElement)) {
        return false;
      }

      return dialog.querySelector('[data-search-dialog-input]') === document.activeElement;
    });

    await page.keyboard.press('Escape');
    await expect(page.locator('#global-search-dialog')).not.toHaveAttribute('open', '');

    await page.keyboard.press('Control+K');
    await expect(page.locator('#global-search-dialog')).toHaveAttribute('open', '');

    expect(consoleMessages.join('\n')).not.toContain('requestOpen is not a function');
    expect(consoleMessages.join('\n')).not.toContain('captureOpenModality is not a function');
  });

  test('search page enhancer が content hydration 経由で有効になること', async ({ page }) => {
    await page.goto('/search/');

    await page.waitForFunction(() => {
      const host = document.querySelector('#main-content [data-search-page-root]');
      return (
        host instanceof HTMLElement &&
        host.querySelector('[data-search-query-input]') instanceof HTMLInputElement &&
        host.querySelector('[data-search-page-form]') instanceof HTMLFormElement
      );
    });
  });
});
