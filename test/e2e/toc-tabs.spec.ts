import { expect, test, type Page } from '@playwright/test';

import { e2eNoteFixtures } from './support/note-fixtures.js';

const path = e2eNoteFixtures.interactive.directPath;

const tocItem = (page: Page, id: string) =>
  page.locator(`[data-layout-toc-nav] .layout-toc__item[data-heading-id="${id}"]`);

const expectInteractiveCanaryContent = async (page: Page): Promise<void> => {
  await expect(page.locator('#main-content')).toContainText('JavaScriptのHello, World!');
  await expect(page.locator('#main-content')).toContainText('RustのHello, World!');
  await expect(page.locator('#main-content')).toContainText('概要の内容');
  await expect(page.locator('#main-content')).toContainText('詳細の内容');
};

test.describe('TOC follows active tab', () => {
  test('初期表示でも interactive canary の本文が欠落しないこと', async ({ page }) => {
    await page.goto(path);
    await expectInteractiveCanaryContent(page);
  });

  test('?tab=rust 直アクセス時も本文が欠落せず URL を保持すること', async ({ page }) => {
    await page.goto(`${path}?tab=rust`);
    await expect(page).toHaveURL(`${path}?tab=rust`);
    await expectInteractiveCanaryContent(page);
  });

  test('公開 URL を Rust へ切り替えても本文が欠落しないこと', async ({ page }) => {
    await page.goto(path);
    await expectInteractiveCanaryContent(page);

    await page.goto(`${path}?tab=rust`);
    await expect(page).toHaveURL(`${path}?tab=rust`);
    await expectInteractiveCanaryContent(page);
  });

  test('タブ内見出しへの hash 直アクセスでも本文が欠落せず URL を保持すること', async ({
    page,
  }) => {
    await page.goto(`${path}#rustのhello-world`);
    await expect(page).toHaveURL(`${path}?tab=rust#rustのhello-world`);
    await expectInteractiveCanaryContent(page);
  });

  test('矛盾する query/hash 直アクセスでは hash 側 tab を選択し URL を正規化すること', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`${path}?tab=rust#javascriptのhello-world`);

    await expect(page).toHaveURL(`${path}?tab=javascript#javascriptのhello-world`);
    await expect(page.getByRole('tab', { name: 'JavaScript' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(tocItem(page, 'javascriptのhello-world')).toBeVisible();
    await expect(tocItem(page, 'rustのhello-world')).toBeHidden();
    await expectInteractiveCanaryContent(page);
  });

  test('desktop TOC は現在の tab scope の見出しだけを表示すること', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(path);

    await expect(tocItem(page, 'javascriptのhello-world')).toBeVisible();
    await expect(tocItem(page, 'rustのhello-world')).toBeHidden();
    await expect(tocItem(page, '概要の内容')).toBeVisible();
    await expect(tocItem(page, '詳細の内容')).toBeHidden();

    await page.getByRole('tab', { name: 'Rust' }).click();
    await expect(tocItem(page, 'rustのhello-world')).toBeVisible();
    await expect(tocItem(page, 'javascriptのhello-world')).toBeHidden();

    await page.getByRole('tab', { name: '詳細' }).click();
    await expect(tocItem(page, '詳細の内容')).toBeVisible();
    await expect(tocItem(page, '概要の内容')).toBeHidden();
  });
});
