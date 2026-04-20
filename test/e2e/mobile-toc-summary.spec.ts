import { expect, test, type Page } from '@playwright/test';

import { e2eNoteFixtures } from './support/note-fixtures.js';

const layoutRichPath = e2eNoteFixtures.layoutRich.directPath;
const aboutPath = '/about/';

const waitForTocHydrated = async (page: Page): Promise<void> => {
  await page.waitForFunction(() => {
    const toc = document.querySelector('layout-toc');
    return toc instanceof HTMLElement && toc.shadowRoot instanceof ShadowRoot;
  });
};

const waitForHeaderTrigger = async (page: Page): Promise<void> => {
  await expect
    .poll(async () => {
      return await page.evaluate(() => {
        const header = document.querySelector('layout-header');
        const trigger = header?.shadowRoot?.querySelector<HTMLButtonElement>('.toc-trigger');
        if (!(trigger instanceof HTMLButtonElement)) {
          return false;
        }

        return getComputedStyle(trigger).display !== 'none';
      });
    })
    .toBe(true);
};

const clickHeaderTrigger = async (page: Page): Promise<void> => {
  await page.evaluate(() => {
    const header = document.querySelector('layout-header');
    const trigger = header?.shadowRoot?.querySelector<HTMLButtonElement>('.toc-trigger');
    if (!(trigger instanceof HTMLButtonElement)) {
      throw new Error('header toc trigger が見つかりません');
    }

    trigger.click();
  });
};

const readMobilePanelState = async (page: Page) =>
  await page.evaluate(() => {
    const header = document.querySelector('layout-header');
    const toc = document.querySelector('layout-toc');
    const trigger = header?.shadowRoot?.querySelector<HTMLButtonElement>('.toc-trigger');
    const panel = toc?.shadowRoot?.querySelector<HTMLElement>('.mobile-panel');
    const mobileBar = toc?.shadowRoot?.querySelector('.mobile-bar');
    const headerHost = header instanceof HTMLElement ? header : null;

    const triggerRect = trigger instanceof HTMLElement ? trigger.getBoundingClientRect() : null;
    const panelRect = panel instanceof HTMLElement ? panel.getBoundingClientRect() : null;
    const headerRect = headerHost?.getBoundingClientRect() ?? null;

    return {
      triggerExists: trigger instanceof HTMLElement,
      triggerVisible: trigger instanceof HTMLElement ? getComputedStyle(trigger).display !== 'none' : false,
      triggerExpanded: trigger instanceof HTMLElement ? trigger.getAttribute('aria-expanded') : null,
      triggerControls: trigger instanceof HTMLElement ? trigger.getAttribute('aria-controls') : null,
      triggerText: trigger instanceof HTMLElement ? (trigger.textContent?.trim() ?? '') : null,
      panelExists: panel instanceof HTMLElement,
      panelOpen: panel instanceof HTMLElement ? panel.getAttribute('data-open') === 'true' : false,
      panelAriaHidden: panel instanceof HTMLElement ? panel.getAttribute('aria-hidden') : null,
      panelTop: panelRect ? Math.round(panelRect.top) : null,
      headerBottom: headerRect ? Math.round(headerRect.bottom) : null,
      mobileBarExists: mobileBar instanceof HTMLElement,
      triggerTop: triggerRect ? Math.round(triggerRect.top) : null,
    };
  });

test.describe('mobile TOC header trigger contract', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 900 });
  });

  for (const path of [layoutRichPath, aboutPath]) {
    test(`${path} で mobile TOC trigger が header に現れ、旧 mobile bar を描画しないこと`, async ({
      page,
    }) => {
      await page.goto(path);
      await waitForTocHydrated(page);
      await waitForHeaderTrigger(page);

      const state = await readMobilePanelState(page);
      expect(state.triggerExists).toBe(true);
      expect(state.triggerVisible).toBe(true);
      expect(state.panelExists).toBe(true);
      expect(state.mobileBarExists).toBe(false);
      expect(state.triggerExpanded).toBe('false');
      expect(state.panelAriaHidden).toBe('true');
      expect((state.triggerText ?? '').length).toBeGreaterThan(0);
      expect(state.triggerControls).toMatch(/^layout-toc-panel-/);
    });
  }

  test('note ページで header trigger 押下により panel が header 直下から開閉すること', async ({ page }) => {
    await page.goto(layoutRichPath);
    await waitForTocHydrated(page);
    await waitForHeaderTrigger(page);

    await clickHeaderTrigger(page);
    await expect
      .poll(async () => (await readMobilePanelState(page)).panelOpen)
      .toBe(true);

    let state = await readMobilePanelState(page);
    expect(state.triggerExpanded).toBe('true');
    expect(state.panelAriaHidden).toBe('false');
    expect(Math.abs((state.panelTop ?? 0) - (state.headerBottom ?? 0))).toBeLessThanOrEqual(1);

    await clickHeaderTrigger(page);
    await expect
      .poll(async () => (await readMobilePanelState(page)).panelOpen)
      .toBe(false);

    state = await readMobilePanelState(page);
    expect(state.triggerExpanded).toBe('false');
    expect(state.panelAriaHidden).toBe('true');
  });

  test('長スクロール後でも panel 開閉位置が header 直下で安定すること', async ({ page }) => {
    await page.goto(aboutPath);
    await waitForTocHydrated(page);
    await waitForHeaderTrigger(page);

    await page.evaluate(() => {
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' });
    });

    await clickHeaderTrigger(page);
    await expect
      .poll(async () => (await readMobilePanelState(page)).panelOpen)
      .toBe(true);

    const state = await readMobilePanelState(page);
    expect(Math.abs((state.panelTop ?? 0) - (state.headerBottom ?? 0))).toBeLessThanOrEqual(1);
    expect(state.mobileBarExists).toBe(false);
  });
});
