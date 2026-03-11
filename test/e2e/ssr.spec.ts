import { expect, test } from '@playwright/test';

const beethovenPath = '/notes/music/classical/beethoven/symphony-9';
const sortingPath = '/notes/computer-science/algorithms/sorting';
const beethovenEntryPath = `${beethovenPath}/`;
const sortingEntryPath = `${sortingPath}/`;

test.describe('SSR Rendering', () => {
  test.use({ javaScriptEnabled: false });

  test('ノートページが Declarative Shadow DOM と本文を初期表示すること', async ({ page }) => {
    await page.goto(beethovenEntryPath);

    await expect(page.locator('#main-content h1').first()).toHaveText(
      '交響曲第9番 ニ短調 作品125',
    );
    await expect(page.locator('text=楽章構成').first()).toBeVisible();
    await expect(page.locator('text=第4楽章「歓喜の歌」').first()).toBeVisible();

    const hasHeaderShadowRoot = await page.locator('layout-header').evaluate(
      (element) => element.shadowRoot !== null,
    );
    const hasSidebarShadowRoot = await page.locator('layout-sidebar').evaluate(
      (element) => element.shadowRoot !== null,
    );
    const hasTocShadowRoot = await page.locator('layout-toc').evaluate(
      (element) => element.shadowRoot !== null,
    );
    const hasArticleHeaderShadowRoot = await page.locator('ui-article-header').evaluate(
      (element) => element.shadowRoot !== null,
    );

    expect(hasHeaderShadowRoot).toBe(true);
    expect(hasSidebarShadowRoot).toBe(true);
    expect(hasTocShadowRoot).toBe(true);
    expect(hasArticleHeaderShadowRoot).toBe(true);
  });

  test('コードブロックとテーブルが JavaScript 無効時も読めること', async ({ page }) => {
    await page.goto(sortingEntryPath);

    await expect(page.locator('#main-content h1').first()).toHaveText(
      'ソートアルゴリズム比較',
    );
    await expect(page.locator('text=クイックソートの実装例').first()).toBeVisible();
    await expect(page.locator('code').first()).toContainText('function quickSort');
    await expect(page.locator('table').first()).toContainText('アルゴリズム');

    const hasCodeBlockShadowRoot = await page.locator('ui-code-block').first().evaluate(
      (element) => element.shadowRoot !== null,
    );
    const hasTableShadowRoot = await page.locator('ui-table').first().evaluate(
      (element) => element.shadowRoot !== null,
    );

    expect(hasCodeBlockShadowRoot).toBe(true);
    expect(hasTableShadowRoot).toBe(true);
  });
});
