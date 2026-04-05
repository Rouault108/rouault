import { expect, test } from '@playwright/test';

const sidebarSourcePath = '/notes/testing/sidebar-scroll/group-01/source/';
const codePath = '/notes/testing/code/';
const sampleJavascriptPath = '/notes/program/sample-javascript/';

test.describe('No-JS baseline', () => {
  test.use({ javaScriptEnabled: false });

  test('direct 404.html load works without JavaScript', async ({ page }) => {
    await page.goto('/404.html');

    await expect(
      page.getByRole('heading', { level: 1, name: 'このページは見つかりませんでした' }),
    ).toBeVisible();
    const fallback = page.locator('[data-not-found-fallback]');
    await expect(fallback.getByRole('link', { name: '検索ページへ' })).toBeVisible();
    await expect(fallback.getByRole('link', { name: 'このサイトについて' })).toBeVisible();
  });

  test('ノートページを直接アクセスで初期表示できること', async ({ page }) => {
    await page.goto(sidebarSourcePath);

    await expect(page.getByRole('heading', { level: 1, name: 'Sidebar Scroll Source' }).first()).toBeVisible();
    await expect(page).toHaveURL(sidebarSourcePath);
  });

  test('ノートページが SSR シェルと本文を初期表示すること', async ({ page }) => {
    await page.goto(sidebarSourcePath);

    await expect(page.getByRole('heading', { level: 1, name: 'Sidebar Scroll Source' }).first()).toBeVisible();
    await expect(
      page.locator('text=サイドバーのルート遷移時に現在地へ寄せる挙動を検証するための遷移元です。').first(),
    ).toBeVisible();

    await expect(page.locator('layout-header')).toHaveCount(1);
    await expect(page.locator('layout-sidebar')).toHaveCount(1);
    await expect(page.locator('layout-toc')).toHaveCount(1);
    await expect(page.locator('ui-article-header')).toHaveCount(1);
  });

  test('コードブロックとテーブルが JavaScript 無効時も読めること', async ({ page }) => {
    await page.goto(sampleJavascriptPath);

    await expect(page.locator('code').first()).toContainText('let empty = []');
    await expect(page.locator('[data-table-root]').first()).toBeVisible();
    await expect(page.locator('[data-table-root] table').first()).toContainText('分類');

    await expect(page.locator('[data-code-block-root]').first()).toBeVisible();
  });

  test('code group が JavaScript 無効時に全パネル縦積みで読めること', async ({ page }) => {
    await page.goto(codePath);

    const firstCodeGroup = page.locator('section[data-code-group]').first();
    await expect(firstCodeGroup.locator('pre[data-code-block]')).toHaveCount(2);
    await expect(firstCodeGroup.locator('.code-group-stack-label')).toHaveCount(2);
    await expect(firstCodeGroup.locator('.code-group-header')).toBeHidden();
    await expect(firstCodeGroup).toContainText('正しい例');
    await expect(firstCodeGroup).toContainText('誤り例');
  });

  test('タグページが JavaScript 無効時も search-page host を初期配置すること', async ({
    page,
  }) => {
    await page.goto('/tags/testing/');

    await expect(page.locator('#main-content search-page')).toHaveCount(1);
  });

  test('ホームページではヘッダー中央ラベルを出さず、検索導線を少しコンパクトにすること', async ({
    page,
  }) => {
    await page.goto('/');

    await expect(page.locator('#main-content h1').first()).toHaveText(
      '静かに入り、静かに読み進める。',
    );
    await expect(page.locator('#main-content')).toContainText(
      '公開している個人ノートの入口です。新しいものから辿れます。',
    );

    const headerText = await page
      .locator('layout-header')
      .evaluate((element) => element.shadowRoot?.textContent ?? '');
    expect(headerText).not.toContain('ホーム');
  });

  test('ヘッダーとサイドバーがスクロールしても固定されること', async ({ page }) => {
    await page.goto(sidebarSourcePath);

    const header = page.locator('layout-header');
    const sidebar = page.locator('.layout-sidebar-col');
    const toc = page.locator('.layout-toc-col');

    const headerBefore = await header.boundingBox();
    const sidebarBefore = await sidebar.boundingBox();
    const tocBefore = await toc.boundingBox();

    expect(headerBefore).not.toBeNull();
    expect(sidebarBefore).not.toBeNull();
    expect(tocBefore).not.toBeNull();

    await page.evaluate(() => {
      window.scrollTo({ top: 640, behavior: 'instant' });
    });

    const headerAfter = await header.boundingBox();
    const sidebarAfter = await sidebar.boundingBox();
    const tocAfter = await toc.boundingBox();

    expect(headerAfter).not.toBeNull();
    expect(sidebarAfter).not.toBeNull();
    expect(tocAfter).not.toBeNull();

    expect(Math.abs((headerAfter?.y ?? 0) - (headerBefore?.y ?? 0))).toBeLessThan(1);
    expect(Math.abs((sidebarAfter?.y ?? 0) - (sidebarBefore?.y ?? 0))).toBeLessThan(2);
  });

  test('狭い画面では sidebar が折りたたまれて本文を覆わないこと', async ({ page }) => {
    await page.setViewportSize({ width: 744, height: 900 });
    await page.goto(sidebarSourcePath);

    const layoutState = await page.evaluate(() => {
      const main = document.querySelector('#main-content article');
      const sidebarColumn = document.querySelector('.layout-sidebar-col');
      return {
        hasMainArticle: main instanceof HTMLElement,
        hasSidebarColumn: sidebarColumn instanceof HTMLElement,
        horizontalOverflow:
          document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });

    expect(layoutState.hasMainArticle).toBe(true);
    expect(layoutState.hasSidebarColumn).toBe(true);
    expect(layoutState.horizontalOverflow).toBeLessThanOrEqual(1);
  });
});
