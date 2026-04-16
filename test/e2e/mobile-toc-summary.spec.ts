import { expect, test, type Page } from '@playwright/test';

import { e2eNoteFixtures } from './support/note-fixtures.js';

const aboutPath = '/about/';
const layoutRichPath = e2eNoteFixtures.layoutRich.directPath;

interface MobileSummaryState {
  barExists: boolean;
  barPosition: string | null;
  barTop: number | null;
  barBottom: number | null;
  panelOpen: boolean;
  panelTop: number | null;
  footerTop: number | null;
  viewportHeight: number;
  title: string | null;
}

const waitForLayoutTocHydrated = async (page: Page): Promise<void> => {
  await page.waitForFunction(() => {
    const toc = document.querySelector('layout-toc');
    return toc instanceof HTMLElement && toc.shadowRoot instanceof ShadowRoot;
  });
};

const revealMobileBar = async (page: Page): Promise<void> => {
  await page.evaluate(() => {
    window.scrollTo({ top: 160, left: 0, behavior: 'instant' });
  });
};

const waitForMobileBar = async (page: Page): Promise<void> => {
  await expect
    .poll(async () => {
      return await page.evaluate(() => {
        const toc = document.querySelector('layout-toc');
        return toc?.shadowRoot?.querySelector('.mobile-bar') instanceof HTMLElement;
      });
    })
    .toBe(true);
};

const readMobileSummaryState = async (page: Page): Promise<MobileSummaryState> =>
  await page.evaluate(() => {
    const toc = document.querySelector('layout-toc');
    const bar = toc?.shadowRoot?.querySelector('.mobile-bar');
    const panel = toc?.shadowRoot?.querySelector('.mobile-panel');
    const title = toc?.shadowRoot?.querySelector('.mobile-title');
    const footer = document.querySelector('footer');

    const barRect = bar instanceof HTMLElement ? bar.getBoundingClientRect() : null;
    const panelRect = panel instanceof HTMLElement ? panel.getBoundingClientRect() : null;
    const footerRect = footer instanceof HTMLElement ? footer.getBoundingClientRect() : null;

    return {
      barExists: bar instanceof HTMLElement,
      barPosition: bar instanceof HTMLElement ? getComputedStyle(bar).position : null,
      barTop: barRect ? Math.round(barRect.top) : null,
      barBottom: barRect ? Math.round(barRect.bottom) : null,
      panelOpen: panel instanceof HTMLElement && panel.getAttribute('data-open') === 'true',
      panelTop: panelRect ? Math.round(panelRect.top) : null,
      footerTop: footerRect ? Math.round(footerRect.top) : null,
      viewportHeight: window.innerHeight,
      title: title instanceof HTMLElement ? (title.textContent?.trim() ?? '') : null,
    };
  });

const waitForFooterVisible = async (page: Page): Promise<void> => {
  await expect
    .poll(async () => {
      const state = await readMobileSummaryState(page);
      return state.footerTop !== null && state.footerTop < state.viewportHeight;
    })
    .toBe(true);
};

const scrollFooterIntoView = async (page: Page): Promise<void> => {
  await page.evaluate(() => {
    const footer = document.querySelector('footer');
    if (footer instanceof HTMLElement) {
      const rect = footer.getBoundingClientRect();
      const nextTop = Math.max(0, window.scrollY + rect.bottom - window.innerHeight);

      window.scrollTo({
        top: nextTop,
        left: 0,
        behavior: 'instant',
      });
      return;
    }

    window.scrollTo({
      top: document.documentElement.scrollHeight,
      left: 0,
      behavior: 'instant',
    });
  });

  await waitForFooterVisible(page);

  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            resolve();
          });
        });
      }),
  );
};

test.describe('mobile TOC summary UX', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 900 });
  });

  test('about ページで footer が見えても summary bar が header 直下の fixed 位置を保つこと', async ({
    page,
  }) => {
    await page.goto(aboutPath);
    await waitForLayoutTocHydrated(page);
    await revealMobileBar(page);
    await waitForMobileBar(page);

    const before = await readMobileSummaryState(page);
    expect(before.barExists).toBe(true);
    expect(before.barPosition).toBe('fixed');
    expect(before.barTop).not.toBeNull();
    expect((before.title ?? '').length).toBeGreaterThan(0);

    await scrollFooterIntoView(page);

    const after = await readMobileSummaryState(page);
    expect(after.barExists).toBe(true);
    expect(after.barPosition).toBe('fixed');
    expect(after.footerTop).not.toBeNull();
    expect(after.footerTop ?? Number.POSITIVE_INFINITY).toBeLessThan(after.viewportHeight);
    expect(Math.abs((after.barTop ?? -1) - (before.barTop ?? -1))).toBeLessThanOrEqual(1);
  });

  test('note ページで summary bar の直下から TOC panel が開き、footer 可視時も bar 位置が変わらないこと', async ({
    page,
  }) => {
    await page.goto(layoutRichPath);
    await waitForLayoutTocHydrated(page);
    await revealMobileBar(page);
    await waitForMobileBar(page);

    const before = await readMobileSummaryState(page);
    expect(before.barExists).toBe(true);
    expect(before.barPosition).toBe('fixed');
    expect(before.barTop).not.toBeNull();
    expect(before.barBottom).not.toBeNull();

    await page.evaluate(() => {
      const button = document
        .querySelector('layout-toc')
        ?.shadowRoot?.querySelector<HTMLButtonElement>('.mobile-summary');

      if (!(button instanceof HTMLButtonElement)) {
        throw new Error('mobile summary button が見つかりません');
      }

      button.click();
    });

    await expect
      .poll(async () => {
        return (await readMobileSummaryState(page)).panelOpen;
      })
      .toBe(true);

    const opened = await readMobileSummaryState(page);
    expect(opened.panelOpen).toBe(true);
    expect(opened.panelTop).not.toBeNull();
    expect((opened.panelTop ?? Number.NEGATIVE_INFINITY)).toBeGreaterThanOrEqual(
      (opened.barBottom ?? 0) - 1,
    );

    await scrollFooterIntoView(page);

    const after = await readMobileSummaryState(page);
    expect(after.barExists).toBe(true);
    expect(after.barPosition).toBe('fixed');
    expect(after.footerTop ?? Number.POSITIVE_INFINITY).toBeLessThan(after.viewportHeight);
    expect(Math.abs((after.barTop ?? -1) - (before.barTop ?? -1))).toBeLessThanOrEqual(1);
  });
});