import { expect, test, type Page } from '@playwright/test';

import { e2eNoteFixtures } from './support/note-fixtures.js';

const sidebarSourcePath = e2eNoteFixtures.sidebarScrollSource.directPath;
const codePath = e2eNoteFixtures.code.directPath;
const layoutRich = e2eNoteFixtures.layoutRich;
const layoutRichPath = layoutRich.directPath;
const tocAbsentPath = e2eNoteFixtures.tocAbsent.directPath;
const aboutPath = '/about/';

interface NoteChromeState {
  articleHeaderExists: boolean;
  articleHeaderHeading: string;
  breadcrumbLabels: string[];
  tocExists: boolean;
  tocLabels: string[];
}

const readNoteChromeState = async (page: Page): Promise<NoteChromeState> =>
  page.evaluate(() => {
    const articleHeader = document.querySelector<HTMLElement>('.article-header');
    const toc = document.querySelector<HTMLElement>('.layout-toc');

    return {
      articleHeaderExists: articleHeader instanceof HTMLElement,
      articleHeaderHeading:
        articleHeader?.querySelector<HTMLElement>('.article-header__heading')?.textContent?.trim() ??
        '',
      breadcrumbLabels: Array.from(
        articleHeader?.querySelectorAll<HTMLElement>('.article-header__breadcrumb-item') ?? [],
      )
        .map((element) => element.textContent?.trim() ?? '')
        .filter((text) => text.length > 0),
      tocExists: toc instanceof HTMLElement,
      tocLabels: Array.from(toc?.querySelectorAll<HTMLElement>('.layout-toc__link-label') ?? [])
        .map((element) => element.textContent?.trim() ?? '')
        .filter((text) => text.length > 0),
    };
  });

