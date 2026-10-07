import { expect, test } from '@playwright/test';
import type { NavigationResult } from '../../src/router/router-types.js';
test('superseded memo navigation keeps the winning document and can resume ordinary reading', async ({
  page,
}) => {
  await page.goto('/notes/testing/reader-basic');
  await page.waitForFunction(() => {
    const host = document.querySelector('router-document-host');
    return host instanceof HTMLElement && 'navigate' in host && typeof host.navigate === 'function';
  });
  const response = await page.request.get('/__router/memos/example/index.router.json');
  expect(response.ok()).toBe(true);
  const body = await response.body();
  const reached = Promise.withResolvers<undefined>();
  const release = Promise.withResolvers<undefined>();
  await page.route('**/__router/memos/example/index.router.json', async (route) => {
    reached.resolve(undefined);
    await release.promise;
    try {
      await route.fulfill({ status: 200, contentType: 'application/json', body });
    } catch {
      /* superseded fetchの終了後も、勝った文書の状態を下で検証する。 */
    }
  });
  const navigate = (url: string) =>
    page.evaluate(async (target) => {
      const host = document.querySelector('router-document-host') as HTMLElement & {
        whenReady: () => Promise<void>;
        navigate: (url: string) => Promise<NavigationResult>;
      };
      await host.whenReady();
      return host.navigate(target);
    }, url);
  const first = navigate('/memos/example');
  await reached.promise;
  const second = await navigate('/memos/no-headings');
  release.resolve(undefined);
  const cancelled = await first;
  expect(second.committed).toBe(true);
  expect(cancelled.committed).toBe(false);
  expect(cancelled.reason).toBe('superseded');
  await expect(page).toHaveURL(/\/memos\/no-headings$/u);
  await expect(page.locator('.note-shell')).toHaveAttribute('data-toc-presence', 'absent');
  await expect(page.locator('.note-shell')).toHaveAttribute('data-sidebar-presence', 'absent');
  await page.unroute('**/__router/memos/example/index.router.json');
  await navigate('/memos/example');
  await expect(page.locator('[data-layout-toc-nav]')).toBeVisible();
});
test('memo index, body, notes and history preserve the shared shell and TOC ownership', async ({
  page,
}) => {
  await page.goto('/memos/');
  await expect(page.getByRole('heading', { name: 'メモ', exact: true })).toBeVisible();
  await page.getByRole('link', { name: '合成メモ', exact: true }).click();
  await expect(page).toHaveURL(/\/memos\/example$/u);
  await expect(page.locator('.note-shell')).toHaveAttribute('data-sidebar-presence', 'absent');
  await expect(page.locator('[data-layout-toc-nav]')).toBeVisible();
  await page.locator('aside[data-layout-sidebar-root]').evaluate((node) => {
    node.setAttribute('data-synthetic-identity', 'persistent');
  });
  await page.getByRole('link', { name: '別の合成メモ', exact: true }).click();
  await expect(page.locator('.note-shell')).toHaveAttribute('data-toc-presence', 'absent');
  await expect(page.locator('aside[data-layout-sidebar-root]')).toHaveAttribute(
    'data-synthetic-identity',
    'persistent',
  );
  await page.goBack();
  await expect(page).toHaveURL(/\/memos\/example$/u);
  await expect(page.locator('[data-layout-toc-nav]')).toBeVisible();
  await page.goForward();
  await expect(page).toHaveURL(/\/memos\/no-headings$/u);
  await page.reload();
  await expect(
    page.getByRole('heading', { name: '見出しのない合成メモ', exact: true }),
  ).toBeVisible();
  await page.goto('/notes/testing/reader-basic');
  await expect(page.locator('.note-shell')).toHaveAttribute('data-sidebar-presence', 'present');
  await page
    .locator('[data-layout-footer]')
    .getByRole('link', { name: 'メモ', exact: true })
    .click();
  await expect(page).toHaveURL(/\/memos\/$/u);
  await expect(page.locator('aside[data-layout-sidebar-root] [data-sidebar-nav]')).toHaveCount(0);
});
test('memo mobile TOC works through the existing header and keyboard contracts', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/memos/example');
  const trigger = page.locator('header[data-layout-header] [data-toc-trigger]');
  await expect(trigger).toHaveAttribute('data-toc-trigger-interactive', 'true');
  await trigger.focus();
  await trigger.press('Enter');
  await expect(page.locator('[data-layout-toc-mobile-panel]')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-layout-toc-mobile-panel]')).toBeHidden();
});
test.describe('memo no-JS reading', () => {
  test.use({ javaScriptEnabled: false });
  test('dedicated list and body remain readable with ordinary navigation', async ({ page }) => {
    await page.goto('/memos/');
    await page.getByRole('link', { name: '合成メモ', exact: true }).click();
    await expect(page.getByRole('heading', { name: '合成メモ', exact: true })).toBeVisible();
    await expect(page.getByText('検証専用の合成本文です。')).toBeVisible();
    await expect(page.getByRole('link', { name: '別の合成メモ', exact: true })).toBeVisible();
    await expect(
      page.locator('[data-layout-footer]').getByRole('link', { name: 'メモ', exact: true }),
    ).toBeVisible();
  });
});
