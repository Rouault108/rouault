import { expect, test, type Page } from '@playwright/test';

import { e2eNoteFixtures } from './support/note-fixtures.js';

const fixturePath = e2eNoteFixtures.tocReadableLongHeading.directPath;
const longHeadingPrefix = '第2章 ソースコードから実行まで';
const panelSelector = '[data-layout-toc-mobile-panel]';

const waitForTocReady = async (page: Page): Promise<void> => {
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const nav = document.querySelector('[data-layout-toc-nav]');
        const controller = document.querySelector('layout-toc-controller');
        return nav instanceof HTMLElement && controller instanceof HTMLElement;
      }),
    )
    .toBe(true);
};

const activateLongHeading = async (page: Page): Promise<void> => {
  await page.evaluate((prefix) => {
    const link = Array.from(
      document.querySelectorAll<HTMLAnchorElement>('[data-layout-toc-nav] [data-toc-link]'),
    ).find((candidate) => candidate.textContent?.includes(prefix) === true);
    if (!(link instanceof HTMLAnchorElement)) {
      throw new Error(`long heading TOC link not found: ${prefix}`);
    }
    link.click();
  }, longHeadingPrefix);

  await expect
    .poll(async () =>
      page.evaluate((prefix) => {
        const active = document.querySelector<HTMLElement>(
          '[data-layout-toc-nav] [data-toc-link][aria-current="location"]',
        );
        return active?.textContent?.includes(prefix) === true;
      }, longHeadingPrefix),
    )
    .toBe(true);
};

const readDesktopTocStyle = async (page: Page) =>
  page.evaluate((prefix) => {
    const nav = document.querySelector<HTMLElement>('[data-layout-toc-nav]');
    const inactiveLink = Array.from(
      document.querySelectorAll<HTMLElement>('[data-layout-toc-nav] [data-toc-link]'),
    ).find((link) => link.textContent?.includes(prefix) === false);
    const activeLink = document.querySelector<HTMLElement>(
      '[data-layout-toc-nav] [data-toc-link][aria-current="location"]',
    );
    const inactiveLabel =
      inactiveLink?.querySelector<HTMLElement>('.layout-toc__link-label') ?? inactiveLink ?? null;
    const activeLabel =
      activeLink?.querySelector<HTMLElement>('.layout-toc__link-label') ?? activeLink ?? null;
    const inactiveStyle =
      inactiveLabel instanceof HTMLElement ? getComputedStyle(inactiveLabel) : null;
    const activeStyle = activeLabel instanceof HTMLElement ? getComputedStyle(activeLabel) : null;
    const tocRect = nav?.getBoundingClientRect() ?? null;

    return {
      densityTier:
        nav?.getAttribute('data-density-tier') ??
        nav?.closest<HTMLElement>('[data-density-tier]')?.getAttribute('data-density-tier') ??
        null,
      horizontalOverflow:
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
      tocRight: tocRect === null ? null : Math.round(tocRect.right),
      viewportWidth: window.innerWidth,
      inactiveWhiteSpace: inactiveStyle?.whiteSpace ?? null,
      inactiveTextOverflow: inactiveStyle?.textOverflow ?? null,
      inactiveClamp: inactiveStyle?.webkitLineClamp ?? null,
      activeClamp: activeStyle?.webkitLineClamp ?? null,
      activeTextIncludesLongHeading: activeLabel?.textContent?.includes(prefix) ?? false,
    };
  }, longHeadingPrefix);

