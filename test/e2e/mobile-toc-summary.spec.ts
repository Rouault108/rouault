import { expect, test, type Page } from '@playwright/test';

import { e2eNoteFixtures } from './support/note-fixtures.js';

const aboutPath = '/about/';
const layoutRichPath = e2eNoteFixtures.layoutRich.directPath;

type HeaderDropdownKind = 'corpus' | 'theme';

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

interface HeaderDropdownPaintState {
  panelOpen: boolean;
  panelTop: number | null;
  panelBottom: number | null;
  barTop: number | null;
  barBottom: number | null;
  hasOverlapWithBar: boolean;
  samplePoint: { x: number; y: number } | null;
  topmostInsidePanel: boolean;
  topmostInsideBar: boolean;
  topmostTag: string | null;
  topmostPathTags: string[];
}

const waitForLayoutHeaderHydrated = async (page: Page): Promise<void> => {
  await page.waitForFunction(() => {
    const header = document.querySelector('layout-header');
    return header instanceof HTMLElement && header.shadowRoot instanceof ShadowRoot;
  });
};

const waitForLayoutTocHydrated = async (page: Page): Promise<void> => {
  await page.waitForFunction(() => {
    const toc = document.querySelector('layout-toc');
    return toc instanceof HTMLElement && toc.shadowRoot instanceof ShadowRoot;
  });
};

