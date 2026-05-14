import { expect, test } from '@playwright/test';

const aboutPath = '/about/';

const readAboutLayout = async () => {
  const shell = document.querySelector<HTMLElement>('.about-shell');
  const main = document.querySelector<HTMLElement>('.about-shell > .about-main-col');
  const toc = document.querySelector<HTMLElement>('.about-shell > .layout-toc-col');
  const staticTocNav = document.querySelector<HTMLElement>('.about-shell [data-layout-toc-nav]');
  const controller = document.querySelector<HTMLElement>('layout-toc-controller');

  if (!(shell instanceof HTMLElement) || !(main instanceof HTMLElement)) {
    return null;
  }

  const shellStyle = getComputedStyle(shell);
  const mainStyle = getComputedStyle(main);
  const shellRect = shell.getBoundingClientRect();
  const mainRect = main.getBoundingClientRect();

  const resolveCssLength = (value: string): number => {
    const probe = document.createElement('div');
    probe.style.position = 'absolute';
    probe.style.visibility = 'hidden';
    probe.style.inlineSize = value.trim();
    document.body.append(probe);
    const resolved = probe.getBoundingClientRect().width;
    probe.remove();
    return resolved;
  };

  const maxWidthValue = mainStyle.getPropertyValue('--about-content-max-inline-size');
  const resolvedMaxWidth = resolveCssLength(maxWidthValue.length > 0 ? maxWidthValue : '52rem');

  return {
    shellExists: true,
    mainColExists: true,
    tocColExists: toc instanceof HTMLElement,
    staticTocNavExists: staticTocNav instanceof HTMLElement,
    layoutTocControllerExists: controller instanceof HTMLElement,
    shellDisplay: shellStyle.display,
    shellWidth: Math.round(shellRect.width),
    viewportWidth: window.innerWidth,
    mainWidth: Math.round(mainRect.width),
    resolvedMaxWidth: Math.round(resolvedMaxWidth),
    mainCenter: Math.round(mainRect.left + mainRect.width / 2),
    viewportCenter: Math.round(window.innerWidth / 2),
    horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  };
};

test.describe('About layout', () => {
  test('desktop 幅では About が TOC なし 1 カラム中央配置になること', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(aboutPath);

    const state = await page.evaluate(readAboutLayout);

    if (state === null) {
      throw new Error('about layout elements were not found');
    }

    expect(state.shellExists).toBe(true);
    expect(state.mainColExists).toBe(true);
    expect(state.tocColExists).toBe(false);
    expect(state.staticTocNavExists).toBe(false);
    expect(state.layoutTocControllerExists).toBe(false);
    expect(state.shellDisplay).not.toBe('grid');
    expect(state.mainWidth).toBeLessThanOrEqual(state.resolvedMaxWidth + 1);
    expect(Math.abs(state.mainCenter - state.viewportCenter)).toBeLessThanOrEqual(1);
    expect(state.horizontalOverflow).toBeLessThanOrEqual(1);
  });

  test('1024px 未満でも About が旧 TOC gap 補正に依存しないこと', async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 900 });
    await page.goto(aboutPath);

    const state = await page.evaluate(readAboutLayout);

    if (state === null) {
      throw new Error('about layout elements were not found');
    }

    expect(state.tocColExists).toBe(false);
    expect(state.staticTocNavExists).toBe(false);
    expect(state.layoutTocControllerExists).toBe(false);
    expect(state.shellDisplay).not.toBe('grid');
    expect(state.shellWidth).toBeLessThanOrEqual(state.viewportWidth);
    expect(state.mainWidth).toBeLessThanOrEqual(state.resolvedMaxWidth + 1);
    expect(Math.abs(state.mainCenter - state.viewportCenter)).toBeLessThanOrEqual(1);
    expect(state.horizontalOverflow).toBeLessThanOrEqual(1);
  });
});
