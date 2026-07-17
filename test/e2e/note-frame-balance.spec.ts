import { expect, test, type Page } from '@playwright/test';

import { e2eNoteFixtures } from './support/note-fixtures.js';

const layoutRichPath = e2eNoteFixtures.layoutRich.directPath;
const tocAbsentPath = e2eNoteFixtures.tocAbsent.directPath;

interface NoteWideFrameSnapshot {
  hasAppShellRoot: boolean;
  hasRouterDocumentHost: boolean;
  hasSidebarColumn: boolean;
  hasNoteShell: boolean;
  layoutInlineLeft: number | null;
  layoutInlineRight: number | null;
  layoutInlineWidth: number | null;
  outerGutterUsedValue: number;
  routerDocumentHostWidth: number | null;
  routerDocumentHostLeft: number | null;
  routerDocumentHostRight: number | null;
  routerDocumentHostGridTemplateColumns: string | null;
  sidebarColumnLeft: number | null;
  sidebarColumnWidth: number | null;
  noteShellWidth: number | null;
  mainContentWidth: number;
  tocColumnExists: boolean;
  tocColumnWidth: number | null;
  articleWidth: number | null;
  articleLeft: number | null;
  horizontalOverflow: number;
}

const settleLayout = async (page: Page): Promise<void> => {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => resolve());
        });
      }),
  );
};