const waitForHeaderDropdownInteractive = async (
  page: Page,
  kind: HeaderDropdownKind,
): Promise<void> => {
  await expect
    .poll(async () => {
      return await page.evaluate((dropdownKind) => {
        const header = document.querySelector('layout-header');
        if (!(header instanceof HTMLElement) || !(header.shadowRoot instanceof ShadowRoot)) {
          return false;
        }

        const dropdownSelector =
          dropdownKind === 'corpus' ? '.corpus-switcher' : '[data-dropdown="theme"]';
        const dropdown = header.shadowRoot.querySelector<HTMLElement>(dropdownSelector);
        const trigger = dropdown?.querySelector<HTMLElement>('[slot="trigger"]');
        const panel = dropdown?.shadowRoot?.querySelector<HTMLElement>('.panel');
        const openMethod = dropdown
          ? (dropdown as HTMLElement & { open?: () => void }).open
          : undefined;

        return (
          dropdown instanceof HTMLElement &&
          trigger instanceof HTMLElement &&
          panel instanceof HTMLElement &&
          typeof openMethod === 'function'
        );
      }, kind);
    })
    .toBe(true);
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

const readHeaderDropdownPaintState = async (
  page: Page,
  kind: HeaderDropdownKind,
): Promise<HeaderDropdownPaintState> =>
  await page.evaluate((dropdownKind) => {
    const header = document.querySelector('layout-header');
    const toc = document.querySelector('layout-toc');

    const dropdownSelector =
      dropdownKind === 'corpus' ? '.corpus-switcher' : '[data-dropdown="theme"]';

    const dropdown = header?.shadowRoot?.querySelector<HTMLElement>(dropdownSelector);
    const panel = dropdown?.shadowRoot?.querySelector<HTMLElement>('.panel');
    const bar = toc?.shadowRoot?.querySelector<HTMLElement>('.mobile-bar');

    const panelRect = panel instanceof HTMLElement ? panel.getBoundingClientRect() : null;
    const barRect = bar instanceof HTMLElement ? bar.getBoundingClientRect() : null;

    const overlapTop =
      panelRect && barRect ? Math.max(panelRect.top, barRect.top) : Number.NaN;
    const overlapBottom =
      panelRect && barRect ? Math.min(panelRect.bottom, barRect.bottom) : Number.NaN;
    const hasOverlapWithBar =
      Number.isFinite(overlapTop) &&
      Number.isFinite(overlapBottom) &&
      overlapBottom - overlapTop >= 8;

    const samplePoint = panelRect
      ? (() => {
          const x = Math.round(panelRect.left + panelRect.width / 2);

          if (hasOverlapWithBar) {
            return {
              x,
              y: Math.round((overlapTop + overlapBottom) / 2),
            };
          }

          return {
            x,
            y: Math.round(
              Math.min(
                panelRect.bottom - 16,
                Math.max(panelRect.top + 24, panelRect.top + panelRect.height / 2),
              ),
            ),
          };
        })()
      : null;

    const deepestElementFromPoint = (
      root: Document | ShadowRoot,
      x: number,
      y: number,
    ): Element | null => {
      const hit = root.elementFromPoint(x, y);
      if (!(hit instanceof Element)) {
        return null;
      }

      if (hit.shadowRoot instanceof ShadowRoot) {
        const inner = deepestElementFromPoint(hit.shadowRoot, x, y);
        return inner ?? hit;
      }

      return hit;
    };

    const composedContains = (container: HTMLElement, node: Node | null): boolean => {
      const visited = new Set<Node>();
      let current: Node | null = node;

      while (current && !visited.has(current)) {
        visited.add(current);

        if (current === container) {
          return true;
        }

        const assignedSlot = current instanceof Element ? current.assignedSlot : null;
        if (assignedSlot instanceof HTMLSlotElement) {
          current = assignedSlot;
          continue;
        }

        const parent = current.parentNode;
        if (parent) {
          current = parent;
          continue;
        }

        const root = current.getRootNode();
        if (root instanceof ShadowRoot) {
          current = root.host;
          continue;
        }

        current = null;
      }

      return false;
    };

    const topmost =
      samplePoint !== null ? deepestElementFromPoint(document, samplePoint.x, samplePoint.y) : null;

    const topmostPathTags: string[] = [];
    {
      const visited = new Set<Node>();
      let current: Node | null = topmost;

      while (current && !visited.has(current)) {
        visited.add(current);

        if (current instanceof HTMLElement) {
          topmostPathTags.push(current.tagName.toLowerCase());
        }

        const assignedSlot = current instanceof Element ? current.assignedSlot : null;
        if (assignedSlot instanceof HTMLSlotElement) {
          current = assignedSlot;
          continue;
        }

        const parent = current.parentNode;
        if (parent) {
          current = parent;
          continue;
        }

        const root = current.getRootNode();
        if (root instanceof ShadowRoot) {
          current = root.host;
          continue;
        }

        current = null;
      }
    }

    return {
      panelOpen: dropdown instanceof HTMLElement && dropdown.hasAttribute('opened'),
      panelTop: panelRect ? Math.round(panelRect.top) : null,
      panelBottom: panelRect ? Math.round(panelRect.bottom) : null,
      barTop: barRect ? Math.round(barRect.top) : null,
      barBottom: barRect ? Math.round(barRect.bottom) : null,
      hasOverlapWithBar,
      samplePoint,
      topmostInsidePanel:
        panel instanceof HTMLElement && topmost instanceof Node && composedContains(panel, topmost),
      topmostInsideBar:
        bar instanceof HTMLElement && topmost instanceof Node && composedContains(bar, topmost),
      topmostTag: topmost instanceof HTMLElement ? topmost.tagName.toLowerCase() : null,
      topmostPathTags,
    };
  }, kind);

const openHeaderDropdown = async (page: Page, kind: HeaderDropdownKind): Promise<void> => {
  await waitForHeaderDropdownInteractive(page, kind);

  await expect
    .poll(async () => {
      return await page.evaluate((dropdownKind) => {
        const header = document.querySelector('layout-header');
        if (!(header instanceof HTMLElement) || !(header.shadowRoot instanceof ShadowRoot)) {
          return false;
        }

        const dropdownSelector =
          dropdownKind === 'corpus' ? '.corpus-switcher' : '[data-dropdown="theme"]';
        const dropdown = header.shadowRoot.querySelector<HTMLElement>(dropdownSelector);

        if (!(dropdown instanceof HTMLElement)) {
          return false;
        }

        if (dropdown.hasAttribute('opened')) {
          return true;
        }

        const openMethod = (dropdown as HTMLElement & { open?: () => void }).open;
        if (typeof openMethod === 'function') {
          openMethod.call(dropdown);
        } else {
          const trigger = dropdown.querySelector<HTMLElement>('[slot="trigger"]');
          if (trigger instanceof HTMLElement) {
            trigger.click();
          }
        }

        return dropdown.hasAttribute('opened');
      }, kind);
    })
    .toBe(true);
};

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

  test('about ページで corpus dropdown が mobile TOC bar より前面に描画されること', async ({
    page,
  }) => {
    await page.goto(aboutPath);
    await waitForLayoutHeaderHydrated(page);
    await waitForLayoutTocHydrated(page);
    await revealMobileBar(page);
    await waitForMobileBar(page);

    await openHeaderDropdown(page, 'corpus');

    const state = await readHeaderDropdownPaintState(page, 'corpus');
    expect(state.panelOpen, JSON.stringify(state)).toBe(true);
    expect(state.hasOverlapWithBar, JSON.stringify(state)).toBe(true);
    expect(state.samplePoint, JSON.stringify(state)).not.toBeNull();
    expect(state.topmostInsidePanel, JSON.stringify(state)).toBe(true);
    expect(state.topmostInsideBar, JSON.stringify(state)).toBe(false);
  });

  test('about ページで theme dropdown が mobile TOC bar より前面に描画されること', async ({
    page,
  }) => {
    await page.goto(aboutPath);
    await waitForLayoutHeaderHydrated(page);
    await waitForLayoutTocHydrated(page);
    await revealMobileBar(page);
    await waitForMobileBar(page);

    await openHeaderDropdown(page, 'theme');

    const state = await readHeaderDropdownPaintState(page, 'theme');
    expect(state.panelOpen, JSON.stringify(state)).toBe(true);
    expect(state.hasOverlapWithBar, JSON.stringify(state)).toBe(true);
    expect(state.samplePoint, JSON.stringify(state)).not.toBeNull();
    expect(state.topmostInsidePanel, JSON.stringify(state)).toBe(true);
    expect(state.topmostInsideBar, JSON.stringify(state)).toBe(false);
  });

  test('note ページで corpus dropdown が mobile TOC bar より前面に描画されること', async ({
    page,
  }) => {
    await page.goto(layoutRichPath);
    await waitForLayoutHeaderHydrated(page);
    await waitForLayoutTocHydrated(page);
    await revealMobileBar(page);
    await waitForMobileBar(page);

    await openHeaderDropdown(page, 'corpus');

    const state = await readHeaderDropdownPaintState(page, 'corpus');
    expect(state.panelOpen, JSON.stringify(state)).toBe(true);
    expect(state.hasOverlapWithBar, JSON.stringify(state)).toBe(true);
    expect(state.samplePoint, JSON.stringify(state)).not.toBeNull();
    expect(state.topmostInsidePanel, JSON.stringify(state)).toBe(true);
    expect(state.topmostInsideBar, JSON.stringify(state)).toBe(false);
  });

  test('note ページで theme dropdown が mobile TOC bar より前面に描画されること', async ({
    page,
  }) => {
    await page.goto(layoutRichPath);
    await waitForLayoutHeaderHydrated(page);
    await waitForLayoutTocHydrated(page);
    await revealMobileBar(page);
    await waitForMobileBar(page);

    await openHeaderDropdown(page, 'theme');

    const state = await readHeaderDropdownPaintState(page, 'theme');
    expect(state.panelOpen, JSON.stringify(state)).toBe(true);
    expect(state.hasOverlapWithBar, JSON.stringify(state)).toBe(true);
    expect(state.samplePoint, JSON.stringify(state)).not.toBeNull();
    expect(state.topmostInsidePanel, JSON.stringify(state)).toBe(true);
    expect(state.topmostInsideBar, JSON.stringify(state)).toBe(false);
  });
});