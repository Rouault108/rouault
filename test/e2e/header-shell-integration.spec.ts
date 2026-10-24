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
  for (const surface of ['menu', 'toc', 'search', 'combined'] as const) {
    test(`sidebar overlay can coexist with reachable ${surface} without losing usable focus`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize({ width: 639, height: 760 });
      await page.goto(layoutRich.directPath);
      await waitForRouterDocumentHostReady(page);
      const sidebar = page.locator('aside[data-layout-sidebar-root]');
      const sidebarToggle = page.locator('[data-layout-sidebar-toggle]');
      await expect(sidebar).toHaveAttribute('data-mode', 'overlay');
      if ((await sidebar.getAttribute('data-state')) !== 'expanded') await sidebarToggle.click();
      await expect(sidebar).toHaveAttribute('data-state', 'expanded');
      const expectExpandedSidebar = async (): Promise<void> => {
        await expect(sidebar).toHaveAttribute('data-state', 'expanded');
        await expect(sidebar).not.toHaveAttribute('hidden');
        await expect(sidebar).not.toHaveAttribute('inert');
        expect(
          await sidebar.evaluate((element) => {
            if (!(element instanceof HTMLElement)) throw new Error('sidebar root missing');
            return { hidden: element.hidden, inert: element.inert };
          }),
        ).toEqual({ hidden: false, inert: false });
      };

      const evidence: unknown[] = [];
      const record = async (stage: string): Promise<void> => {
        const sample = await page.evaluate((label) => {
          const root = document.querySelector<HTMLElement>('aside[data-layout-sidebar-root]');
          const focus = document.activeElement;
          const describe = (element: Element | null) =>
            element ? `${element.tagName.toLowerCase()}#${element.id}.${element.className}` : null;
          return {
            stage: label,
            hits: [
              [10, 80],
              [innerWidth - 10, 120],
              [innerWidth / 2, 180],
            ].map(([x, y]) => ({
              x,
              y,
              target: describe(document.elementFromPoint(x ?? 0, y ?? 0)),
            })),
            sidebar: {
              mode: root?.dataset['mode'],
              state: root?.dataset['state'],
              hidden: root?.hidden,
              inert: root?.inert,
            },
            toc: document.querySelector('[data-toc-trigger]')?.getAttribute('aria-expanded'),
            menu: document.querySelector('[data-header-menu="theme"]')?.hasAttribute('open'),
            search: document.querySelector('dialog[data-search-dialog-root]')?.hasAttribute('open'),
            focus: describe(focus),
            usableFocus:
              focus instanceof HTMLElement &&
              focus !== document.body &&
              focus.checkVisibility({ visibilityProperty: true }) &&
              !focus.closest('[hidden], [inert]'),
          };
        }, stage);
        evidence.push(sample);
        expect(sample.usableFocus).toBe(true);
      };
      await record('sidebar expanded');
      if (surface === 'menu') {
        await page.locator(themeTriggerRootSelector).click();
        await expectMenuOpen(page, 'theme', true);
        await expectExpandedSidebar();
        const item = page.locator('[data-header-menu="theme"] [data-theme-value="dark"]');
        await expect(item).toBeVisible();
        expect(
          await item.evaluate((element) => {
            const rect = element.getBoundingClientRect();
            return element.contains(
              document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2),
            );
          }),
        ).toBe(true);
        await record('menu and sidebar open');
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('Escape');
        await expectMenuOpen(page, 'theme', false);
      } else if (surface === 'toc') {
        const trigger = page.locator('[data-toc-trigger]');
        await expect(trigger).toHaveAttribute('data-toc-trigger-interactive', 'true');
        await trigger.click();
        const panel = page.locator('[data-layout-toc-mobile-panel]');
        await expect(panel).toBeVisible();
        await expectExpandedSidebar();
        await expect(panel).toHaveCSS('z-index', '300');
        expect(
          await panel.evaluate((element) =>
            element.contains(
              document.elementFromPoint(20, element.getBoundingClientRect().top + 20),
            ),
          ),
        ).toBe(true);
        await record('TOC and sidebar open');
        await sidebarToggle.focus();
        await page.setViewportSize({ width: 640, height: 760 });
        await expect(panel).toBeHidden();
        await expect(sidebarToggle).toBeFocused();
        expect(
          await sidebar.evaluate((element) =>
            element.contains(
              document.elementFromPoint(20, element.getBoundingClientRect().top + 20),
            ),
          ),
        ).toBe(true);
        await record('640px TOC paint excluded');
        await page.setViewportSize({ width: 639, height: 760 });
        await expect(panel).toBeVisible();
        await expectExpandedSidebar();
        await expect(sidebarToggle).toBeFocused();
        await record('639px TOC paint restored');
        await trigger.click();
        await expect(panel).toBeHidden();
        await expect(trigger).toBeFocused();
      } else if (surface === 'combined') {
        const tocTrigger = page.locator('[data-toc-trigger]');
        const panel = page.locator('[data-layout-toc-mobile-panel]');
        await expect(tocTrigger).toHaveAttribute('data-toc-trigger-interactive', 'true');
        await tocTrigger.click();
        await expect(panel).toBeVisible();
        await expectExpandedSidebar();
        const menuTrigger = page.locator(themeTriggerRootSelector);
        await menuTrigger.focus();
        await menuTrigger.press('Enter');
        await expectMenuOpen(page, 'theme', true);
        await expectExpandedSidebar();
        await expect(panel).toBeVisible();
        await expectExpandedSidebar();
        // 同値300のDOM tieを観測し、menuのlocal400をsite全体の順位にしない。
        const overlap = await page.locator('.theme-switcher__menu').evaluate((menu) => {
          const toc = document.querySelector('[data-layout-toc-mobile-panel]');
          if (!toc) throw new Error('mobile TOC missing');
          const a = menu.getBoundingClientRect();
          const b = toc.getBoundingClientRect();
          const left = Math.max(a.left, b.left);
          const top = Math.max(a.top, b.top);
          const right = Math.min(a.right, b.right);
          const bottom = Math.min(a.bottom, b.bottom);
          return {
            width: right - left,
            height: bottom - top,
            tocHit: toc.contains(document.elementFromPoint((left + right) / 2, (top + bottom) / 2)),
          };
        });
        expect(overlap.width).toBeGreaterThan(0);
        expect(overlap.height).toBeGreaterThan(0);
        expect(overlap.tocHit).toBe(true);
        evidence.push({ stage: 'header/menu and TOC overlap', overlap });
        await record('keyboard-opened menu plus TOC and sidebar');
        const searchTrigger = page.locator('[data-search-dialog-trigger]');
        await searchTrigger.focus();
        await searchTrigger.press('Enter');
        const dialog = page.locator('dialog[data-search-dialog-root]');
        await expect(dialog).toBeVisible();
        // native modalのimplicit inertとsidebarの明示inert属性を区別する。
        await expectExpandedSidebar();
        expect(
          await dialog.evaluate((element) => {
            const rect = element.getBoundingClientRect();
            return (
              element.matches(':modal') &&
              element.contains(
                document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2),
              )
            );
          }),
        ).toBe(true);
        await record('reachable combined surfaces with top-layer search');
        await page.keyboard.press('Escape');
        await expect(dialog).not.toHaveAttribute('open', '');
        // Escapeによる複数closeの有無は記録し、foremost-only契約を追加しない。
        await record('combined Escape result');
        if ((await page.locator('[data-header-menu="theme"]').getAttribute('open')) !== null) {
          await menuTrigger.focus();
          await menuTrigger.press('Escape');
        }
        if ((await tocTrigger.getAttribute('aria-expanded')) === 'true') await tocTrigger.click();
        await expectMenuOpen(page, 'theme', false);
        await expect(panel).toBeHidden();
      } else {
        await page.locator('[data-search-dialog-trigger]').click();
        const dialog = page.locator('dialog[data-search-dialog-root]');
        await expect(dialog).toBeVisible();
        // native modalのimplicit inertとsidebarの明示inert属性を区別する。
        await expectExpandedSidebar();
        expect(
          await dialog.evaluate((element) => {
            const rect = element.getBoundingClientRect();
            return (
              element.matches(':modal') &&
              element.contains(
                document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2),
              )
            );
          }),
        ).toBe(true);
        await record('top-layer search and sidebar open');
        await page.keyboard.press('Escape');
        await expect(dialog).not.toHaveAttribute('open', '');
      }
      await record('surface dismissed');
      expect(
        await page.evaluate(() => {
          const focus = document.activeElement;
          return (
            focus instanceof HTMLElement &&
            focus !== document.body &&
            focus.checkVisibility({ visibilityProperty: true }) &&
            !focus.closest('[hidden], [inert]')
          );
        }),
      ).toBe(true);
      if ((await sidebar.getAttribute('data-state')) === 'expanded') await sidebarToggle.click();
      await expect(sidebar).toHaveAttribute('data-state', 'collapsed');
      await sidebarToggle.focus();
      await page.keyboard.press('Enter');
      await expect(sidebar).toHaveAttribute('data-state', 'expanded');
      const backdrop = page.locator('[data-layout-sidebar-backdrop]');
      await backdrop.click({ position: { x: 620, y: 100 } });
      await expect(sidebar).toHaveAttribute('data-state', 'collapsed');
      await expect(sidebarToggle).toBeFocused();
      await record('sidebar dismissed');
      console.log('sidebar-overlay-surface-evidence', JSON.stringify(evidence));
      await testInfo.attach('overlay-surface-state-hit-focus', {
        body: JSON.stringify(evidence, null, 2),
        contentType: 'application/json',
      });
    });
  }

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

    await navigateWithRouterDocumentHost(page, sidebarScrollTarget.normalizedPath);

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
