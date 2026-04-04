import { test, expect, type Page } from '@playwright/test';

const navigateToMissingRoute = async (page: Page, url: string) => {
  await page.waitForFunction(() => {
    const router = document.querySelector('app-router');
    return (
      router instanceof HTMLElement && typeof (router as { navigate?: unknown }).navigate === 'function'
    );
  });

  return page.evaluate(async (targetUrl) => {
    const router = document.querySelector('app-router') as
      | (HTMLElement & { navigate: (nextUrl: string) => Promise<unknown> })
      | null;

    if (!router || typeof router.navigate !== 'function') {
      throw new Error('app-router.navigate() が利用できません');
    }

    return router.navigate(targetUrl);
  }, url);
};

const tabUntilFocused = async (page: Page, expectedLabel: string): Promise<void> => {
  for (let index = 0; index < 8; index += 1) {
    await page.keyboard.press('Tab');
    const focusedText = await page.evaluate(() => {
      const active = document.activeElement;
      return active?.textContent?.trim() ?? '';
    });

    if (focusedText.includes(expectedLabel)) {
      return;
    }
  }

  throw new Error(`"${expectedLabel}" にキーボードフォーカスが到達しませんでした`);
};

test.describe('not-found page', () => {
  test('router commits not-found as completed outcome', async ({ page }) => {
    await page.goto('/search/');

    const navigationResult = (await navigateToMissingRoute(page, '/__playwright_missing_route__')) as {
      outcome?: string;
      renderedKind?: string;
      committed?: boolean;
    };

    expect(navigationResult.outcome).toBe('completed');
    expect(navigationResult.renderedKind).toBe('not-found');
    expect(navigationResult.committed).toBe(true);

    await expect(
      page.getByRole('heading', { level: 1, name: 'このページは見つかりませんでした' }),
    ).toBeVisible();

    const fallback = page.locator('[data-not-found-fallback]');
    await expect(fallback.getByRole('link', { name: '検索ページへ' })).toBeVisible();
    await expect(fallback.getByRole('link', { name: 'このサイトについて' })).toBeVisible();
  });

  test('requested path is surfaced after client-side navigation', async ({ page }) => {
    await page.goto('/search/');

    await navigateToMissingRoute(page, '/__playwright_missing_route__?from=e2e#section-x');

    await expect(page.getByText('要求されたパス')).toBeVisible();
    await expect(page.getByText('/__playwright_missing_route__?from=e2e#section-x')).toBeVisible();
  });

  test('keyboard navigation can reach fallback links', async ({ page }) => {
    await page.goto('/404.html');

    await tabUntilFocused(page, '検索ページへ');
    await tabUntilFocused(page, 'このサイトについて');
  });
});
