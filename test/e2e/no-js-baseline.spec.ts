import { expect, test, type Page } from '@playwright/test';

const sidebarSourcePath = '/notes/testing/sidebar-scroll/group-01/source/';
const codePath = '/notes/testing/code/';
const sampleJavascriptPath = '/notes/program/sample-javascript/';

interface NoteChromeState {
  articleHeaderExists: boolean;
  articleHeaderTemplateCount: number;
  articleHeaderHeading: string;
  articleHeaderHasBreadcrumbsJson: boolean;
  tocExists: boolean;
  tocTemplateCount: number;
  tocHasHeadingsJson: boolean;
  tocContentRootId: string;
  fixedSidebarExists: boolean;
  overlaySidebarExists: boolean;
}

const readNoteChromeState = async (page: Page): Promise<NoteChromeState> =>
  page.evaluate(() => {
    const articleHeader = document.querySelector('ui-article-header');
    const toc = document.querySelector('layout-toc');
    const fixedSidebar = document.querySelector('.layout-sidebar-col layout-sidebar');
    const overlaySidebar = document.querySelector('layout-sidebar.layout-sidebar-overlay');

    const countDeclarativeShadowRootTemplates = (element: Element | null): number => {
      if (!(element instanceof Element)) {
        return -1;
      }

      return Array.from(element.children).filter((child) => {
        return (
          child instanceof HTMLTemplateElement &&
          (child.hasAttribute('shadowrootmode') || child.hasAttribute('shadowroot'))
        );
      }).length;
    };

    return {
      articleHeaderExists: articleHeader instanceof HTMLElement,
      articleHeaderTemplateCount: countDeclarativeShadowRootTemplates(articleHeader),
      articleHeaderHeading:
        articleHeader instanceof HTMLElement ? (articleHeader.getAttribute('heading') ?? '') : '',
      articleHeaderHasBreadcrumbsJson:
        articleHeader instanceof HTMLElement && articleHeader.hasAttribute('breadcrumbs-json'),
      tocExists: toc instanceof HTMLElement,
      tocTemplateCount: countDeclarativeShadowRootTemplates(toc),
      tocHasHeadingsJson: toc instanceof HTMLElement && toc.hasAttribute('headings-json'),
      tocContentRootId:
        toc instanceof HTMLElement ? (toc.getAttribute('content-root-id') ?? '') : '',
      fixedSidebarExists: fixedSidebar instanceof HTMLElement,
      overlaySidebarExists: overlaySidebar instanceof HTMLElement,
    };
  });

