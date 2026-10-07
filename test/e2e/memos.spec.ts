import { expect, test } from '@playwright/test';
test('memo index, body, notes and history preserve the shared shell and TOC ownership', async ({
  page,
}) => {
  await page.goto('/memos/');
  await expect(page.getByRole('heading', { name: 'メモ', exact: true })).toBeVisible();
  await page.getByRole('link', { name: '合成メモ', exact: true }).click();
  await expect(page).toHaveURL(/\/memos\/example$/u);
  await expect(page.locator('.note-shell')).toHaveAttribute('data-sidebar-presence', 'absent');
  await expect(page.locator('[data-layout-toc-nav]')).toBeVisible();
  await page.locator('aside[data-layout-sidebar-root]').evaluate((node) => {
    node.setAttribute('data-synthetic-identity', 'persistent');
  });
  await page.getByRole('link', { name: '別の合成メモ', exact: true }).click();
  await expect(page.locator('.note-shell')).toHaveAttribute('data-toc-presence', 'absent');
  await expect(page.locator('aside[data-layout-sidebar-root]')).toHaveAttribute(
    'data-synthetic-identity',
    'persistent',
  );
  await page.goBack();
  await expect(page).toHaveURL(/\/memos\/example$/u);
  await expect(page.locator('[data-layout-toc-nav]')).toBeVisible();
  await page.goForward();
  await expect(page).toHaveURL(/\/memos\/no-headings$/u);
  await page.reload();
  await expect(
    page.getByRole('heading', { name: '見出しのない合成メモ', exact: true }),
  ).toBeVisible();
  await page.goto('/notes/testing/reader-basic');
  await expect(page.locator('.note-shell')).toHaveAttribute('data-sidebar-presence', 'present');
  await page
    .locator('[data-layout-footer]')
    .getByRole('link', { name: 'メモ', exact: true })
    .click();
  await expect(page).toHaveURL(/\/memos\/$/u);
  await expect(page.locator('aside[data-layout-sidebar-root] [data-sidebar-nav]')).toHaveCount(0);
});
test('memo mobile TOC works through the existing header and keyboard contracts', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/memos/example');
  const trigger = page.locator('header[data-layout-header] [data-toc-trigger]');
  await expect(trigger).toHaveAttribute('data-toc-trigger-interactive', 'true');
  await trigger.focus();
  await trigger.press('Enter');
  await expect(page.locator('[data-layout-toc-mobile-panel]')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-layout-toc-mobile-panel]')).toBeHidden();
});
test.describe('memo no-JS reading', () => {
  test.use({ javaScriptEnabled: false });
  test('dedicated list and body remain readable with ordinary navigation', async ({ page }) => {
    await page.goto('/memos/');
    await page.getByRole('link', { name: '合成メモ', exact: true }).click();
    await expect(page.getByRole('heading', { name: '合成メモ', exact: true })).toBeVisible();
    await expect(page.getByText('検証専用の合成本文です。')).toBeVisible();
    await expect(page.getByRole('link', { name: '別の合成メモ', exact: true })).toBeVisible();
    await expect(
      page.locator('[data-layout-footer]').getByRole('link', { name: 'メモ', exact: true }),
    ).toBeVisible();
  });
});
