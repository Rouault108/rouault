import { expect, test } from '@playwright/test';

const aboutPath = '/about/';

const readAboutLayout = async () => {
  const shell = document.querySelector<HTMLElement>('.about-shell');
  const main = document.querySelector<HTMLElement>('.about-shell > .about-main-col');
  const toc = document.querySelector<HTMLElement>('.about-shell > .layout-toc-col');

  if (
    !(shell instanceof HTMLElement) ||
    !(main instanceof HTMLElement) ||
    !(toc instanceof HTMLElement)
  ) {
    return null;
  }

  const shellStyle = getComputedStyle(shell);
  const shellRect = shell.getBoundingClientRect();
  const mainRect = main.getBoundingClientRect();
  const tocRect = toc.getBoundingClientRect();
  const gridTemplateColumns = shellStyle.gridTemplateColumns.trim();
  const trackCount =
    gridTemplateColumns.length === 0 ? 0 : gridTemplateColumns.split(/\s+/u).length;
  const toNumber = (value: string): number => Number.parseFloat(value);

  return {
    shellWidth: Math.round(shellRect.width),
    viewportWidth: window.innerWidth,
    mainWidth: Math.round(mainRect.width),
    tocWidth: Math.round(tocRect.width),
    renderedGap: Math.round(tocRect.left - mainRect.right),
    columnGap: shellStyle.columnGap,
    expectedGap: toNumber(shellStyle.columnGap),
    expectedTocWidth: toNumber(shellStyle.getPropertyValue('--about-toc-inline-size')),
    maxWidth: shellStyle.maxWidth,
    trackCount,
  };
};

test.describe('About layout', () => {
  test('desktop 幅では About shell が本文トラックと明示 gap と TOC 幅に収まること', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(aboutPath);

    const state = await page.evaluate(readAboutLayout);

    if (state === null) {
      throw new Error('about layout elements were not found');
    }

    expect(state.trackCount).toBe(2);
    expect(state.columnGap).toBe(`${state.expectedGap}px`);
    expect(state.tocWidth).toBe(state.expectedTocWidth);
    expect(state.renderedGap).toBe(state.expectedGap);
    expect(state.shellWidth).toBe(state.mainWidth + state.renderedGap + state.tocWidth);
    expect(state.shellWidth).toBeLessThan(state.viewportWidth);
  });

  test('1024px 未満では desktop gap 補正を適用しないこと', async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 900 });
    await page.goto(aboutPath);

    const state = await page.evaluate(readAboutLayout);

    if (state === null) {
      throw new Error('about layout elements were not found');
    }

    expect(state.trackCount).toBe(2);
    expect(state.renderedGap).toBe(0);
    expect(state.shellWidth).toBe(state.viewportWidth);
    expect(state.maxWidth).toBe('1280px');
  });
});
