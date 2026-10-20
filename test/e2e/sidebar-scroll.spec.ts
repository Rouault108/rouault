import { expect, test, type Locator, type Page } from '@playwright/test';

import { e2eNoteFixtures } from './support/note-fixtures.js';

const sourceEntryPath = e2eNoteFixtures.sidebarScrollSource.directPath;
const targetPath = e2eNoteFixtures.sidebarScrollTarget.normalizedPath;

test.describe('Sidebar Selected Item Scroll', () => {
  test('sidebar host を保持したままルート遷移しても破綻しないこと', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 480 });
    await page.goto(sourceEntryPath);
    await expect(page.locator('[data-app-shell-sidebar-host]')).toHaveCount(1);
    await expect(page.locator('aside[data-layout-sidebar-root]')).toHaveCount(1);
    await expect(page.locator('router-document-host > #main-content')).toHaveCount(1);
    await expect(page.locator('#main-content h1').first()).toHaveText('Sidebar Scroll Source');

    await page
      .locator('#main-content')
      .getByRole('link', { name: 'Sidebar Scroll Target' })
      .click();

    await expect(page).toHaveURL(new RegExp(`${targetPath}/?$`));
    await expect(page.locator('#main-content h1').first()).toHaveText('Sidebar Scroll Target');
    await expect(page.locator('[data-app-shell-sidebar-host]')).toHaveCount(1);
    await expect(page.locator('aside[data-layout-sidebar-root]')).toHaveCount(1);
    await expect(page.locator('router-document-host > #main-content')).toHaveCount(1);
  });
});

const sidebarSelector = 'aside[data-layout-sidebar-root]';
const sidebarViewports = {
  fixed: { width: 1280, height: 480 },
  overlay: { width: 768, height: 480 },
} as const;
type SidebarMode = keyof typeof sidebarViewports;

const openSidebar = async (page: Page, mode: SidebarMode, height = 480): Promise<Locator> => {
  await page.setViewportSize({ ...sidebarViewports[mode], height });
  await page.goto(sourceEntryPath);
  const root = page.locator(sidebarSelector);
  await expect(page.locator('[data-sidebar-enhancement-state]')).toHaveAttribute(
    'data-sidebar-enhancement-state',
    'active',
  );
  await expect(root).toHaveAttribute('data-mode', mode);
  if (mode === 'overlay') {
    if ((await root.getAttribute('data-state')) !== 'expanded') {
      await page.locator('[data-layout-sidebar-toggle]').click();
    }
    await expect(root).toHaveAttribute('data-state', 'expanded');
  }
  return root;
};

const sidebarMetrics = async (root: Locator) =>
  root.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      scrollHeight: element.scrollHeight,
      clientHeight: element.clientHeight,
      scrollTop: element.scrollTop,
      overflowY: style.overflowY,
      scrollbarWidth: style.getPropertyValue('scrollbar-width'),
      scrollbarColor: style.getPropertyValue('scrollbar-color'),
      scrollbarGutter: style.scrollbarGutter,
      currentId:
        document
          .querySelector('[data-layout-toc-nav] [aria-current="location"]')
          ?.getAttribute('data-heading-id') ?? null,
    };
  });

const displayedSidebarControls = async (root: Locator) =>
  root.locator('[data-sidebar-nav-control]').evaluateAll((elements) =>
    elements
      .filter((element) => {
        // closed details 内にも rect を返す Chromium で、summary 以外を操作対象へ含めない。
        for (let ancestor = element.parentElement; ancestor; ancestor = ancestor.parentElement) {
          if (
            ancestor instanceof HTMLDetailsElement &&
            !ancestor.open &&
            ancestor.querySelector(':scope > summary') !== element
          )
            return false;
        }
        return (
          element.getClientRects().length > 0 && getComputedStyle(element).visibility === 'visible'
        );
      })
      .map((element) => ({
        nodeId: element.closest('[data-node-id]')?.getAttribute('data-node-id'),
        href: element.getAttribute('href'),
        tagName: element.tagName,
        focused: element === document.activeElement,
      })),
  );

const sidebarStable = async (root: Locator, atEnd = false): Promise<void> => {
  await expect
    .poll(async () =>
      root.evaluate(async (element, endpoint) => {
        const read = () =>
          JSON.stringify([
            element.scrollHeight,
            element.clientHeight,
            element.scrollTop,
            document
              .querySelector('[data-layout-toc-nav] [aria-current="location"]')
              ?.getAttribute('data-heading-id'),
          ]);
        let previous = read();
        for (let frame = 0; frame < 4; frame += 1) {
          await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
          const next = read();
          if (next !== previous) return false;
          previous = next;
        }
        return (
          !endpoint ||
          Math.abs(element.scrollHeight - element.clientHeight - element.scrollTop) <= 1
        );
      }, atEnd),
    )
    .toBe(true);
};

