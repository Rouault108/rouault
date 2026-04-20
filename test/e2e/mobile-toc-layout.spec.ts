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
    const trigger = header?.shadowRoot?.querySelector<HTMLElement>('.toc-trigger');
    const mobileBar = toc?.shadowRoot?.querySelector('.mobile-bar');

    if (!(shell instanceof HTMLElement)) {
      return null;
    }

    const shellColumns = getComputedStyle(shell).gridTemplateColumns.trim();
    const shellTrackCount = shellColumns.length === 0 ? 0 : shellColumns.split(/\s+/u).length;
    const triggerRect = trigger instanceof HTMLElement ? trigger.getBoundingClientRect() : null;

    return {
      shellTrackCount,
      horizontalOverflow:
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
      triggerExists: trigger instanceof HTMLElement,
      triggerLeft: triggerRect ? Math.round(triggerRect.left) : null,
      triggerRight: triggerRect ? Math.round(triggerRect.right) : null,
      viewportWidth: window.innerWidth,
      mobileBarExists: mobileBar instanceof HTMLElement,
    };
  }, shellSelector);

test.describe('mobile TOC layout contract after header integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 900 });
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
