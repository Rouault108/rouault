import { test, expect } from '@playwright/test';

test.describe('not-found page', () => {
  test('router commits not-found as completed outcome', async ({ page }) => {
    await page.goto('/search/');

    const navigationResult = await page.evaluate(async () => {
      const router = document.querySelector('app-router') as
        | (HTMLElement & { navigate?: (url: string) => Promise<unknown> })
        | null;

      if (!router || typeof router.navigate !== 'function') {
        throw new Error('app-router.navigate() が利用できません');
      }

      const result = await router.navigate('/__playwright_missing_route__');

      return result as {
        outcome?: string;
        renderedKind?: string;
        committed?: boolean;
      };
    });

    expect(navigationResult.outcome).toBe('completed');
    expect(navigationResult.renderedKind).toBe('not-found');
    expect(navigationResult.committed).toBe(true);

    await expect(
      page.getByRole('heading', { level: 1, name: 'このページは見つかりませんでした' }),
    ).toBeVisible();

    await expect(page.getByRole('link', { name: '検索ページへ' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'このサイトについて' })).toBeVisible();
    await expect(page.getByRole('button', { name: '前のページへ戻る' })).toBeVisible();
  });

  test('requested path is surfaced after client-side navigation', async ({ page }) => {
    await page.goto('/search/');

    await page.evaluate(async () => {
      const router = document.querySelector('app-router') as
        | (HTMLElement & { navigate?: (url: string) => Promise<unknown> })
        | null;

      if (!router || typeof router.navigate !== 'function') {
        throw new Error('app-router.navigate() が利用できません');
      }

      await router.navigate('/__playwright_missing_route__?from=e2e#section-x');
    });

    await expect(page.getByText('要求されたパス')).toBeVisible();
    await expect(page.getByText('/__playwright_missing_route__?from=e2e#section-x')).toBeVisible();
  });

  test('keyboard navigation reaches all actions in order', async ({ page }) => {
    await page.goto('/404.html');

    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: '検索ページへ' })).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'このサイトについて' })).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: '前のページへ戻る' })).toBeFocused();
  });
});