const expectSidebarSurface = async (target: Locator, focusRing = false): Promise<void> => {
  const violations = await target.evaluate((element, includeRing) => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    const ring = includeRing
      ? Math.max(0, parseFloat(style.outlineWidth) + parseFloat(style.outlineOffset))
      : 0;
    const box = {
      left: rect.left - ring,
      right: rect.right + ring,
      top: rect.top - ring,
      bottom: rect.bottom + ring,
    };
    const failures: string[] = [];
    const check = (
      name: string,
      left: number,
      right: number,
      top: number,
      bottom: number,
      x = true,
      y = true,
    ) => {
      if (x && (box.left < left - 1 || box.right > right + 1))
        failures.push(`${name}: horizontal clipping`);
      if (y && (box.top < top - 1 || box.bottom > bottom + 1))
        failures.push(`${name}: vertical clipping`);
    };
    check('viewport', 0, innerWidth, 0, innerHeight);
    for (let ancestor = element.parentElement; ancestor; ancestor = ancestor.parentElement) {
      const css = getComputedStyle(ancestor);
      const clips = (overflow: string) => /^(auto|scroll|hidden|clip)$/.test(overflow);
      const bounds = ancestor.getBoundingClientRect();
      const left = bounds.left + ancestor.clientLeft;
      const top = bounds.top + ancestor.clientTop;
      check(
        ancestor.tagName,
        left,
        left + ancestor.clientWidth,
        top,
        top + ancestor.clientHeight,
        clips(css.overflowX),
        clips(css.overflowY),
      );
    }
    for (const x of [rect.left + 3, (rect.left + rect.right) / 2, rect.right - 3]) {
      for (const y of [rect.top + 3, (rect.top + rect.bottom) / 2, rect.bottom - 3]) {
        const hit = document.elementFromPoint(x, y);
        if (!hit || !element.contains(hit)) failures.push(`occluded at ${x},${y}`);
      }
    }
    return failures;
  }, focusRing);
  expect(violations).toEqual([]);
};

for (const mode of ['fixed', 'overlay'] as const) {
  for (const environment of ['light', 'dark', 'forced-colors'] as const) {
    test(`${mode} native scrollbar computed styles: ${environment}`, async ({
      page,
      browserName,
    }) => {
      await page.emulateMedia({
        colorScheme: environment === 'dark' ? 'dark' : 'light',
        forcedColors: environment === 'forced-colors' ? 'active' : 'none',
      });
      const support = await page.evaluate(() => ({
        width: CSS.supports('scrollbar-width', 'thin'),
        color: CSS.supports('scrollbar-color', 'auto'),
        forcedColors: matchMedia('(forced-colors: active)').matches,
        userAgent: navigator.userAgent,
      }));
      test.info().annotations.push({
        type: 'scrollbar-environment',
        description: JSON.stringify({ browserName, mode, environment, ...support }),
      });
      for (const state of ['normal', 'hover', 'focus-within'] as const) {
        const root = await openSidebar(page, mode);
        await page.mouse.move(0, 0);
        await page.evaluate(() => {
          if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
        });
        if (state === 'hover') {
          const box = await root.boundingBox();
          if (!box) throw new Error('sidebar has no scrollport rectangle');
          await page.mouse.move(box.x + 20, box.y + 20);
        }
        if (state === 'focus-within')
          await root.locator('[data-sidebar-nav-control]').first().focus();
        expect(await root.evaluate((element) => element.matches(':hover'))).toBe(state === 'hover');
        expect(await root.evaluate((element) => element.matches(':focus-within'))).toBe(
          state === 'focus-within',
        );
        const metrics = await sidebarMetrics(root);
        await test.info().attach(`${mode}-${environment}-${state}`, {
          body: JSON.stringify(metrics, null, 2),
          contentType: 'application/json',
        });
        if (support.width) expect(metrics.scrollbarWidth).toBe('thin');
        if (support.color) expect(metrics.scrollbarColor).toBe('auto');
        expect(metrics.overflowY).toBe('auto');
      }
    });
  }

  for (const input of ['wheel', 'scrollTop'] as const) {
    test(`${mode} last displayed operable item is fully reachable by ${input}`, async ({
      page,
    }) => {
      const root = await openSidebar(page, mode);
      const branch = root.locator('li[data-node-id$="group-16"] > details');
      await branch.locator(':scope > summary').click();
      await expect(branch).toHaveAttribute('open', '');
      const target = root.locator(`a[href="${targetPath}"]`);
      await expect(root.locator('[data-sidebar-nav-branch]')).toHaveCount(17);
      const displayed = await displayedSidebarControls(root);
      expect(displayed).toHaveLength(19);
      expect(displayed.at(-1)?.href).toBe(targetPath);
      await root.evaluate((element) => {
        element.scrollTop = 0;
      });
      await sidebarStable(root);
      const initial = await sidebarMetrics(root);
      await test.info().attach('overflow-precondition', {
        body: JSON.stringify({ mode, initial, displayed }),
        contentType: 'application/json',
      });
      console.info('sidebar-scroll-fixture', JSON.stringify({ mode, ...initial }));
      expect(initial.scrollTop).toBe(0);
      expect(initial.scrollHeight).toBeGreaterThan(initial.clientHeight + 1);
      if (input === 'wheel') {
        const box = await root.boundingBox();
        if (!box) throw new Error('sidebar has no scrollport rectangle');
        await page.mouse.move(box.x + box.width / 2, box.y + Math.min(80, box.height / 2));
        await page.mouse.wheel(0, initial.scrollHeight);
      } else
        await root.evaluate((element) => {
          element.scrollTop = element.scrollHeight;
        });
      await sidebarStable(root, true);
      await test.info().attach('endpoint', {
        body: JSON.stringify(await sidebarMetrics(root)),
        contentType: 'application/json',
      });
      await expectSidebarSurface(target);
      await target.click();
      await expect(page).toHaveURL(new RegExp(`${targetPath}/?$`));
      await expect(page.locator('#main-content h1').first()).toHaveText('Sidebar Scroll Target');
    });
  }
}

