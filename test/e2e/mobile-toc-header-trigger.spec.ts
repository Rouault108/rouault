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
    const triggerText = header?.shadowRoot?.querySelector<HTMLElement>('.toc-trigger-text');
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
      triggerAriaLabel: trigger instanceof HTMLElement ? trigger.getAttribute('aria-label') : null,
      triggerTextContent:
        triggerText instanceof HTMLElement ? (triggerText.textContent?.trim() ?? '') : null,
      triggerTextVisible:
        triggerText instanceof HTMLElement ? getComputedStyle(triggerText).display !== 'none' : false,
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
  for (const [path, width, expectedTextVisible] of [
    [layoutRichPath, 375, false],
    [layoutRichPath, 400, true],
    [aboutPath, 375, false],
    [aboutPath, 400, true],
  ] as const) {
    test(`${path} で ${width}px 契約の mobile TOC trigger が成立し、旧 mobile bar を描画しないこと`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(path);
      await waitForTocHydrated(page);
      await waitForHeaderTrigger(page);

      const state = await readMobilePanelState(page);
      expect(state.triggerExists).toBe(true);
      expect(state.triggerVisible).toBe(true);
      expect(state.panelExists).toBe(true);
      expect(state.mobileBarExists).toBe(false);
      expect(state.triggerExpanded).toBe('false');
      expect(state.triggerAriaLabel).toBe('目次を開く');
      expect(state.panelAriaHidden).toBe('true');
      expect(state.triggerTextContent).toBe('目次');
      expect(state.triggerTextVisible).toBe(expectedTextVisible);
      expect(state.triggerControls).toMatch(/^layout-toc-panel-/);
    });
  }

  test('note ページで header trigger 押下により panel が header 直下から開閉すること', async ({ page }) => {
    await page.setViewportSize({ width: 400, height: 900 });
    await page.goto(layoutRichPath);
    await waitForTocHydrated(page);
    await waitForHeaderTrigger(page);

    await clickHeaderTrigger(page);
    await expect
      .poll(async () => (await readMobilePanelState(page)).panelOpen)
      .toBe(true);

    let state = await readMobilePanelState(page);
    expect(state.triggerExpanded).toBe('true');
    expect(state.triggerAriaLabel).toBe('目次を閉じる');
    expect(state.panelAriaHidden).toBe('false');
    expect(Math.abs((state.panelTop ?? 0) - (state.headerBottom ?? 0))).toBeLessThanOrEqual(1);

    await clickHeaderTrigger(page);
    await expect
      .poll(async () => (await readMobilePanelState(page)).panelOpen)
      .toBe(false);

    state = await readMobilePanelState(page);
    expect(state.triggerExpanded).toBe('false');
    expect(state.triggerAriaLabel).toBe('目次を開く');
    expect(state.panelAriaHidden).toBe('true');
  });

  test('長スクロール後でも panel 開閉位置が header 直下で安定すること', async ({ page }) => {
    await page.setViewportSize({ width: 400, height: 900 });
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
