import { expect, test, type Page } from '@playwright/test';

const path = '/notes/testing/interactive/';

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
    await expect(page).toHaveURL(`${path}#rustのhello-world`);
    await expectInteractiveCanaryContent(page);
  });
});
