import { expect, test, type Page } from '@playwright/test';

import { e2eNoteFixtures } from './support/note-fixtures.js';

const layoutRichPath = e2eNoteFixtures.layoutRich.directPath;
const aboutPath = '/about/';

const waitForHeaderTrigger = async (page: Page): Promise<void> => {
  await expect
    .poll(async () => {
      return await page.evaluate(() => {
        const header = document.querySelector('layout-header');
        const trigger = header?.shadowRoot?.querySelector<HTMLButtonElement>('.toc-trigger');
        return trigger instanceof HTMLButtonElement && getComputedStyle(trigger).display !== 'none';
      });
    })
    .toBe(true);
};

const waitForAboutHeaderStable = async (page: Page): Promise<void> => {
  await expect
    .poll(async () =>
      await page.evaluate(async () => {
        await customElements.whenDefined('layout-header');

        const header = document.querySelector('layout-header') as
          | (HTMLElement & { updateComplete?: Promise<unknown> })
          | null;

        if (!(header instanceof HTMLElement)) {
          return false;
        }

        if (header.updateComplete instanceof Promise) {
          await header.updateComplete;
        }

        return (
          header.getAttribute('toc-presence') === 'absent' &&
          header.getAttribute('toc-trigger-reserved') === 'false' &&
          !header.hasAttribute('toc-runtime-id') &&
          !header.hasAttribute('data-toc-owner-id') &&
          header.shadowRoot?.querySelector('.toc-trigger') instanceof HTMLButtonElement
        );
      }),
    )
    .toBe(true);
};

const readLayoutState = async (page: Page, shellSelector: string) =>
  await page.evaluate((selector) => {
    const shell = document.querySelector(selector);
    const header = document.querySelector<HTMLElement>('layout-header');
    const toc = document.querySelector('layout-toc');
    const uiHeader = header?.shadowRoot?.querySelector('ui-header');
    const trigger = header?.shadowRoot?.querySelector<HTMLButtonElement>('.toc-trigger') ?? null;
    const triggerText = header?.shadowRoot?.querySelector<HTMLElement>('.toc-trigger-text') ?? null;
    const compactLabel =
      header?.shadowRoot?.querySelector<HTMLElement>('.compact-note-label') ?? null;
    const corpusSwitcher =
      header?.shadowRoot?.querySelector<HTMLElement>('.corpus-switcher') ?? null;
    const themeChevron = header?.shadowRoot?.querySelector<HTMLElement>('.theme-chevron') ?? null;
    const mobileBar = toc?.shadowRoot?.querySelector('.mobile-bar') ?? null;
    const mobilePanel = document.querySelector('[data-layout-toc-mobile-panel]');
    const layoutTocController = document.querySelector('layout-toc-controller');
    const zoneStart = uiHeader?.shadowRoot?.querySelector<HTMLElement>('.zone-start') ?? null;
    const zoneEnd = uiHeader?.shadowRoot?.querySelector<HTMLElement>('.zone-end') ?? null;

    if (!(shell instanceof HTMLElement)) {
      return null;
    }

    const staticTocNav = shell.querySelector<HTMLElement>('[data-layout-toc-nav]');
    const isVisible = (element: Element | null): element is HTMLElement => {
      if (!(element instanceof HTMLElement)) {
        return false;
      }

      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        rect.width > 0 &&
        rect.height > 0
      );
    };

    const toRect = (element: Element | null) => {
      if (!(element instanceof HTMLElement)) {
        return null;
      }

      const rect = element.getBoundingClientRect();
      return {
        right: Math.round(rect.right),
      };
    };

    const shellColumns = getComputedStyle(shell).gridTemplateColumns.trim();
    const shellTrackCount = shellColumns.length === 0 ? 0 : shellColumns.split(/\s+/u).length;
    const triggerRect = toRect(trigger);

    return {
      shellTrackCount,
      horizontalOverflow:
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
      headerTocPresence: header instanceof HTMLElement ? header.getAttribute('toc-presence') : null,
      headerTocRuntimeId:
        header instanceof HTMLElement ? header.getAttribute('toc-runtime-id') : null,
      headerOwnerId:
        header instanceof HTMLElement ? header.getAttribute('data-toc-owner-id') : null,
      headerTocTriggerReserved:
        header instanceof HTMLElement ? header.getAttribute('toc-trigger-reserved') : null,
      triggerExists: trigger instanceof HTMLButtonElement,
      triggerVisible:
        trigger instanceof HTMLButtonElement ? getComputedStyle(trigger).display !== 'none' : false,
      triggerDisabled: trigger instanceof HTMLButtonElement ? trigger.disabled : null,
      triggerDataVisible:
        trigger instanceof HTMLButtonElement ? (trigger.dataset['visible'] ?? null) : null,
      triggerDataReserved:
        trigger instanceof HTMLButtonElement ? (trigger.dataset['reserved'] ?? null) : null,
      triggerTocTriggerReserved:
        trigger instanceof HTMLButtonElement
          ? (trigger.dataset['tocTriggerReserved'] ?? null)
          : null,
      triggerTocTriggerInteractive:
        trigger instanceof HTMLButtonElement
          ? (trigger.dataset['tocTriggerInteractive'] ?? null)
          : null,
      triggerHydrationState:
        trigger instanceof HTMLButtonElement ? (trigger.dataset['tocHydrationState'] ?? null) : null,
      triggerControls:
        trigger instanceof HTMLButtonElement ? trigger.getAttribute('aria-controls') : null,
      triggerRight: triggerRect ? triggerRect.right : null,
      viewportWidth: window.innerWidth,
      mobileBarExists: mobileBar instanceof HTMLElement,
      mobilePanelExists: mobilePanel instanceof HTMLElement,
      staticTocNavExists: staticTocNav instanceof HTMLElement,
      layoutTocControllerExists: layoutTocController instanceof HTMLElement,
      compactLabelExists: compactLabel instanceof HTMLElement,
      corpusSwitcherVisible: isVisible(corpusSwitcher),
      themeChevronExists: themeChevron instanceof HTMLElement,
      triggerTextVisible: isVisible(triggerText),
      triggerProgressExists:
        header?.shadowRoot?.querySelector<HTMLElement>('.toc-trigger-progress') instanceof
        HTMLElement,
      zoneStartExists: zoneStart instanceof HTMLElement,
      zoneEndExists: zoneEnd instanceof HTMLElement,
    };
  }, shellSelector);

