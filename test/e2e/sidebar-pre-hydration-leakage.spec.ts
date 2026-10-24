import { expect, test } from '@playwright/test';
import { e2eNoteFixtures } from './support/note-fixtures.js';

const layoutRichPath = e2eNoteFixtures.layoutRich.directPath;
const rootSelector = 'aside[data-layout-sidebar-root]';

test.describe('sidebar static baseline', () => {
  for (const interaction of ['branch', 'link-focus', 'pointer'] as const) {
    test(`pending validation preserves initial ${interaction} interaction`, async ({ page }) => {
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
      const nav = root.locator('nav[data-sidebar-nav]');
      const helper = root.locator('[data-layout-sidebar-main-link]');
      await expect(page.locator('[data-sidebar-enhancement-state]')).toHaveAttribute(
        'data-sidebar-enhancement-state',
        'staged',
      );
      await expect(nav).toBeVisible();
      await expect(page.locator('[data-layout-sidebar-toggle]')).toBeHidden();
      if (interaction === 'branch') {
        const branches = root.locator('details[data-sidebar-nav-branch]');
        const index = await branches.evaluateAll((items) =>
          items.findIndex((item) => item.hasAttribute('open')),
        );
        expect(index).toBeGreaterThanOrEqual(0);
        const branch = branches.nth(index);
        const control = branch.locator(':scope > summary');
        await control.click();
        await expect(branch).not.toHaveAttribute('open');
        await control.press('Enter');
        await expect(branch).toHaveAttribute('open');
      } else if (interaction === 'link-focus') await helper.focus();
      else {
        const bounds = await nav.boundingBox();
        if (!bounds) throw new Error('native nav geometry missing');
        await page.mouse.click(bounds.x + 2, bounds.y + 2);
      }
      await page.evaluate(() => {
        (Reflect.get(window, 'releaseSidebarValidation') as () => void)();
      });
      await expect(page.locator('[data-sidebar-enhancement-state]')).toHaveAttribute(
        'data-sidebar-enhancement-state',
        'fallback',
      );
      await expect(nav).toBeVisible();
      if (interaction === 'link-focus') await expect(helper).toBeFocused();
      await expect(root.locator('[data-layout-sidebar-static-trigger]')).toHaveCount(0);
    });
  }

  for (const width of [1440, 390]) {
    for (const condition of ['normal', 'js-delay', 'manifest-delay', 'manifest-failure'] as const) {
      test(`${width}px ${condition} keeps a single static nav without an outer disclosure`, async ({
        page,
      }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.addInitScript(() => {
          const frames: { time: number; summary: number; nav: number }[] = [];
          const sample = (): void => {
            const root = document.querySelector('aside[data-layout-sidebar-root]');
            if (root?.querySelector('nav[data-sidebar-nav]'))
              frames.push({
                time: performance.now(),
                summary: root.querySelectorAll(
                  '[data-layout-sidebar-static-trigger], [data-layout-sidebar-disclosure]',
                ).length,
                nav: root.querySelectorAll('nav[data-sidebar-nav]').length,
              });
            if (frames.length < 600) requestAnimationFrame(sample);
          };
          requestAnimationFrame(sample);
          Object.assign(window, { sidebarBaselineFrames: frames });
        });
        if (condition !== 'normal') {
          const pattern =
            condition === 'js-delay'
              ? '**/client-assets/client-*.js'
              : '**/assets/internal-document-routes.json*';
          await page.route(pattern, async (route) => {
            if (condition === 'manifest-failure') {
              await route.fulfill({ status: 503, contentType: 'application/json', body: '{}' });
              return;
            }
            await new Promise((resolve) => setTimeout(resolve, 3000));
            await route.continue();
          });
        }
        await page.goto(layoutRichPath, { waitUntil: 'commit' });
        const root = page.locator(rootSelector);
        await expect(root.locator('[data-layout-sidebar-main-link]')).toHaveAttribute(
          'href',
          '#main-content',
        );
        await expect(
          root.locator('[data-layout-sidebar-static-trigger], [data-layout-sidebar-disclosure]'),
        ).toHaveCount(0);
        await expect(root.locator('nav[data-sidebar-nav]')).toHaveCount(1);
        if (condition !== 'normal') {
          await expect(root.locator('nav')).toBeVisible();
          await expect(page.locator('.layout-sidebar-overlay-layer')).toHaveCSS('z-index', 'auto');
          await expect(root).toHaveCSS('z-index', 'auto');
          await expect(page.locator('[data-layout-sidebar-backdrop]')).toBeHidden();
          await test.info().attach('static-baseline-sampled-paint', {
            body: await page.screenshot(),
            contentType: 'image/png',
          });
        }
        if (condition === 'manifest-failure') {
          await page.waitForLoadState('domcontentloaded');
          await expect(page.locator('[data-sidebar-enhancement-state]')).toHaveAttribute(
            'data-sidebar-enhancement-state',
            'staged',
          );
          await expect(root.locator('nav')).toBeVisible();
        } else
          await expect(page.locator('[data-sidebar-enhancement-state]')).toHaveAttribute(
            'data-sidebar-enhancement-state',
            'active',
          );
        await expect(root).toHaveAttribute('tabindex', '-1');
        if (width >= 1024)
          await expect(root.locator('[data-layout-sidebar-main-link]')).toBeHidden();
        const frames = await page.evaluate(
          () =>
            Reflect.get(window, 'sidebarBaselineFrames') as {
              time: number;
              summary: number;
              nav: number;
            }[],
        );
        expect(frames.length).toBeGreaterThan(0);
        expect(frames.every((frame) => frame.summary === 0 && frame.nav === 1)).toBe(true);
        // DOMのrAF観測はpaintそのものではなく、上のcaptureとは別に保持する。
        await test.info().attach('sidebar-dom-frames', {
          body: JSON.stringify(frames),
          contentType: 'application/json',
        });
      });
    }
  }

  test('No-JS helper retains focus across widths and native branches remain reachable', async ({
    browser,
    baseURL,
  }) => {
    const context = await browser.newContext({
      baseURL: baseURL ?? 'http://127.0.0.1:4173',
      javaScriptEnabled: false,
      viewport: { width: 1440, height: 844 },
    });
    try {
      const page = await context.newPage();
      await page.goto(layoutRichPath);
      const root = page.locator(rootSelector);
      const helper = root.locator('[data-layout-sidebar-main-link]');
      await expect(helper).toBeHidden();
      await expect(root.locator('nav')).toBeVisible();
      await page.setViewportSize({ width: 390, height: 844 });
      await helper.focus();
      for (const width of [390, 1023, 1024, 1440, 390]) {
        await page.setViewportSize({ width, height: 844 });
        await expect(page.locator('.layout-sidebar-overlay-layer')).toHaveCSS('z-index', 'auto');
        await expect(root).toHaveCSS('z-index', 'auto');
        await expect(page.locator('[data-layout-sidebar-backdrop]')).toBeHidden();
        await expect(helper).toBeVisible();
        await expect(helper).toBeFocused();
        await expect(root.locator('nav')).toBeVisible();
      }
      const branches = root.locator('details[data-sidebar-nav-branch]');
      for (let index = 0; index < (await branches.count()); index++) {
        const branch = branches.nth(index);
        if ((await branch.getAttribute('open')) === null)
          await branch.locator(':scope > summary').press('Enter');
      }
      const links = root.locator('a[data-sidebar-nav-link]');
      expect(await links.count()).toBeGreaterThan(0);
      for (let index = 0; index < (await links.count()); index++)
        await expect(links.nth(index)).toBeVisible();
      await expect(helper).not.toHaveAttribute('data-sidebar-nav-control');
    } finally {
      await context.close();
    }
  });
  for (const target of ['aside', 'nav', 'helper'] as const) {
    test(`actual CSS keeps ${target} focus safe across the fixed/overlay boundary`, async ({
      page,
    }) => {
      if (target === 'helper') {
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
        const helper = page.locator('[data-layout-sidebar-main-link]');
        await helper.focus();
        for (const width of [1023, 1024, 1440, 390]) {
          await page.setViewportSize({ width, height: 844 });
          await expect(helper).toBeVisible();
          await expect(helper).toBeFocused();
        }
        await page.evaluate(() => {
          (Reflect.get(window, 'releaseSidebarValidation') as () => void)();
        });
        await expect(page.locator('[data-sidebar-enhancement-state]')).toHaveAttribute(
          'data-sidebar-enhancement-state',
          'fallback',
        );
        await expect(helper).toBeFocused();
        return;
      }
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(layoutRichPath);
      await expect(page.locator('[data-sidebar-enhancement-state]')).toHaveAttribute(
        'data-sidebar-enhancement-state',
        'active',
      );
      const root = page.locator(rootSelector);
      const focused =
        target === 'aside' ? root : root.locator('[data-sidebar-nav-control]').first();
      await focused.focus();
      const button = page.locator('[data-layout-sidebar-toggle]');
      await page.setViewportSize({ width: 1023, height: 900 });
      await expect(button).toBeFocused();
      await expect(button).toBeVisible();
      await expect(root).toHaveAttribute('inert');
      await page.setViewportSize({ width: 1024, height: 900 });
      await expect(root).toBeFocused();
      await expect(button).toBeHidden();
      await expect(root).not.toHaveAttribute('inert');
    });
  }
  test('branch operation before the JS entry starts survives after focus leaves the sidebar', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    let release = (): void => {
      /* route保持の初期化後に置き換える。 */
    };
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route('**/client-assets/client-*.js', async (route) => {
      await gate;
      await route.continue();
    });
    await page.goto(layoutRichPath, { waitUntil: 'commit' });
    const root = page.locator(rootSelector);
    const branches = root.locator('details[data-sidebar-nav-branch]');
    await expect(branches.first()).toBeAttached();
    const index = await branches.evaluateAll((items) =>
      items.findIndex((item) => item.hasAttribute('open')),
    );
    expect(index).toBeGreaterThanOrEqual(0);
    const branch = branches.nth(index);
    await branch.locator(':scope > summary').click();
    await expect(branch).not.toHaveAttribute('open');
    await page.locator('#main-content').focus();
    release();
    await expect(page.locator('[data-sidebar-enhancement-state]')).toHaveAttribute(
      'data-sidebar-enhancement-state',
      'fallback',
    );
    await expect(branch).not.toHaveAttribute('open');
    await expect(root.locator('nav')).toBeVisible();
    await expect(page.locator('#main-content')).toBeFocused();
  });
  test('active overlay omits the baseline helper and fallback fragment leaves no backdrop', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(layoutRichPath);
    const root = page.locator(rootSelector);
    await expect(page.locator('[data-sidebar-enhancement-state]')).toHaveAttribute(
      'data-sidebar-enhancement-state',
      'active',
    );
    await page.locator('[data-layout-sidebar-toggle]').click();
    await expect(root).toHaveAttribute('data-state', 'expanded');
    const helper = root.locator('[data-layout-sidebar-main-link]');
    await expect(helper).toBeHidden();
    await page.evaluate(() =>
      document
        .querySelector('[data-app-shell-root]')
        ?.removeAttribute('data-layout-header-enhancer-state'),
    );
    await expect(page.locator('[data-sidebar-enhancement-state]')).toHaveAttribute(
      'data-sidebar-enhancement-state',
      'fallback',
    );
    await expect(helper).toBeVisible();
    await helper.focus();
    await helper.press('Enter');
    await expect(page).toHaveURL(/#main-content$/u);
    await expect(page.locator('#main-content')).toBeFocused();
    await expect(page.locator('[data-layout-sidebar-backdrop]')).toBeHidden();
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(0);
  });
});
