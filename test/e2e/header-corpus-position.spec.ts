import { expect, test, type Page } from '@playwright/test';
const notePath = '/notes/program/csharp/what-is-csharp';
const testedViewports = [640, 768, 1023, 1024, 1440] as const;

interface HeaderFrameSnapshot {
  headerWidth: number | null;
  innerLeft: number | null;
  innerWidth: number | null;
}

interface HeaderCorpusState {
  currentCorpusKey: string | null;
  corpora: { key: string; label: string; href: string }[];
  menuItemCount: number | null;
  noteLayout: boolean;
  sidebarEnabled: boolean;
}

interface CorpusGeometrySnapshot extends HeaderFrameSnapshot {
  triggerLeft: number | null;
  panelLeft?: number | null;
}

const expectWithinPx = (actual: number, expected: number, tolerance = 1): void => {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance);
};

const corpusPanelPositionTolerancePx = 1.5;

const waitForAnimationFrames = async (page: Page, count = 3): Promise<void> => {
  for (let index = 0; index < count; index += 1) {
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          requestAnimationFrame(() => resolve());
        }),
    );
  }
};

const waitForFontsReady = async (page: Page): Promise<void> => {
  await page.evaluate(async () => {
    await document.fonts?.ready;
  });
};

const waitForHeaderCorpusTrigger = async (page: Page): Promise<void> => {
  await expect
    .poll(async () => {
      return await page.evaluate(async () => {
        await customElements.whenDefined('layout-header');
        await customElements.whenDefined('ui-dropdown');

        const header = document.querySelector('layout-header');
        const maybeHeader = header as (HTMLElement & { updateComplete?: Promise<unknown> }) | null;
        if (maybeHeader?.updateComplete instanceof Promise) {
          await maybeHeader.updateComplete;
        }

        const dropdown = header?.shadowRoot?.querySelector<
          HTMLElement & {
            getTriggerElement?: () => HTMLElement | null;
            updateComplete?: Promise<unknown>;
          }
        >('.corpus-switcher');
        if (dropdown?.updateComplete instanceof Promise) {
          await dropdown.updateComplete;
        }

        return dropdown?.getTriggerElement?.() instanceof HTMLElement;
      });
    })
    .toBe(true);

  await waitForFontsReady(page);
};

const waitForHeaderCorpusPanelReady = async (page: Page): Promise<void> => {
  await expect
    .poll(async () => {
      return await page.evaluate(() => {
        const header = document.querySelector('layout-header');
        const dropdown = header?.shadowRoot?.querySelector<
          HTMLElement & { getMenuElement?: () => HTMLElement | null }
        >('.corpus-switcher');
        const panel = dropdown?.getMenuElement?.() ?? null;
        if (!(panel instanceof HTMLElement)) {
          return false;
        }

        const style = getComputedStyle(panel);
        return (
          panel.dataset['positionPhase'] === 'ready' &&
          style.visibility === 'visible' &&
          panel.getAttribute('aria-hidden') === 'false'
        );
      });
    })
    .toBe(true);

  await waitForAnimationFrames(page, 3);
};

const readHeaderCorpusState = async (page: Page): Promise<HeaderCorpusState> => {
  return await page.evaluate(() => {
    const header = document.querySelector('layout-header') as
      | (HTMLElement & {
          currentCorpusKey?: string;
          corporaJson?: string;
          readShellProjection?: () => {
            currentCorpusKey: string;
            corpora:
              | { items?: { key: string; label: string; href: string }[] }
              | { key: string; label: string; href: string }[];
          };
        })
      | null;
    const projection = header?.readShellProjection?.();
    const corpusDropdown = header?.shadowRoot?.querySelector('.corpus-switcher');
    const rawCorpora = projection?.corpora;
    const corpora = Array.isArray(rawCorpora)
      ? rawCorpora
      : Array.isArray(rawCorpora?.items)
        ? rawCorpora.items
        : [];

    return {
      currentCorpusKey: projection?.currentCorpusKey ?? header?.currentCorpusKey ?? null,
      corpora,
      menuItemCount: corpusDropdown?.querySelectorAll('ui-menu-link').length ?? null,
      noteLayout: header?.hasAttribute('note-layout') ?? false,
      sidebarEnabled: header?.hasAttribute('sidebar-enabled') ?? false,
    };
  });
};

const readHeaderFrame = async (page: Page): Promise<HeaderFrameSnapshot> => {
  return await page.evaluate(() => {
    const header = document.querySelector('layout-header');
    const uiHeader = header?.shadowRoot?.querySelector('ui-header');
    const inner = uiHeader?.shadowRoot?.querySelector('.inner');
    const headerRect = header?.getBoundingClientRect();
    const innerRect = inner?.getBoundingClientRect();

    return {
      headerWidth: headerRect?.width ?? null,
      innerLeft: innerRect?.left ?? null,
      innerWidth: innerRect?.width ?? null,
    };
  });
};

