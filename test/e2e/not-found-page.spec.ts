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
  for (let index = 0; index < 20; index += 1) {
    await page.keyboard.press('Tab');
    const focusedState = await page.evaluate(() => {
      const active = document.activeElement;
      return {
        text: active?.textContent?.trim() ?? '',
        isFocusable:
          active instanceof HTMLElement &&
          active.matches('a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'),
      };
    });

    if (focusedState.isFocusable && focusedState.text.includes(expectedLabel)) {
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

  test('404 への SPA 遷移後は main に論理フォーカスを移しつつ fallback link の可視フォーカスを維持すること', async ({
    page,
    browserName,
  }) => {
    await page.goto('/search/');

    await navigateToMissingRoute(page, '/__playwright_missing_route__');
    await expect(page.locator('[data-not-found-fallback]')).toBeVisible();

    const mainFocusState = await page.evaluate(() => {
      const main = document.querySelector<HTMLElement>('main#main-content');
      const active = document.activeElement;
      const style = main ? getComputedStyle(main) : null;

      return {
        activeId: active?.id ?? '',
        activeTagName: active?.tagName ?? '',
        outlineStyle: style?.outlineStyle ?? '',
        outlineWidth: style?.outlineWidth ?? '',
        boxShadow: style?.boxShadow ?? '',
      };
    });

    expect(mainFocusState.activeId).toBe('main-content');
    expect(mainFocusState.activeTagName).toBe('MAIN');
    expect(mainFocusState.outlineStyle).toBe('none');
    expect(mainFocusState.outlineWidth).toBe('0px');
    expect(mainFocusState.boxShadow).toBe('none');

    if (browserName === 'webkit') {
      return;
    }

    await tabUntilFocused(page, '検索ページへ');
    const linkFocusState = await page.evaluate(() => {
      const active = document.activeElement;
      const style = active ? getComputedStyle(active) : null;
      return {
        activeText: active?.textContent?.trim() ?? '',
        activeTagName: active?.tagName ?? '',
        outlineStyle: style?.outlineStyle ?? '',
        outlineWidth: style?.outlineWidth ?? '',
      };
    });

    expect(linkFocusState.activeTagName).toBe('A');
    expect(linkFocusState.activeText).toContain('検索ページへ');
    expect(linkFocusState.outlineStyle).not.toBe('none');
    expect(linkFocusState.outlineWidth).not.toBe('0px');
  });

  test('keyboard navigation can reach fallback links', async ({ page, browserName }) => {
    test.skip(
      browserName === 'webkit',
      'WebKit は環境設定次第で Tab によるリンク到達可否が変わる',
    );

    await page.goto('/404.html');

    await tabUntilFocused(page, '検索ページへ');
    await tabUntilFocused(page, 'このサイトについて');
  });
});
