import { expect, test } from '@playwright/test';

import { e2eNoteFixtures } from './support/note-fixtures.js';

test.describe('translation fallback without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('summary から翻訳本文を開いて読めること', async ({ page }) => {
    await page.goto(e2eNoteFixtures.interactive.directPath);

    const translation = page.locator('ui-translation').first();
    const fallback = translation.locator('details[data-translation-fallback]');
    const summary = fallback.locator('summary[data-translation-fallback-trigger]');
    const content = fallback.locator('[data-translation-fallback-content]');

    await expect(translation).toHaveCount(1);
    await expect(summary).toHaveText('Je pense, donc je suis.');
    await expect(content).toHaveText('我思う、ゆえに我あり。');
    await expect(content).toBeHidden();

    await summary.click();

    await expect(fallback).toHaveAttribute('open', '');
    await expect(content).toBeVisible();
  });
});