test.describe('mobile TOC layout contract after header integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 900 });
  });

  test('note ページが mobile で compact-center を出さず、icon-only TOC と corpus 後退を使うこと', async ({
    page,
  }) => {
    await page.goto(layoutRichPath);
    await waitForHeaderTrigger(page);

    const state = await readLayoutState(page, '.note-shell');
    expect(state).not.toBeNull();
    expect(state?.shellTrackCount).toBe(1);
    expect(state?.horizontalOverflow).toBeLessThanOrEqual(1);
    expect(state?.triggerExists).toBe(true);
    expect(state?.triggerHydrationState).toBe('hydrated');
    expect(state?.triggerTextVisible).toBe(false);
    expect(state?.triggerProgressExists).toBe(false);
    expect(state?.compactLabelExists).toBe(false);
    expect(state?.corpusSwitcherVisible).toBe(false);
    expect(state?.themeChevronExists).toBe(false);
    expect(state?.mobileBarExists).toBe(false);
    expect(state?.mobilePanelExists).toBe(true);
    expect(state?.zoneStartExists).toBe(true);
    expect(state?.zoneEndExists).toBe(true);
    expect(state?.triggerRight ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(
      (state?.viewportWidth ?? 0) + 1,
    );
  });

  test('about ページが mobile で TOC DOM を出さず、header trigger を非表示・非活性にすること', async ({
    page,
  }) => {
    await page.goto(aboutPath);
    await waitForAboutHeaderStable(page);

    const state = await readLayoutState(page, '.about-shell');
    expect(state).not.toBeNull();
    expect(state?.horizontalOverflow).toBeLessThanOrEqual(1);
    expect(state?.mobileBarExists).toBe(false);
    expect(state?.mobilePanelExists).toBe(false);
    expect(state?.staticTocNavExists).toBe(false);
    expect(state?.layoutTocControllerExists).toBe(false);

    expect(state?.headerTocPresence).toBe('absent');
    expect(state?.headerTocRuntimeId).toBeNull();
    expect(state?.headerOwnerId).toBeNull();
    expect(state?.headerTocTriggerReserved).toBe('false');

    expect(state?.triggerExists).toBe(true);
    expect(state?.triggerVisible).toBe(false);
    expect(state?.triggerDisabled).toBe(true);
    expect(state?.triggerDataVisible).toBe('false');
    expect(state?.triggerDataReserved).toBe('false');
    expect(state?.triggerTocTriggerReserved).toBe('false');
    expect(state?.triggerTocTriggerInteractive).toBe('false');
    expect(state?.triggerHydrationState).toBe('unhydrated');
    expect(state?.triggerControls).toBeNull();
  });

  test('note と about の両方で旧 mobile bar なしにページ種別ごとの header trigger 状態を使うこと', async ({
    page,
  }) => {
    await page.goto(layoutRichPath);
    await waitForHeaderTrigger(page);
    const noteState = await readLayoutState(page, '.note-shell');

    await page.goto(aboutPath);
    await waitForAboutHeaderStable(page);
    const aboutState = await readLayoutState(page, '.about-shell');

    expect(noteState).not.toBeNull();
    expect(aboutState).not.toBeNull();
    expect(noteState?.shellTrackCount).toBe(1);
    expect(aboutState?.horizontalOverflow).toBeLessThanOrEqual(1);
    expect(noteState?.horizontalOverflow).toBeLessThanOrEqual(1);
    expect(noteState?.triggerExists).toBe(true);
    expect(noteState?.mobileBarExists).toBe(false);
    expect(aboutState?.mobileBarExists).toBe(false);
    expect(aboutState?.mobilePanelExists).toBe(false);
    expect(aboutState?.staticTocNavExists).toBe(false);
    expect(aboutState?.layoutTocControllerExists).toBe(false);
    expect(aboutState?.triggerExists).toBe(true);
    expect(aboutState?.triggerVisible).toBe(false);
    expect(aboutState?.triggerDisabled).toBe(true);
  });
});
