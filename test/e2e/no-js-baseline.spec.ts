import { expect, test, type Page } from '@playwright/test';

const sidebarSourcePath = '/notes/testing/sidebar-scroll/group-01/source/';
const codePath = '/notes/testing/code/';
const sampleJavascriptPath = '/notes/program/sample-javascript/';

const readNoteChromeState = async (
  page: Page,
): Promise<{
  articleHeaderExists: boolean;
  articleHeaderShadowRoot: boolean;
  articleHeaderTemplateCount: number;
  articleHeaderHeight: number;
  articleHeaderText: string;
  tocExists: boolean;
  tocShadowRoot: boolean;
  tocTemplateCount: number;
  tocHeight: number;
  tocLabels: string[];
}> =>
  page.evaluate(() => {
    const articleHeader = document.querySelector('ui-article-header');
    const toc = document.querySelector('layout-toc');

    const readShadowText = (element: Element | null): string => {
      if (!(element instanceof HTMLElement)) {
        return '';
      }

      return (element.shadowRoot?.textContent ?? '').trim();
    };

    const readTocLabels = (element: Element | null): string[] => {
      if (!(element instanceof HTMLElement)) {
        return [];
      }

      const root = element.shadowRoot ?? element;

      return Array.from(root.querySelectorAll('.toc-link-label'))
        .map((node) => node.textContent?.trim() ?? '')
        .filter((text) => text.length > 0);
    };

    return {
      articleHeaderExists: articleHeader instanceof HTMLElement,
      articleHeaderShadowRoot:
        articleHeader instanceof HTMLElement && articleHeader.shadowRoot !== null,
      articleHeaderTemplateCount:
        articleHeader instanceof Element
          ? Array.from(articleHeader.children).filter((child) => {
              return (
                child instanceof HTMLTemplateElement &&
                (child.hasAttribute('shadowrootmode') || child.hasAttribute('shadowroot'))
              );
            }).length
          : -1,
      articleHeaderHeight:
        articleHeader instanceof HTMLElement
          ? Math.round(articleHeader.getBoundingClientRect().height)
          : -1,
      articleHeaderText: readShadowText(articleHeader),
      tocExists: toc instanceof HTMLElement,
      tocShadowRoot: toc instanceof HTMLElement && toc.shadowRoot !== null,
      tocTemplateCount:
        toc instanceof Element
          ? Array.from(toc.children).filter((child) => {
              return (
                child instanceof HTMLTemplateElement &&
                (child.hasAttribute('shadowrootmode') || child.hasAttribute('shadowroot'))
              );
            }).length
          : -1,
      tocHeight: toc instanceof HTMLElement ? Math.round(toc.getBoundingClientRect().height) : -1,
      tocLabels: readTocLabels(toc),
    };
  });

const expectSampleJavascriptNoteChromeVisibleWithoutJs = async (page: Page): Promise<void> => {
  const state = await readNoteChromeState(page);

  expect(state.articleHeaderExists).toBe(true);
  expect(state.articleHeaderShadowRoot).toBe(true);
  expect(state.articleHeaderTemplateCount).toBe(0);
  expect(state.articleHeaderHeight).toBeGreaterThan(0);
  expect(state.articleHeaderText).toContain('JavaScriptの配列');
  expect(state.articleHeaderText).toContain('javascript');
  expect(state.articleHeaderText).toContain('programming');

  expect(state.tocExists).toBe(true);
  expect(state.tocShadowRoot).toBe(true);
  expect(state.tocTemplateCount).toBe(0);
  expect(state.tocHeight).toBeGreaterThan(0);
  expect(state.tocLabels).toContain('7.1 配列の生成');
  expect(state.tocLabels).toContain('7.2 配列の要素の読み書き');

  await expect(page.locator('ui-article-header')).toHaveAttribute('heading', 'JavaScriptの配列');
  await expect(page.locator('layout-toc .toc-link-label').first()).toBeVisible();
  await expect(page.locator('layout-toc')).toContainText('7.1 配列の生成');
};

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

    await expect(
      page.getByRole('heading', { level: 1, name: 'Sidebar Scroll Source' }).first(),
    ).toBeVisible();
    await expect(page).toHaveURL(sidebarSourcePath);
  });

  test('sample-javascript が SSR 済みの front matter と TOC を初回表示すること', async ({
    page,
  }) => {
    await page.goto(sampleJavascriptPath);

    await expect(page).toHaveURL(sampleJavascriptPath);
    await expect(page.locator('#main-content')).toContainText(
      'JavaScriptの配列には型はないため、配列の要素にはどの型の値でも格納できる。',
    );

    await expectSampleJavascriptNoteChromeVisibleWithoutJs(page);
  });

  test('ノートページが SSR シェルと本文を初期表示し、note chrome が inert host に退化していないこと', async ({
    page,
  }) => {
    await page.goto(sampleJavascriptPath);

    await expect(page.locator('layout-header')).toHaveCount(1);
    await expect(page.locator('layout-sidebar')).toHaveCount(1);
    await expect(page.locator('layout-toc')).toHaveCount(1);
    await expect(page.locator('ui-article-header')).toHaveCount(1);

    const layoutHeaderText = await page
      .locator('layout-header')
      .evaluate((element) => element.shadowRoot?.textContent ?? '');
    expect(layoutHeaderText.length).toBeGreaterThan(0);

    await expectSampleJavascriptNoteChromeVisibleWithoutJs(page);
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

  test('タグページが JavaScript 無効時も search-page host を初期配置すること', async ({ page }) => {
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