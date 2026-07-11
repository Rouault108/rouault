import { expect, test } from '@playwright/test';

import { e2eNoteFixtures } from './support/note-fixtures.js';

const sourceEntryPath = e2eNoteFixtures.sidebarScrollSource.directPath;
const targetPath = e2eNoteFixtures.sidebarScrollTarget.normalizedPath;

test.describe('Sidebar Selected Item Scroll', () => {
  test('sidebar host を保持したままルート遷移しても破綻しないこと', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 480 });
    await page.goto(sourceEntryPath);
    await expect(page.locator('[data-app-shell-sidebar-host]')).toHaveCount(1);
    await expect(page.locator('layout-sidebar')).toHaveCount(1);
    await expect(page.locator('router-document-host > #main-content')).toHaveCount(1);
    await expect(page.locator('#main-content h1').first()).toHaveText('Sidebar Scroll Source');

    await page
      .locator('#main-content')
      .getByRole('link', { name: 'Sidebar Scroll Target' })
      .click();

    await expect(page).toHaveURL(new RegExp(`${targetPath}/?$`));
    await expect(page.locator('#main-content h1').first()).toHaveText('Sidebar Scroll Target');
    await expect(page.locator('[data-app-shell-sidebar-host]')).toHaveCount(1);
    await expect(page.locator('layout-sidebar')).toHaveCount(1);
    await expect(page.locator('router-document-host > #main-content')).toHaveCount(1);
  });
});
