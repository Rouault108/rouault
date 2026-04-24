import { expect, test, type Locator } from '@playwright/test';

import { e2eNoteFixtures } from './support/note-fixtures.js';

const articleHeaderStaticLayoutPath = e2eNoteFixtures.articleHeaderStaticLayout.directPath;

const horizontalOverflow = async (locator: Locator): Promise<number> => {
  return locator.evaluate((element) => element.scrollWidth - element.clientWidth);
};

test('mobile 幅で static article-header が本文列を押し広げないこと', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(articleHeaderStaticLayoutPath);

  const articleHeader = page.locator('[data-article-header]');
  const articleColumn = page.locator('article.layout-main-col.container-reading');
  const noteShell = page.locator('.note-shell');
  const documentRoot = page.locator('html');
  const body = page.locator('body');

  await expect(articleHeader).toBeVisible();
  await expect(articleColumn).toBeVisible();

  expect(await horizontalOverflow(articleHeader)).toBeLessThanOrEqual(1);
  expect(await horizontalOverflow(articleColumn)).toBeLessThanOrEqual(1);
  expect(await horizontalOverflow(noteShell)).toBeLessThanOrEqual(1);
  expect(await horizontalOverflow(documentRoot)).toBeLessThanOrEqual(1);
  expect(await horizontalOverflow(body)).toBeLessThanOrEqual(1);
});

test('reader chrome 条件で TOC presence が成立していること', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(articleHeaderStaticLayoutPath);

  await expect(page.locator('.note-shell[data-toc-presence="present"]')).toBeVisible();
  await expect(page.locator('[data-layout-toc-root]')).toHaveCount(1);
  await expect(page.locator('[data-layout-toc-nav] .layout-toc__item')).toHaveCount(1);
});

test('static article-header の source link focus-visible が keyboard focus で視認可能であること', async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name.includes('webkit'),
    'WebKit のリンク Tab focus は実行環境設定に依存するため、keyboard focus-visible は Chromium project で固定する。',
  );

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(articleHeaderStaticLayoutPath);

  const sourceLink = page.locator('.article-header__source-link');
  await expect(sourceLink).toBeVisible();

  for (let index = 0; index < 20; index += 1) {
    await page.keyboard.press('Tab');

    const isFocused = await sourceLink.evaluate((element) => element === document.activeElement);
    if (isFocused) {
      break;
    }
  }

  await expect(sourceLink).toBeFocused();

  const outlineWidth = await sourceLink.evaluate((element) => {
    return getComputedStyle(element).outlineWidth;
  });

  expect(outlineWidth).not.toBe('0px');
});
