import { expect, test } from '@playwright/test';

const beethovenPath = '/notes/music/classical/beethoven/symphony-9';
const sortingPath = '/notes/computer-science/algorithms/sorting';
const beethovenEntryPath = `${beethovenPath}/`;
const sortingEntryPath = `${sortingPath}/`;

test.describe('No-JS baseline', () => {
  test.use({ javaScriptEnabled: false });

  test('direct 404.html load works without JavaScript', async ({ page }) => {
    await page.goto('/404.html');

    await expect(
      page.getByRole('heading', { level: 1, name: 'このページは見つかりませんでした' }),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: '検索ページへ' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'このサイトについて' })).toBeVisible();
  });

  test('末尾 slash なしの直接アクセスでもノートページを初期表示できること', async ({ page }) => {
    await page.goto(beethovenPath);

    await expect(page.locator('#main-content h1').first()).toHaveText('交響曲第9番 ニ短調');
    await expect(page).toHaveURL(beethovenPath);
  });

  test('ノートページが Declarative Shadow DOM と本文を初期表示すること', async ({ page }) => {
    await page.goto(beethovenEntryPath);

    await expect(page.locator('#main-content h1').first()).toHaveText('交響曲第9番 ニ短調');
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
    await expect(page.locator('[data-table-root]').first()).toBeVisible();
    await expect(page.locator('[data-table-root] table').first()).toContainText('アルゴリズム');

    await expect(page.locator('[data-code-block-root]').first()).toBeVisible();
    await expect(
      page.locator('[data-code-block-root] .code-surface-filename').first(),
    ).toBeVisible();
  });

  test('code group が JavaScript 無効時に全パネル縦積みで読めること', async ({ page }) => {
    await page.goto(sortingEntryPath);

    await expect(page.locator('section[data-code-group] pre[data-code-block]')).toHaveCount(2);
    await expect(page.locator('section[data-code-group] .code-group-stack-label')).toHaveCount(2);
    await expect(page.locator('section[data-code-group] .code-group-header')).toBeHidden();
    await expect(page.locator('section[data-code-group]')).toContainText('TypeScript');
    await expect(page.locator('section[data-code-group]')).toContainText('JavaScript');
  });

  test('タグページが JavaScript 無効時も search-page として初期表示されること', async ({
    page,
  }) => {
    await page.goto('/tags/music/');

    await expect(page.locator('#main-content h1').first()).toHaveText('#music');
    await expect(page.locator('#main-content')).toContainText(
      'このタグに属するノートを起点に、検索語や追加タグで探索を広げられます。',
    );
    await expect(page.locator('ui-card').first()).toContainText('交響曲第9番 ニ短調');

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

  test('狭い画面では sidebar が折りたたまれて本文を覆わないこと', async ({ page }) => {
    await page.setViewportSize({ width: 744, height: 900 });
    await page.goto(beethovenEntryPath);

    const sidebarState = await page.locator('layout-sidebar').evaluate((host) => {
      const layoutSidebar = host as HTMLElement;
      const uiSidebar = layoutSidebar.shadowRoot?.querySelector('ui-sidebar');
      const shell = uiSidebar?.shadowRoot?.querySelector('ui-sidebar-shell');
      const toggle = layoutSidebar.shadowRoot?.querySelector<HTMLElement>('.floating-toggle');

      return {
        sidebarState: uiSidebar?.getAttribute('data-state') ?? null,
        shellState: shell?.getAttribute('data-state') ?? null,
        toggleExpanded: toggle?.getAttribute('aria-expanded') ?? null,
      };
    });

    expect(sidebarState.sidebarState).toBe('collapsed');
    expect(sidebarState.shellState).toBe('collapsed');
    expect(sidebarState.toggleExpanded).toBe('false');
  });
});
