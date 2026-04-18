import { expect, test, type Page } from '@playwright/test';

import { e2eNoteFixtures } from './support/note-fixtures.js';

const layoutRichPath = e2eNoteFixtures.layoutRich.directPath;
const aboutPath = '/about/';

interface MobileTocLayoutState {
  shellTrackCount: number;
  tocColPosition: string | null;
  tocColLeft: number | null;
  tocColWidth: number | null;
  tocHostLeft: number | null;
  tocHostWidth: number | null;
  mobileBarExists: boolean;
  mobileBarLeft: number | null;
  mobileBarWidth: number | null;
  mobileTitle: string | null;
  horizontalOverflow: number;
}

const waitForLayoutTocHydrated = async (page: Page): Promise<void> => {
  await page.waitForFunction(() => {
    const toc = document.querySelector('layout-toc');
    return toc instanceof HTMLElement && toc.shadowRoot instanceof ShadowRoot;
  });
};

const scrollToRevealMobileSummaryBar = async (page: Page): Promise<void> => {
  await page.evaluate(() => {
    window.scrollTo({ top: 1200, left: 0, behavior: 'instant' });
  });
};

const waitForMobileSummaryBar = async (page: Page): Promise<void> => {
  await expect
    .poll(async () => {
      return await page.evaluate(() => {
        const toc = document.querySelector('layout-toc');
        const bar = toc?.shadowRoot?.querySelector('.mobile-bar');
        return bar instanceof HTMLElement;
      });
    })
    .toBe(true);
};

const readMobileTocLayoutState = async (
  page: Page,
  shellSelector: string,
): Promise<MobileTocLayoutState | null> =>
  await page.evaluate((selector) => {
    const shell = document.querySelector(selector);
    const tocCol = shell?.querySelector(':scope > .layout-toc-col');
    const tocHost = tocCol?.querySelector('layout-toc');
    const mobileBar =
      tocHost instanceof HTMLElement ? tocHost.shadowRoot?.querySelector('.mobile-bar') : null;
    const mobileTitle =
      tocHost instanceof HTMLElement ? tocHost.shadowRoot?.querySelector('.mobile-title') : null;

    if (!(shell instanceof HTMLElement)) {
      return null;
    }
    if (!(tocCol instanceof HTMLElement)) {
      return null;
    }
    if (!(tocHost instanceof HTMLElement)) {
      return null;
    }

    const shellColumns = getComputedStyle(shell).gridTemplateColumns.trim();
    const shellTrackCount = shellColumns.length === 0 ? 0 : shellColumns.split(/\s+/u).length;

    const tocColRect = tocCol.getBoundingClientRect();
    const tocHostRect = tocHost.getBoundingClientRect();
    const mobileBarRect =
      mobileBar instanceof HTMLElement ? mobileBar.getBoundingClientRect() : null;

    return {
      shellTrackCount,
      tocColPosition: getComputedStyle(tocCol).position,
      tocColLeft: Math.round(tocColRect.left),
      tocColWidth: Math.round(tocColRect.width),
      tocHostLeft: Math.round(tocHostRect.left),
      tocHostWidth: Math.round(tocHostRect.width),
      mobileBarExists: mobileBar instanceof HTMLElement,
      mobileBarLeft: mobileBarRect ? Math.round(mobileBarRect.left) : null,
      mobileBarWidth: mobileBarRect ? Math.round(mobileBarRect.width) : null,
      mobileTitle:
        mobileTitle instanceof HTMLElement ? (mobileTitle.textContent?.trim() ?? '') : null,
      horizontalOverflow:
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  }, shellSelector);

const openMobileTocState = async (
  page: Page,
  path: string,
  shellSelector: string,
): Promise<MobileTocLayoutState> => {
  await page.goto(path);
  await waitForLayoutTocHydrated(page);
  await scrollToRevealMobileSummaryBar(page);
  await waitForMobileSummaryBar(page);

  const state = await readMobileTocLayoutState(page, shellSelector);
  expect(state).not.toBeNull();

  if (state === null) {
    throw new Error(`mobile TOC state not found for ${shellSelector}`);
  }

  return state;
};

test.describe('mobile TOC layout contract', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 900 });
  });

  test('about ページが mobile で 1 カラム契約へ落ち、summary bar を右カラムへ押し込まないこと', async ({
    page,
  }) => {
    const state = await openMobileTocState(page, aboutPath, '.about-shell');

    expect(state.shellTrackCount).toBe(1);
    expect(state.tocColPosition).toBe('static');
    expect(state.tocColLeft ?? Number.POSITIVE_INFINITY).toBeLessThan(80);
    expect(state.tocColWidth ?? 0).toBeGreaterThan(240);
    expect(state.tocHostWidth ?? 0).toBeGreaterThan(240);
    expect(state.mobileBarExists).toBe(true);
    expect(state.mobileBarLeft ?? Number.POSITIVE_INFINITY).toBeLessThan(80);
    expect(state.mobileBarWidth ?? 0).toBeGreaterThan(200);
    expect((state.mobileTitle ?? '').length).toBeGreaterThan(0);
    expect(state.horizontalOverflow).toBeLessThanOrEqual(1);
  });

  test('about と note の mobile TOC summary が同じカラム契約に載ること', async ({ page }) => {
    const noteState = await openMobileTocState(page, layoutRichPath, '.note-shell');
    const aboutState = await openMobileTocState(page, aboutPath, '.about-shell');

    expect(noteState.shellTrackCount).toBe(1);
    expect(aboutState.shellTrackCount).toBe(1);
    expect(noteState.tocColPosition).toBe('static');
    expect(aboutState.tocColPosition).toBe('static');

    expect(
      Math.abs((noteState.tocColLeft ?? 0) - (aboutState.tocColLeft ?? 0)),
    ).toBeLessThanOrEqual(24);
    expect(
      Math.abs((noteState.tocColWidth ?? 0) - (aboutState.tocColWidth ?? 0)),
    ).toBeLessThanOrEqual(64);

    expect(
      Math.abs((noteState.mobileBarLeft ?? 0) - (aboutState.mobileBarLeft ?? 0)),
    ).toBeLessThanOrEqual(24);
    expect(
      Math.abs((noteState.mobileBarWidth ?? 0) - (aboutState.mobileBarWidth ?? 0)),
    ).toBeLessThanOrEqual(64);

    expect((noteState.mobileTitle ?? '').length).toBeGreaterThan(0);
    expect((aboutState.mobileTitle ?? '').length).toBeGreaterThan(0);
    expect(noteState.horizontalOverflow).toBeLessThanOrEqual(1);
    expect(aboutState.horizontalOverflow).toBeLessThanOrEqual(1);
  });
});
