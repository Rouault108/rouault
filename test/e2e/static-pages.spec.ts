import { expect, test } from '@playwright/test';

test.describe('Static pages', () => {
  test('about ページが主要見出しまで表示されること', async ({ page }) => {
    await page.goto('/about/');

    await expect(page.locator('#main-content h1').first()).toHaveText(
      '静かに読むための、独立したページ骨格',
    );
    await expect(page.locator('#main-content')).toContainText('Rouaultはどういうものなのか');
  });

  test('corpora 一覧ページが主要見出しまで表示されること', async ({ page }) => {
    await page.goto('/corpora/');

    await expect(page.locator('#main-content h1').first()).toHaveText('すべてのノート');
    await expect(page.locator('#main-content')).toContainText(
      '公開しているコーパスと最近更新したノートを',
    );
  });

  test('search ページが主要見出しまで表示されること', async ({ page }) => {
    await page.goto('/search?tag=music');

    await expect(page.locator('#main-content h1').first()).toHaveText('検索');
    await expect(page.locator('#main-content')).toContainText(
      'タグとキーワードを組み合わせ、複数タグは OR / AND を切り替えて探索します。',
    );
  });
});
