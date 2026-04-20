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

const waitForCompactCenterLabel = async (page: Page): Promise<void> => {
  await expect
    .poll(async () => {
      return await page.evaluate(() => {
        const header = document.querySelector('layout-header');
        const label = header?.shadowRoot?.querySelector<HTMLElement>('.compact-note-label');
        if (!(label instanceof HTMLElement)) {
          return false;
        }

        const style = getComputedStyle(label);
        return (
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          (label.textContent?.trim().length ?? 0) > 0
        );
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

    const overlaps = (
      a: ReturnType<typeof toRect>,
      b: ReturnType<typeof toRect>,
    ): boolean => {
      if (a === null || b === null) {
        return false;
      }

      return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
    };

    const shellColumns = getComputedStyle(shell).gridTemplateColumns.trim();
    const shellTrackCount = shellColumns.length === 0 ? 0 : shellColumns.split(/\s+/u).length;
    const triggerRect = toRect(trigger);
    const compactLabelRect = toRect(compactLabel);
    const zoneStartRect = toRect(zoneStart);
    const zoneEndRect = toRect(zoneEnd);

    return {
      shellTrackCount,
      horizontalOverflow:
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
      triggerExists: trigger instanceof HTMLElement,
      triggerLeft: triggerRect ? triggerRect.left : null,
      triggerRight: triggerRect ? triggerRect.right : null,
      viewportWidth: window.innerWidth,
      mobileBarExists: mobileBar instanceof HTMLElement,
      compactLabelExists: compactLabel instanceof HTMLElement,
      compactLabelVisible: isVisible(compactLabel),
      compactLabelText:
        compactLabel instanceof HTMLElement ? (compactLabel.textContent?.trim() ?? '') : null,
      compactLabelPointerEvents:
        compactLabel instanceof HTMLElement ? getComputedStyle(compactLabel).pointerEvents : null,
      corpusSwitcherVisible: isVisible(corpusSwitcher),
      themeChevronVisible: isVisible(themeChevron),
      compactLabelOverlapsStart: overlaps(compactLabelRect, zoneStartRect),
      compactLabelOverlapsEnd: overlaps(compactLabelRect, zoneEndRect),
    };
  }, shellSelector);

test.describe('mobile TOC layout contract after header integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 900 });
  });

  test('note ページが mobile で compact-center ラベルを表示し、end/start と重ならず、corpus を後退させること', async ({
    page,
  }) => {
    await page.goto(layoutRichPath);
    await waitForHeaderTrigger(page);
    await waitForCompactCenterLabel(page);

    const state = await readLayoutState(page, '.note-shell');
    expect(state).not.toBeNull();
    expect(state?.shellTrackCount).toBe(1);
    expect(state?.horizontalOverflow).toBeLessThanOrEqual(1);
    expect(state?.triggerExists).toBe(true);
    expect(state?.compactLabelExists).toBe(true);
    expect(state?.compactLabelVisible).toBe(true);
    expect((state?.compactLabelText ?? '').length).toBeGreaterThan(0);
    expect(state?.compactLabelPointerEvents).toBe('none');
    expect(state?.corpusSwitcherVisible).toBe(false);
    expect(state?.themeChevronVisible).toBe(false);
    expect(state?.compactLabelOverlapsStart).toBe(false);
    expect(state?.compactLabelOverlapsEnd).toBe(false);
    expect(state?.mobileBarExists).toBe(false);
    expect(state?.triggerRight ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(
      (state?.viewportWidth ?? 0) + 1,
    );
  });

  test('about ページが mobile で 1 カラム契約を維持し、header trigger による横溢れを出さないこと', async ({
    page,
  }) => {
    await page.goto(aboutPath);
    await waitForHeaderTrigger(page);

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
    await waitForHeaderTrigger(page);
    const aboutState = await readLayoutState(page, '.about-shell');

    expect(noteState).not.toBeNull();
    expect(aboutState).not.toBeNull();
    expect(noteState?.shellTrackCount).toBe(1);
    expect(aboutState?.shellTrackCount).toBe(1);
    expect(noteState?.horizontalOverflow).toBeLessThanOrEqual(1);
    expect(aboutState?.horizontalOverflow).toBeLessThanOrEqual(1);
    expect(noteState?.mobileBarExists).toBe(false);
    expect(aboutState?.mobileBarExists).toBe(false);
  });
});