const expectSampleJavascriptNoteChromeHostsWithoutJs = async (page: Page): Promise<void> => {
  const state = await readNoteChromeState(page);

  expect(state.articleHeaderExists).toBe(true);
  expect(state.articleHeaderTemplateCount).toBe(0);
  expect(state.articleHeaderHeading).toBe('JavaScriptの配列');
  expect(state.articleHeaderHasBreadcrumbsJson).toBe(true);

  expect(state.tocExists).toBe(true);
  expect(state.tocTemplateCount).toBe(0);
  expect(state.tocHasHeadingsJson).toBe(true);
  expect(state.tocContentRootId).toBe('note-content-program-sample-javascript');

  expect(state.fixedSidebarExists).toBe(true);
  expect(state.overlaySidebarExists).toBe(true);

  await expect(page.locator('ui-article-header')).toHaveAttribute('heading', 'JavaScriptの配列');
  await expect(page.locator('layout-toc')).toHaveAttribute(
    'content-root-id',
    'note-content-program-sample-javascript',
  );
  await expect(page.locator('layout-toc')).toHaveAttribute('headings-json', /7\.1 配列の生成/);
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

  test('sample-javascript が No-JS でも article header / TOC host と属性ペイロードを初回出力すること', async ({
    page,
  }) => {
    await page.goto(sampleJavascriptPath);

    await expect(page).toHaveURL(sampleJavascriptPath);
    await expect(page.locator('#main-content')).toContainText(
      'JavaScriptの配列には型はないため、配列の要素にはどの型の値でも格納できる。',
    );

    await expectSampleJavascriptNoteChromeHostsWithoutJs(page);
  });

  test('sample-javascript が狭幅でも本文列を 1文字幅へ潰さないこと', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 900 });
    await page.goto(sampleJavascriptPath);

    const state = await page.evaluate(() => {
      const article = document.querySelector('#main-content article');
      const prose = article?.querySelector('.prose');

      if (!(article instanceof HTMLElement) || !(prose instanceof HTMLElement)) {
        return null;
      }

      return {
        articleWidth: Math.round(article.getBoundingClientRect().width),
        proseWidth: Math.round(prose.getBoundingClientRect().width),
        horizontalOverflow:
          document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });

    expect(state).not.toBeNull();
    expect(state?.articleWidth ?? 0).toBeGreaterThan(240);
    expect(state?.proseWidth ?? 0).toBeGreaterThan(240);
    expect(state?.horizontalOverflow ?? 0).toBeLessThanOrEqual(1);

    await expect(page.locator('#main-content')).toContainText(
      'JavaScriptの配列には型はないため、配列の要素にはどの型の値でも格納できる。',
    );
  });

  test('ノートページが SSR シェルと本文を初期表示し、fixed / overlay 両方の sidebar host を出力すること', async ({
    page,
  }) => {
    await page.goto(sampleJavascriptPath);

    await expect(page.locator('layout-header')).toHaveCount(1);
    await expect(page.locator('.layout-sidebar-col layout-sidebar')).toHaveCount(1);
    await expect(page.locator('layout-sidebar.layout-sidebar-overlay')).toHaveCount(1);
    await expect(page.locator('layout-sidebar')).toHaveCount(2);
    await expect(page.locator('layout-toc')).toHaveCount(1);
    await expect(page.locator('ui-article-header')).toHaveCount(1);

    await expect(page.locator('layout-header')).toHaveAttribute('current-corpus-key', 'program');

    await expectSampleJavascriptNoteChromeHostsWithoutJs(page);
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

  test('ホームページでは現行ヒーロー文言を初期表示し、ヘッダー中央ラベルを出さないこと', async ({
    page,
  }) => {
    await page.goto('/');

    await expect(page.locator('#main-content h1').first()).toHaveText(
      '調べたことと考えたことを、ここに置いています。',
    );
    await expect(page.locator('#main-content')).toContainText(
      '技術とその周辺についての個人ノートです。公開しているものを、新しい順に並べています。',
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

  test('1024px 未満では fixed sidebar 列を消し、overlay host を別レイヤーへ退避すること', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1000, height: 900 });
    await page.goto(sidebarSourcePath);

    const layoutState = await page.evaluate(() => {
      const main = document.querySelector('#main-content article');
      const sidebarColumn = document.querySelector('.layout-sidebar-col');
      const overlayHost = document.querySelector('layout-sidebar.layout-sidebar-overlay');

      return {
        hasMainArticle: main instanceof HTMLElement,
        hasSidebarColumn: sidebarColumn instanceof HTMLElement,
        hasOverlayHost: overlayHost instanceof HTMLElement,
        sidebarDisplay:
          sidebarColumn instanceof HTMLElement ? getComputedStyle(sidebarColumn).display : null,
        overlayDisplay:
          overlayHost instanceof HTMLElement ? getComputedStyle(overlayHost).display : null,
        horizontalOverflow:
          document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });

    expect(layoutState.hasMainArticle).toBe(true);
    expect(layoutState.hasSidebarColumn).toBe(true);
    expect(layoutState.hasOverlayHost).toBe(true);
    expect(layoutState.sidebarDisplay).toBe('none');
    expect(layoutState.overlayDisplay).toBe('block');
    expect(layoutState.horizontalOverflow).toBeLessThanOrEqual(1);
  });
});
