import { expect, test, type Page } from '@playwright/test';

import { e2eNoteFixtures } from './support/note-fixtures.js';

const sidebarSourcePath = e2eNoteFixtures.sidebarScrollSource.directPath;
const codePath = e2eNoteFixtures.code.directPath;
const layoutRich = e2eNoteFixtures.layoutRich;
const layoutRichPath = layoutRich.directPath;
const tocAbsentPath = e2eNoteFixtures.tocAbsent.directPath;

interface NoteChromeState {
  articleHeaderExists: boolean;
  articleHeaderTemplateCount: number;
  articleHeaderHeading: string;
  articleHeaderHasBreadcrumbsJson: boolean;
  tocExists: boolean;
  tocTemplateCount: number;
  tocHasHeadingsJson: boolean;
  tocContentRootId: string;
}

const readNoteChromeState = async (page: Page): Promise<NoteChromeState> =>
  page.evaluate(() => {
    const articleHeader = document.querySelector('ui-article-header');
    const toc = document.querySelector('layout-toc');

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
      tocContentRootId: toc instanceof HTMLElement ? (toc.getAttribute('content-root-id') ?? '') : '',
    };
  });

const expectLayoutRichNoteChromeHostsWithoutJs = async (page: Page): Promise<void> => {
  const state = await readNoteChromeState(page);

  expect(state.articleHeaderExists).toBe(true);
  expect(state.articleHeaderTemplateCount).toBe(0);
  expect(state.articleHeaderHeading).toBe(layoutRich.title);
  expect(state.articleHeaderHasBreadcrumbsJson).toBe(true);

  expect(state.tocExists).toBe(true);
  expect(state.tocTemplateCount).toBe(0);
  expect(state.tocHasHeadingsJson).toBe(true);
  expect(state.tocContentRootId).toBe(layoutRich.contentRootId);

  await expect(page.locator('ui-article-header')).toHaveAttribute('heading', layoutRich.title);
  await expect(page.locator('layout-toc')).toHaveAttribute('content-root-id', layoutRich.contentRootId);

  const headingsJson = await page.locator('layout-toc').getAttribute('headings-json');
  expect(headingsJson).not.toBeNull();
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
    await expect(page.locator('app-router > #main-content')).toHaveCount(1);
    await expect(page.locator('app-router > [data-app-router-announcement]')).toHaveCount(1);
    await expect(page).toHaveURL(sidebarSourcePath);
  });

  test('layout-rich が No-JS でも article header / TOC host と属性ペイロードを初回出力すること', async ({
    page,
  }) => {
    await page.goto(layoutRichPath);

    await expect(page).toHaveURL(layoutRichPath);
    await expect(page.locator('#main-content')).toContainText('このノートは e2e 専用 fixture です。');

    await expectLayoutRichNoteChromeHostsWithoutJs(page);
  });

  test('toc-absent fixture では No-JS でも空の TOC landmark を出力しないこと', async ({ page }) => {
    await page.goto(tocAbsentPath);

    await expect(page.locator('ui-article-header')).toHaveAttribute('heading', 'TOC Absent');
    await expect(page.locator('.note-shell')).toHaveAttribute('data-toc-presence', 'absent');
    await expect(page.locator('.layout-toc-col')).toHaveCount(0);
    await expect(page.locator('layout-toc')).toHaveCount(0);
    await expect(page.locator('aside[aria-label="目次"]')).toHaveCount(0);
  });

  test('layout-rich が狭幅でも本文列を 1文字幅へ潰さないこと', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 900 });
    await page.goto(layoutRichPath);

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

    await expect(page.locator('#main-content')).toContainText('front matter、TOC、code block、table');
  });

  test('ノートページが SSR シェルと本文を初期表示し、app shell sidebar host も出力すること', async ({
    page,
  }) => {
    await page.goto(layoutRichPath);

    await expect(page.locator('app-router > #main-content')).toHaveCount(1);
    await expect(page.locator('app-router > [data-app-router-announcement]')).toHaveCount(1);
    await expect(page.locator('layout-header')).toHaveCount(1);
    await expect(page.locator('[data-app-shell-sidebar-host]')).toHaveCount(1);
    await expect(page.locator('layout-sidebar')).toHaveCount(1);
    await expect(page.locator('layout-toc')).toHaveCount(1);
    await expect(page.locator('ui-article-header')).toHaveCount(1);

    const currentCorpusKey = await page.locator('layout-header').getAttribute('current-corpus-key');
    expect(typeof currentCorpusKey).toBe('string');
    expect(currentCorpusKey?.length ?? 0).toBeGreaterThan(0);

    await expectLayoutRichNoteChromeHostsWithoutJs(page);
  });

  test('コードブロックとテーブルが JavaScript 無効時も読めること', async ({ page }) => {
    await page.goto(layoutRichPath);

    await expect(page.locator('code').first()).toContainText('const values = [1, 2, 3];');
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

  test('ヘッダーがスクロールしても固定され、app shell sidebar host が存在しても崩れないこと', async ({
    page,
  }) => {
    await page.goto(layoutRichPath);

    const before = await page.locator('layout-header').boundingBox();
    expect(before).not.toBeNull();

    await page.evaluate(() => {
      window.scrollTo({ top: 1200, behavior: 'instant' });
    });

    const after = await page.locator('layout-header').boundingBox();
    expect(after).not.toBeNull();
    expect(Math.round(after?.y ?? -1)).toBe(Math.round(before?.y ?? -1));
    await expect(page.locator('[data-app-shell-sidebar-host]')).toHaveCount(1);
  });
});