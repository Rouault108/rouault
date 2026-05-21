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
        if (!(trigger instanceof HTMLButtonElement)) {
          return false;
        }

        return getComputedStyle(trigger).display !== 'none';
      });
    })
    .toBe(true);

  await expect
    .poll(async () => {
      return await page.evaluate(() => {
        const controller = document.querySelector('layout-toc-controller');
        const desktopNav = document.querySelector('[data-layout-toc-nav]');
        const panel = document.querySelector('[data-layout-toc-mobile-panel]');
        return (
          controller instanceof HTMLElement &&
          desktopNav instanceof HTMLElement &&
          panel instanceof HTMLElement
        );
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
    const trigger = header?.shadowRoot?.querySelector<HTMLButtonElement>('.toc-trigger');
    const triggerText = header?.shadowRoot?.querySelector<HTMLElement>('.toc-trigger-text');
    const panel = document.querySelector<HTMLElement>('[data-layout-toc-mobile-panel]');
    const closeButton = panel?.querySelector<HTMLButtonElement>('.layout-toc-mobile-panel__close');
    const tocNav = panel?.querySelector<HTMLElement>('[data-layout-toc-mobile-nav]');
    const headerHost = header instanceof HTMLElement ? header : null;

    const triggerRect = trigger instanceof HTMLElement ? trigger.getBoundingClientRect() : null;
    const panelRect = panel instanceof HTMLElement ? panel.getBoundingClientRect() : null;
    const headerRect = headerHost?.getBoundingClientRect() ?? null;

    return {
      headerOwnerId:
        headerHost instanceof HTMLElement ? headerHost.getAttribute('data-toc-owner-id') : null,
      triggerExists: trigger instanceof HTMLElement,
      triggerVisible:
        trigger instanceof HTMLElement ? getComputedStyle(trigger).display !== 'none' : false,
      triggerExpanded:
        trigger instanceof HTMLElement ? trigger.getAttribute('aria-expanded') : null,
      triggerControls:
        trigger instanceof HTMLElement ? trigger.getAttribute('aria-controls') : null,
      triggerAriaLabel: trigger instanceof HTMLElement ? trigger.getAttribute('aria-label') : null,
      triggerTextContent:
        triggerText instanceof HTMLElement ? (triggerText.textContent?.trim() ?? '') : null,
      triggerTextVisible:
        triggerText instanceof HTMLElement
          ? getComputedStyle(triggerText).display !== 'none'
          : false,
      panelExists: panel instanceof HTMLElement,
      panelOpen: panel instanceof HTMLElement ? !panel.hasAttribute('hidden') : false,
      panelAriaHidden: panel instanceof HTMLElement ? panel.getAttribute('aria-hidden') : null,
      panelHasVisibleTitle: false,
      closeButtonExists: closeButton instanceof HTMLButtonElement,
      closeButtonAriaLabel:
        closeButton instanceof HTMLButtonElement ? closeButton.getAttribute('aria-label') : null,
      tocNavAriaLabel: tocNav instanceof HTMLElement ? tocNav.getAttribute('aria-label') : null,
      panelTop: panelRect ? Math.round(panelRect.top) : null,
      headerBottom: headerRect ? Math.round(headerRect.bottom) : null,
      mobileBarExists: false,
      triggerTop: triggerRect ? Math.round(triggerRect.top) : null,
    };
  });

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

const readAboutHeaderTocAbsenceState = async (page: Page) =>
  await page.evaluate(() => {
    const header = document.querySelector<HTMLElement>('layout-header');
    const trigger = header?.shadowRoot?.querySelector<HTMLButtonElement>('.toc-trigger');
    const panel = document.querySelector<HTMLElement>('[data-layout-toc-mobile-panel]');
    const mobileNav = document.querySelector<HTMLElement>('[data-layout-toc-mobile-nav]');
    const layoutTocController = document.querySelector<HTMLElement>('layout-toc-controller');
    const desktopTocNav = document.querySelector<HTMLElement>('[data-layout-toc-nav]');

    return {
      headerTocPresence:
        header instanceof HTMLElement ? header.getAttribute('toc-presence') : null,
      headerTocTriggerReserved:
        header instanceof HTMLElement ? header.getAttribute('toc-trigger-reserved') : null,
      headerTocRuntimeId:
        header instanceof HTMLElement ? header.getAttribute('toc-runtime-id') : null,
      headerOwnerId:
        header instanceof HTMLElement ? header.getAttribute('data-toc-owner-id') : null,
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
      panelExists: panel instanceof HTMLElement,
      mobileNavExists: mobileNav instanceof HTMLElement,
      layoutTocControllerExists: layoutTocController instanceof HTMLElement,
      desktopTocNavExists: desktopTocNav instanceof HTMLElement,
    };
  });

test.describe('mobile TOC header trigger contract', () => {
  for (const [width, expectedTextVisible] of [
    [375, false],
    [400, true],
  ] as const) {
    test(`${layoutRichPath} で ${width}px 契約の mobile TOC trigger が成立し、旧 mobile bar を描画しないこと`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(layoutRichPath);
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
      expect(state.headerOwnerId).toMatch(/^toc-owner-/);
    });
  }

  test('note ページで header trigger 押下により panel が header 直下から開閉すること', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 400, height: 900 });
    await page.goto(layoutRichPath);
    await waitForHeaderTrigger(page);

    await clickHeaderTrigger(page);
    await expect.poll(async () => (await readMobilePanelState(page)).panelOpen).toBe(true);

    let state = await readMobilePanelState(page);
    expect(state.triggerExpanded).toBe('true');
    expect(state.triggerAriaLabel).toBe('目次を閉じる');
    expect(state.panelAriaHidden).toBe('false');
    expect(state.panelHasVisibleTitle).toBe(false);
    expect(state.closeButtonExists).toBe(true);
    expect(state.closeButtonAriaLabel).toBe('目次を閉じる');
    expect(state.tocNavAriaLabel).toBe('モバイル目次');
    expect(Math.abs((state.panelTop ?? 0) - (state.headerBottom ?? 0))).toBeLessThanOrEqual(1);

    await page.evaluate(() => {
      window.scrollTo({ top: 640, behavior: 'instant' });
    });

    state = await readMobilePanelState(page);
    expect(state.panelHasVisibleTitle).toBe(false);
    expect(state.mobileBarExists).toBe(false);

    await clickHeaderTrigger(page);
    await expect.poll(async () => (await readMobilePanelState(page)).panelOpen).toBe(false);

    state = await readMobilePanelState(page);
    expect(state.triggerExpanded).toBe('false');
    expect(state.triggerAriaLabel).toBe('目次を開く');
    expect(state.panelAriaHidden).toBe('true');
  });

  test('長スクロール後でも panel 開閉位置が header 直下で安定すること', async ({ page }) => {
    await page.setViewportSize({ width: 400, height: 900 });
    await page.goto(layoutRichPath);
    await waitForHeaderTrigger(page);

    await page.evaluate(() => {
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' });
    });

    await clickHeaderTrigger(page);
    await expect.poll(async () => (await readMobilePanelState(page)).panelOpen).toBe(true);

    const state = await readMobilePanelState(page);
    expect(Math.abs((state.panelTop ?? 0) - (state.headerBottom ?? 0))).toBeLessThanOrEqual(1);
    expect(state.mobileBarExists).toBe(false);
  });

  test('about ページでは mobile TOC trigger が非表示・非活性で panel を生成しないこと', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 400, height: 900 });
    await page.goto(aboutPath);
    await waitForAboutHeaderStable(page);

    const state = await readAboutHeaderTocAbsenceState(page);

    expect(state.headerTocPresence).toBe('absent');
    expect(state.headerTocTriggerReserved).toBe('false');
    expect(state.headerTocRuntimeId).toBeNull();
    expect(state.headerOwnerId).toBeNull();

    expect(state.triggerExists).toBe(true);
    expect(state.triggerVisible).toBe(false);
    expect(state.triggerDisabled).toBe(true);
    expect(state.triggerDataVisible).toBe('false');
    expect(state.triggerDataReserved).toBe('false');
    expect(state.triggerTocTriggerReserved).toBe('false');
    expect(state.triggerTocTriggerInteractive).toBe('false');
    expect(state.triggerHydrationState).toBe('unhydrated');
    expect(state.triggerControls).toBeNull();

    expect(state.panelExists).toBe(false);
    expect(state.mobileNavExists).toBe(false);
    expect(state.layoutTocControllerExists).toBe(false);
    expect(state.desktopTocNavExists).toBe(false);
  });


  test('TOC ありノートから About へ SPA 遷移しても旧 TOC DOM と header 属性を残さないこと', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 400, height: 900 });
    await page.goto(layoutRichPath);
    await waitForHeaderTrigger(page);

    await clickHeaderTrigger(page);
    await expect.poll(async () => (await readMobilePanelState(page)).panelOpen).toBe(true);
    await expect(page.locator('[data-layout-toc-mobile-panel]')).toHaveCount(1);
    await expect(page.locator('[data-layout-toc-mobile-nav]')).toHaveCount(1);
    await expect(page.locator('layout-toc-controller')).toHaveCount(1);
    await expect(page.locator('[data-layout-toc-nav]')).toHaveCount(1);

    const aboutLink = page.locator('[data-layout-footer] a[href="/about/"]').first();
    await expect(aboutLink).toBeVisible();
    await aboutLink.click();

    await expect(page).toHaveURL('/about/');
    await waitForAboutHeaderStable(page);

    await expect(page.locator('[data-layout-toc-mobile-panel]')).toHaveCount(0);
    await expect(page.locator('[data-layout-toc-mobile-nav]')).toHaveCount(0);
    await expect(page.locator('layout-toc-controller')).toHaveCount(0);
    await expect(page.locator('[data-layout-toc-nav]')).toHaveCount(0);

    const state = await readAboutHeaderTocAbsenceState(page);
    expect(state.headerTocPresence).toBe('absent');
    expect(state.headerTocTriggerReserved).toBe('false');
    expect(state.headerTocRuntimeId).toBeNull();
    expect(state.headerOwnerId).toBeNull();

    expect(state.triggerExists).toBe(true);
    expect(state.triggerVisible).toBe(false);
    expect(state.triggerDisabled).toBe(true);
    expect(state.triggerHydrationState).toBe('unhydrated');
    expect(state.triggerControls).toBeNull();
  });

});
