import { expect, test } from '@playwright/test';

const wideTableNotePath = '/notes/library/collection/%E5%B2%A9%E6%B3%A2%E6%96%87%E5%BA%AB/';

interface ScrollTrace {
  root: number[];
  rail: number[];
}

declare global {
  interface Window {
    tableScrollTrace?: ScrollTrace;
  }
}

// headless Chromium の既定の非表示指定を外し、native thumb に mouse 入力を届ける。
test.use({ launchOptions: { ignoreDefaultArgs: ['--hide-scrollbars'] } });

test.describe('Accessible top scroll rail', () => {
  test('eligible long overflow table では実 Tab 順序で rail に到達し、隣接 root を制御すること', async ({
    page,
    browserName,
  }) => {
    test.skip(
      browserName === 'webkit',
      'WebKit の Tab focus は実行環境設定に依存するため、Tab 順序契約は Chromium で固定する。',
    );

    await page.setViewportSize({ width: 900, height: 900 });
    await page.goto(wideTableNotePath);

    const rail = page.locator('[data-table-scroll-rail]').first();
    const root = page.locator('[data-table-scroll-rail] + [data-table-root]').first();

    await expect(root).toBeVisible();
    await expect(rail).toBeVisible();
    await expect(rail).toHaveAttribute('role', 'region');
    await expect(rail).toHaveAttribute('tabindex', '0');
    await expect(root).toHaveAttribute('id', /.+/u);
    const rootId = await root.getAttribute('id');
    expect(rootId).not.toBeNull();
    await expect(rail).toHaveAttribute('aria-controls', rootId as string);
    await expect(rail).not.toHaveAttribute('aria-hidden', 'true');

    const inserted = await rail.evaluate((railElement) => {
      const rootElement = railElement?.nextElementSibling;

      if (
        !(railElement instanceof HTMLElement) ||
        !(rootElement instanceof HTMLElement) ||
        !rootElement.matches('[data-table-root]')
      ) {
        return false;
      }

      const before = document.createElement('button');
      before.type = 'button';
      before.textContent = 'before table rail';
      before.dataset['e2eTableRailFocusBefore'] = 'true';

      const after = document.createElement('button');
      after.type = 'button';
      after.textContent = 'after table root';
      after.dataset['e2eTableRailFocusAfter'] = 'true';

      railElement.before(before);
      rootElement.after(after);

      return true;
    });

    expect(inserted).toBe(true);

    const before = page.locator('[data-e2e-table-rail-focus-before]').first();
    const after = page.locator('[data-e2e-table-rail-focus-after]').first();

    await before.focus();
    await expect(before).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(rail).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(root).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(after).toBeFocused();
  });
});

