import { test, expect, type Page } from '@playwright/test';

const navigateToMissingRoute = async (page: Page, url: string) => {
  await page.waitForFunction(() => {
    const router = document.querySelector('app-router');
    return (
      router instanceof HTMLElement &&
      typeof (router as { navigate?: unknown }).navigate === 'function'
    );
  });

  await page.evaluate((targetUrl) => {
    const router = document.querySelector('app-router') as
      | (HTMLElement & { navigate: (nextUrl: string) => Promise<unknown> })
      | null;
    const globalWindow = window as typeof window & {
      __lastNotFoundNavigationResult?: unknown;
    };

    if (!router || typeof router.navigate !== 'function') {
      throw new Error('app-router.navigate() が利用できません');
    }

    delete globalWindow.__lastNotFoundNavigationResult;
    void router.navigate(targetUrl).then((result) => {
      globalWindow.__lastNotFoundNavigationResult = result;
    });
  }, url);

  await page.waitForFunction(() => {
    return (
      typeof (
        window as typeof window & {
          __lastNotFoundNavigationResult?: unknown;
        }
      ).__lastNotFoundNavigationResult !== 'undefined'
    );
  });

  return page.evaluate(() => {
    return (
      window as typeof window & {
        __lastNotFoundNavigationResult?: unknown;
      }
    ).__lastNotFoundNavigationResult;
  });
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

    const navigationResult = (await navigateToMissingRoute(
      page,
      '/__playwright_missing_route__',
    )) as {
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

    await expect(page.locator('[data-not-found-fallback]')).toBeVisible();
    await expect(page.locator('dt', { hasText: '要求されたパス' })).toBeVisible();
    await expect(page.locator('dd code')).toHaveText(
      '/__playwright_missing_route__?from=e2e#section-x',
    );
  });

  test('keyboard navigation can reach fallback links', async ({ page }) => {
    await page.goto('/404.html');

    await tabUntilFocused(page, '検索ページへ');
    await tabUntilFocused(page, 'このサイトについて');
  });
});