const readNoteWideFrameSnapshot = async (page: Page): Promise<NoteWideFrameSnapshot> =>
  page.evaluate(() => {
    const appShellRoot = document.querySelector<HTMLElement>(
      '[data-app-shell-root].app-shell-root',
    );
    const routerDocumentHost = document.querySelector<HTMLElement>(
      'router-document-host[data-sidebar-presence="present"]',
    );
    const sidebarColumn = document.querySelector<HTMLElement>('[data-app-shell-sidebar-host]');
    const mainContent = document.querySelector<HTMLElement>('main#main-content');
    const noteShell = document.querySelector<HTMLElement>('.note-shell');
    const tocColumn = document.querySelector<HTMLElement>('.note-shell .layout-toc-col');
    const article = document.querySelector<HTMLElement>('.note-shell .layout-main-col');

    const readCssLengthTokenUsedValue = (tokenName: string): number => {
      const probe = document.createElement('div');
      probe.style.position = 'absolute';
      probe.style.visibility = 'hidden';
      probe.style.pointerEvents = 'none';
      probe.style.inlineSize = `var(${tokenName})`;
      probe.style.blockSize = '0';

      document.body.append(probe);

      try {
        return probe.getBoundingClientRect().width;
      } finally {
        probe.remove();
      }
    };

    const appShellRootRect = appShellRoot?.getBoundingClientRect() ?? null;
    const routerDocumentHostRect = routerDocumentHost?.getBoundingClientRect() ?? null;
    const sidebarColumnRect = sidebarColumn?.getBoundingClientRect() ?? null;
    const mainContentRect = mainContent?.getBoundingClientRect() ?? null;
    const noteShellRect = noteShell?.getBoundingClientRect() ?? null;
    const tocColumnRect = tocColumn?.getBoundingClientRect() ?? null;
    const articleRect = article?.getBoundingClientRect() ?? null;

    return {
      hasAppShellRoot: appShellRoot instanceof HTMLElement,
      hasRouterDocumentHost: routerDocumentHost instanceof HTMLElement,
      hasSidebarColumn: sidebarColumn instanceof HTMLElement,
      hasNoteShell: noteShell instanceof HTMLElement,
      layoutInlineLeft: appShellRootRect?.left ?? null,
      layoutInlineRight: appShellRootRect?.right ?? null,
      layoutInlineWidth: appShellRootRect?.width ?? null,
      outerGutterUsedValue: readCssLengthTokenUsedValue('--note-frame-outer-gutter'),
      routerDocumentHostWidth: routerDocumentHostRect?.width ?? null,
      routerDocumentHostLeft: routerDocumentHostRect?.left ?? null,
      routerDocumentHostRight: routerDocumentHostRect?.right ?? null,
      routerDocumentHostGridTemplateColumns: routerDocumentHost
        ? getComputedStyle(routerDocumentHost).gridTemplateColumns
        : null,
      sidebarColumnLeft: sidebarColumnRect?.left ?? null,
      sidebarColumnWidth: sidebarColumnRect?.width ?? null,
      noteShellWidth: noteShellRect?.width ?? null,
      mainContentWidth: mainContentRect?.width ?? 0,
      tocColumnExists: tocColumn instanceof HTMLElement,
      tocColumnWidth: tocColumnRect?.width ?? null,
      articleWidth: articleRect?.width ?? null,
      articleLeft: articleRect?.left ?? null,
      horizontalOverflow:
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });

const routerDocumentHostLeftGutter = (snapshot: NoteWideFrameSnapshot): number => {
  if (snapshot.layoutInlineLeft === null || snapshot.routerDocumentHostLeft === null) {
    return Number.NaN;
  }

  return snapshot.routerDocumentHostLeft - snapshot.layoutInlineLeft;
};

const routerDocumentHostRightGutter = (snapshot: NoteWideFrameSnapshot): number => {
  if (snapshot.layoutInlineRight === null || snapshot.routerDocumentHostRight === null) {
    return Number.NaN;
  }

  return snapshot.layoutInlineRight - snapshot.routerDocumentHostRight;
};

test.describe('note frame balance', () => {
  test('wide viewport でも note frame と header inner width が頭打ちになり、横スクロールを出さないこと', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1600, height: 900 });
    await page.goto(layoutRichPath);
    await settleLayout(page);

    const wide = await readNoteWideFrameSnapshot(page);
    expect(wide.hasRouterDocumentHost).toBe(true);
    expect(wide.hasSidebarColumn).toBe(true);
    expect(wide.hasNoteShell).toBe(true);

    expect(wide.routerDocumentHostWidth).toBeGreaterThanOrEqual(1414);
    expect(wide.routerDocumentHostWidth).toBeLessThanOrEqual(1418);
    expect(wide.sidebarColumnLeft).not.toBeNull();
    expect(wide.sidebarColumnWidth).toBeGreaterThanOrEqual(246);
    expect(wide.sidebarColumnWidth).toBeLessThanOrEqual(250);

    expect(wide.noteShellWidth).not.toBeNull();
    expect(wide.mainContentWidth).toBeGreaterThan(0);
    expect((wide.noteShellWidth ?? 0) <= 1170).toBe(true);
    expect(wide.tocColumnWidth).toBeGreaterThanOrEqual(270);
    expect(wide.tocColumnWidth).toBeLessThanOrEqual(274);
    expect(wide.articleWidth).toBeGreaterThanOrEqual(820);
    expect((wide.articleWidth ?? 0) > (wide.tocColumnWidth ?? 0)).toBe(true);

    expect(wide.horizontalOverflow).toBeLessThanOrEqual(1);

    await page.setViewportSize({ width: 1920, height: 900 });
    await settleLayout(page);

    const wider = await readNoteWideFrameSnapshot(page);

    expect(wider.routerDocumentHostWidth).toBeGreaterThanOrEqual(1414);
    expect(wider.routerDocumentHostWidth).toBeLessThanOrEqual(1418);

    expect(
      Math.abs((wider.routerDocumentHostWidth ?? 0) - (wide.routerDocumentHostWidth ?? 0)),
    ).toBeLessThanOrEqual(1);
    expect(wider.sidebarColumnLeft).not.toBeNull();
    expect(wider.sidebarColumnWidth).toBeGreaterThanOrEqual(246);
    expect(wider.sidebarColumnWidth).toBeLessThanOrEqual(250);
    expect(wider.tocColumnWidth).toBeGreaterThanOrEqual(270);
    expect(wider.tocColumnWidth).toBeLessThanOrEqual(274);
    expect(wider.mainContentWidth).toBeGreaterThan(0);
    expect((wider.articleWidth ?? 0) > (wider.tocColumnWidth ?? 0)).toBe(true);

    expect(wider.horizontalOverflow).toBeLessThanOrEqual(1);
  });

  test('1366px の fixed sidebar note frame は左右 outer gutter を確保すること', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1366, height: 900 });
    await page.goto(layoutRichPath);
    await settleLayout(page);

    const state = await readNoteWideFrameSnapshot(page);

    expect(state.hasAppShellRoot).toBe(true);
    expect(state.hasRouterDocumentHost).toBe(true);
    expect(state.hasSidebarColumn).toBe(true);
    expect(state.hasNoteShell).toBe(true);
    expect(routerDocumentHostLeftGutter(state)).toBeGreaterThanOrEqual(
      state.outerGutterUsedValue - 1,
    );
    expect(routerDocumentHostRightGutter(state)).toBeGreaterThanOrEqual(
      state.outerGutterUsedValue - 1,
    );
    expect(
      Math.abs(routerDocumentHostLeftGutter(state) - routerDocumentHostRightGutter(state)),
    ).toBeLessThanOrEqual(1);
    expect(
      Math.abs((state.sidebarColumnLeft ?? 0) - (state.routerDocumentHostLeft ?? 0)),
    ).toBeLessThanOrEqual(1);
    expect(state.mainContentWidth).toBeGreaterThan(0);
    expect(state.horizontalOverflow).toBeLessThanOrEqual(1);
  });

  test('TOC absent note では desktop で note shell 外形と本文開始位置を維持しつつ本文 frame を右へ拡張すること', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1600, height: 900 });

    await page.goto(layoutRichPath);
    await settleLayout(page);
    const present = await readNoteWideFrameSnapshot(page);

    await page.goto(tocAbsentPath);
    await settleLayout(page);

    const state = await page.evaluate(() => {
      const noteShell = document.querySelector<HTMLElement>('.note-shell');
      const article = document.querySelector<HTMLElement>('.note-shell .layout-main-col');
      const tocColumn = document.querySelector<HTMLElement>('.note-shell .layout-toc-col');
      const noteShellStyles = noteShell ? getComputedStyle(noteShell) : null;
      const noteShellColumnGap = Number.parseFloat(noteShellStyles?.columnGap ?? '0');

      return {
        tocPresence: noteShell?.getAttribute('data-toc-presence') ?? null,
        noteShellWidth: Math.round(noteShell?.getBoundingClientRect().width ?? 0),
        mainContentWidth: Math.round(
          document.querySelector<HTMLElement>('main#main-content')?.getBoundingClientRect().width ??
            0,
        ),
        articleWidth: Math.round(article?.getBoundingClientRect().width ?? 0),
        articleLeft: Math.round(article?.getBoundingClientRect().left ?? 0),
        tocColumnExists: tocColumn instanceof HTMLElement,
        noteShellColumnGap: Number.isFinite(noteShellColumnGap)
          ? Math.round(noteShellColumnGap)
          : 0,
        horizontalOverflow:
          document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });

    expect(state.tocPresence).toBe('absent');
    expect(state.tocColumnExists).toBe(false);
    expect(state.noteShellWidth).toBeGreaterThan(0);
    expect(state.mainContentWidth).toBeGreaterThan(0);
    expect(state.articleWidth).toBeGreaterThan(0);

    expect(Math.abs(state.noteShellWidth - (present.noteShellWidth ?? 0))).toBeLessThanOrEqual(1);

    expect(state.articleWidth).toBeGreaterThan(
      (present.articleWidth ?? 0) + (present.tocColumnWidth ?? 0),
    );
    expect(Math.abs(state.articleWidth - state.noteShellWidth)).toBeLessThanOrEqual(1);
    expect(Math.abs(state.articleLeft - (present.articleLeft ?? 0))).toBeLessThanOrEqual(1);
    expect(state.horizontalOverflow).toBeLessThanOrEqual(1);
  });

  test('1366px の TOC absent note でも frame gutter と本文開始位置を維持すること', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1366, height: 900 });

    await page.goto(layoutRichPath);
    await settleLayout(page);
    const present = await readNoteWideFrameSnapshot(page);

    await page.goto(tocAbsentPath);
    await settleLayout(page);
    const absent = await readNoteWideFrameSnapshot(page);

    expect(present.hasAppShellRoot).toBe(true);
    expect(present.hasRouterDocumentHost).toBe(true);
    expect(absent.hasAppShellRoot).toBe(true);
    expect(absent.hasRouterDocumentHost).toBe(true);
    expect(absent.tocColumnExists).toBe(false);
    expect(routerDocumentHostLeftGutter(absent)).toBeGreaterThanOrEqual(
      absent.outerGutterUsedValue - 1,
    );
    expect(routerDocumentHostRightGutter(absent)).toBeGreaterThanOrEqual(
      absent.outerGutterUsedValue - 1,
    );
    expect(Math.abs((absent.articleLeft ?? 0) - (present.articleLeft ?? 0))).toBeLessThanOrEqual(1);
    expect(absent.articleWidth ?? 0).toBeGreaterThan(present.articleWidth ?? 0);
    expect(absent.mainContentWidth).toBeGreaterThan(0);
    expect(absent.noteShellWidth ?? 0).toBeLessThanOrEqual(absent.mainContentWidth + 1);
    expect(absent.horizontalOverflow).toBeLessThanOrEqual(1);
  });

  test('1024px は fixed sidebar layout として outer gutter を確保すること', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 900 });
    await page.goto(layoutRichPath);
    await settleLayout(page);

    const state = await readNoteWideFrameSnapshot(page);

    expect(state.hasAppShellRoot).toBe(true);
    expect(state.hasRouterDocumentHost).toBe(true);
    expect(routerDocumentHostLeftGutter(state)).toBeGreaterThanOrEqual(
      state.outerGutterUsedValue - 1,
    );
    expect(routerDocumentHostRightGutter(state)).toBeGreaterThanOrEqual(
      state.outerGutterUsedValue - 1,
    );
    expect(state.mainContentWidth).toBeGreaterThan(0);
    expect(state.horizontalOverflow).toBeLessThanOrEqual(1);
  });

  test('1023px 以下では router-document-host 幅へ fixed sidebar 用 gutter を二重適用しないこと', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1023, height: 900 });
    await page.goto(layoutRichPath);
    await settleLayout(page);

    const state = await readNoteWideFrameSnapshot(page);

    expect(state.hasAppShellRoot).toBe(true);
    expect(state.hasRouterDocumentHost).toBe(true);
    expect(Math.abs(routerDocumentHostLeftGutter(state))).toBeLessThanOrEqual(1);
    expect(Math.abs(routerDocumentHostRightGutter(state))).toBeLessThanOrEqual(1);
    expect(state.sidebarColumnWidth ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(1);
    expect(state.routerDocumentHostGridTemplateColumns ?? '').toContain('0px');
    expect(state.mainContentWidth).toBeGreaterThan(0);
    expect(state.horizontalOverflow).toBeLessThanOrEqual(1);
  });
});
