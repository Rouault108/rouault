import { expect, test, type Locator } from '@playwright/test';

import { e2eNoteFixtures } from './support/note-fixtures.js';

const articleHeaderStaticLayoutPath = e2eNoteFixtures.articleHeaderStaticLayout.directPath;
const articleHeaderLinkDecorationPath = e2eNoteFixtures.articleHeaderLinkDecoration.directPath;

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

test('static structural links are not underlined while prose and source links are underlined', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(articleHeaderLinkDecorationPath);

  const breadcrumbLink = page.locator('.article-header__breadcrumb-link').first();
  const tagLink = page.locator('.article-header__tag-link').first();
  const tocLink = page.locator('[data-layout-toc-nav] .layout-toc__link').first();
  const sourceLink = page.locator('.article-header__source-link').first();
  const proseLink = page.locator('.prose a[href]:not(.heading-anchor)').first();

  await expect(breadcrumbLink).toBeVisible();
  await expect(tagLink).toBeVisible();
  await expect(tocLink).toBeVisible();
  await expect(sourceLink).toBeVisible();
  await expect(proseLink).toBeVisible();

  await expect(breadcrumbLink).toHaveCSS('text-decoration-line', 'none');
  await expect(tagLink).toHaveCSS('text-decoration-line', 'none');
  await expect(tocLink).toHaveCSS('text-decoration-line', 'none');
  await expect(sourceLink).toHaveCSS('text-decoration-line', 'underline');
  await expect(proseLink).toHaveCSS('text-decoration-line', 'underline');
});

test('static article-header tag uses subtle filled chip contract', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(articleHeaderLinkDecorationPath);

  const tagLink = page.locator('.article-header__tag-link').first();
  await expect(tagLink).toBeVisible();

  const beforeHover = await tagLink.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      backgroundColor: style.backgroundColor,
      color: style.color,
      borderTopLeftRadius: style.borderTopLeftRadius,
      borderTopRightRadius: style.borderTopRightRadius,
      borderBottomRightRadius: style.borderBottomRightRadius,
      borderBottomLeftRadius: style.borderBottomLeftRadius,
      minBlockSize: style.minBlockSize,
    };
  });

  expect(beforeHover.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
  expect(beforeHover.borderTopLeftRadius).toBe('4px');
  expect(beforeHover.borderTopRightRadius).toBe('4px');
  expect(beforeHover.borderBottomRightRadius).toBe('4px');
  expect(beforeHover.borderBottomLeftRadius).toBe('4px');
  expect(beforeHover.minBlockSize).toBe('20px');

  await tagLink.hover();

  const afterHover = await tagLink.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      backgroundColor: style.backgroundColor,
      color: style.color,
    };
  });

  expect(afterHover.backgroundColor).toBe(beforeHover.backgroundColor);
  expect(afterHover.color).toBe(beforeHover.color);
});

test('static structural links stay not underlined on hover', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(articleHeaderLinkDecorationPath);

  const breadcrumbLink = page.locator('.article-header__breadcrumb-link').first();
  const tagLink = page.locator('.article-header__tag-link').first();
  const tocLink = page.locator('[data-layout-toc-nav] .layout-toc__link').first();

  await breadcrumbLink.hover();
  await expect(breadcrumbLink).toHaveCSS('text-decoration-line', 'none');

  await tagLink.hover();
  await expect(tagLink).toHaveCSS('text-decoration-line', 'none');

  await tocLink.hover();
  await expect(tocLink).toHaveCSS('text-decoration-line', 'none');
});
