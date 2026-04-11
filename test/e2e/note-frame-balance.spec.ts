import { expect, test, type Page } from '@playwright/test';
const sampleJavascriptPath = '/notes/program/sample-javascript/';

interface NoteWideFrameSnapshot {
  hasAppRouter: boolean;
  hasSidebarColumn: boolean;
  hasNoteShell: boolean;
  hasHeaderInner: boolean;
  appRouterWidth: number | null;
  appRouterLeft: number | null;
  sidebarColumnLeft: number | null;
  noteShellWidth: number | null;
  headerInnerWidth: number | null;
  headerInnerLeft: number | null;
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
    const layoutHeader = document.querySelector<HTMLElement>('layout-header');

    const uiHeader = layoutHeader?.shadowRoot?.querySelector<HTMLElement>('ui-header');
    const headerInner = uiHeader?.shadowRoot?.querySelector<HTMLElement>('.inner');

    const round = (value: number | null): number | null =>
      value === null ? null : Math.round(value);

    return {
      hasAppRouter: appRouter instanceof HTMLElement,
      hasSidebarColumn: sidebarColumn instanceof HTMLElement,
      hasNoteShell: noteShell instanceof HTMLElement,
      hasHeaderInner: headerInner instanceof HTMLElement,
      appRouterWidth: round(appRouter?.getBoundingClientRect().width ?? null),
      appRouterLeft: round(appRouter?.getBoundingClientRect().left ?? null),
      sidebarColumnLeft: round(sidebarColumn?.getBoundingClientRect().left ?? null),
      noteShellWidth: round(noteShell?.getBoundingClientRect().width ?? null),
      headerInnerWidth: round(headerInner?.getBoundingClientRect().width ?? null),
      headerInnerLeft: round(headerInner?.getBoundingClientRect().left ?? null),
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
    expect(wide.hasSidebarColumn).toBe(false);
    expect(wide.hasNoteShell).toBe(true);
    expect(wide.hasHeaderInner).toBe(true);

    expect(wide.appRouterWidth).toBeGreaterThanOrEqual(1438);
    expect(wide.appRouterWidth).toBeLessThanOrEqual(1442);

    expect(wide.headerInnerWidth).toBeGreaterThanOrEqual(1300);
    expect(wide.headerInnerWidth).toBeLessThanOrEqual(1320);
    expect((wide.headerInnerWidth ?? 0) <= (wide.appRouterWidth ?? 0)).toBe(true);
    expect(wide.sidebarColumnLeft).toBeNull();

    expect(wide.noteShellWidth).not.toBeNull();
    expect((wide.noteShellWidth ?? 0) <= 1282).toBe(true);

    expect(wide.horizontalOverflow).toBeLessThanOrEqual(1);

    await page.setViewportSize({ width: 1920, height: 900 });
    await settleLayout(page);

    const wider = await readNoteWideFrameSnapshot(page);

    expect(wider.appRouterWidth).toBeGreaterThanOrEqual(1438);
    expect(wider.appRouterWidth).toBeLessThanOrEqual(1442);
    expect(wider.headerInnerWidth).toBeGreaterThanOrEqual(1300);
    expect(wider.headerInnerWidth).toBeLessThanOrEqual(1320);

    expect(Math.abs((wider.appRouterWidth ?? 0) - (wide.appRouterWidth ?? 0))).toBeLessThanOrEqual(
      1,
    );
    expect(
      Math.abs((wider.headerInnerWidth ?? 0) - (wide.headerInnerWidth ?? 0)),
    ).toBeLessThanOrEqual(1);

    expect((wider.headerInnerWidth ?? 0) <= (wider.appRouterWidth ?? 0)).toBe(true);
    expect(wider.sidebarColumnLeft).toBeNull();

    expect(wider.horizontalOverflow).toBeLessThanOrEqual(1);
  });
});