const openMobilePanel = async (page: Page): Promise<void> => {
  await expect
    .poll(async () =>
      page.evaluate((selector) => {
        const header = document.querySelector('layout-header');
        const trigger = header?.shadowRoot?.querySelector<HTMLButtonElement>('.toc-trigger');
        const panel = document.querySelector<HTMLElement>(selector);
        return (
          trigger instanceof HTMLButtonElement &&
          trigger.getAttribute('data-toc-trigger-interactive') === 'true' &&
          panel instanceof HTMLElement
        );
      }, panelSelector),
    )
    .toBe(true);

  await page.evaluate(() => {
    const header = document.querySelector('layout-header');
    const trigger = header?.shadowRoot?.querySelector<HTMLButtonElement>('.toc-trigger');
    if (!(trigger instanceof HTMLButtonElement)) {
      throw new Error('mobile TOC trigger not found');
    }
    trigger.click();
  });

  await expect
    .poll(async () =>
      page.evaluate((selector) => {
        const panel = document.querySelector<HTMLElement>(selector);
        return panel instanceof HTMLElement && !panel.hasAttribute('hidden');
      }, panelSelector),
    )
    .toBe(true);
};

const readMobilePanelStyle = async (page: Page) =>
  page.evaluate((selector) => {
    const panel = document.querySelector<HTMLElement>(selector);
    const inactiveLabel =
      panel?.querySelector<HTMLElement>(
        '[data-layout-toc-mobile-nav] [data-toc-link] .layout-toc__link-label',
      ) ??
      panel?.querySelector<HTMLElement>('[data-layout-toc-mobile-nav] [data-toc-link]') ??
      null;
    const activeLabel =
      panel?.querySelector<HTMLElement>(
        '[data-layout-toc-mobile-nav] [data-toc-link][aria-current="location"] .layout-toc__link-label',
      ) ??
      panel?.querySelector<HTMLElement>(
        '[data-layout-toc-mobile-nav] [data-toc-link][aria-current="location"]',
      ) ??
      null;
    const inactiveStyle =
      inactiveLabel instanceof HTMLElement ? getComputedStyle(inactiveLabel) : null;
    const activeStyle = activeLabel instanceof HTMLElement ? getComputedStyle(activeLabel) : null;

    return {
      panelExists: panel instanceof HTMLElement,
      panelAriaHidden: panel?.getAttribute('aria-hidden') ?? null,
      panelDensityTier: panel?.getAttribute('data-density-tier') ?? null,
      inactiveClamp: inactiveStyle?.webkitLineClamp ?? null,
      inactiveWhiteSpace: inactiveStyle?.whiteSpace ?? null,
      activeClamp: activeStyle?.webkitLineClamp ?? null,
    };
  }, panelSelector);

test.describe('readable long heading TOC contract', () => {
  test('desktop TOC keeps long Japanese headings readable without horizontal overflow', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(fixturePath);
    await waitForTocReady(page);
    await activateLongHeading(page);
    await expect.poll(async () => (await readDesktopTocStyle(page)).activeClamp).toBe('3');

    const state = await readDesktopTocStyle(page);
    expect(state.densityTier).toBe('compact');
    expect(state.horizontalOverflow).toBeLessThanOrEqual(1);
    expect(state.tocRight ?? 0).toBeLessThanOrEqual(state.viewportWidth + 1);
    expect(state.inactiveWhiteSpace).toBe('normal');
    expect(state.inactiveTextOverflow).not.toBe('ellipsis');
    expect(state.inactiveClamp).toBe('2');
    expect(state.activeClamp).toBe('3');
    expect(state.activeTextIncludesLongHeading).toBe(true);
  });

  test('mobile panel clone uses the same wrapping contract and DOM hook', async ({ page }) => {
    await page.setViewportSize({ width: 400, height: 900 });
    await page.goto(fixturePath);
    await waitForTocReady(page);
    await activateLongHeading(page);
    await openMobilePanel(page);

    const state = await readMobilePanelStyle(page);
    expect(state.panelExists).toBe(true);
    expect(state.panelAriaHidden).toBe('false');
    expect(state.panelDensityTier).toBe('compact');
    expect(state.inactiveWhiteSpace).toBe('normal');
    expect(state.inactiveClamp).toBe('2');
    expect(state.activeClamp).toBe('3');
  });
});
