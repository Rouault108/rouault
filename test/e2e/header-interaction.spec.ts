import { expect, test } from '@playwright/test';

import { e2eNoteFixtures } from './support/note-fixtures.js';
import {
  closeSearchDialog,
  expectMenuOpen,
  headerMenuTriggerSelector,
  prepareHeaderMenuItems,
  searchDialogSelector,
  searchTriggerSelector,
  themeTriggerRootSelector,
} from './support/header-contract.js';
import {
  navigateWithRouterDocumentHost,
  waitForRouterDocumentHostReady,
} from './support/router-document-host.js';

const markdownBasic = e2eNoteFixtures.markdownBasic;

test.describe('header interaction', () => {
  test('検索 trigger は Enter 起動時に keyboard modality で dialog を開くこと', async ({
    page,
  }) => {
    await page.goto('/about/');
    await waitForRouterDocumentHostReady(page);

    await page.locator(searchTriggerSelector).focus();
    await page.keyboard.press('Enter');

    await expect(page.locator(searchDialogSelector)).toHaveAttribute('open', '');
    await expect(page.locator(searchDialogSelector)).toHaveAttribute(
      'data-search-dialog-open-modality',
      'keyboard',
    );
    await closeSearchDialog(page);
  });

  test('検索 trigger は mouse click 起動時に pointer modality で dialog を開くこと', async ({
    page,
  }) => {
    await page.goto('/about/');
    await waitForRouterDocumentHostReady(page);

    await page.locator(searchTriggerSelector).click();

    await expect(page.locator(searchDialogSelector)).toHaveAttribute('open', '');
    await expect(page.locator(searchDialogSelector)).toHaveAttribute(
      'data-search-dialog-open-modality',
      'pointer',
    );
    await closeSearchDialog(page);
  });

  test('検索 trigger は判定不能な click では controller の modalityTracker に委ねること', async ({
    page,
  }) => {
    await page.goto('/about/');
    await waitForRouterDocumentHostReady(page);

    await page.keyboard.press('Tab');
    await page.locator(searchTriggerSelector).evaluate((anchor) => {
      const event = new Event('click', { bubbles: true, cancelable: true, composed: true });
      Object.defineProperty(event, 'button', { value: 0 });
      anchor.dispatchEvent(event);
    });

    await expect(page.locator(searchDialogSelector)).toHaveAttribute('open', '');
    await expect(page.locator(searchDialogSelector)).toHaveAttribute(
      'data-search-dialog-open-modality',
      'keyboard',
    );
    await closeSearchDialog(page);
  });

  test('direct data-theme mutation でも header theme 表示だけを同期すること', async ({ page }) => {
    await page.goto('/about/');
    await waitForRouterDocumentHostReady(page);

    await page.evaluate(() => {
      document.documentElement.dataset['theme'] = 'light';
    });

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(page.locator('header[data-layout-header] [data-theme-current-label]')).toHaveText(
      'ライト',
    );
    await expect(page.locator(themeTriggerRootSelector)).toHaveAttribute(
      'aria-label',
      'テーマ: ライト',
    );
    await expect(
      page.locator('header[data-layout-header] .theme-trigger-icon svg[data-icon]'),
    ).toHaveAttribute('data-icon', 'sun');
    await expect(
      page.locator('header[data-layout-header] [data-theme-value="light"]'),
    ).toHaveAttribute('aria-pressed', 'true');
    await expect(
      page.locator('header[data-layout-header] [data-theme-value="light"]'),
    ).toHaveAttribute('data-selected', 'true');
    await expect(
      page.locator('header[data-layout-header] [data-theme-value="light"] svg[data-icon]'),
    ).toHaveAttribute('data-icon', 'sun');
  });

  test('header menu は Escape dismissal と trigger focus restore を同期すること', async ({
    page,
  }) => {
    await page.goto(markdownBasic.directPath);
    await waitForRouterDocumentHostReady(page);

    for (const menu of ['corpus', 'theme'] as const) {
      const trigger = page.locator(
        `header[data-layout-header] [data-header-menu="${menu}"] [data-header-menu-trigger]`,
      );
      await trigger.click();
      await expectMenuOpen(page, menu, true);

      await page.keyboard.press('Escape');

      await expectMenuOpen(page, menu, false);
      await expect(trigger).toBeFocused();
    }
  });

  test('header menu は outside pointer と app-shell event で stale open state を閉じること', async ({
    page,
  }) => {
    await page.goto(markdownBasic.directPath);
    await waitForRouterDocumentHostReady(page);

    await page.locator(headerMenuTriggerSelector('corpus')).click();
    await expectMenuOpen(page, 'corpus', true);
    await page.locator('main').click({ position: { x: 8, y: 8 } });
    await expectMenuOpen(page, 'corpus', false);

    await page.locator(headerMenuTriggerSelector('theme')).click();
    await expectMenuOpen(page, 'theme', true);
    await page.evaluate(() => {
      document.dispatchEvent(new CustomEvent('app-shell:rollback-start'));
    });
    await expectMenuOpen(page, 'theme', false);

    for (const eventName of ['app-shell:committed', 'app-shell:restored'] as const) {
      await page.locator(headerMenuTriggerSelector('theme')).click();
      await expectMenuOpen(page, 'theme', true);
      await page.evaluate((name) => {
        document.dispatchEvent(new CustomEvent(name));
      }, eventName);
      await expectMenuOpen(page, 'theme', false);
    }
  });

  test('header menu は one-menu-open と項目選択後 close を維持すること', async ({ page }) => {
    await page.goto(markdownBasic.directPath);
    await waitForRouterDocumentHostReady(page);

    await page.locator(headerMenuTriggerSelector('corpus')).click();
    await expectMenuOpen(page, 'corpus', true);
    await expect(page.locator('header[data-layout-header] [data-header-menu][open]')).toHaveCount(
      1,
    );

    await page.locator(headerMenuTriggerSelector('theme')).click();
    await expectMenuOpen(page, 'corpus', false);
    await expectMenuOpen(page, 'theme', true);
    await expect(page.locator('header[data-layout-header] [data-header-menu][open]')).toHaveCount(
      1,
    );

    await page.locator('header[data-layout-header] [data-theme-value="dark"]').click();
    await expectMenuOpen(page, 'theme', false);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('header menu は外部 scroll で閉じ、panel 内 scroll では閉じないこと', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 360 });
    await page.goto(markdownBasic.directPath);
    await waitForRouterDocumentHostReady(page);

    await page.locator(headerMenuTriggerSelector('corpus')).click();
    await expectMenuOpen(page, 'corpus', true);
    await page.evaluate(() => window.dispatchEvent(new Event('scroll')));
    await expectMenuOpen(page, 'corpus', false);

    await page.locator(headerMenuTriggerSelector('corpus')).click();
    await expectMenuOpen(page, 'corpus', true);
    await page
      .locator('header[data-layout-header] [data-header-menu="corpus"]')
      .evaluate((menu) => {
        const panel = menu.querySelector<HTMLElement>('[data-header-menu-panel]');
        const list = panel?.querySelector('ul');
        const item = list?.querySelector('li');
        if (panel === null || panel === undefined || list === null || list === undefined) {
          throw new Error('corpus menu panel is missing.');
        }
        if (item === null || item === undefined) {
          throw new Error('corpus menu panel is missing.');
        }
        for (let index = 0; index < 24; index += 1) {
          list.append(item.cloneNode(true));
        }
      });

    const panel = page.locator(
      'header[data-layout-header] [data-header-menu="corpus"] [data-header-menu-panel]',
    );
    await expect
      .poll(() =>
        panel.evaluate((element) => ({
          clientHeight: element.clientHeight,
          overflowY: window.getComputedStyle(element).overflowY,
          scrollHeight: element.scrollHeight,
          scrollbarWidth: window.getComputedStyle(element).scrollbarWidth,
        })),
      )
      .toMatchObject({
        overflowY: 'auto',
        scrollbarWidth: 'thin',
      });
    await expect
      .poll(() => panel.evaluate((element) => element.scrollHeight > element.clientHeight))
      .toBe(true);

    await panel.evaluate((element) => {
      element.scrollTop = 80;
      element.dispatchEvent(new Event('scroll', { bubbles: false }));
    });
    await expectMenuOpen(page, 'corpus', true);
  });

  test('summary click / Enter / Space は native details toggle と二重反転しないこと', async ({
    page,
  }) => {
    await page.goto(markdownBasic.directPath);
    await waitForRouterDocumentHostReady(page);

    // This test intentionally targets the native summary element because it verifies
    // details/summary toggle semantics rather than the visual state contract.
    const trigger = page.locator('header[data-layout-header] [data-header-menu="corpus"] summary');
    await trigger.click();
    await expectMenuOpen(page, 'corpus', true);
    await trigger.click();
    await expectMenuOpen(page, 'corpus', false);

    await trigger.focus();
    await page.keyboard.press('Enter');
    await expectMenuOpen(page, 'corpus', true);
    await page.keyboard.press('Enter');
    await expectMenuOpen(page, 'corpus', false);

    await page.keyboard.press('Space');
    await expectMenuOpen(page, 'corpus', true);
    await page.keyboard.press('Space');
    await expectMenuOpen(page, 'corpus', false);
  });

  test('header menu controller は Tab の通常 focus 移動と SPA 置換後の旧 header を壊さないこと', async ({
    page,
  }) => {
    await page.goto(markdownBasic.directPath);
    await waitForRouterDocumentHostReady(page);

    const corpusTrigger = page.locator(headerMenuTriggerSelector('corpus'));
    await corpusTrigger.focus();
    await page.keyboard.press('Tab');
    await expect(
      page.locator('header[data-layout-header] [data-search-dialog-trigger]'),
    ).toBeFocused();

    await corpusTrigger.click();
    await expectMenuOpen(page, 'corpus', true);
    await page.evaluate(() => {
      const oldHeader = document.querySelector<HTMLElement>('header[data-layout-header]');
      if (oldHeader === null) throw new Error('static header is missing.');
      const state = window as unknown as {
        staticHeaderMenuOldHeader?: HTMLElement;
        readStaticHeaderMenuOldHeader?: () => Record<string, string | null>;
      };
      state.staticHeaderMenuOldHeader = oldHeader;
      state.readStaticHeaderMenuOldHeader = () => {
        const oldMenu = oldHeader.querySelector('details[data-header-menu="corpus"]');
        const oldTrigger = oldMenu?.querySelector('[data-header-menu-trigger]');
        return {
          connected: oldHeader.isConnected ? 'true' : 'false',
          open: oldMenu?.hasAttribute('open') === true ? 'true' : 'false',
          expanded: oldTrigger?.getAttribute('aria-expanded') ?? null,
        };
      };
    });

    await navigateWithRouterDocumentHost(page, '/about/');
    await page.locator(headerMenuTriggerSelector('theme')).click();
    await page.evaluate(() => {
      document.dispatchEvent(new CustomEvent('app-shell:committed'));
      window.dispatchEvent(new Event('scroll'));
    });

    await expect
      .poll(async () =>
        page.evaluate(() => {
          const state = window as unknown as {
            readStaticHeaderMenuOldHeader?: () => Record<string, string | null>;
          };
          return state.readStaticHeaderMenuOldHeader?.() ?? {};
        }),
      )
      .toEqual({
        connected: 'false',
        open: 'true',
        expanded: 'true',
      });
    await expectMenuOpen(page, 'theme', false);
  });

  test('header menu は Arrow / Home / End で補助 focus 移動し runtime tabindex を導入しないこと', async ({
    page,
  }) => {
    await page.goto(markdownBasic.directPath);
    await waitForRouterDocumentHostReady(page);
    await prepareHeaderMenuItems(page, 'corpus', ['Alpha', 'Beta', 'Gamma']);

    for (const menu of ['corpus', 'theme'] as const) {
      const trigger = page.locator(headerMenuTriggerSelector(menu));
      const items = page.locator(
        `header[data-layout-header] [data-header-menu="${menu}"] [data-header-menu-item]`,
      );

      await trigger.focus();
      await page.keyboard.press('ArrowDown');
      await expectMenuOpen(page, menu, true);
      await expect(items.first()).toBeFocused();
      await page.keyboard.press('ArrowDown');
      await expect(items.nth(1)).toBeFocused();
      await page.keyboard.press('ArrowUp');
      await expect(items.first()).toBeFocused();
      await page.keyboard.press('End');
      await expect(items.nth((await items.count()) - 1)).toBeFocused();
      await page.keyboard.press('Home');
      await expect(items.first()).toBeFocused();
      await expect(
        page.locator(
          `header[data-layout-header] [data-header-menu="${menu}"] [data-header-menu-item][tabindex]`,
        ),
      ).toHaveCount(0);

      await page.keyboard.press('Tab');
      await expectMenuOpen(page, menu, false);

      await trigger.focus();
      await page.keyboard.press('ArrowUp');
      await expectMenuOpen(page, menu, true);
      await expect(items.nth((await items.count()) - 1)).toBeFocused();

      await page.keyboard.press('Escape');
      await expectMenuOpen(page, menu, false);
      await expect(trigger).toBeFocused();
    }
  });

  test('header menu は closed trigger の ArrowDown / ArrowUp で first / last item に focus すること', async ({
    page,
  }) => {
    await page.goto(markdownBasic.directPath);
    await waitForRouterDocumentHostReady(page);
    const labels = ['Alpha', 'Beta', 'Gamma'] as const;
    await prepareHeaderMenuItems(page, 'corpus', labels);
    await prepareHeaderMenuItems(page, 'theme', labels);

    for (const menu of ['corpus', 'theme'] as const) {
      const trigger = page.locator(headerMenuTriggerSelector(menu));
      const items = page.locator(
        `header[data-layout-header] [data-header-menu="${menu}"] [data-header-menu-item]`,
      );

      await expectMenuOpen(page, menu, false);
      await trigger.focus();
      await page.keyboard.press('ArrowDown');
      await expectMenuOpen(page, menu, true);
      await expect(items.first()).toBeFocused();

      await page.keyboard.press('Escape');
      await expectMenuOpen(page, menu, false);
      await expect(trigger).toBeFocused();

      await page.keyboard.press('ArrowUp');
      await expectMenuOpen(page, menu, true);
      await expect(items.nth((await items.count()) - 1)).toBeFocused();

      await page.keyboard.press('Escape');
      await expectMenuOpen(page, menu, false);
      await expect(trigger).toBeFocused();
    }
  });

  test('corpus menu の item focus と Escape focus restore は preventScroll で focus scroll を抑止すること', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 520 });
    await page.goto('/about/');
    await waitForRouterDocumentHostReady(page);

    await page.evaluate(async () => {
      const router = document.querySelector('router-document-host') as
        | (HTMLElement & { whenReady?: () => Promise<void> })
        | null;

      if (typeof router?.whenReady === 'function') {
        await router.whenReady();
      }

      if (document.readyState !== 'complete') {
        await new Promise<void>((resolve) => {
          window.addEventListener('load', () => resolve(), { once: true });
        });
      }

      const waitForAnimationFrame = (): Promise<void> =>
        new Promise((resolve) => {
          requestAnimationFrame(() => resolve());
        });

      await waitForAnimationFrame();
      await waitForAnimationFrame();
      await waitForAnimationFrame();
    });

    const targetScrollY = 120;

    await page.evaluate((nextScrollY) => {
      const existingSpacer = document.querySelector<HTMLElement>(
        '[data-static-header-scroll-spacer="true"]',
      );
      const spacer = existingSpacer ?? document.createElement('div');

      spacer.style.display = 'block';
      spacer.style.blockSize = `${Math.max(window.innerHeight * 2, nextScrollY + window.innerHeight)}px`;
      spacer.setAttribute('data-static-header-scroll-spacer', 'true');

      if (!spacer.isConnected) {
        document.body.append(spacer);
      }
    }, targetScrollY);

    await page.waitForFunction((nextScrollY) => {
      const scrollingElement = document.scrollingElement;
      return (
        scrollingElement !== null &&
        scrollingElement.scrollHeight - window.innerHeight >= nextScrollY
      );
    }, targetScrollY);

    await page.evaluate((nextScrollY) => {
      window.scrollTo({ top: nextScrollY, left: 0, behavior: 'instant' });
    }, targetScrollY);

    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThanOrEqual(100);

    await page.evaluate(() => {
      interface FocusCall {
        afterScrollY: number;
        beforeScrollY: number;
        preventScroll: boolean;
        target: 'item' | 'trigger' | 'other';
      }

      const windowWithFocusCalls = window as Window & {
        __staticHeaderFocusCalls?: FocusCall[];
        __staticHeaderRestoreFocusSpy?: () => void;
      };

      windowWithFocusCalls.__staticHeaderRestoreFocusSpy?.();
      windowWithFocusCalls.__staticHeaderFocusCalls = [];

      const trigger = document.querySelector<HTMLElement>(
        'header[data-layout-header] [data-header-menu="corpus"] > [data-header-menu-trigger]',
      );
      const item = document.querySelector<HTMLElement>(
        'header[data-layout-header] [data-header-menu="corpus"] [data-header-menu-item]',
      );

      if (trigger === null || item === null) {
        throw new Error('Corpus menu trigger or item is missing.');
      }

      const originalTriggerFocus = trigger.focus.bind(trigger);
      const originalItemFocus = item.focus.bind(item);

      trigger.focus = (options?: FocusOptions) => {
        const beforeScrollY = window.scrollY;
        originalTriggerFocus(options);
        const afterScrollY = window.scrollY;

        windowWithFocusCalls.__staticHeaderFocusCalls?.push({
          afterScrollY,
          beforeScrollY,
          preventScroll: options?.preventScroll === true,
          target: 'trigger',
        });
      };

      item.focus = (options?: FocusOptions) => {
        const beforeScrollY = window.scrollY;
        originalItemFocus(options);
        const afterScrollY = window.scrollY;

        windowWithFocusCalls.__staticHeaderFocusCalls?.push({
          afterScrollY,
          beforeScrollY,
          preventScroll: options?.preventScroll === true,
          target: 'item',
        });
      };

      windowWithFocusCalls.__staticHeaderRestoreFocusSpy = () => {
        trigger.focus = originalTriggerFocus;
        item.focus = originalItemFocus;
        delete windowWithFocusCalls.__staticHeaderRestoreFocusSpy;
      };
    });

    const trigger = page.locator(headerMenuTriggerSelector('corpus'));
    await trigger.focus();

    await page.keyboard.press('ArrowDown');
    await expectMenuOpen(page, 'corpus', true);
    await expect(
      page
        .locator('header[data-layout-header] [data-header-menu="corpus"] [data-header-menu-item]')
        .first(),
    ).toBeFocused();

    await page.keyboard.press('Escape');
    await expectMenuOpen(page, 'corpus', false);
    await expect(trigger).toBeFocused();

    const focusCalls = await page.evaluate(() => {
      const windowWithFocusCalls = window as Window & {
        __staticHeaderFocusCalls?: {
          afterScrollY: number;
          beforeScrollY: number;
          preventScroll: boolean;
          target: 'item' | 'trigger' | 'other';
        }[];
      };

      return windowWithFocusCalls.__staticHeaderFocusCalls ?? [];
    });

    const itemFocusCall = focusCalls.find(
      (call) => call.target === 'item' && call.preventScroll === true,
    );
    const triggerFocusCall = focusCalls.find(
      (call) => call.target === 'trigger' && call.preventScroll === true,
    );

    expect(itemFocusCall).toBeDefined();
    expect(triggerFocusCall).toBeDefined();

    if (itemFocusCall === undefined || triggerFocusCall === undefined) {
      throw new Error('Expected item and trigger focus calls with preventScroll.');
    }

    expect(Math.abs(itemFocusCall.afterScrollY - itemFocusCall.beforeScrollY)).toBeLessThanOrEqual(
      1,
    );
    expect(
      Math.abs(triggerFocusCall.afterScrollY - triggerFocusCall.beforeScrollY),
    ).toBeLessThanOrEqual(1);

    await page.evaluate(() => {
      const windowWithFocusCalls = window as Window & {
        __staticHeaderRestoreFocusSpy?: () => void;
      };

      windowWithFocusCalls.__staticHeaderRestoreFocusSpy?.();
    });
  });

  test('header menu は typeahead と close 後の buffer reset を同期すること', async ({ page }) => {
    await page.goto(markdownBasic.directPath);
    await waitForRouterDocumentHostReady(page);
    const labels = ['Gamma', 'Gala', 'Alpha'] as const;
    await prepareHeaderMenuItems(page, 'corpus', labels);
    await prepareHeaderMenuItems(page, 'theme', labels);

    const corpusTrigger = page.locator(headerMenuTriggerSelector('corpus'));
    const corpusItems = page.locator(
      'header[data-layout-header] [data-header-menu="corpus"] [data-header-menu-item]',
    );

    await corpusTrigger.click();
    await expectMenuOpen(page, 'corpus', true);

    await page.keyboard.press('G');
    await expect(corpusItems.first()).toBeFocused();

    await page.keyboard.press('A');
    await expect(corpusItems.nth(1)).toBeFocused();

    await page.waitForTimeout(1100);
    await expectMenuOpen(page, 'corpus', true);

    await page.keyboard.press('A');
    await expect(corpusItems.nth(2)).toBeFocused();

    await page.keyboard.press('Escape');
    await expectMenuOpen(page, 'corpus', false);

    await corpusTrigger.click();
    await expectMenuOpen(page, 'corpus', true);

    await page.keyboard.press('G');
    await expect(corpusItems.first()).toBeFocused();

    await page.keyboard.press('Escape');
    await expectMenuOpen(page, 'corpus', false);

    await corpusTrigger.click();
    await expectMenuOpen(page, 'corpus', true);

    await page.keyboard.press('A');
    await expect(corpusItems.nth(2)).toBeFocused();

    await page.keyboard.press('Escape');
    await expectMenuOpen(page, 'corpus', false);

    for (const menu of ['corpus', 'theme'] as const) {
      const trigger = page.locator(headerMenuTriggerSelector(menu));
      const items = page.locator(
        `header[data-layout-header] [data-header-menu="${menu}"] [data-header-menu-item]`,
      );

      await trigger.click();
      await expectMenuOpen(page, menu, true);

      await page.keyboard.press('G');
      await expect(items.first()).toBeFocused();

      await page.keyboard.press('Escape');
      await expectMenuOpen(page, menu, false);

      await trigger.click();
      await expectMenuOpen(page, menu, true);

      await page.keyboard.press('A');
      await expect(items.nth(2)).toBeFocused();

      await page.evaluate(() => {
        document.dispatchEvent(new CustomEvent('app-shell:rollback-start'));
      });
      await expectMenuOpen(page, menu, false);

      await trigger.click();
      await expectMenuOpen(page, menu, true);

      await page.keyboard.press('G');
      await expect(items.first()).toBeFocused();

      await page.keyboard.press('Escape');
      await expectMenuOpen(page, menu, false);
    }
  });
});
