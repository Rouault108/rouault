import { expect, test, type Page } from '@playwright/test';

const sampleJavascriptPath = '/notes/program/sample-javascript/';

const waitForTocReady = async (page: Page): Promise<void> => {
  await page.locator('layout-toc .desktop ui-toc .toc-link-label').first().waitFor();
};

const readActiveTocLabel = async (page: Page): Promise<string> => {
  const label = page
    .locator('layout-toc .desktop ui-toc a.toc-link.is-active .toc-link-label')
    .first();
  return (await label.textContent())?.trim() ?? '';
};

test.describe('TOC active state follows scroll position', () => {
  test('sample-javascript で本文スクロールに応じて current が更新されること', async ({ page }) => {
    await page.goto(sampleJavascriptPath);
    await waitForTocReady(page);

    await expect.poll(() => readActiveTocLabel(page)).toContain('7.1 配列の生成');

    await page.locator('#72-配列の要素の読み書き').scrollIntoViewIfNeeded();
    await expect.poll(() => readActiveTocLabel(page)).toContain('7.2 配列の要素の読み書き');

    await page.locator('#714-arrayof').scrollIntoViewIfNeeded();
    await expect.poll(() => readActiveTocLabel(page)).toContain('7.1.4 Array.of()');

    await page.locator('#715-arrayfrom').scrollIntoViewIfNeeded();
    await expect.poll(() => readActiveTocLabel(page)).toContain('7.1.5 Array.from()');
  });
});