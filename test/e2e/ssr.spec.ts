import { expect, test } from '@playwright/test';

const beethovenPath = '/notes/music/classical/beethoven/symphony-9';
const sortingPath = '/notes/computer-science/algorithms/sorting';
const beethovenEntryPath = `${beethovenPath}/`;
const sortingEntryPath = `${sortingPath}/`;

test.describe('SSR Rendering', () => {
  test.use({ javaScriptEnabled: false });

  test('末尾 slash なしの直接アクセスでもノートページを初期表示できること', async ({ page }) => {
    await page.goto(beethovenPath);

    await expect(page.locator('#main-content h1').first()).toHaveText('交響曲第9番 ニ短調 作品125');
    await expect(page).toHaveURL(beethovenPath);
  });

  test('ノートページが Declarative Shadow DOM と本文を初期表示すること', async ({ page }) => {
    await page.goto(beethovenEntryPath);

    await expect(page.locator('#main-content h1').first()).toHaveText('交響曲第9番 ニ短調 作品125');
    await expect(page.locator('text=楽章構成').first()).toBeVisible();
    await expect(page.locator('text=第4楽章「歓喜の歌」').first()).toBeVisible();
    await expect(page.locator('ui-article-header')).toContainText('music');
    await expect(page.locator('ui-article-header')).toContainText('classical');

    const hasHeaderShadowRoot = await page
      .locator('layout-header')
      .evaluate((element) => element.shadowRoot !== null);
    const hasSidebarShadowRoot = await page
      .locator('layout-sidebar')
      .evaluate((element) => element.shadowRoot !== null);
    const hasTocShadowRoot = await page
      .locator('layout-toc')
      .evaluate((element) => element.shadowRoot !== null);
    const hasArticleHeaderShadowRoot = await page
      .locator('ui-article-header')
      .evaluate((element) => element.shadowRoot !== null);

    expect(hasHeaderShadowRoot).toBe(true);
    expect(hasSidebarShadowRoot).toBe(true);
    expect(hasTocShadowRoot).toBe(true);
    expect(hasArticleHeaderShadowRoot).toBe(true);
  });

  test('コードブロックとテーブルが JavaScript 無効時も読めること', async ({ page }) => {
    await page.goto(sortingEntryPath);

    await expect(page.locator('#main-content h1').first()).toHaveText('ソートアルゴリズム比較');
    await expect(page.locator('text=クイックソートの実装例').first()).toBeVisible();
    await expect(page.locator('code').first()).toContainText('function quickSort');
    await expect(page.locator('table').first()).toContainText('アルゴリズム');

    const hasCodeBlockShadowRoot = await page
      .locator('ui-code-block')
      .first()
      .evaluate((element) => element.shadowRoot !== null);
    const hasTableShadowRoot = await page
      .locator('ui-table')
      .first()
      .evaluate((element) => element.shadowRoot !== null);

    expect(hasCodeBlockShadowRoot).toBe(true);
    expect(hasTableShadowRoot).toBe(true);
  });

  test('タグページが JavaScript 無効時も search-page として初期表示されること', async ({ page }) => {
    await page.goto('/tags/music/');

    await expect(page.locator('#main-content h1').first()).toHaveText('#music');
    await expect(page.locator('#main-content')).toContainText(
      'このタグに属するノートを起点に、検索語や追加タグで探索を広げられます。',
    );
    await expect(page.locator('ui-card').first()).toContainText('交響曲第9番 ニ短調 作品125');

    const hasCardShadowRoot = await page
      .locator('ui-card')
      .first()
      .evaluate((element) => element.shadowRoot !== null);

    expect(hasCardShadowRoot).toBe(true);
  });

  test('ホームページではヘッダー中央ラベルを出さず、検索導線を少しコンパクトにすること', async ({
    page,
  }) => {
    await page.goto('/');

    await expect(page.locator('#main-content h1').first()).toHaveText('静かに入り、静かに読み進める。');
    await expect(page.locator('#main-content')).toContainText(
      '公開している個人ノートの入口です。新しいものから辿れます。',
    );

    const headerText = await page.locator('layout-header').evaluate((element) => element.shadowRoot?.textContent ?? '');
    expect(headerText).not.toContain('ホーム');
  });

  test('ヘッダーとサイドバーがスクロールしても固定されること', async ({ page }) => {
    await page.goto(beethovenEntryPath);

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
    expect(Math.abs((sidebarAfter?.y ?? 0) - (headerBefore?.height ?? 0))).toBeLessThan(2);
    expect(Math.abs((tocAfter?.y ?? 0) - (headerBefore?.height ?? 0))).toBeLessThan(2);
  });
});
