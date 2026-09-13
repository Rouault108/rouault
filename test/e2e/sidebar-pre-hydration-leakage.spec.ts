import { expect, test } from '@playwright/test';
import { e2eNoteFixtures } from './support/note-fixtures.js';

const layoutRichPath = e2eNoteFixtures.layoutRich.directPath;
const rootSelector = 'aside[data-layout-sidebar-root]';

test.describe('sidebar native fallback', () => {
  test('遅いJSでもnative navigationを表示し、入力後は同じ世代でoverlayへ昇格しない', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(() => {
      const dispatch = document.dispatchEvent.bind(document);
      let held: Event | null = null;
      document.dispatchEvent = (event: Event): boolean => {
        if (event.type === 'app-shell:validated') {
          held = event;
          return true;
        }
        return dispatch(event);
      };
      Object.assign(window, {
        releaseSidebarValidation: () => {
          if (held) dispatch(held);
        },
      });
    });
    await page.goto(layoutRichPath);
    const root = page.locator(rootSelector);
    const summary = root.locator('[data-layout-sidebar-static-trigger]');
    const nav = root.locator('nav[data-sidebar-nav]');
    await expect(page.locator('[data-sidebar-enhancement-state]')).toHaveAttribute(
      'data-sidebar-enhancement-state',
      'staged',
    );
    await expect(nav).toBeVisible();
    await expect(page.locator('[data-layout-sidebar-toggle]')).toBeHidden();
    await summary.click();
    await expect(nav).toBeHidden();
    await summary.press('Enter');
    await expect(nav).toBeVisible();
    await page.evaluate(() => {
      const release = Reflect.get(window, 'releaseSidebarValidation') as () => void;
      release();
    });
    await expect(page.locator('[data-sidebar-enhancement-state]')).toHaveAttribute(
      'data-sidebar-enhancement-state',
      'fallback',
    );
    await expect(summary).toBeFocused();
    await expect(nav).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      ),
    ).toBeLessThanOrEqual(1);
  });

  test('JSなしでも幅変更後にsummaryと全native branchへ到達できる', async ({ browser, baseURL }) => {
    const context = await browser.newContext({
      baseURL: baseURL ?? 'http://127.0.0.1:4173',
      javaScriptEnabled: false,
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage();
    try {
      await page.goto(layoutRichPath);
      const root = page.locator(rootSelector);
      await expect(root).toHaveCount(1);
      await expect(page.locator('layout-sidebar')).toHaveCount(0);
      await expect(page.locator('[data-layout-sidebar-toggle]')).toBeHidden();
      for (const width of [390, 1023, 1280, 390]) {
        await page.setViewportSize({ width, height: 844 });
        const summary = root.locator('[data-layout-sidebar-static-trigger]');
        await summary.press('Enter');
        await expect(root.locator('nav')).toBeHidden();
        await summary.press('Space');
        await expect(root.locator('nav')).toBeVisible();
      }
      const branches = root.locator('details[data-sidebar-nav-branch]');
      for (let index = 0; index < (await branches.count()); index += 1) {
        const branch = branches.nth(index);
        if ((await branch.getAttribute('open')) === null)
          await branch.locator(':scope > summary').press('Enter');
      }
      const links = root.locator('a[data-sidebar-nav-link]');
      expect(await links.count()).toBeGreaterThan(0);
      for (let index = 0; index < (await links.count()); index += 1)
        await expect(links.nth(index)).toBeVisible();
    } finally {
      await context.close();
    }
  });
});
