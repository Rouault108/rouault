import { expect, test, type Page } from '@playwright/test';

const skipLinkName = 'メインコンテンツへ移動';

const expectNativeSkipLinkStructure = async (page: Page): Promise<void> => {
  const skipLink = page.locator('body > a.skip-link');

  await expect(skipLink).toHaveCount(1);
  await expect(skipLink).toHaveAttribute('href', '#main-content');
  await expect(skipLink).toHaveText(skipLinkName);
  await expect(skipLink).not.toHaveAttribute('data-hydration-scope');
  await expect(page.locator('body > ui-skip-link')).toHaveCount(0);
  await expect(page.locator('#main-content')).toHaveAttribute('tabindex', '-1');

  const order = await page.evaluate(() => {
    const skipLinkElement = document.querySelector('body > a.skip-link');
    const appRootElement = document.querySelector('#app');

    if (!skipLinkElement || !appRootElement) {
      return 'missing';
    }

    return skipLinkElement.compareDocumentPosition(appRootElement) &
      Node.DOCUMENT_POSITION_FOLLOWING
      ? 'before-app'
      : 'after-app';
  });

  expect(order).toBe('before-app');
};

const expectSkipLinkHiddenBeforeFocus = async (page: Page): Promise<void> => {
  const skipLink = page.getByRole('link', { name: skipLinkName });

  await expect(skipLink).toHaveCount(1);
  await expect(skipLink).toHaveCSS('opacity', '0');
  await expect(skipLink).not.toBeInViewport({ ratio: 0.5 });
};

const expectSkipLinkVisibleAfterFirstTab = async (page: Page): Promise<void> => {
  const skipLink = page.getByRole('link', { name: skipLinkName });

  await expect(skipLink).toHaveCount(1);

  await page.keyboard.press('Tab');

  await expect(skipLink).toBeFocused();
  await expect(skipLink).toBeVisible();
  await expect(skipLink).toBeInViewport({ ratio: 0.5 });
  await expect(skipLink).toHaveCSS('opacity', '1');

  const box = await skipLink.boundingBox();
  expect(box).not.toBeNull();
  expect(box?.y ?? -1).toBeGreaterThanOrEqual(0);
};

test.describe('Skip link', () => {
  test('SSR の Light DOM ネイティブアンカーとして1個だけ出力されること', async ({ page }) => {
    await page.goto('/');

    await expectNativeSkipLinkStructure(page);
    await expectSkipLinkHiddenBeforeFocus(page);
  });

  test('通常時は隠れ、最初の Tab でフォーカスされ可視化されること', async ({
    page,
    browserName,
  }) => {
    test.skip(
      browserName === 'webkit',
      'WebKit のリンク Tab focus は実行環境設定に依存するため、Tab 契約は Chromium / Firefox で固定する。',
    );

    await page.goto('/');

    await expectSkipLinkHiddenBeforeFocus(page);
    await expectSkipLinkVisibleAfterFirstTab(page);
  });

  test('Enter で main-content へ移動すること', async ({ page, browserName }) => {
    test.skip(
      browserName === 'webkit',
      'WebKit のリンク Tab focus は実行環境設定に依存するため、Tab 契約は Chromium / Firefox で固定する。',
    );

    await page.goto('/');

    const skipLink = page.getByRole('link', { name: skipLinkName });
    await expect(skipLink).toHaveCount(1);

    await page.keyboard.press('Tab');
    await expect(skipLink).toBeFocused();

    await page.keyboard.press('Enter');

    await expect(page).toHaveURL(/#main-content$/);
    await expect(page.locator('#main-content')).toBeInViewport();
  });
});

test.describe('Skip link without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('SSR の Light DOM ネイティブアンカーとして1個だけ出力されること', async ({ page }) => {
    await page.goto('/');

    await expectNativeSkipLinkStructure(page);
    await expectSkipLinkHiddenBeforeFocus(page);
  });

  test('通常時は隠れ、最初の Tab でフォーカスされ可視化されること', async ({
    page,
    browserName,
  }) => {
    test.skip(
      browserName === 'webkit',
      'WebKit のリンク Tab focus は実行環境設定に依存するため、Tab 契約は Chromium / Firefox で固定する。',
    );

    await page.goto('/');

    await expectSkipLinkHiddenBeforeFocus(page);
    await expectSkipLinkVisibleAfterFirstTab(page);
  });

  test('Enter で main-content へ移動すること', async ({ page, browserName }) => {
    test.skip(
      browserName === 'webkit',
      'WebKit のリンク Tab focus は実行環境設定に依存するため、Tab 契約は Chromium / Firefox で固定する。',
    );

    await page.goto('/');

    const skipLink = page.getByRole('link', { name: skipLinkName });
    await expect(skipLink).toHaveCount(1);

    await page.keyboard.press('Tab');
    await expect(skipLink).toBeFocused();

    await page.keyboard.press('Enter');

    await expect(page).toHaveURL(/#main-content$/);
    await expect(page.locator('#main-content')).toBeInViewport();
  });
});
