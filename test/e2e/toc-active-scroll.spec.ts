import { expect, test, type Page } from '@playwright/test';

import { e2eNoteFixtures } from './support/note-fixtures.js';

const sourcePath = e2eNoteFixtures.markdownBasic.directPath;
const sampleJavascriptPath = e2eNoteFixtures.sampleJavascript.directPath;
const sampleJavascriptSpaPath = e2eNoteFixtures.sampleJavascript.normalizedPath;

interface TocSyncState {
  hostActiveId: string | null;
  childPropActiveId: string | null;
  childAttrActiveId: string | null;
  childDomActiveLabel: string | null;
  tocTemplateCount: number;
}

interface ViewportPosition {
  top: number | null;
  bottom: number | null;
  viewportHeight: number;
}

interface ExpectedActiveHeading {
  id: string | null;
  label: string | null;
}

const waitForAppRouterReady = async (page: Page): Promise<void> => {
  await page.waitForFunction(() => {
    const router = document.querySelector('app-router');
    return (
      router instanceof HTMLElement &&
      typeof (router as { navigate?: unknown }).navigate === 'function'
    );
  });
};

const navigateWithAppRouter = async (page: Page, url: string): Promise<void> => {
  await waitForAppRouterReady(page);

  await page.evaluate(async (targetUrl) => {
    const router = document.querySelector('app-router') as
      | (HTMLElement & { navigate: (nextUrl: string) => Promise<unknown> })
      | null;
    if (!router || typeof router.navigate !== 'function') {
      throw new Error('app-router.navigate() が利用できません');
    }

    await router.navigate(targetUrl);
  }, url);
};

const readTocSyncState = async (page: Page): Promise<TocSyncState> =>
  page.evaluate(() => {
    const host = document.querySelector('layout-toc') as
      | (HTMLElement & { _activeId?: string })
      | null;
    const ui = host?.shadowRoot?.querySelector('ui-toc') as
      | (HTMLElement & { activeId?: string })
      | null;

    const tocTemplateCount =
      host instanceof Element
        ? Array.from(host.children).filter((child) => {
            return (
              child instanceof HTMLTemplateElement &&
              (child.hasAttribute('shadowrootmode') || child.hasAttribute('shadowroot'))
            );
          }).length
        : -1;

    return {
      hostActiveId: host?._activeId ?? null,
      childPropActiveId: typeof ui?.activeId === 'string' ? ui.activeId : null,
      childAttrActiveId: ui?.getAttribute('active-id') ?? null,
      childDomActiveLabel:
        ui?.shadowRoot
          ?.querySelector('a.toc-link.is-active .toc-link-label')
          ?.textContent?.trim() ?? null,
      tocTemplateCount,
    };
  });

const waitForTocReady = async (page: Page): Promise<void> => {
  await expect.poll(async () => (await readTocSyncState(page)).tocTemplateCount).toBe(0);
  await expect.poll(async () => (await readTocSyncState(page)).childDomActiveLabel).not.toBeNull();
};

const expectTocSynchronized = async (
  page: Page,
  expectedId: string,
  expectedLabel: string,
): Promise<void> => {
  await expect
    .poll(async () => {
      return await readTocSyncState(page);
    })
    .toEqual({
      hostActiveId: expectedId,
      childPropActiveId: expectedId,
      childAttrActiveId: expectedId,
      childDomActiveLabel: expectedLabel,
      tocTemplateCount: 0,
    });
};

const readExpectedActiveHeadingFromViewport = async (page: Page): Promise<ExpectedActiveHeading> =>
  page.evaluate(() => {
    const article = document.querySelector('article');
    if (!(article instanceof HTMLElement)) {
      return { id: null, label: null };
    }

    const headerHeightRaw = getComputedStyle(document.documentElement)
      .getPropertyValue('--header-height')
      .trim();
    const headerHeight = headerHeightRaw ? Number.parseFloat(headerHeightRaw) : Number.NaN;
    const headerOffset = (Number.isFinite(headerHeight) ? headerHeight : 48) + 32;

    const headings = Array.from(article.querySelectorAll<HTMLElement>('h2[id], h3[id], h4[id]'));
    if (headings.length === 0) {
      return { id: null, label: null };
    }

    let current = headings[0] ?? null;
    for (const heading of headings) {
      if (heading.getBoundingClientRect().top <= headerOffset) {
        current = heading;
        continue;
      }
      break;
    }

    return {
      id: current?.id ?? null,
      label: current?.textContent?.replace(/「.*?」への固定リンク/g, '').trim() ?? null,
    };
  });

