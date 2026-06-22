import { expect, test } from '@playwright/test';

test.describe('Static pages', () => {
  test('about ページが主要見出しまで表示されること', async ({ page }) => {
    await page.goto('/about/');

    await expect(page.locator('#main-content h1').first()).toHaveText('Rouaultの目的と設計方針');
    await expect(page.locator('#main-content')).toContainText(
      '個人ノートを静かに読み、長期的に整理・再編集・参照するための設計メモ。',
    );
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