test.describe('Native table scrollbar continuous drag', () => {
  for (const source of ['rail', 'root'] as const) {
    for (const pace of ['slow', 'fast'] as const) {
      test(`${source} の ${pace} drag で左右に振動せず middle / right / left へ同期すること`, async ({
        page,
      }) => {
        await page.setViewportSize({ width: 900, height: 900 });
        await page.goto(wideTableNotePath);
        const rail = page.locator('[data-table-scroll-rail]').first();
        const root = page.locator('[data-table-scroll-rail] + [data-table-root]').first();
        await expect(rail).toBeVisible();
        await expect(root).toBeVisible();
        for (const locator of [rail, root]) {
          expect(
            await locator.evaluate((element) => getComputedStyle(element).scrollbarWidth),
          ).toBe('thin');
        }

        await rail.evaluate((element) => {
          const rootElement = element.nextElementSibling;
          if (!(element instanceof HTMLElement) || !(rootElement instanceof HTMLElement)) {
            throw new Error('Missing table scroll pair');
          }
          const trace: ScrollTrace = { root: [], rail: [] };
          window.tableScrollTrace = trace;
          const record = (): void => {
            trace.root.push(rootElement.scrollLeft);
            trace.rail.push(element.scrollLeft);
          };
          rootElement.addEventListener('scroll', record);
          element.addEventListener('scroll', record);
        });

        const scrollbar = source === 'rail' ? rail : root;
        await scrollbar.evaluate(
          (element, block: 'start' | 'end') =>
            element.scrollIntoView({ block, behavior: 'instant' }),
          source === 'rail' ? 'start' : 'end',
        );

        for (const destination of [0.5, 1, 0]) {
          const geometry = await scrollbar.evaluate((element) => {
            if (!(element instanceof HTMLElement)) throw new Error('Missing native scroll source');
            const rect = element.getBoundingClientRect();
            const thickness = element.offsetHeight - element.clientHeight;
            const range = element.scrollWidth - element.clientWidth;
            const thumbWidth = (element.clientWidth * element.clientWidth) / element.scrollWidth;
            const travel = element.clientWidth - thumbWidth;
            return {
              x: rect.left + thumbWidth / 2 + (travel * element.scrollLeft) / range,
              y: rect.bottom - thickness / 2,
              travel,
              range,
              position: element.scrollLeft,
              thickness,
            };
          });
          expect(
            geometry.thickness,
            'Native horizontal scrollbar must expose a mouse target',
          ).toBeGreaterThan(0);
          const delta = geometry.travel * (destination - geometry.position / geometry.range);
          await page.mouse.move(geometry.x, geometry.y);
          await page.evaluate(() => {
            const trace = window.tableScrollTrace;
            if (!trace) throw new Error('Missing native scroll trace');
            trace.root.length = 0;
            trace.rail.length = 0;
          });
          await page.mouse.down();
          const steps = pace === 'slow' ? 60 : 12;
          for (let step = 1; step <= steps; step += 1) {
            await page.mouse.move(geometry.x + (delta * step) / steps, geometry.y);
            if (pace === 'slow') await page.waitForTimeout(8);
          }
          await page.mouse.up();
          await expect
            .poll(async () =>
              Math.abs(
                (await root.evaluate((element) => element.scrollLeft)) -
                  (await rail.evaluate((element) => element.scrollLeft)),
              ),
            )
            .toBeLessThanOrEqual(1);
          const reached = await scrollbar.evaluate((element) => element.scrollLeft);
          if (destination === 0) expect(reached).toBeLessThanOrEqual(2);
          else expect(reached / geometry.range).toBeCloseTo(destination, 1);

          const trace = await page.evaluate(() => {
            const recorded = window.tableScrollTrace;
            if (!recorded) throw new Error('Missing native scroll trace');
            return recorded;
          });
          for (const positions of [trace.root, trace.rail]) {
            expect(
              positions.length,
              'Drag must produce native scroll observations',
            ).toBeGreaterThan(1);
            for (let index = 1; index < positions.length; index += 1) {
              const movement = (positions[index] ?? 0) - (positions[index - 1] ?? 0);
              expect(
                movement * Math.sign(delta),
                'Continuous drag must not reverse by more than subpixel tolerance',
              ).toBeGreaterThanOrEqual(-1);
            }
          }
        }
      });
    }
  }

  test('root / rail の native keyboard scroll が双方向同期すること', async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 900 });
    await page.goto(wideTableNotePath);
    const rail = page.locator('[data-table-scroll-rail]').first();
    const root = page.locator('[data-table-scroll-rail] + [data-table-root]').first();
    await expect(rail).toBeVisible();
    for (const source of [rail, root]) {
      const before = await source.evaluate((element) => element.scrollLeft);
      await source.focus();
      await page.keyboard.press('ArrowRight');
      await expect
        .poll(() => source.evaluate((element) => element.scrollLeft))
        .toBeGreaterThan(before);
      await expect
        .poll(async () =>
          Math.abs(
            (await root.evaluate((element) => element.scrollLeft)) -
              (await rail.evaluate((element) => element.scrollLeft)),
          ),
        )
        .toBeLessThanOrEqual(1);
    }
  });

  test('coarse pointer では top rail を表示せず root は操作対象として維持すること', async ({
    browser,
    baseURL,
  }) => {
    if (!baseURL) throw new Error('Table scroll E2E requires the configured preview baseURL');
    const context = await browser.newContext({
      baseURL,
      hasTouch: true,
      viewport: { width: 900, height: 900 },
    });
    try {
      const page = await context.newPage();
      await page.goto(wideTableNotePath);
      expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches)).toBe(true);
      const rail = page.locator('[data-table-scroll-rail]').first();
      await expect(rail).toHaveCount(1);
      await expect(rail).toBeHidden();
      const root = page.locator('[data-table-scroll-rail] + [data-table-root]').first();
      await expect(root).toBeVisible();
      await expect(root).toHaveAttribute('tabindex', '0');
    } finally {
      await context.close();
    }
  });
});