const expectLayoutRichNoteChromeHostsWithoutJs = async (page: Page): Promise<void> => {
  const state = await readNoteChromeState(page);

  expect(state.articleHeaderExists).toBe(true);
  expect(state.articleHeaderHeading).toBe(layoutRich.title);
  expect(state.breadcrumbLabels.join('\n')).toContain('Notes');

  expect(state.tocExists).toBe(true);
  expect(state.tocLabels.join('\n')).toContain('1. 導入');

  await expect(page.locator('.article-header__heading')).toHaveText(layoutRich.title);
  await expect
    .poll(async () => await page.locator('.layout-toc [data-toc-link]').count())
    .toBeGreaterThan(0);
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
    await expect(page.locator('#main-content')).toContainText(
      'このノートは e2e 専用 fixture です。',
    );

    await expectLayoutRichNoteChromeHostsWithoutJs(page);
  });

  test('layout-rich は狭幅 No-JS では sidebar raw nav を paint しないこと', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 900 });
    await page.goto(layoutRichPath);

    const state = await page.evaluate(() => {
      const sidebarColumn = document.querySelector<HTMLElement>('[data-app-shell-sidebar-host]');
      const sidebarHost = document.querySelector<HTMLElement>(
        'layout-sidebar[data-sidebar-boot-state="ssr"]',
      );
      const rawNav = sidebarHost?.querySelector<HTMLElement>('[data-sidebar-nav]');

      if (
        !(sidebarColumn instanceof HTMLElement) ||
        !(sidebarHost instanceof HTMLElement) ||
        !(rawNav instanceof HTMLElement)
      ) {
        return null;
      }

      const sidebarColumnStyle = getComputedStyle(sidebarColumn);
      const sidebarHostStyle = getComputedStyle(sidebarHost);

      return {
        bootState: sidebarHost.getAttribute('data-sidebar-boot-state'),
        hostVisibility: sidebarHostStyle.visibility,
        hostPointerEvents: sidebarHostStyle.pointerEvents,
        columnOverflowX: sidebarColumnStyle.overflowX,
        columnOverflowY: sidebarColumnStyle.overflowY,
        columnWidth: Math.round(sidebarColumn.getBoundingClientRect().width),
        hostWidth: Math.round(sidebarHost.getBoundingClientRect().width),
        horizontalOverflow:
          document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });

    expect(state).not.toBeNull();
    expect(state?.bootState).toBe('ssr');
    expect(state?.hostVisibility).toBe('hidden');
    expect(state?.hostPointerEvents).toBe('none');
    expect(state?.columnOverflowX).toBe('hidden');
    expect(state?.columnOverflowY).toBe('hidden');
    expect(state?.columnWidth ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(1);
    expect(state?.hostWidth ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(1);
    expect(state?.horizontalOverflow ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(1);

    await expect(page.locator('layout-sidebar[data-sidebar-boot-state="ssr"]')).toHaveCount(1);
    await expect(
      page.locator('layout-sidebar[data-sidebar-boot-state="ssr"] [data-sidebar-nav]'),
    ).toBeHidden();
  });

  test('toc-absent fixture では No-JS でも空の TOC landmark を出力しないこと', async ({ page }) => {
    await page.goto(tocAbsentPath);

    await expect(page.locator('.article-header__heading')).toHaveText('TOC Absent');
    await expect(page.locator('.note-shell')).toHaveAttribute('data-toc-presence', 'absent');
    await expect(page.locator('.layout-toc-col')).toHaveCount(0);
    await expect(page.locator('[data-layout-toc-nav]')).toHaveCount(0);
    await expect(page.locator('aside[aria-label="目次"]')).toHaveCount(0);
  });

  test('about ページは狭幅 No-JS でも TOC DOM を出力せず、本文幅と横溢れ契約を維持すること', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 900 });
    await page.goto(aboutPath);

    const state = await page.evaluate(() => {
      const shell = document.querySelector<HTMLElement>('.about-shell');
      const mainCol = shell?.querySelector<HTMLElement>(':scope > .about-main-col');
      const tocCol = shell?.querySelector<HTMLElement>(':scope > .layout-toc-col');
      const tocNav = shell?.querySelector<HTMLElement>('[data-layout-toc-nav]');
      const layoutTocController = document.querySelector<HTMLElement>('layout-toc-controller');
      const mobilePanel = document.querySelector<HTMLElement>('[data-layout-toc-mobile-panel]');
      const mobileNav = document.querySelector<HTMLElement>('[data-layout-toc-mobile-nav]');

      const createsPseudoSpacer = (element: HTMLElement): boolean =>
        ['::before', '::after'].some((pseudo) => {
          const style = getComputedStyle(element, pseudo);
          const hasContent = style.content !== 'none' && style.content !== 'normal' && style.content !== '""';
          const blockSize = Number.parseFloat(style.blockSize || style.height || '0');
          return hasContent && blockSize > 0;
        });

      const isZeroLengthToken = (value: string): boolean =>
        value === '0' || value === '0px' || value === '0rem' || value === '0em' || value === '0%';

      const splitCssFunctionArguments = (value: string): string[] =>
        value
          .split(',')
          .map((part) => part.trim())
          .filter((part) => part.length > 0);

      const hasNonZeroSecondComponent = (value: string): boolean => {
        const parts = value.split(/\s+/u).filter((part) => part.length > 0);
        const secondComponent = parts[1];
        return secondComponent !== undefined && !isZeroLengthToken(secondComponent);
      };

      const hasBlockAxisTranslateOffset = (value: string): boolean => {
        const normalized = value.trim().toLowerCase();
        if (normalized.length === 0 || normalized === 'none' || normalized === '0' || normalized === '0px') {
          return false;
        }
        if (normalized.startsWith('translatey(')) {
          const args = splitCssFunctionArguments(normalized.slice('translatey('.length, -1));
          const y = args[0];
          return y !== undefined && !isZeroLengthToken(y);
        }
        if (normalized.startsWith('translate3d(')) {
          const args = splitCssFunctionArguments(normalized.slice('translate3d('.length, -1));
          const y = args[1];
          return y !== undefined && !isZeroLengthToken(y);
        }
        if (normalized.startsWith('translate(')) {
          const args = splitCssFunctionArguments(normalized.slice('translate('.length, -1));
          const y = args[1];
          if (y !== undefined) return !isZeroLengthToken(y);
          return hasNonZeroSecondComponent(args[0] ?? '');
        }
        if (normalized.startsWith('translatex(')) return false;
        return hasNonZeroSecondComponent(normalized);
      };

      const hasBlockAxisTransformOffset = (value: string): boolean => {
        const normalized = value.trim().toLowerCase();
        if (normalized.length === 0 || normalized === 'none') return false;
        for (const match of normalized.matchAll(/translatey\(([^)]*)\)/gu)) {
          const args = splitCssFunctionArguments(match[1] ?? '');
          const y = args[0];
          if (y !== undefined && !isZeroLengthToken(y)) return true;
        }
        for (const match of normalized.matchAll(/translate3d\(([^)]*)\)/gu)) {
          const args = splitCssFunctionArguments(match[1] ?? '');
          const y = args[1];
          if (y !== undefined && !isZeroLengthToken(y)) return true;
        }
        for (const match of normalized.matchAll(/translate\(([^)]*)\)/gu)) {
          const args = splitCssFunctionArguments(match[1] ?? '');
          const y = args[1];
          if (y !== undefined && !isZeroLengthToken(y)) return true;
        }
        for (const match of normalized.matchAll(/matrix\(([^)]*)\)/gu)) {
          const args = splitCssFunctionArguments(match[1] ?? '');
          const y = args[5];
          if (y !== undefined && !isZeroLengthToken(y)) return true;
        }
        for (const match of normalized.matchAll(/matrix3d\(([^)]*)\)/gu)) {
          const args = splitCssFunctionArguments(match[1] ?? '');
          const y = args[13];
          if (y !== undefined && !isZeroLengthToken(y)) return true;
        }
        return false;
      };

      const hasVisualOffset = (style: CSSStyleDeclaration): boolean => {
        const insetBlockStart = style.insetBlockStart.trim();
        const insetBlockEnd = style.insetBlockEnd.trim();
        const insetBlock = style.getPropertyValue('inset-block').trim();
        const inset = style.getPropertyValue('inset').trim();
        const top = style.top.trim();
        const bottom = style.bottom.trim();
        const isNonZeroOffset = (value: string): boolean =>
          value.length > 0 &&
          value !== 'auto' &&
          value.split(/\s+/u).some((part) => part !== '0' && part !== '0px' && part !== 'auto');
        return (
          hasBlockAxisTransformOffset(style.transform) ||
          hasBlockAxisTranslateOffset(style.translate) ||
          (style.position !== 'static' && isNonZeroOffset(insetBlockStart)) ||
          (style.position !== 'static' && isNonZeroOffset(insetBlockEnd)) ||
          (style.position !== 'static' && isNonZeroOffset(insetBlock)) ||
          (style.position !== 'static' && isNonZeroOffset(inset)) ||
          (style.position !== 'static' && isNonZeroOffset(top)) ||
          (style.position !== 'static' && isNonZeroOffset(bottom))
        );
      };

      const hasBlockStartBorder = (style: CSSStyleDeclaration): boolean =>
        Number.parseFloat(style.borderBlockStartWidth || style.borderTopWidth || '0') > 0 &&
        style.borderBlockStartStyle !== 'none' &&
        style.borderTopStyle !== 'none';

      const createsTopDistance = (element: HTMLElement | null | undefined): boolean => {
        if (!(element instanceof HTMLElement)) return false;
        const style = getComputedStyle(element);
        return (
          Number.parseFloat(style.marginBlockStart || style.marginTop || '0') > 0 ||
          Number.parseFloat(style.paddingBlockStart || style.paddingTop || '0') > 0 ||
          createsPseudoSpacer(element) ||
          hasVisualOffset(style) ||
          hasBlockStartBorder(style)
        );
      };

      if (!(shell instanceof HTMLElement) || !(mainCol instanceof HTMLElement)) {
        return {
          shellExists: shell instanceof HTMLElement,
          mainColExists: mainCol instanceof HTMLElement,
          shellDisplay: null,
          shellPaddingBlockStart: null,
          shellPaddingBlockEnd: null,
          shellPaddingInlineStart: null,
          shellPaddingInlineEnd: null,
          shellMarginBlockStart: null,
          shellMarginBlockEnd: null,
          shellMaxWidth: null,
          shellMaxInlineSize: null,
          shellHasPseudoSpacer: null,
          shellHasVisualOffset: null,
          shellHasBlockStartBorder: null,
          mainColWidth: null,
          mainColContentWidth: null,
          mainPaddingInlineStart: null,
          mainPaddingInlineEnd: null,
          mainCenter: null,
          viewportCenter: null,
          resolvedContentMaxWidth: null,
          mainPaddingBlockStart: null,
          resolvedPaddingBlockStart: null,
          mainColHasPseudoSpacer: null,
          mainColHasVisualOffset: null,
          mainColHasBlockStartBorder: null,
          aboutContentAddsTopDistance: null,
          aboutHeroAddsTopDistance: null,
          aboutContentFirstChildAddsTopDistance: null,
          aboutHeroFirstChildAddsTopDistance: null,
          tocColExists: tocCol instanceof HTMLElement,
          tocNavExists: tocNav instanceof HTMLElement,
          layoutTocControllerExists: layoutTocController instanceof HTMLElement,
          mobilePanelExists: mobilePanel instanceof HTMLElement,
          mobileNavExists: mobileNav instanceof HTMLElement,
          horizontalOverflow:
            document.documentElement.scrollWidth - document.documentElement.clientWidth,
        };
      }

      const mainStyle = getComputedStyle(mainCol);
      const shellStyle = getComputedStyle(shell);
      const paddingInlineStart = Number.parseFloat(mainStyle.paddingInlineStart || '0');
      const paddingInlineEnd = Number.parseFloat(mainStyle.paddingInlineEnd || '0');
      const mainRect = mainCol.getBoundingClientRect();
      const probe = document.createElement('div');
      probe.style.position = 'absolute';
      probe.style.visibility = 'hidden';
      probe.style.pointerEvents = 'none';
      probe.style.paddingBlockStart = 'var(--about-content-padding-block-start)';
      mainCol.append(probe);
      const resolvedPaddingBlockStart = getComputedStyle(probe).paddingBlockStart;
      probe.remove();

      const maxWidthProbe = document.createElement('div');
      maxWidthProbe.style.position = 'absolute';
      maxWidthProbe.style.visibility = 'hidden';
      maxWidthProbe.style.pointerEvents = 'none';
      maxWidthProbe.style.inlineSize = 'var(--about-content-max-inline-size, 52rem)';
      mainCol.append(maxWidthProbe);
      const resolvedContentMaxWidth = Math.round(maxWidthProbe.getBoundingClientRect().width);
      maxWidthProbe.remove();

      const aboutContent = mainCol.querySelector<HTMLElement>(':scope > .about-content');
      const aboutHero = aboutContent?.querySelector<HTMLElement>(':scope > .about-hero');
      const aboutContentFirstChild =
        aboutContent?.firstElementChild instanceof HTMLElement ? aboutContent.firstElementChild : null;
      const aboutHeroFirstChild =
        aboutHero?.firstElementChild instanceof HTMLElement ? aboutHero.firstElementChild : null;

      return {
        shellExists: true,
        mainColExists: true,
        shellDisplay: shellStyle.display,
        shellPaddingBlockStart: shellStyle.paddingBlockStart,
        shellPaddingBlockEnd: shellStyle.paddingBlockEnd,
        shellPaddingInlineStart: shellStyle.paddingInlineStart,
        shellPaddingInlineEnd: shellStyle.paddingInlineEnd,
        shellMarginBlockStart: shellStyle.marginBlockStart,
        shellMarginBlockEnd: shellStyle.marginBlockEnd,
        shellMaxWidth: shellStyle.maxWidth,
        shellMaxInlineSize: shellStyle.maxInlineSize,
        shellHasPseudoSpacer: createsPseudoSpacer(shell),
        shellHasVisualOffset: hasVisualOffset(shellStyle),
        shellHasBlockStartBorder: hasBlockStartBorder(shellStyle),
        mainColWidth: Math.round(mainRect.width),
        mainColContentWidth: Math.round(mainRect.width - paddingInlineStart - paddingInlineEnd),
        mainPaddingInlineStart: Math.round(paddingInlineStart),
        mainPaddingInlineEnd: Math.round(paddingInlineEnd),
        mainCenter: Math.round(mainRect.left + mainRect.width / 2),
        viewportCenter: Math.round(document.documentElement.clientWidth / 2),
        resolvedContentMaxWidth,
        mainPaddingBlockStart: mainStyle.paddingBlockStart,
        resolvedPaddingBlockStart,
        mainColHasPseudoSpacer: createsPseudoSpacer(mainCol),
        mainColHasVisualOffset: hasVisualOffset(mainStyle),
        mainColHasBlockStartBorder: hasBlockStartBorder(mainStyle),
        aboutContentAddsTopDistance: createsTopDistance(aboutContent),
        aboutHeroAddsTopDistance: createsTopDistance(aboutHero),
        aboutContentFirstChildAddsTopDistance: createsTopDistance(aboutContentFirstChild),
        aboutHeroFirstChildAddsTopDistance: createsTopDistance(aboutHeroFirstChild),
        tocColExists: tocCol instanceof HTMLElement,
        tocNavExists: tocNav instanceof HTMLElement,
        layoutTocControllerExists: layoutTocController instanceof HTMLElement,
        mobilePanelExists: mobilePanel instanceof HTMLElement,
        mobileNavExists: mobileNav instanceof HTMLElement,
        horizontalOverflow:
          document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });

    expect(state?.shellExists).toBe(true);
    expect(state?.mainColExists).toBe(true);
    expect(state?.shellDisplay).not.toBe('grid');
    expect(state?.shellDisplay).not.toBe('flex');
    expect(state?.shellDisplay).not.toBe('contents');
    expect(state?.shellDisplay).not.toBe('none');
    expect(state?.shellPaddingBlockStart).toBe('0px');
    expect(state?.shellPaddingBlockEnd).toBe('0px');
    expect(state?.shellPaddingInlineStart).toBe('0px');
    expect(state?.shellPaddingInlineEnd).toBe('0px');
    expect(state?.shellMarginBlockStart).toBe('0px');
    expect(state?.shellMarginBlockEnd).toBe('0px');
    expect(state?.shellMaxWidth).toBe('none');
    expect(state?.shellMaxInlineSize).toBe('none');
    expect(state?.shellHasPseudoSpacer).toBe(false);
    expect(state?.shellHasVisualOffset).toBe(false);
    expect(state?.shellHasBlockStartBorder).toBe(false);
    expect(state?.mainColWidth ?? 0).toBeGreaterThan(240);
    expect(state?.mainColContentWidth ?? 0).toBeGreaterThan(240);
    expect(state?.mainColContentWidth ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(
      (state?.resolvedContentMaxWidth ?? 0) + 1,
    );
    expect(state?.mainColWidth).toBe(
      (state?.mainColContentWidth ?? 0) +
        (state?.mainPaddingInlineStart ?? 0) +
        (state?.mainPaddingInlineEnd ?? 0),
    );
    expect(Math.abs((state?.mainCenter ?? 0) - (state?.viewportCenter ?? 0))).toBeLessThanOrEqual(1);
    expect(state?.mainPaddingBlockStart).toBe(state?.resolvedPaddingBlockStart);
    expect(state?.mainColHasPseudoSpacer).toBe(false);
    expect(state?.mainColHasVisualOffset).toBe(false);
    expect(state?.mainColHasBlockStartBorder).toBe(false);
    expect(state?.aboutContentAddsTopDistance).toBe(false);
    expect(state?.aboutHeroAddsTopDistance).toBe(false);
    expect(state?.aboutContentFirstChildAddsTopDistance).toBe(false);
    expect(state?.aboutHeroFirstChildAddsTopDistance).toBe(false);

    expect(state?.tocColExists).toBe(false);
    expect(state?.tocNavExists).toBe(false);
    expect(state?.layoutTocControllerExists).toBe(false);
    expect(state?.mobilePanelExists).toBe(false);
    expect(state?.mobileNavExists).toBe(false);
    expect(state?.horizontalOverflow ?? 0).toBeLessThanOrEqual(1);

    await expect(page.locator('.about-shell')).toHaveCount(1);
    await expect(page.locator('.about-main-col')).toHaveCount(1);
    await expect(page.locator('.about-shell > .layout-toc-col')).toHaveCount(0);
    await expect(page.locator('.about-shell [data-layout-toc-nav]')).toHaveCount(0);
    await expect(page.locator('layout-toc-controller')).toHaveCount(0);
    await expect(page.locator('aside[aria-label="目次"]')).toHaveCount(0);
    await expect(page.locator('[data-layout-toc-mobile-panel]')).toHaveCount(0);
    await expect(page.locator('[data-layout-toc-mobile-nav]')).toHaveCount(0);
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

    await expect(page.locator('#main-content')).toContainText(
      'note shell / front matter / TOC / hash navigation / code block / table',
    );
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
    await expect(page.locator('[data-layout-toc-nav]')).toHaveCount(1);
    await expect(page.locator('.article-header')).toHaveCount(1);

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
    await page.goto('/tags/Programming/');

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

  test('ヘッダーがスクロール後も上端に残り、app shell sidebar host が存在しても崩れないこと', async ({
    page,
  }) => {
    await page.goto(layoutRichPath);

    const readHeaderVisibilityState = async (): Promise<{
      top: number | null;
      sticky: string | null;
      visibleAtViewportTop: boolean;
    }> =>
      await page.locator('layout-header').evaluate((element) => {
        const rect = element.getBoundingClientRect();
        const topElement = document.elementFromPoint(window.innerWidth / 2, 12);
        return {
          top: Number.isFinite(rect.top) ? rect.top : null,
          sticky: getComputedStyle(element).position,
          visibleAtViewportTop:
            topElement instanceof Element && topElement.closest('layout-header') === element,
        };
      });

    const before = await readHeaderVisibilityState();
    expect(before.top).not.toBeNull();
    expect(before.sticky).toBe('sticky');

    await page.evaluate(() => {
      window.scrollTo({ top: 1200, behavior: 'instant' });
    });

    const after = await readHeaderVisibilityState();
    expect(after.top).not.toBeNull();
    expect(after.sticky).toBe('sticky');
    expect(after.visibleAtViewportTop).toBe(true);
    await expect(page.locator('[data-app-shell-sidebar-host]')).toHaveCount(1);
  });
});
