import { expect, test } from '@playwright/test';

import { e2eNoteFixtures } from './support/note-fixtures.js';

const layoutRichPath = e2eNoteFixtures.layoutRich.directPath;

test.describe('sidebar pre-hydration leakage', () => {
  test('狭幅 reload 中も SSR raw sidebar を paint せず、hydration 後は通常どおり開けること', async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== 'webkit', 'WebKit regression guard');

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(layoutRichPath);

    await page.addInitScript(() => {
      const registry = window.customElements;
      const realDefine = registry.define.bind(registry);
      const heldDefinitions: [string, CustomElementConstructor, ElementDefinitionOptions | undefined][] =
        [];
      const heldTagNames = new Set(['layout-sidebar']);

      (
        window as Window & {
          __releaseHeldLayoutSidebarDefinition__?: () => void;
        }
      ).__releaseHeldLayoutSidebarDefinition__ = () => {
        while (heldDefinitions.length > 0) {
          const entry = heldDefinitions.shift();
          if (!entry) {
            continue;
          }

          const [name, ctor, options] = entry;
          if (!registry.get(name)) {
            realDefine(name, ctor, options);
          }
        }
      };

      registry.define = ((name, ctor, options) => {
        if (heldTagNames.has(name) && !registry.get(name)) {
          heldDefinitions.push([name, ctor, options]);
          return;
        }

        realDefine(name, ctor, options);
      }) as typeof registry.define;
    });

    await page.reload();

    const sidebarHost = page.locator('layout-sidebar[data-sidebar-boot-state="ssr"]');
    const rawNav = sidebarHost.locator('[data-sidebar-nav]');

    await expect(sidebarHost).toHaveCount(1);
    await expect(rawNav).toHaveCount(1);
    await expect(rawNav).toBeHidden();

    const preHydrationState = await page.evaluate(() => {
      const sidebarHost = document.querySelector<HTMLElement>(
        'layout-sidebar[data-sidebar-boot-state="ssr"]',
      );
      const sidebarColumn = document.querySelector<HTMLElement>('[data-app-shell-sidebar-host]');

      if (!(sidebarHost instanceof HTMLElement) || !(sidebarColumn instanceof HTMLElement)) {
        return null;
      }

      const sidebarHostStyle = getComputedStyle(sidebarHost);
      const sidebarColumnStyle = getComputedStyle(sidebarColumn);

      return {
        hostVisibility: sidebarHostStyle.visibility,
        hostPointerEvents: sidebarHostStyle.pointerEvents,
        columnOverflowX: sidebarColumnStyle.overflowX,
        columnOverflowY: sidebarColumnStyle.overflowY,
        columnWidth: Math.round(sidebarColumn.getBoundingClientRect().width),
        horizontalOverflow:
          document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });

    expect(preHydrationState).not.toBeNull();
    expect(preHydrationState?.hostVisibility).toBe('hidden');
    expect(preHydrationState?.hostPointerEvents).toBe('none');
    expect(preHydrationState?.columnOverflowX).toBe('hidden');
    expect(preHydrationState?.columnOverflowY).toBe('hidden');
    expect(preHydrationState?.columnWidth ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(1);
    expect(preHydrationState?.horizontalOverflow ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(
      1,
    );

    await page.evaluate(() => {
      (
        window as Window & {
          __releaseHeldLayoutSidebarDefinition__?: () => void;
        }
      ).__releaseHeldLayoutSidebarDefinition__?.();
    });

    await expect
      .poll(async () => {
        return await page.locator('layout-sidebar').getAttribute('data-sidebar-boot-state');
      })
      .toBeNull();

    await page.getByRole('button', { name: 'サイドバーを開く' }).click();
    await expect(page.locator('layout-sidebar-surface [data-sidebar-nav]')).toBeVisible();
  });
});