test('sidebar keyboard movement / roving / details / focus return stay independent', async ({
  page,
}) => {
  const root = await openSidebar(page, 'overlay');
  const first = root.locator('[data-sidebar-nav-control]').first();
  await first.focus();
  await page.keyboard.press('Home');
  await expect(first).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(first.locator('..')).not.toHaveAttribute('open');
  await page.keyboard.press('ArrowRight');
  await expect(first.locator('..')).toHaveAttribute('open', '');
  await page.keyboard.press('ArrowDown');
  await expect(root.locator('[data-sidebar-nav-control]').nth(1)).toBeFocused();
  await page.keyboard.press('End');
  await expect(root.locator('[data-sidebar-nav-control][tabindex="0"]')).toBeFocused();
  await expect.poll(async () => (await displayedSidebarControls(root)).at(-1)?.focused).toBe(true);
  const last = (await displayedSidebarControls(root)).at(-1);
  expect(last?.tagName).toBe('SUMMARY');
  expect(last?.nodeId).toMatch(/group-16$/u);
  await expect(root.locator('[data-sidebar-nav-control][tabindex="0"]')).toHaveCount(1);
  await page.keyboard.press('Home');
  await expect(first).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(root).toHaveAttribute('data-state', 'collapsed');
  await expect(page.locator('[data-layout-sidebar-toggle]')).toBeFocused();
});

test('short fixed sidebar remains nonoverflowing', async ({ page }) => {
  const root = await openSidebar(page, 'fixed', 900);
  await sidebarStable(root);
  const metrics = await sidebarMetrics(root);
  await test
    .info()
    .attach('short-fixed', { body: JSON.stringify(metrics), contentType: 'application/json' });
  expect(metrics.scrollHeight).toBeLessThanOrEqual(metrics.clientHeight + 1);
});

for (const mode of ['fixed', 'overlay'] as const) {
  test(`${mode} sidebar focus ring fits independently of endpoint arrival`, async ({ page }) => {
    const root = await openSidebar(page, mode);
    const first = root.locator('[data-sidebar-nav-control]').first();
    await first.focus();
    await page.keyboard.press('Home');
    await expect(first).toBeFocused();
    expect(await first.evaluate((element) => element.matches(':focus-visible'))).toBe(true);
    await expect(first).toHaveCSS('outline-style', 'solid');
    await expectSidebarSurface(first, true);
  });
}

test('short overlay sidebar remains nonoverflowing', async ({ page }) => {
  const root = await openSidebar(page, 'overlay', 900);
  await sidebarStable(root);
  const metrics = await sidebarMetrics(root);
  await test
    .info()
    .attach('short-overlay', { body: JSON.stringify(metrics), contentType: 'application/json' });
  expect(metrics.scrollHeight).toBeLessThanOrEqual(metrics.clientHeight + 1);
});
