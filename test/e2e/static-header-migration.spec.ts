import { expect, test, type Page } from '@playwright/test';

import { e2eNoteFixtures } from './support/note-fixtures.js';

const layoutRich = e2eNoteFixtures.layoutRich;
const markdownBasic = e2eNoteFixtures.markdownBasic;

const waitForAppRouterReady = async (page: Page): Promise<void> => {
  await page.waitForFunction(() => {
    const router = document.querySelector('app-router');
    return (
      router instanceof HTMLElement &&
      typeof (router as { navigate?: unknown }).navigate === 'function' &&
      typeof (router as { whenReady?: unknown }).whenReady === 'function'
    );
  });
};

const navigateWithAppRouter = async (page: Page, url: string): Promise<void> => {
  await waitForAppRouterReady(page);
  await page.evaluate(async (targetUrl) => {
    const router = document.querySelector('app-router') as
      | (HTMLElement & {
          navigate: (nextUrl: string) => Promise<unknown>;
          whenReady: () => Promise<void>;
        })
      | null;
    if (router === null) throw new Error('app-router is missing.');
    await router.whenReady();
    await router.navigate(targetUrl);
  }, url);
};

test.describe('Static header migration', () => {
  test('SPA 遷移では shell.headerHtml で header 全体を置換すること', async ({ page }) => {
    await page.goto(layoutRich.directPath);
    await waitForAppRouterReady(page);

    await expect(page.locator('header[data-layout-header]')).toHaveAttribute(
      'data-note-layout',
      'true',
    );
    await navigateWithAppRouter(page, '/about/');

    await expect(page.locator('header[data-layout-header]')).toHaveAttribute(
      'data-note-layout',
      'false',
    );
    await expect(page.locator('header[data-layout-header]')).toHaveCount(1);
    await expect(page.locator('layout-header, ui-header')).toHaveCount(0);
  });

  test('検索 trigger は dialog が利用可能な時だけ progressive enhancement されること', async ({
    page,
  }) => {
    await page.goto('/about/');
    await waitForAppRouterReady(page);

    await page.locator('header[data-layout-header] [data-search-dialog-trigger]').click();

    await expect(page.locator('dialog[data-search-dialog-root]')).toHaveAttribute('open', '');
    await expect(
      page.locator('header[data-layout-header] [data-search-dialog-trigger]'),
    ).toHaveAttribute('aria-expanded', 'true');
    await expect(page).toHaveURL(/\/about\/$/u);
  });

  test('theme switcher は静的 header 置換後も delegation で同期すること', async ({ page }) => {
    await page.goto(markdownBasic.directPath);
    await waitForAppRouterReady(page);
    await navigateWithAppRouter(page, '/about/');

    await page.locator('header[data-layout-header] [data-theme-switcher] summary').click();
    await page.locator('header[data-layout-header] [data-theme-value="dark"]').click();

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('header[data-layout-header] [data-theme-current-label]')).toHaveText(
      'ダーク',
    );
  });

  test('mobile TOC trigger は validated 後の controller activation で panel を開くこと', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 760 });
    await page.goto(layoutRich.directPath);
    await waitForAppRouterReady(page);

    const trigger = page.locator('header[data-layout-header] [data-toc-trigger]');
    await expect(trigger).toHaveAttribute('data-toc-trigger-interactive', 'true');
    await trigger.click();

    await expect(page.locator('[data-layout-toc-mobile-panel]')).toBeVisible();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });

  test('commit 後 link contract 失敗時は rollback 完了後に app-shell:restored を発火すること', async ({
    page,
  }) => {
    await page.goto(markdownBasic.directPath);
    await waitForAppRouterReady(page);
    const originalUrl = page.url();

    await page.route('**/__router/about/index.router.json', async (route) => {
      const response = await route.fetch();
      const envelope = (await response.json()) as {
        shell: { headerHtml: string };
      };
      envelope.shell.headerHtml = envelope.shell.headerHtml.replace(
        '</header>',
        '<a href="https://example.com/" data-link-kind="external-web" data-link-surface="header">invalid</a></header>',
      );
      await route.fulfill({
        status: response.status(),
        contentType: 'application/json',
        body: `${JSON.stringify(envelope)}\n`,
      });
    });

    const restored = page.evaluate(
      () =>
        new Promise((resolve) => {
          document.addEventListener('app-shell:restored', () => resolve(true), { once: true });
        }),
    );

    await page.evaluate(async () => {
      const router = document.querySelector('app-router') as
        | (HTMLElement & {
            navigate: (nextUrl: string) => Promise<unknown>;
            whenReady: () => Promise<void>;
          })
        | null;
      if (router === null) throw new Error('app-router is missing.');
      await router.whenReady();
      await router.navigate('/about/');
    });

    await expect(restored).resolves.toBe(true);
    await expect(page).toHaveURL(originalUrl);
    await expect(page.locator('header[data-layout-header]')).toHaveAttribute(
      'data-note-layout',
      'true',
    );
  });

  test('app-shell:validated 後の history 失敗時も rollback 後に TOC bridge を旧 shell へ再同期すること', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 760 });
    await page.goto(layoutRich.directPath);
    await waitForAppRouterReady(page);
    const originalUrl = page.url();
    const originalNavigationUrl = layoutRich.normalizedPath;

    await expect(page.locator('header[data-layout-header] [data-toc-trigger]')).toHaveAttribute(
      'data-toc-trigger-interactive',
      'true',
    );

    await page.evaluate(() => {
      const state = window as unknown as {
        staticHeaderHistoryFailureEvents?: string[];
        restoreStaticHeaderHistoryPatch?: () => void;
      };
      state.staticHeaderHistoryFailureEvents = [];
      document.addEventListener('app-shell:validated', (event) => {
        const detail = (event as CustomEvent<{ navigationUrl?: string }>).detail;
        state.staticHeaderHistoryFailureEvents?.push(`validated:${detail.navigationUrl ?? ''}`);
      });
      document.addEventListener('app-shell:restored', (event) => {
        const detail = (event as CustomEvent<{ restoredUrl?: string }>).detail;
        state.staticHeaderHistoryFailureEvents?.push(`restored:${detail.restoredUrl ?? ''}`);
      });

      const originalPushState = history.pushState.bind(history);
      history.pushState = (() => {
        throw new Error('forced history failure after app-shell:validated');
      }) as typeof history.pushState;
      state.restoreStaticHeaderHistoryPatch = () => {
        history.pushState = originalPushState;
      };
    });

    await page.evaluate(async () => {
      const router = document.querySelector('app-router') as
        | (HTMLElement & {
            navigate: (nextUrl: string) => Promise<unknown>;
            whenReady: () => Promise<void>;
          })
        | null;
      if (router === null) throw new Error('app-router is missing.');
      await router.whenReady();
      await router.navigate('/about/');
    });

    await page.evaluate(() => {
      (
        window as unknown as {
          restoreStaticHeaderHistoryPatch?: () => void;
        }
      ).restoreStaticHeaderHistoryPatch?.();
    });

    await expect(page).toHaveURL(originalUrl);
    await expect(page.locator('header[data-layout-header]')).toHaveAttribute(
      'data-note-layout',
      'true',
    );
    await expect
      .poll(async () =>
        page.evaluate(
          () =>
            (
              window as unknown as {
                staticHeaderHistoryFailureEvents?: string[];
              }
            ).staticHeaderHistoryFailureEvents ?? [],
        ),
      )
      .toEqual(['validated:/about/', `restored:${originalNavigationUrl}`]);

    const trigger = page.locator('header[data-layout-header] [data-toc-trigger]');
    await expect(trigger).toHaveAttribute('data-toc-trigger-interactive', 'true');
    await expect(page.locator('[data-layout-toc-mobile-panel]')).toHaveCount(1);
    await trigger.click();
    await expect(page.locator('[data-layout-toc-mobile-panel]')).toHaveCount(1);
    await expect(page.locator('[data-layout-toc-mobile-panel]')).toBeVisible();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });
});

test.describe('Static header migration no-JS', () => {
  test.use({ javaScriptEnabled: false });

  test('検索リンクは JS 無効時も検索ページへ通常遷移すること', async ({ page }) => {
    await page.goto('/about/');
    await page.locator('header[data-layout-header] [data-search-dialog-trigger]').click();

    await expect(page).toHaveURL(/\/search\/$/u);
    await expect(page.locator('#main-content h1').first()).toHaveText('検索');
  });
});