const readCorpusGeometry = async (
  page: Page,
  options: { panel: boolean } = { panel: false },
): Promise<CorpusGeometrySnapshot> => {
  await waitForHeaderCorpusTrigger(page);
  const frame = await readHeaderFrame(page);
  const triggerLeft = await page.evaluate(() => {
    const header = document.querySelector('layout-header');
    const dropdown = header?.shadowRoot?.querySelector<
      HTMLElement & { getTriggerElement?: () => HTMLElement | null }
    >('.corpus-switcher');
    const trigger = dropdown?.getTriggerElement?.() ?? null;

    return trigger?.getBoundingClientRect().left ?? null;
  });

  if (!options.panel) {
    return { ...frame, triggerLeft };
  }

  await page
    .locator('layout-header')
    .locator('.corpus-switcher')
    .locator('[slot="trigger"] button')
    .click();
  await waitForHeaderCorpusPanelReady(page);
  const panelLeft = await page.evaluate(() => {
    const header = document.querySelector('layout-header');
    const dropdown = header?.shadowRoot?.querySelector<
      HTMLElement & { getMenuElement?: () => HTMLElement | null }
    >('.corpus-switcher');
    const panel = dropdown?.getMenuElement?.() ?? null;

    return panel?.getBoundingClientRect().left ?? null;
  });

  return { ...frame, triggerLeft, panelLeft };
};

type HeaderBreakpointDomain = 'medium' | 'desktop';

const readHeaderBreakpointDomain = (width: number): HeaderBreakpointDomain => {
  if (width >= 1024) {
    return 'desktop';
  }

  if (width >= 640) {
    return 'medium';
  }

  throw new Error(`geometry comparison 対象外の header width: ${String(width)}`);
};

const expectComparableFrames = (
  noteFrame: HeaderFrameSnapshot,
  corpusFrame: HeaderFrameSnapshot,
): void => {
  expect(noteFrame.headerWidth).not.toBeNull();
  expect(corpusFrame.headerWidth).not.toBeNull();
  expect(noteFrame.innerLeft).not.toBeNull();
  expect(corpusFrame.innerLeft).not.toBeNull();
  expect(noteFrame.innerWidth).not.toBeNull();
  expect(corpusFrame.innerWidth).not.toBeNull();

  const noteHeaderWidth = noteFrame.headerWidth ?? 0;
  const corpusHeaderWidth = corpusFrame.headerWidth ?? 0;
  expectWithinPx(noteHeaderWidth, corpusHeaderWidth, 1);

  const noteDomain = readHeaderBreakpointDomain(noteHeaderWidth);
  const corpusDomain = readHeaderBreakpointDomain(corpusHeaderWidth);
  expect(corpusDomain).toBe(noteDomain);

  expectWithinPx(noteFrame.innerLeft ?? 0, corpusFrame.innerLeft ?? 0, 1);
  expectWithinPx(noteFrame.innerWidth ?? 0, corpusFrame.innerWidth ?? 0, 1);
};

const readCorpusHrefFromCurrentHeader = async (page: Page): Promise<string> => {
  const state = await readHeaderCorpusState(page);
  expect(state.noteLayout).toBe(true);
  expect(state.sidebarEnabled).toBe(true);
  expect(state.currentCorpusKey).not.toBeNull();
  expect(state.corpora.length).toBeGreaterThan(0);
  expect(state.menuItemCount).toBe(state.corpora.length);

  const current = state.corpora.find((item) => item.key === state.currentCorpusKey);
  expect(current).toBeDefined();

  return current?.href ?? '';
};

