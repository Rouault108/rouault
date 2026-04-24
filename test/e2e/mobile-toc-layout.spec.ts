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

const readLayoutState = async (page: Page, shellSelector: string) =>
  await page.evaluate((selector) => {
    const shell = document.querySelector(selector);
    const header = document.querySelector('layout-header');
    const toc = document.querySelector('layout-toc');
    const uiHeader = header?.shadowRoot?.querySelector('ui-header');
    const trigger = header?.shadowRoot?.querySelector<HTMLElement>('.toc-trigger') ?? null;
    const triggerText = header?.shadowRoot?.querySelector<HTMLElement>('.toc-trigger-text') ?? null;
    const compactLabel =
      header?.shadowRoot?.querySelector<HTMLElement>('.compact-note-label') ?? null;
    const corpusSwitcher =
      header?.shadowRoot?.querySelector<HTMLElement>('.corpus-switcher') ?? null;
    const themeChevron = header?.shadowRoot?.querySelector<HTMLElement>('.theme-chevron') ?? null;
    const mobileBar = toc?.shadowRoot?.querySelector('.mobile-bar') ?? null;
    const zoneStart = uiHeader?.shadowRoot?.querySelector<HTMLElement>('.zone-start') ?? null;
    const zoneEnd = uiHeader?.shadowRoot?.querySelector<HTMLElement>('.zone-end') ?? null;

    if (!(shell instanceof HTMLElement)) {
      return null;
    }

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
        left: Math.round(rect.left),
        right: Math.round(rect.right),
        top: Math.round(rect.top),
        bottom: Math.round(rect.bottom),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      };
    };

    const shellColumns = getComputedStyle(shell).gridTemplateColumns.trim();
    const shellTrackCount = shellColumns.length === 0 ? 0 : shellColumns.split(/\s+/u).length;
    const triggerRect = toRect(trigger);

    return {
      shellTrackCount,
      horizontalOverflow:
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
      triggerExists: trigger instanceof HTMLElement,
      triggerRight: triggerRect ? triggerRect.right : null,
      viewportWidth: window.innerWidth,
      mobileBarExists: mobileBar instanceof HTMLElement,
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
    expect(state?.triggerTextVisible).toBe(false);
    expect(state?.triggerProgressExists).toBe(false);
    expect(state?.compactLabelExists).toBe(false);
    expect(state?.corpusSwitcherVisible).toBe(false);
    expect(state?.themeChevronExists).toBe(false);
    expect(state?.mobileBarExists).toBe(false);
    expect(state?.zoneStartExists).toBe(true);
    expect(state?.zoneEndExists).toBe(true);
    expect(state?.triggerRight ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(
      (state?.viewportWidth ?? 0) + 1,
    );
  });

  test('about ページが mobile で 1 カラム契約を維持し、header trigger による横溢れを出さないこと', async ({
    page,
  }) => {
    await page.goto(aboutPath);

    const state = await readLayoutState(page, '.about-shell');
    expect(state).not.toBeNull();
    expect(state?.shellTrackCount).toBe(1);
    expect(state?.horizontalOverflow).toBeLessThanOrEqual(1);
    expect(state?.triggerExists).toBe(true);
    expect(state?.mobileBarExists).toBe(false);
    expect(state?.triggerRight ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(
      (state?.viewportWidth ?? 0) + 1,
    );
  });

  test('note と about の両方で旧 mobile bar なしに header trigger を使うこと', async ({ page }) => {
    await page.goto(layoutRichPath);
    await waitForHeaderTrigger(page);
    const noteState = await readLayoutState(page, '.note-shell');

    await page.goto(aboutPath);
    const aboutState = await readLayoutState(page, '.about-shell');

    expect(noteState).not.toBeNull();
    expect(aboutState).not.toBeNull();
    expect(noteState?.shellTrackCount).toBe(1);
    expect(aboutState?.shellTrackCount).toBe(1);
    expect(noteState?.horizontalOverflow).toBeLessThanOrEqual(1);
    expect(aboutState?.horizontalOverflow).toBeLessThanOrEqual(1);
    expect(noteState?.triggerExists).toBe(true);
    expect(aboutState?.triggerExists).toBe(true);
    expect(noteState?.mobileBarExists).toBe(false);
    expect(aboutState?.mobileBarExists).toBe(false);
  });
});
