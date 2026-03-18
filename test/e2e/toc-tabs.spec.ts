import { expect, test } from '@playwright/test';

const path = '/notes/testing/tabs-test/';

test.describe('TOC follows active tab', () => {
  test('初期表示ではアクティブタブ内の見出しだけ TOC に出ること', async ({ page }) => {
    await page.goto(path);

    const toc = page.locator('.layout-toc-col');

    await expect(toc).toContainText('JavaScriptのHello, World!');
    await expect(toc).not.toContainText('RustのHello, World!');
  });

  test('?tab=rust 直アクセス時は Rust タブが初期選択され TOC も同期すること', async ({
    page,
  }) => {
    await page.goto(`${path}?tab=rust`);

    await expect(page.getByRole('tab', { name: 'Rust' })).toHaveAttribute(
      'aria-selected',
      'true',
    );

    const toc = page.locator('.layout-toc-col');
    await expect(toc).toContainText('RustのHello, World!');
    await expect(toc).not.toContainText('JavaScriptのHello, World!');
  });

  test('タブ切り替えで TOC の見出しも切り替わること', async ({ page }) => {
    await page.goto(path);

    await page.getByRole('tab', { name: 'Rust' }).click();

    const toc = page.locator('.layout-toc-col');

    await expect(toc).toContainText('RustのHello, World!');
    await expect(toc).not.toContainText('JavaScriptのHello, World!');
  });

  test('非表示タブ内見出しへの hash 直アクセス時は対象タブを開いて TOC も同期すること', async ({
    page,
  }) => {
    await page.goto(`${path}#rustのhello-world`);

    await expect(page.getByRole('tab', { name: 'Rust' })).toHaveAttribute(
      'aria-selected',
      'true',
    );

    const toc = page.locator('.layout-toc-col');
    await expect(toc).toContainText('RustのHello, World!');
    await expect(toc).not.toContainText('JavaScriptのHello, World!');
  });
});