test.describe('header corpus dropdown position contract', () => {
  test('実ページで note と同一 corpus の Corpora ページの trigger / panel left が一致すること', async ({
    page,
  }) => {
    for (const width of testedViewports) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(notePath);
      await waitForHeaderCorpusTrigger(page);
      const noteState = await readHeaderCorpusState(page);
      const corpusHref = await readCorpusHrefFromCurrentHeader(page);

      const noteTriggerGeometry = await readCorpusGeometry(page);
      await page.goto(corpusHref);
      await waitForHeaderCorpusTrigger(page);
      const corpusState = await readHeaderCorpusState(page);
      expect(corpusState.currentCorpusKey).toBe(noteState.currentCorpusKey);
      expect(corpusState.corpora.length).toBeGreaterThan(0);
      expect(corpusState.menuItemCount).toBe(corpusState.corpora.length);
      const corpusTriggerGeometry = await readCorpusGeometry(page);

      expectComparableFrames(noteTriggerGeometry, corpusTriggerGeometry);
      expect(noteTriggerGeometry.triggerLeft).not.toBeNull();
      expect(corpusTriggerGeometry.triggerLeft).not.toBeNull();
      expectWithinPx(
        noteTriggerGeometry.triggerLeft ?? 0,
        corpusTriggerGeometry.triggerLeft ?? 0,
        1,
      );

      await page.goto(notePath);
      const notePanelGeometry = await readCorpusGeometry(page, { panel: true });
      await page.goto(corpusHref);
      const corpusPanelGeometry = await readCorpusGeometry(page, { panel: true });

      expectComparableFrames(notePanelGeometry, corpusPanelGeometry);
      expect(notePanelGeometry.panelLeft).not.toBeNull();
      expect(corpusPanelGeometry.panelLeft).not.toBeNull();
      expectWithinPx(
        notePanelGeometry.panelLeft ?? 0,
        corpusPanelGeometry.panelLeft ?? 0,
        corpusPanelPositionTolerancePx,
      );
    }
  });

  test('中幅域で sidebar toggle と corpus trigger の pointer target が相互干渉しないこと', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 768, height: 900 });
    await page.goto(notePath);
    await waitForHeaderCorpusTrigger(page);

    const state = await readHeaderCorpusState(page);
    expect(state.noteLayout).toBe(true);
    expect(state.sidebarEnabled).toBe(true);

    const readInteractionState = async () =>
      await page.evaluate(() => {
        const header = document.querySelector('layout-header');
        const dropdown = header?.shadowRoot?.querySelector<
          HTMLElement & {
            getTriggerElement?: () => HTMLElement | null;
            getMenuElement?: () => HTMLElement | null;
          }
        >('.corpus-switcher');
        const sidebarToggle = header?.shadowRoot?.querySelector<HTMLElement>('.sidebar-toggle');
        const trigger = dropdown?.getTriggerElement?.() ?? null;
        const panel = dropdown?.getMenuElement?.() ?? null;
        const sidebarButton = sidebarToggle?.shadowRoot?.querySelector('button');
        const triggerRect = trigger?.getBoundingClientRect();
        const sidebarRect = sidebarToggle?.getBoundingClientRect();

        return {
          sidebarExpanded: sidebarButton?.getAttribute('aria-expanded') ?? null,
          dropdownExpanded: trigger?.getAttribute('aria-expanded') ?? null,
          dropdownPhase: panel?.dataset['positionPhase'] ?? null,
          triggerRect: triggerRect
            ? {
                left: triggerRect.left,
                right: triggerRect.right,
                top: triggerRect.top,
                bottom: triggerRect.bottom,
              }
            : null,
          sidebarRect: sidebarRect
            ? {
                left: sidebarRect.left,
                right: sidebarRect.right,
                top: sidebarRect.top,
                bottom: sidebarRect.bottom,
              }
            : null,
        };
      });

    const initial = await readInteractionState();
    expect(initial.triggerRect).not.toBeNull();
    expect(initial.sidebarRect).not.toBeNull();

    await page.mouse.click(
      (initial.triggerRect?.left ?? 0) + 2,
      ((initial.triggerRect?.top ?? 0) + (initial.triggerRect?.bottom ?? 0)) / 2,
    );
    await waitForHeaderCorpusPanelReady(page);
    const afterCorpusClick = await readInteractionState();
    expect(afterCorpusClick.dropdownExpanded).toBe('true');
    expect(afterCorpusClick.dropdownPhase).toBe('ready');
    expect(afterCorpusClick.sidebarExpanded).toBe(initial.sidebarExpanded);

    await page.evaluate(() => {
      const header = document.querySelector('layout-header');
      const dropdown = header?.shadowRoot?.querySelector<HTMLElement & { close?: () => void }>(
        '.corpus-switcher',
      );
      dropdown?.close?.();
    });
    await expect
      .poll(async () => (await readInteractionState()).dropdownPhase)
      .toBe('idle');

    const beforeSidebarClick = await readInteractionState();
    await page.mouse.click(
      (beforeSidebarClick.sidebarRect?.right ?? 0) - 2,
      ((beforeSidebarClick.sidebarRect?.top ?? 0) + (beforeSidebarClick.sidebarRect?.bottom ?? 0)) /
        2,
    );
    await expect
      .poll(async () => (await readInteractionState()).sidebarExpanded)
      .not.toBe(beforeSidebarClick.sidebarExpanded);
    const afterSidebarClick = await readInteractionState();
    expect(afterSidebarClick.dropdownExpanded).not.toBe('true');
    expect(afterSidebarClick.dropdownPhase).toBe('idle');
  });
});
