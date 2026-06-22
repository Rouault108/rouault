import { expect, test } from '@playwright/test';

test.describe('Static pages', () => {
  test('about ページが主要構造まで表示されること', async ({ page }) => {
    await page.goto('/about/');

    const mainContent = page.locator('#main-content');
    const heading = mainContent.getByRole('heading', { level: 1 });

    await expect(heading).toHaveCount(1);
    await expect(heading).toHaveText(/\S/);
    await expect(mainContent.locator('.about-summary[aria-label]')).toBeVisible();
  });

  test('corpora 一覧ページが主要見出しまで表示されること', async ({ page }) => {
    await page.goto('/corpora/');

    await expect(page.locator('#main-content h1').first()).toHaveText('すべてのノート');
    await expect(page.locator('#main-content')).toContainText(
      '公開しているコーパスと最近更新したノートを',
    );
  });

  test('search ページが主要見出しまで表示されること', async ({ page }) => {
    await page.goto('/search/?tag=music');

    await expect(page.locator('#main-content h1').first()).toHaveText('検索');
    await expect(page.locator('#main-content')).toContainText(
      'タグとキーワードを組み合わせ、複数タグは OR / AND を切り替えて探索します。',
    );
  });
});
