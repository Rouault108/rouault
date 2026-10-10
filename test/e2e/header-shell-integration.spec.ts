import { expect, test, type Page } from '@playwright/test';

import { e2eNoteFixtures } from './support/note-fixtures.js';
import { expectMenuOpen, themeTriggerRootSelector } from './support/header-contract.js';
import {
  navigateWithRouterDocumentHost,
  waitForRouterDocumentHostReady,
} from './support/router-document-host.js';

const layoutRich = e2eNoteFixtures.layoutRich;
const markdownBasic = e2eNoteFixtures.markdownBasic;
const sidebarScrollTarget = e2eNoteFixtures.sidebarScrollTarget;

const waitForRouterDocumentHostSettled = async (page: Page): Promise<void> => {
  await waitForRouterDocumentHostReady(page);
  await page.evaluate(async () => {
    const router = document.querySelector('router-document-host') as
      | (HTMLElement & { whenReady: () => Promise<void> })
      | null;

    if (router === null) {
      throw new Error('router-document-host is missing.');
    }

    await router.whenReady();
  });
};

test.describe('header shell integration', () => {
  test('SPA 遷移では shell.headerHtml で header 全体を置換すること', async ({ page }) => {
    await page.goto(layoutRich.directPath);
    await waitForRouterDocumentHostReady(page);

    await expect(page.locator('header[data-layout-header]')).toHaveAttribute(
      'data-note-layout',
      'true',
    );
    await navigateWithRouterDocumentHost(page, '/about/');

    await expect(page.locator('header[data-layout-header]')).toHaveAttribute(
      'data-note-layout',
      'false',
    );
    await expect(page.locator('header[data-layout-header]')).toHaveCount(1);
    await expect(page.locator('layout-header, ui-header')).toHaveCount(0);
  });

  test('theme switcher は静的 header 置換後も delegation で同期すること', async ({ page }) => {
    await page.goto(markdownBasic.directPath);
    await waitForRouterDocumentHostReady(page);
    await navigateWithRouterDocumentHost(page, '/about/');

    await page.locator(themeTriggerRootSelector).click();
    await expectMenuOpen(page, 'theme', true);
    await page.locator('header[data-layout-header] [data-theme-value="dark"]').click();

    await expectMenuOpen(page, 'theme', false);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('header[data-layout-header] [data-theme-current-label]')).toHaveText(
      'ダーク',
    );
    await expect(
      page.locator('header[data-layout-header] .theme-trigger-icon svg[data-icon]'),
    ).toHaveAttribute('data-icon', 'moon');
    await expect(
      page.locator('header[data-layout-header] [data-theme-value="dark"]'),
    ).toHaveAttribute('aria-pressed', 'true');
    await expect(
      page.locator('header[data-layout-header] [data-theme-value="dark"]'),
    ).toHaveAttribute('data-selected', 'true');
    await expect(
      page.locator('header[data-layout-header] [data-theme-value="dark"] svg[data-icon]'),
    ).toHaveAttribute('data-icon', 'moon');
  });

  test('corpus link の hydrated 遷移後に current state を新しい header へ同期すること', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 760 });
    await page.goto('/about/');
    await waitForRouterDocumentHostSettled(page);

    const corpusMenu = page.locator('header[data-layout-header] [data-header-menu="corpus"]');
    await corpusMenu.locator('[data-header-menu-trigger]').click();
    await expectMenuOpen(page, 'corpus', true);

    const candidateInfo = await corpusMenu
      .locator('[data-header-menu-item]')
      .evaluateAll((items) => {
        const currentHref = window.location.href;

        for (const [index, item] of items.entries()) {
          if (!(item instanceof HTMLAnchorElement)) continue;
          if (item.getAttribute('aria-current') === 'page') continue;

          const href = item.href;
          const label = item.getAttribute('data-header-menu-text') ?? '';
          if (href.length > 0 && href !== currentHref && label.length > 0) {
            return { href, index, label };
          }
        }

        return null;
      });

    if (candidateInfo === null) {
      throw new Error('No navigable corpus menu item was found.');
    }

    const candidate = corpusMenu.locator('[data-header-menu-item]').nth(candidateInfo.index);
    const expectedUrl = new URL(candidateInfo.href);

    await Promise.all([
      page.waitForURL((url) => url.pathname === expectedUrl.pathname),
      candidate.click(),
    ]);
    await waitForRouterDocumentHostSettled(page);

    const nextHeader = page.locator('header[data-layout-header]');
    await expect(nextHeader.locator('.corpus-trigger-text')).toHaveText(candidateInfo.label);
    const nextCurrentItems = nextHeader.locator(
      '[data-header-menu="corpus"] [data-header-menu-item][aria-current="page"]',
    );
    await expect(nextCurrentItems).toHaveCount(1);
    await expect(nextCurrentItems.first()).toHaveAttribute(
      'data-header-menu-text',
      candidateInfo.label,
    );
    await expect(
      nextCurrentItems
        .first()
        .locator(':scope svg[data-icon="check"], :scope .corpus-menu-item__indicator'),
    ).toHaveCount(0);
    await expect(
      nextHeader.locator(
        '[data-header-menu="corpus"] [data-header-menu-item]:not([aria-current="page"]) svg[data-icon="check"], [data-header-menu="corpus"] [data-header-menu-item]:not([aria-current="page"]) .corpus-menu-item__indicator',
      ),
    ).toHaveCount(0);
  });

  test('mobile TOC trigger は validated 後の controller activation で panel を開くこと', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 760 });
    await page.goto(layoutRich.directPath);
    await waitForRouterDocumentHostReady(page);

    const trigger = page.locator('header[data-layout-header] [data-toc-trigger]');
    await expect(trigger).toHaveAttribute('data-visible', 'true');
    await expect(trigger).toHaveAttribute('data-toc-trigger-interactive', 'true');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(trigger).toHaveAttribute('aria-label', '目次を開く');
    const staticTocRootId = await trigger.getAttribute('data-toc-static-root-id');
    expect(staticTocRootId).not.toBeNull();
    await expect(trigger).toHaveAttribute('href', `#${staticTocRootId ?? ''}`);
    await expect(trigger).toHaveAttribute('aria-controls', /layout-toc-panel-/u);
    const hydratedTocPanelId = await trigger.getAttribute('aria-controls');
    expect(hydratedTocPanelId).not.toBeNull();
    await expect(trigger).toHaveAttribute('data-toc-mobile-panel-id', hydratedTocPanelId ?? '');
    await expect(page.locator(`#${hydratedTocPanelId ?? ''}`)).toHaveAttribute(
      'data-layout-toc-mobile-panel',
      '',
    );
    await trigger.click();

    await expect(page.locator('[data-layout-toc-mobile-panel]')).toBeVisible();
    await expect(trigger).toHaveAttribute('href', `#${staticTocRootId ?? ''}`);
    await expect(trigger).toHaveAttribute('aria-controls', hydratedTocPanelId ?? '');
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(trigger).toHaveAttribute('aria-label', '目次を閉じる');

    await trigger.click();
    await expect(page.locator('[data-layout-toc-mobile-panel]')).toBeHidden();
    await expect(trigger).toHaveAttribute('href', `#${staticTocRootId ?? ''}`);
    await expect(trigger).toHaveAttribute('aria-controls', hydratedTocPanelId ?? '');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(trigger).toHaveAttribute('aria-label', '目次を開く');
    await expect(trigger).toBeFocused();
  });

  test('sidebar toggle は controller state と aria を同期し focus return trigger を渡すこと', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 390, height: 760 });
    await page.goto(layoutRich.directPath);
    await waitForRouterDocumentHostReady(page);

    const header = page.locator('header[data-layout-header]');
    const trigger = page.locator('header[data-layout-header] [data-layout-sidebar-toggle]');

    await expect(header).toHaveAttribute('data-sidebar-mode', 'overlay');
    await expect(header).toHaveAttribute('data-sidebar-state', 'collapsed');
    await expect(header).toHaveAttribute('data-overlay-sidebar-open', 'false');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(trigger).toHaveAttribute('aria-label', 'サイドバーを開く');

    await trigger.click();

    await expect(header).toHaveAttribute('data-sidebar-mode', 'overlay');
    await expect(header).toHaveAttribute('data-sidebar-state', 'expanded');
    await expect(header).toHaveAttribute('data-overlay-sidebar-open', 'true');
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(trigger).toHaveAttribute('aria-label', 'サイドバーを閉じる');
    await expect(page.locator('aside[data-layout-sidebar-root]')).toHaveAttribute(
      'data-state',
      'expanded',
    );
    await expect(page.locator('aside[data-layout-sidebar-root] nav')).toBeVisible();
    await expect(
      page.locator('aside[data-layout-sidebar-root] [data-sidebar-nav-control]').first(),
    ).toBeFocused();

    await page.locator('[data-layout-sidebar-backdrop]').click({ position: { x: 350, y: 100 } });

    await expect(header).toHaveAttribute('data-sidebar-state', 'collapsed');
    await expect(header).toHaveAttribute('data-overlay-sidebar-open', 'false');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(trigger).toHaveAttribute('aria-label', 'サイドバーを開く');
    await expect(trigger).toBeFocused();
  });

  test('app-shell commit 後は theme と sidebar state を header へ再同期すること', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 760 });
    await page.goto(layoutRich.directPath);
    await waitForRouterDocumentHostReady(page);

    const header = page.locator('header[data-layout-header]');
    const sidebarTrigger = page.locator('header[data-layout-header] [data-layout-sidebar-toggle]');

    await sidebarTrigger.click();
    await expect(header).toHaveAttribute('data-sidebar-state', 'expanded');
    await expect(header).toHaveAttribute('data-overlay-sidebar-open', 'true');
    await expect(sidebarTrigger).toHaveAttribute('aria-expanded', 'true');

    await page.evaluate(() => {
      document.documentElement.dataset['theme'] = 'dark';
    });
    await expect(page.locator('header[data-layout-header] [data-theme-current-label]')).toHaveText(
      'ダーク',
    );

    await page.locator('header[data-layout-header]').evaluate((element) => {
      element.setAttribute('data-sidebar-mode', 'fixed');
      element.setAttribute('data-sidebar-state', 'collapsed');
      element.setAttribute('data-overlay-sidebar-open', 'false');
      element
        .querySelector<HTMLElement>('[data-layout-sidebar-toggle]')
        ?.setAttribute('aria-expanded', 'false');
      const label = element.querySelector<HTMLElement>('[data-theme-current-label]');
      if (label !== null) label.textContent = 'stale';
      element
        .querySelector<HTMLElement>('[data-theme-value="dark"]')
        ?.setAttribute('aria-pressed', 'false');
      element
        .querySelector<HTMLElement>('[data-theme-value="dark"]')
        ?.removeAttribute('data-selected');
    });

    await page.evaluate(() => {
      document.dispatchEvent(new CustomEvent('app-shell:committed'));
    });

    await expect(header).toHaveAttribute('data-sidebar-mode', 'overlay');
    await expect(header).toHaveAttribute('data-sidebar-state', 'expanded');
    await expect(header).toHaveAttribute('data-overlay-sidebar-open', 'true');
    await expect(sidebarTrigger).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('header[data-layout-header] [data-theme-current-label]')).toHaveText(
      'ダーク',
    );
    await expect(
      page.locator('header[data-layout-header] [data-theme-value="dark"]'),
    ).toHaveAttribute('aria-pressed', 'true');
    await expect(
      page.locator('header[data-layout-header] [data-theme-value="dark"]'),
    ).toHaveAttribute('data-selected', 'true');
  });

  test('SPA header replacement 後は旧 header の sidebar subscription を解除すること', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 760 });
    await page.goto(layoutRich.directPath);
    await waitForRouterDocumentHostReady(page);

    await expect(page.locator('header[data-layout-header]')).toHaveAttribute(
      'data-overlay-sidebar-open',
      'false',
    );
    await page.evaluate(() => {
      const oldHeader = document.querySelector<HTMLElement>('header[data-layout-header]');
      if (oldHeader === null) throw new Error('static header is missing.');
      const state = window as unknown as {
        staticHeaderMigrationOldHeader?: HTMLElement;
        readStaticHeaderMigrationOldHeader?: () => Record<string, string | null>;
      };
      state.staticHeaderMigrationOldHeader = oldHeader;
      state.readStaticHeaderMigrationOldHeader = () => ({
        connected: oldHeader.isConnected ? 'true' : 'false',
        mode: oldHeader.getAttribute('data-sidebar-mode'),
        state: oldHeader.getAttribute('data-sidebar-state'),
        overlayOpen: oldHeader.getAttribute('data-overlay-sidebar-open'),
      });
    });

    await navigateWithRouterDocumentHost(page, sidebarScrollTarget.normalizedPath);
    await expect(page.locator('header[data-layout-header]')).toHaveCount(1);
    await expect(page.locator('header[data-layout-header]')).toHaveAttribute(
      'data-sidebar-enabled',
      'true',
    );
    await expect(page.locator('header[data-layout-header]')).toHaveAttribute(
      'data-overlay-sidebar-open',
      'false',
    );

    await page.locator('header[data-layout-header] [data-layout-sidebar-toggle]').click();
    await expect(page.locator('header[data-layout-header]')).toHaveAttribute(
      'data-overlay-sidebar-open',
      'true',
    );

    await expect
      .poll(async () =>
        page.evaluate(() => {
          const state = window as unknown as {
            readStaticHeaderMigrationOldHeader?: () => Record<string, string | null>;
          };
          return state.readStaticHeaderMigrationOldHeader?.() ?? {};
        }),
      )
      .toEqual({
        connected: 'false',
        mode: 'overlay',
        state: 'collapsed',
        overlayOpen: 'false',
      });
  });

  test('commit 後 link contract 失敗時は rollback 完了後に app-shell:restored を発火すること', async ({
    page,
  }) => {
    await page.goto(markdownBasic.directPath);
    await waitForRouterDocumentHostReady(page);
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
      const router = document.querySelector('router-document-host') as
        | (HTMLElement & {
            navigate: (nextUrl: string) => Promise<unknown>;
            whenReady: () => Promise<void>;
          })
        | null;
      if (router === null) throw new Error('router-document-host is missing.');
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

  test('history 失敗時は validated を通知せず rollback 後に TOC bridge を旧 shell へ再同期すること', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 760 });
    await page.goto(layoutRich.directPath);
    await waitForRouterDocumentHostReady(page);
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
        throw new Error('forced history failure before app-shell:validated');
      }) as typeof history.pushState;
      state.restoreStaticHeaderHistoryPatch = () => {
        history.pushState = originalPushState;
      };
    });

    await page.evaluate(async () => {
      const router = document.querySelector('router-document-host') as
        | (HTMLElement & {
            navigate: (nextUrl: string) => Promise<unknown>;
            whenReady: () => Promise<void>;
          })
        | null;
      if (router === null) throw new Error('router-document-host is missing.');
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
      .toEqual([`restored:${originalNavigationUrl}`]);

    const trigger = page.locator('header[data-layout-header] [data-toc-trigger]');
    await expect(trigger).toHaveAttribute('data-toc-trigger-interactive', 'true');
    await expect(page.locator('[data-layout-toc-mobile-panel]')).toHaveCount(1);
    await trigger.click();
    await expect(page.locator('[data-layout-toc-mobile-panel]')).toHaveCount(1);
    await expect(page.locator('[data-layout-toc-mobile-panel]')).toBeVisible();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });
});
