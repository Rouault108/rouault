import { expect, test, type Page } from '@playwright/test';
import type { NavigationResult } from '../../src/router/router-types.js';
import { MEMO_RIGHTS_NOTICE } from '../../build/projections/memo-page-projection.js';
test.describe.configure({ retries: 0 });
const waitForMemoRouterReady = async (page: Page): Promise<void> => {
  await page.waitForFunction(() => {
    const host = document.querySelector('router-document-host');
    return (
      host instanceof HTMLElement && 'whenReady' in host && typeof host.whenReady === 'function'
    );
  });
  await page.evaluate(async () => {
    const host = document.querySelector('router-document-host') as HTMLElement & {
      whenReady: () => Promise<void>;
    };
    await host.whenReady();
  });
};
test('superseded memo navigation keeps the winning document and can resume ordinary reading', async ({
  page,
}) => {
  await page.goto('/notes/testing/reader-basic');
  await waitForMemoRouterReady(page);
  const response = await page.request.get('/__router/memos/example/index.router.json');
  expect(response.ok()).toBe(true);
  const body = await response.body();
  let markReached = (): void => {
    throw new Error('Navigation arrival gate was not initialized');
  };
  let releaseResponse = (): void => {
    throw new Error('Navigation response gate was not initialized');
  };
  const reached = new Promise<void>((resolve) => {
    markReached = resolve;
  });
  const release = new Promise<void>((resolve) => {
    releaseResponse = resolve;
  });
  await page.route('**/__router/memos/example/index.router.json', async (route) => {
    markReached();
    await release;
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
  await reached;
  const second = await navigate('/memos/no-headings');
  releaseResponse();
  const cancelled = await first;
  expect(second.committed).toBe(true);
  expect(cancelled).toMatchObject({ committed: false, reason: 'superseded' });
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
  await waitForMemoRouterReady(page);
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
test('memo index uses the shared page shell across widths and color schemes', async ({
  browser,
  baseURL,
}) => {
  if (baseURL === undefined) throw new Error('production E2E baseURL is required');
  for (const viewport of [
    { name: 'wide', width: 1280, height: 900 },
    { name: 'narrow', width: 390, height: 844 },
  ] as const) {
    for (const colorScheme of ['light', 'dark'] as const) {
      const context = await browser.newContext({
        baseURL,
        viewport: { width: viewport.width, height: viewport.height },
        colorScheme,
      });
      const page = await context.newPage();
      try {
        const response = await page.goto('/memos/');
        expect(response?.status(), `${viewport.name}/${colorScheme} HTTP status`).toBe(200);

        const shell = page.locator('#main-content .memo-index.page-shell');
        await expect(shell).toBeVisible();
        await expect(page.locator('html')).toHaveAttribute('data-resolved-theme', colorScheme);
        await expect(shell.getByRole('heading', { name: 'メモ', level: 1 })).toBeVisible();
        await expect(shell.locator('.meta-row')).toHaveText('2件のメモ');
        await expect(shell.locator('.memo-index__list > .memo-index__item')).toHaveCount(2);
        await expect(shell.locator('.result-card')).toHaveCount(2);
        await expect(shell.getByRole('link', { name: '合成メモ', exact: true })).toHaveAttribute(
          'data-link-surface',
          'card',
        );
        await expect(shell.locator('.container-reading')).toHaveCount(0);
        await expect(shell.getByText(MEMO_RIGHTS_NOTICE, { exact: true })).toHaveCount(0);
        await expect(
          page.locator('[data-layout-footer]').getByText(MEMO_RIGHTS_NOTICE, { exact: true }),
        ).toHaveCount(1);

        const geometry = await page.evaluate(() => {
          const shellElement = document.querySelector<HTMLElement>('#main-content .memo-index');
          const hero = shellElement?.querySelector<HTMLElement>('.hero');
          const results = shellElement?.querySelector<HTMLElement>('.results-section');
          const heroRect = hero?.getBoundingClientRect();
          const resultsRect = results?.getBoundingClientRect();
          return {
            clientWidth: document.documentElement.clientWidth,
            scrollWidth: document.documentElement.scrollWidth,
            separated:
              heroRect !== undefined &&
              resultsRect !== undefined &&
              resultsRect.top > heroRect.bottom,
          };
        });
        expect(
          geometry.scrollWidth,
          `${viewport.name}/${colorScheme} horizontal overflow`,
        ).toBeLessThanOrEqual(geometry.clientWidth);
        expect(geometry.separated, `${viewport.name}/${colorScheme} hero/results spacing`).toBe(
          true,
        );
      } finally {
        await context.close();
      }
    }
  }
});
test('delayed router bootstrap waits for readiness before preserving the memo navigation shell', async ({
  page,
}) => {
  let release = (): void => {
    throw new Error('Router module gate not initialized');
  };
  let reached = (): void => {
    throw new Error('Router module arrival not initialized');
  };
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const arrival = new Promise<void>((resolve) => {
    reached = resolve;
  });
  await page.route(
    (url) => /router-document-host.*\.(?:js|ts)$/u.test(url.pathname),
    async (route) => {
      reached();
      await gate;
      await route.continue();
    },
  );
  await page.goto('/memos/', { waitUntil: 'commit' });
  await expect(page.getByRole('heading', { name: 'メモ', exact: true })).toBeVisible();
  await arrival;
  expect(
    await page.evaluate(() => {
      const host = document.querySelector('router-document-host');
      return host instanceof HTMLElement && 'whenReady' in host;
    }),
  ).toBe(false);
  const readiness = waitForMemoRouterReady(page);
  release();
  await readiness;
  await page.locator('aside[data-layout-sidebar-root]').evaluate((node) => {
    node.setAttribute('data-synthetic-identity', 'delayed-ready');
  });
  await page.getByRole('link', { name: '合成メモ', exact: true }).click();
  await expect(page).toHaveURL(/\/memos\/example$/u);
  await page.getByRole('link', { name: '別の合成メモ', exact: true }).click();
  await expect(page).toHaveURL(/\/memos\/no-headings$/u);
  await expect(page.locator('aside[data-layout-sidebar-root]')).toHaveAttribute(
    'data-synthetic-identity',
    'delayed-ready',
  );
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