const expectTocSynchronizedToViewport = async (page: Page): Promise<void> => {
  const expected = await readExpectedActiveHeadingFromViewport(page);
  expect(expected.id).not.toBeNull();
  expect(expected.label).not.toBeNull();
  await expectTocSynchronized(page, expected.id ?? '', expected.label ?? '');
};

const scrollHeadingToActiveZone = async (page: Page, headingId: string): Promise<void> => {
  await page.evaluate(async (id) => {
    const target = document.getElementById(id);
    if (!(target instanceof HTMLElement)) {
      throw new Error(`heading not found: ${id}`);
    }

    const headerHeightRaw = getComputedStyle(document.documentElement)
      .getPropertyValue('--header-height')
      .trim();
    const headerHeight = headerHeightRaw ? Number.parseFloat(headerHeightRaw) : Number.NaN;
    const headerOffset = (Number.isFinite(headerHeight) ? headerHeight : 48) + 32;
    const desiredTop = headerOffset - 24;
    const waitForFrame = async (): Promise<void> =>
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          resolve();
        });
      });

    // WebKit では instant scroll 後でも数 px ずれることがあるため、
    // レイアウト確定を挟みつつ active 判定閾値を確実に跨ぐまで補正する。
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const currentTop = target.getBoundingClientRect().top;
      if (currentTop <= headerOffset - 8) {
        break;
      }

      const absoluteTop = currentTop + window.scrollY;
      const nextScrollTop = Math.max(0, absoluteTop - desiredTop);

      window.scrollTo({
        top: nextScrollTop,
        left: 0,
        behavior: 'instant',
      });

      await waitForFrame();
      await waitForFrame();
    }
  }, headingId);
};

const readHeadingViewportPosition = async (
  page: Page,
  headingId: string,
): Promise<ViewportPosition> =>
  page.evaluate((id) => {
    const target = document.getElementById(id);
    if (!(target instanceof HTMLElement)) {
      return {
        top: null,
        bottom: null,
        viewportHeight: window.innerHeight,
      };
    }

    const rect = target.getBoundingClientRect();
    return {
      top: Math.round(rect.top),
      bottom: Math.round(rect.bottom),
      viewportHeight: window.innerHeight,
    };
  }, headingId);

test.describe('TOC active state stays synchronized with host state', () => {
  test('sample-javascript 直アクセス時に scroll で host / child / DOM の current が同期して更新されること', async ({
    page,
  }) => {
    await page.goto(sampleJavascriptPath);
    await waitForTocReady(page);

    await expectTocSynchronized(page, '71-配列の生成', '7.1 配列の生成');

    await scrollHeadingToActiveZone(page, '72-配列の要素の読み書き');
    await expectTocSynchronizedToViewport(page);

    await scrollHeadingToActiveZone(page, '714-arrayof');
    await expectTocSynchronizedToViewport(page);

    await scrollHeadingToActiveZone(page, '715-arrayfrom');
    await expectTocSynchronizedToViewport(page);
  });

  test('hash 直アクセス時に初回表示から host / child / DOM の current が一致すること', async ({
    page,
  }) => {
    await page.goto(`${sampleJavascriptPath}#72-配列の要素の読み書き`);
    await waitForTocReady(page);

    // 現実装では hash ターゲット自体は可視範囲に入るが、
    // current は viewport 上端閾値を通過済みの最後の見出し（7.1.5）になる。
    await expectTocSynchronized(page, '715-arrayfrom', '7.1.5 Array.from()');

    const position = await readHeadingViewportPosition(page, '72-配列の要素の読み書き');

    expect(position.top).not.toBeNull();
    expect(position.bottom).not.toBeNull();
    expect(position.top ?? Number.POSITIVE_INFINITY).toBeLessThan(position.viewportHeight);
    expect(position.bottom ?? Number.NEGATIVE_INFINITY).toBeGreaterThan(0);
  });

  test('SPA 遷移で sample-javascript を開いた後も scroll に応じて host / child / DOM の current が同期すること', async ({
    page,
  }) => {
    await page.goto(sourcePath);
    await navigateWithAppRouter(page, sampleJavascriptSpaPath);

    await expect(page).toHaveURL(sampleJavascriptSpaPath);
    await waitForTocReady(page);

    await expectTocSynchronized(page, '71-配列の生成', '7.1 配列の生成');

    await scrollHeadingToActiveZone(page, '72-配列の要素の読み書き');
    await expectTocSynchronized(page, '72-配列の要素の読み書き', '7.2 配列の要素の読み書き');
  });
});