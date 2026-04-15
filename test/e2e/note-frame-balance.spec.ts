import { expect, test, type Page } from '@playwright/test';
const sampleJavascriptPath = '/notes/program/sample-javascript/';
const tocAbsentPath = '/notes/testing/toc-absent/';

interface NoteWideFrameSnapshot {
  hasAppRouter: boolean;
  hasSidebarColumn: boolean;
  hasNoteShell: boolean;
  appRouterWidth: number | null;
  appRouterLeft: number | null;
  sidebarColumnLeft: number | null;
  sidebarColumnWidth: number | null;
  noteShellWidth: number | null;
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
    const appRouter = document.querySelector<HTMLElement>(
      'app-router[data-sidebar-presence="present"]',
    );
    const sidebarColumn = document.querySelector<HTMLElement>('[data-app-shell-sidebar-host]');
    const noteShell = document.querySelector<HTMLElement>('.note-shell');
    const tocColumn = document.querySelector<HTMLElement>('.note-shell .layout-toc-col');
    const article = document.querySelector<HTMLElement>('.note-shell .layout-main-col');

    const round = (value: number | null): number | null =>
      value === null ? null : Math.round(value);

    return {
      hasAppRouter: appRouter instanceof HTMLElement,
      hasSidebarColumn: sidebarColumn instanceof HTMLElement,
      hasNoteShell: noteShell instanceof HTMLElement,
      appRouterWidth: round(appRouter?.getBoundingClientRect().width ?? null),
      appRouterLeft: round(appRouter?.getBoundingClientRect().left ?? null),
      sidebarColumnLeft: round(sidebarColumn?.getBoundingClientRect().left ?? null),
      sidebarColumnWidth: round(sidebarColumn?.getBoundingClientRect().width ?? null),
      noteShellWidth: round(noteShell?.getBoundingClientRect().width ?? null),
      tocColumnWidth: round(tocColumn?.getBoundingClientRect().width ?? null),
      articleWidth: round(article?.getBoundingClientRect().width ?? null),
      articleLeft: round(article?.getBoundingClientRect().left ?? null),
      horizontalOverflow:
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });

test.describe('note frame balance', () => {
  test('wide viewport でも note frame と header inner width が頭打ちになり、横スクロールを出さないこと', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1600, height: 900 });
    await page.goto(sampleJavascriptPath);
    await settleLayout(page);

    const wide = await readNoteWideFrameSnapshot(page);
    expect(wide.hasAppRouter).toBe(true);
    expect(wide.hasSidebarColumn).toBe(true);
    expect(wide.hasNoteShell).toBe(true);

    expect(wide.appRouterWidth).toBeGreaterThanOrEqual(1358);
    expect(wide.appRouterWidth).toBeLessThanOrEqual(1362);
    expect(wide.sidebarColumnLeft).not.toBeNull();
    expect(wide.sidebarColumnWidth).toBeGreaterThanOrEqual(246);
    expect(wide.sidebarColumnWidth).toBeLessThanOrEqual(250);

    expect(wide.noteShellWidth).not.toBeNull();
    expect((wide.noteShellWidth ?? 0) <= 1116).toBe(true);
    expect(wide.tocColumnWidth).toBeGreaterThanOrEqual(214);
    expect(wide.tocColumnWidth).toBeLessThanOrEqual(218);
    expect(wide.articleWidth).toBeGreaterThanOrEqual(820);
    expect((wide.articleWidth ?? 0) > (wide.tocColumnWidth ?? 0)).toBe(true);

    expect(wide.horizontalOverflow).toBeLessThanOrEqual(1);

    await page.setViewportSize({ width: 1920, height: 900 });
    await settleLayout(page);

    const wider = await readNoteWideFrameSnapshot(page);

    expect(wider.appRouterWidth).toBeGreaterThanOrEqual(1358);
    expect(wider.appRouterWidth).toBeLessThanOrEqual(1362);

    expect(Math.abs((wider.appRouterWidth ?? 0) - (wide.appRouterWidth ?? 0))).toBeLessThanOrEqual(
      1,
    );
    expect(wider.sidebarColumnLeft).not.toBeNull();
    expect(wider.sidebarColumnWidth).toBeGreaterThanOrEqual(246);
    expect(wider.sidebarColumnWidth).toBeLessThanOrEqual(250);
    expect(wider.tocColumnWidth).toBeGreaterThanOrEqual(214);
    expect(wider.tocColumnWidth).toBeLessThanOrEqual(218);
    expect((wider.articleWidth ?? 0) > (wider.tocColumnWidth ?? 0)).toBe(true);

    expect(wider.horizontalOverflow).toBeLessThanOrEqual(1);
  });

  test('TOC absent note では desktop で TOC reserve を残さず note shell 自体を縮めること', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1600, height: 900 });

    await page.goto(sampleJavascriptPath);
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
        articleWidth: Math.round(article?.getBoundingClientRect().width ?? 0),
        articleLeft: Math.round(article?.getBoundingClientRect().left ?? 0),
        tocColumnExists: tocColumn instanceof HTMLElement,
        noteShellColumnGap: Number.isFinite(noteShellColumnGap) ? Math.round(noteShellColumnGap) : 0,
        horizontalOverflow:
          document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });

    expect(state.tocPresence).toBe('absent');
    expect(state.tocColumnExists).toBe(false);
    expect(state.noteShellWidth).toBeGreaterThan(0);
    expect(state.articleWidth).toBeGreaterThan(0);

    expect((present.noteShellWidth ?? 0) - state.noteShellWidth).toBeGreaterThanOrEqual(100);

    const articleWidthDelta = state.articleWidth - (present.articleWidth ?? 0);
    expect(Math.abs(articleWidthDelta - state.noteShellColumnGap)).toBeLessThanOrEqual(1);

    expect(state.articleLeft).toBeGreaterThan(present.articleLeft ?? 0);
    expect(state.horizontalOverflow).toBeLessThanOrEqual(1);
  });
});
