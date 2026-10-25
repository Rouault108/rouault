import { expect, test, type Page } from '@playwright/test';
import sharp from 'sharp';

const prepare = async (page: Page, theme: 'light' | 'dark', direction: 'ltr' | 'rtl') => {
  const response = await page.request.get('/about');
  const stylesheet = /<link rel="stylesheet" href="([^"]+)"/u.exec(await response.text())?.[1];
  if (!stylesheet) throw new Error('production stylesheet missing');
  const href = new URL(stylesheet, response.url()).href;
  await page.setContent(`<!doctype html><html data-theme="${theme}" dir="${direction}">
    <head><link rel="stylesheet" href="${href}"><style>
      body { margin: 0; padding: 24px; background: var(--bg-default); }
      .prose { width: 320px; }
      [data-table-root] > table { width: 900px; min-width: 900px; height: 240px; }
    </style></head><body><div class="prose">
      <div data-table-root role="region" tabindex="0" aria-label="Scrollable reference table">
        <table><caption>Reference caption</caption><tbody><tr>
          <td><a href="#cell">Native cell link</a></td><td>Second cell</td>
        </tr></tbody></table>
      </div></div></body></html>`);
  await page.evaluate(() => document.fonts.ready);
  return page.locator('[data-table-root]');
};

for (const theme of ['light', 'dark'] as const) {
  for (const direction of ['ltr', 'rtl'] as const) {
    test(`table fade preserves the blurred reference appearance and geometry (${theme}, ${direction})`, async ({
      page,
    }, info) => {
      const root = await prepare(page, theme, direction);
      const comparisons: { fraction: number; maximum: number; mean: number }[] = [];
      for (const fraction of [0, 0.5, 1]) {
        // state属性の物理方向の描画を検証する。RTL enhancerの方針をここで追加しない。
        const state = await root.evaluate((element, value) => {
          const range = element.scrollWidth - element.clientWidth;
          const rtl = getComputedStyle(element).direction === 'rtl';
          element.scrollLeft = (rtl ? -1 : 1) * range * value;
          const left = rtl ? value < 1 : value > 0;
          const right = rtl ? value > 0 : value < 1;
          element.toggleAttribute('data-fade-left', left);
          element.toggleAttribute('data-fade-right', right);
          return { left, right };
        }, fraction);
        await page.waitForTimeout(200);
        const geometry = () =>
          root.evaluate((element) => ({
            root: element.getBoundingClientRect().toJSON(),
            table: element.querySelector('table')?.getBoundingClientRect().toJSON(),
            range: element.scrollWidth - element.clientWidth,
            x: element.scrollLeft,
          }));
        const before = await geometry();
        expect(before.root.width).toBe(320);
        expect(before.table?.width).toBe(900);
        expect(before.range).toBe(580);
        const bounds = await root.boundingBox();
        if (!bounds) throw new Error('table bounds');
        // native scrollbarの自動非表示の時刻差を画素比較へ混ぜない。操作は別契約で検証する。
        const clip = { ...bounds, height: bounds.height - 16 };
        const actual = await page.screenshot({ clip, animations: 'disabled' });
        await root.evaluate((element, fades) => {
          element.style.backgroundImage = 'none';
          element.style.boxShadow = [
            fades.left
              ? 'inset 10px 0 10px -10px var(--_table-scroll-fade-color)'
              : 'inset 0 0 0 0 transparent',
            fades.right
              ? 'inset -10px 0 10px -10px var(--_table-scroll-fade-color)'
              : 'inset 0 0 0 0 transparent',
          ].join(',');
        }, state);
        const reference = await page.screenshot({ clip, animations: 'disabled' });
        expect(await geometry()).toEqual(before);
        const a = await sharp(actual).removeAlpha().raw().toBuffer();
        const b = await sharp(reference).removeAlpha().raw().toBuffer();
        expect(a.length).toBe(b.length);
        let maximum = 0;
        let total = 0;
        for (let index = 0; index < a.length; index++) {
          const difference = Math.abs((a[index] ?? 0) - (b[index] ?? 0));
          maximum = Math.max(maximum, difference);
          total += difference;
        }
        comparisons.push({ fraction, maximum, mean: total / a.length });
        await info.attach(`table-fade-${fraction}`, { body: actual, contentType: 'image/png' });
        await info.attach(`blurred-reference-${fraction}`, {
          body: reference,
          contentType: 'image/png',
        });
        expect(maximum, 'edge shading must retain the existing appearance').toBeLessThanOrEqual(3);
        expect(total / a.length).toBeLessThan(0.1);
        await root.evaluate((element) => {
          element.style.removeProperty('background-image');
          element.style.removeProperty('box-shadow');
        });
      }
      await info.attach('table-fade-pixel-comparison', {
        body: JSON.stringify(comparisons),
        contentType: 'application/json',
      });
      await expect(root).toHaveAttribute('tabindex', '0');
      await expect(root).toHaveAttribute('role', 'region');
      await expect(page.getByRole('table')).toHaveCount(1);
      await expect(page.getByRole('link', { name: 'Native cell link' })).toBeVisible();
      await root.evaluate((element) => {
        element.scrollLeft = 0;
        element.focus();
      });
      await page.keyboard.press(direction === 'ltr' ? 'ArrowRight' : 'ArrowLeft');
      await expect
        .poll(() => root.evaluate((element) => Math.abs(element.scrollLeft)))
        .toBeGreaterThan(0);
      await expect(root).toBeFocused();
    });
  }
}

test('forced colors retains native scrolling and focus without gradient painting', async ({
  page,
  browserName,
}, info) => {
  test.skip(browserName === 'webkit', 'Playwright WebKit does not emulate forced-colors.');
  await page.emulateMedia({ forcedColors: 'active' });
  const root = await prepare(page, 'light', 'ltr');
  await root.evaluate((element) => {
    element.setAttribute('data-fade-right', 'true');
    element.focus();
  });
  const state = await root.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      forced: matchMedia('(forced-colors: active)').matches,
      background: style.backgroundImage,
      scrollbar: style.scrollbarWidth,
      adjustment: style.forcedColorAdjust,
      outline: Number.parseFloat(style.outlineWidth),
    };
  });
  expect(state.forced).toBe(true);
  expect(state.background).toBe('none');
  // densityの指定はSSR契約で固定する。headless UAのused scrollbar描画は推定しない。
  await info.attach('forced-colors-table-state', {
    body: JSON.stringify(state),
    contentType: 'application/json',
  });
  expect(state.adjustment).toBe('auto');
  expect(state.outline).toBeGreaterThanOrEqual(2);
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => root.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
  await info.attach('forced-colors-table', {
    body: await root.screenshot({ animations: 'disabled' }),
    contentType: 'image/png',
  });
});
