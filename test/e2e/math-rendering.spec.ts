import { expect, test } from '@playwright/test';
import { getE2ENoteFixture } from './support/note-fixtures.js';

test.use({ javaScriptEnabled: false });

test('static math keeps layout, MathML and package fonts without JavaScript', async ({ page }) => {
  const failedFonts: string[] = [];
  page.on('response', (response) => {
    if (response.url().includes('KaTeX_') && response.status() !== 200) {
      failedFonts.push(response.url());
    }
  });
  await page.goto(getE2ENoteFixture('note.math-rendering').directPath);
  await expect(page.locator('.katex')).toHaveCount(3);
  await expect(page.locator('.katex-display')).toHaveCount(2);
  await expect(page.locator('.katex-mathml math')).toHaveCount(3);
  await expect(page.locator('.katex-base').first()).toBeVisible();
  // Firefoxのno-JS文書内ではPromiseの解決を待たず、runnerから同期状態を待つ。
  await expect.poll(() => page.evaluate(() => document.fonts.status)).toBe('loaded');
  const rendering = await page.evaluate(() => {
    const fraction = document.querySelector('.frac-line');
    const display = document.querySelector('.katex-display');
    const mathml = document.querySelector('.katex-mathml');
    if (!fraction || !display || !mathml) throw new Error('Missing static math output');
    return {
      fractionBorder: Number.parseFloat(getComputedStyle(fraction).borderBottomWidth),
      display: getComputedStyle(display).display,
      mathmlWidth: mathml.getBoundingClientRect().width,
      loadedFonts: [...document.fonts]
        .filter(
          (font) =>
            font.family.replace(/^["']|["']$/gu, '').startsWith('KaTeX_') &&
            font.status === 'loaded',
        )
        .map((font) => font.family.replace(/^["']|["']$/gu, '')),
    };
  });
  expect(rendering.fractionBorder).toBeGreaterThan(0);
  expect(rendering.display).toBe('block');
  expect(rendering.mathmlWidth).toBeLessThanOrEqual(1);
  expect(rendering.loadedFonts).toEqual(expect.arrayContaining(['KaTeX_Main', 'KaTeX_Math']));
  expect(failedFonts).toEqual([]);
});
