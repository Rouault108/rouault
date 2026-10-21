import { expect, test } from '@playwright/test';

import { e2eNoteFixtures } from './support/note-fixtures.js';
import { headerMenuTriggerSelector } from './support/header-contract.js';

const layoutRich = e2eNoteFixtures.layoutRich;

test.describe('header no-JS', () => {
  test.use({ javaScriptEnabled: false });

  test('narrow note page は hidden header trigger と可視の本文リンクを持つこと', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1023, height: 760 });
    await page.goto(layoutRich.directPath);

    await expect(
      page.locator('header[data-layout-header] [data-layout-sidebar-toggle]'),
    ).toBeHidden();
    const helper = page.locator('[data-layout-sidebar-main-link]');
    await expect(helper).toBeVisible();
    await expect(helper).toHaveAttribute('href', '#main-content');
    await expect(page.locator('[data-layout-sidebar-root] nav')).toBeVisible();
    await expect(page.locator('[data-layout-sidebar-disclosure]')).toHaveCount(0);
  });

  test('本文リンクはnative fragmentで本文へscrollしkeyboard focusを渡すこと', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(layoutRich.directPath);
    const helper = page.locator('[data-layout-sidebar-main-link]');
    await helper.focus();
    await helper.press('Enter');
    await expect(page).toHaveURL(/#main-content$/u);
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
    await expect(page.locator('#main-content')).toBeFocused();
  });

  test('desktop note page は hydration 前の静的 CSS で sidebar toggle を隠すこと', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1024, height: 760 });
    await page.goto(layoutRich.directPath);

    await expect(
      page.locator('header[data-layout-header] [data-layout-sidebar-toggle]'),
    ).toBeHidden();
    await expect(page.locator('[data-layout-sidebar-main-link]')).toBeHidden();
    await expect(page.locator('[data-layout-sidebar-root] nav')).toBeVisible();
  });

  test('検索リンクは JS 無効時も検索ページへ通常遷移すること', async ({ page }) => {
    await page.goto('/about/');
    const trigger = page.locator('header[data-layout-header] [data-search-dialog-trigger]');
    await expect(trigger).toHaveAttribute('href', '/search/');
    await expect(trigger).toHaveAttribute('aria-controls', 'global-search-dialog');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await trigger.click();

    await expect(page).toHaveURL(/\/search\/$/u);
    await expect(page.locator('#main-content h1').first()).toHaveText('検索');
  });

  test('TOC trigger は JS 無効時の fallback href と static aria-controls を維持すること', async ({
    page,
  }) => {
    await page.goto(layoutRich.directPath);

    const trigger = page.locator('header[data-layout-header] [data-toc-trigger]');
    const staticTocRootId = await trigger.getAttribute('data-toc-static-root-id');
    expect(staticTocRootId).not.toBeNull();

    await expect(trigger).toHaveAttribute('href', `#${staticTocRootId ?? ''}`);
    await expect(trigger).toHaveAttribute('aria-controls', staticTocRootId ?? '');
    await expect(page.locator(`#${staticTocRootId ?? ''}`)).toHaveCount(1);

    await page.goto(`${layoutRich.directPath}#${staticTocRootId ?? ''}`);
    await expect(page).toHaveURL(new RegExp(`#${staticTocRootId ?? ''}$`, 'u'));
    await expect(page.locator(`#${staticTocRootId ?? ''}`)).toHaveCount(1);
  });

  test('corpus link は JS 無効時も通常リンクとして遷移すること', async ({ page }) => {
    await page.goto('/about/');

    await page.locator(headerMenuTriggerSelector('corpus')).click();
    const link = page
      .locator('header[data-layout-header] [data-header-menu="corpus"] [data-header-menu-item]')
      .first();
    const href = await link.getAttribute('href');
    expect(href).not.toBeNull();
    const expectedUrl = new URL(href ?? '/', page.url()).href;

    await link.click();

    await expect(page).toHaveURL(expectedUrl);
  });
});
