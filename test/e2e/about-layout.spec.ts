import { expect, test } from '@playwright/test';

import { e2eNoteFixtures } from './support/note-fixtures.js';

const aboutPath = '/about/';
const notePath = e2eNoteFixtures.tocAbsent.directPath;

interface AboutLayoutState {
  readonly shellExists: boolean;
  readonly mainColExists: boolean;
  readonly tocColExists: boolean;
  readonly staticTocNavExists: boolean;
  readonly layoutTocControllerExists: boolean;
  readonly mobilePanelExists: boolean;
  readonly shellDisplay: string;
  readonly shellPaddingBlockStart: string;
  readonly shellPaddingBlockEnd: string;
  readonly shellPaddingInlineStart: string;
  readonly shellPaddingInlineEnd: string;
  readonly shellMarginBlockStart: string;
  readonly shellMarginBlockEnd: string;
  readonly shellMaxWidth: string;
  readonly shellMaxInlineSize: string;
  readonly shellForbiddenDisplay: boolean;
  readonly shellHasPseudoSpacer: boolean;
  readonly shellHasVisualOffset: boolean;
  readonly shellHasBlockStartBorder: boolean;
  readonly shellWidth: number;
  readonly shellContainingBlockWidth: number;
  readonly shellWidthComparisonApplies: boolean;
  readonly viewportWidth: number;
  readonly mainWidth: number;
  readonly mainContentWidth: number;
  readonly mainPaddingInlineStart: number;
  readonly mainPaddingInlineEnd: number;
  readonly mainPaddingBlockStart: string;
  readonly resolvedAboutPaddingBlockStart: string;
  readonly mainHasPseudoSpacer: boolean;
  readonly mainHasVisualOffset: boolean;
  readonly mainHasBlockStartBorder: boolean;
  readonly resolvedContentMaxWidth: number;
  readonly mainCenter: number;
  readonly viewportCenter: number;
  readonly firstChildAddsTopDistance: boolean;
  readonly aboutContentAddsTopDistance: boolean;
  readonly aboutHeroAddsTopDistance: boolean;
  readonly aboutContentFirstChildAddsTopDistance: boolean;
  readonly aboutHeroFirstChildAddsTopDistance: boolean;
  readonly horizontalOverflow: number;
}

interface WrapperPaddingState {
  readonly exists: boolean;
  readonly paddingBlockStart: string;
  readonly resolvedToken: string;
}

const readWrapperPaddingState = ({
  selector,
  tokenName,
}: {
  readonly selector: string;
  readonly tokenName: string;
}): WrapperPaddingState => {
  const element = document.querySelector<HTMLElement>(selector);
  if (!(element instanceof HTMLElement)) {
    return { exists: false, paddingBlockStart: '', resolvedToken: '' };
  }

  const probe = document.createElement('div');
  probe.style.position = 'absolute';
  probe.style.visibility = 'hidden';
  probe.style.pointerEvents = 'none';
  probe.style.paddingBlockStart = `var(${tokenName})`;
  element.append(probe);
  const resolvedToken = getComputedStyle(probe).paddingBlockStart;
  probe.remove();

  return {
    exists: true,
    paddingBlockStart: getComputedStyle(element).paddingBlockStart,
    resolvedToken,
  };
};

const readSearchPageShellPaddingState = (): WrapperPaddingState => {
  const host = document.querySelector('search-page');
  const pageShell = host?.shadowRoot?.querySelector<HTMLElement>('.page-shell');
  if (!(pageShell instanceof HTMLElement)) {
    return { exists: false, paddingBlockStart: '', resolvedToken: '' };
  }

  const probe = document.createElement('div');
  probe.style.position = 'absolute';
  probe.style.visibility = 'hidden';
  probe.style.pointerEvents = 'none';
  probe.style.paddingBlockStart = 'var(--page-shell-padding-block-start)';
  pageShell.append(probe);
  const resolvedToken = getComputedStyle(probe).paddingBlockStart;
  probe.remove();

  return {
    exists: true,
    paddingBlockStart: getComputedStyle(pageShell).paddingBlockStart,
    resolvedToken,
  };
};

const readAboutLayout = async (): Promise<AboutLayoutState | null> => {
  const shell = document.querySelector<HTMLElement>('.about-shell');
  const main = document.querySelector<HTMLElement>('.about-shell > .about-main-col');
  const toc = document.querySelector<HTMLElement>('.about-shell > .layout-toc-col');
  const staticTocNav = document.querySelector<HTMLElement>('.about-shell [data-layout-toc-nav]');
  const controller = document.querySelector<HTMLElement>('layout-toc-controller');
  const mobilePanel = document.querySelector<HTMLElement>('[data-layout-toc-mobile-panel]');

  if (!(shell instanceof HTMLElement) || !(main instanceof HTMLElement)) {
    return null;
  }

  const shellStyle = getComputedStyle(shell);
  const mainStyle = getComputedStyle(main);
  const shellRect = shell.getBoundingClientRect();
  const mainRect = main.getBoundingClientRect();

  const resolveCssLength = (scopeElement: HTMLElement, value: string): number => {
    const probe = document.createElement('div');
    probe.style.position = 'absolute';
    probe.style.visibility = 'hidden';
    probe.style.pointerEvents = 'none';
    probe.style.inlineSize = value.trim();
    scopeElement.append(probe);
    const resolved = probe.getBoundingClientRect().width;
    probe.remove();
    return resolved;
  };

  const resolvePaddingBlockStartToken = (scopeElement: HTMLElement, tokenName: string): string => {
    const probe = document.createElement('div');
    probe.style.position = 'absolute';
    probe.style.visibility = 'hidden';
    probe.style.pointerEvents = 'none';
    probe.style.paddingBlockStart = `var(${tokenName})`;
    scopeElement.append(probe);
    const resolved = getComputedStyle(probe).paddingBlockStart;
    probe.remove();
    return resolved;
  };

  const createsPseudoSpacer = (element: HTMLElement): boolean =>
    ['::before', '::after'].some((pseudo) => {
      const style = getComputedStyle(element, pseudo);
      const hasContent = style.content !== 'none' && style.content !== 'normal' && style.content !== '""';
      const blockSize = Number.parseFloat(style.blockSize || style.height || '0');
      return hasContent && blockSize > 0;
    });

  const isZeroLengthToken = (value: string): boolean =>
    value === '0' || value === '0px' || value === '0rem' || value === '0em' || value === '0%';

  const splitCssFunctionArguments = (value: string): string[] =>
    value
      .split(',')
      .map((part) => part.trim())
      .filter((part) => part.length > 0);

  const hasNonZeroSecondComponent = (value: string): boolean => {
    const parts = value.split(/\s+/u).filter((part) => part.length > 0);
    if (parts.length < 2) {
      return false;
    }
    return !isZeroLengthToken(parts[1] ?? '');
  };

  const hasBlockAxisTranslateOffset = (value: string): boolean => {
    const normalized = value.trim().toLowerCase();
    if (normalized.length === 0 || normalized === 'none' || normalized === '0' || normalized === '0px') {
      return false;
    }
    if (normalized.startsWith('translatey(')) {
      const args = splitCssFunctionArguments(normalized.slice('translatey('.length, -1));
      return args.length > 0 && !isZeroLengthToken(args[0] ?? '');
    }
    if (normalized.startsWith('translate3d(')) {
      const args = splitCssFunctionArguments(normalized.slice('translate3d('.length, -1));
      return args.length >= 2 && !isZeroLengthToken(args[1] ?? '');
    }
    if (normalized.startsWith('translate(')) {
      const args = splitCssFunctionArguments(normalized.slice('translate('.length, -1));
      if (args.length >= 2) {
        return !isZeroLengthToken(args[1] ?? '');
      }
      return hasNonZeroSecondComponent(args[0] ?? '');
    }
    if (normalized.startsWith('translatex(')) {
      return false;
    }
    return hasNonZeroSecondComponent(normalized);
  };

  const hasBlockAxisTransformOffset = (value: string): boolean => {
    const normalized = value.trim().toLowerCase();
    if (normalized.length === 0 || normalized === 'none') {
      return false;
    }
    for (const match of normalized.matchAll(/translatey\(([^)]*)\)/gu)) {
      const args = splitCssFunctionArguments(match[1] ?? '');
      if (args.length > 0 && !isZeroLengthToken(args[0] ?? '')) {
        return true;
      }
    }
    for (const match of normalized.matchAll(/translate3d\(([^)]*)\)/gu)) {
      const args = splitCssFunctionArguments(match[1] ?? '');
      if (args.length >= 2 && !isZeroLengthToken(args[1] ?? '')) {
        return true;
      }
    }
    for (const match of normalized.matchAll(/translate\(([^)]*)\)/gu)) {
      const args = splitCssFunctionArguments(match[1] ?? '');
      if (args.length >= 2 && !isZeroLengthToken(args[1] ?? '')) {
        return true;
      }
    }
    for (const match of normalized.matchAll(/matrix\(([^)]*)\)/gu)) {
      const args = splitCssFunctionArguments(match[1] ?? '');
      if (args.length >= 6 && !isZeroLengthToken(args[5] ?? '')) {
        return true;
      }
    }
    for (const match of normalized.matchAll(/matrix3d\(([^)]*)\)/gu)) {
      const args = splitCssFunctionArguments(match[1] ?? '');
      if (args.length >= 14 && !isZeroLengthToken(args[13] ?? '')) {
        return true;
      }
    }
    return false;
  };

  const hasVisualOffset = (style: CSSStyleDeclaration): boolean => {
    const insetBlockStart = style.getPropertyValue('inset-block-start').trim();
    const insetBlockEnd = style.getPropertyValue('inset-block-end').trim();
    const insetBlock = style.getPropertyValue('inset-block').trim();
    const inset = style.getPropertyValue('inset').trim();
    const top = style.top.trim();
    const bottom = style.bottom.trim();
    const transform = style.transform.trim();
    const translate = style.getPropertyValue('translate').trim();
    const isNonZeroOffset = (value: string): boolean =>
      value.length > 0 &&
      value !== 'auto' &&
      value.split(/\s+/u).some((part) => part !== '0' && part !== '0px' && part !== 'auto');
    return (
      hasBlockAxisTransformOffset(transform) ||
      hasBlockAxisTranslateOffset(translate) ||
      (style.position !== 'static' && isNonZeroOffset(insetBlockStart)) ||
      (style.position !== 'static' && isNonZeroOffset(insetBlockEnd)) ||
      (style.position !== 'static' && isNonZeroOffset(insetBlock)) ||
      (style.position !== 'static' && isNonZeroOffset(inset)) ||
      (style.position !== 'static' && isNonZeroOffset(top)) ||
      (style.position !== 'static' && isNonZeroOffset(bottom))
    );
  };

  const hasBlockStartBorder = (style: CSSStyleDeclaration): boolean =>
    Number.parseFloat(style.getPropertyValue('border-block-start-width') || style.borderTopWidth || '0') >
      0 &&
    style.getPropertyValue('border-block-start-style') !== 'none' &&
    style.borderTopStyle !== 'none';

  const firstChild = main.firstElementChild instanceof HTMLElement ? main.firstElementChild : null;
  const aboutContent = main.querySelector<HTMLElement>(':scope > .about-content');
  const aboutHero = aboutContent?.querySelector<HTMLElement>(':scope > .about-hero') ?? null;
  const aboutContentFirstChild =
    aboutContent?.firstElementChild instanceof HTMLElement ? aboutContent.firstElementChild : null;
  const aboutHeroFirstChild =
    aboutHero?.firstElementChild instanceof HTMLElement ? aboutHero.firstElementChild : null;
  const createsTopDistance = (element: HTMLElement | null): boolean => {
    if (!(element instanceof HTMLElement)) {
      return false;
    }
    const style = getComputedStyle(element);
    return (
      Number.parseFloat(style.marginBlockStart || style.marginTop || '0') > 0 ||
      Number.parseFloat(style.paddingBlockStart || style.paddingTop || '0') > 0 ||
      createsPseudoSpacer(element) ||
      hasVisualOffset(style) ||
      hasBlockStartBorder(style)
    );
  };

  const maxWidthValue = mainStyle.getPropertyValue('--about-content-max-inline-size');
  const resolvedMaxWidth = resolveCssLength(main, maxWidthValue.length > 0 ? maxWidthValue : '52rem');
  const paddingInlineStart = Number.parseFloat(mainStyle.paddingInlineStart || '0');
  const paddingInlineEnd = Number.parseFloat(mainStyle.paddingInlineEnd || '0');
  const mainContent = document.querySelector<HTMLElement>('main#main-content');
  const shellContainingBlock = mainContent ?? shell.parentElement;
  const shellContainingBlockStyle =
    shellContainingBlock instanceof HTMLElement ? getComputedStyle(shellContainingBlock) : null;
  const shellContainingBlockRect = shellContainingBlock?.getBoundingClientRect() ?? shellRect;
  const shellContainingBlockWidth = Math.round(
    shellContainingBlockRect.width -
      Number.parseFloat(shellContainingBlockStyle?.paddingInlineStart ?? '0') -
      Number.parseFloat(shellContainingBlockStyle?.paddingInlineEnd ?? '0'),
  );
  const resolvedAboutMainColMaxBorderBoxWidth = resolvedMaxWidth + paddingInlineStart + paddingInlineEnd;
  const shellWidthComparisonApplies =
    document.documentElement.clientWidth >= resolvedAboutMainColMaxBorderBoxWidth + 32;

  return {
    shellExists: true,
    mainColExists: true,
    tocColExists: toc instanceof HTMLElement,
    staticTocNavExists: staticTocNav instanceof HTMLElement,
    layoutTocControllerExists: controller instanceof HTMLElement,
    mobilePanelExists: mobilePanel instanceof HTMLElement,
    shellDisplay: shellStyle.display,
    shellPaddingBlockStart: shellStyle.paddingBlockStart,
    shellPaddingBlockEnd: shellStyle.paddingBlockEnd,
    shellPaddingInlineStart: shellStyle.paddingInlineStart,
    shellPaddingInlineEnd: shellStyle.paddingInlineEnd,
    shellMarginBlockStart: shellStyle.marginBlockStart,
    shellMarginBlockEnd: shellStyle.marginBlockEnd,
    shellMaxWidth: shellStyle.maxWidth,
    shellMaxInlineSize: shellStyle.getPropertyValue('max-inline-size'),
    shellForbiddenDisplay: ['grid', 'flex', 'contents', 'none', 'table', 'inline-table'].includes(
      shellStyle.display,
    ),
    shellHasPseudoSpacer: createsPseudoSpacer(shell),
    shellHasVisualOffset: hasVisualOffset(shellStyle),
    shellHasBlockStartBorder: hasBlockStartBorder(shellStyle),
    shellWidth: Math.round(shellRect.width),
    shellContainingBlockWidth,
    shellWidthComparisonApplies,
    viewportWidth: document.documentElement.clientWidth,
    mainWidth: mainRect.width,
    mainContentWidth: mainRect.width - paddingInlineStart - paddingInlineEnd,
    mainPaddingInlineStart: paddingInlineStart,
    mainPaddingInlineEnd: paddingInlineEnd,
    mainPaddingBlockStart: mainStyle.paddingBlockStart,
    resolvedAboutPaddingBlockStart: resolvePaddingBlockStartToken(
      main,
      '--about-content-padding-block-start',
    ),
    mainHasPseudoSpacer: createsPseudoSpacer(main),
    mainHasVisualOffset: hasVisualOffset(mainStyle),
    mainHasBlockStartBorder: hasBlockStartBorder(mainStyle),
    resolvedContentMaxWidth: resolvedMaxWidth,
    mainCenter: mainRect.left + mainRect.width / 2,
    viewportCenter: document.documentElement.clientWidth / 2,
    firstChildAddsTopDistance: createsTopDistance(firstChild),
    aboutContentAddsTopDistance: createsTopDistance(aboutContent),
    aboutHeroAddsTopDistance: createsTopDistance(aboutHero),
    aboutContentFirstChildAddsTopDistance: createsTopDistance(aboutContentFirstChild),
    aboutHeroFirstChildAddsTopDistance: createsTopDistance(aboutHeroFirstChild),
    horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  };
};

const expectAboutLayoutContract = (state: AboutLayoutState): void => {
  expect(state.shellExists).toBe(true);
  expect(state.mainColExists).toBe(true);
  expect(state.tocColExists).toBe(false);
  expect(state.staticTocNavExists).toBe(false);
  expect(state.layoutTocControllerExists).toBe(false);
  expect(state.mobilePanelExists).toBe(false);
  expect(state.shellForbiddenDisplay).toBe(false);
  expect(state.shellPaddingBlockStart).toBe('0px');
  expect(state.shellPaddingBlockEnd).toBe('0px');
  expect(state.shellPaddingInlineStart).toBe('0px');
  expect(state.shellPaddingInlineEnd).toBe('0px');
  expect(state.shellMarginBlockStart).toBe('0px');
  expect(state.shellMarginBlockEnd).toBe('0px');
  expect(state.shellMaxWidth).toBe('none');
  expect(state.shellMaxInlineSize).toBe('none');
  expect(state.shellHasPseudoSpacer).toBe(false);
  expect(state.shellHasVisualOffset).toBe(false);
  expect(state.shellHasBlockStartBorder).toBe(false);
  if (state.shellWidthComparisonApplies) {
    expect(Math.abs(state.shellWidth - state.shellContainingBlockWidth)).toBeLessThanOrEqual(1);
  }
  expect(state.mainPaddingBlockStart).toBe(state.resolvedAboutPaddingBlockStart);
  expect(state.mainHasPseudoSpacer).toBe(false);
  expect(state.mainHasVisualOffset).toBe(false);
  expect(state.mainHasBlockStartBorder).toBe(false);
  expect(state.mainContentWidth).toBeLessThanOrEqual(state.resolvedContentMaxWidth + 1);
  expect(
    Math.abs(
      state.mainWidth -
        (state.mainContentWidth + state.mainPaddingInlineStart + state.mainPaddingInlineEnd),
    ),
  ).toBeLessThanOrEqual(1);
  expect(Math.abs(state.mainCenter - state.viewportCenter)).toBeLessThanOrEqual(1);
  expect(state.firstChildAddsTopDistance).toBe(false);
  expect(state.aboutContentAddsTopDistance).toBe(false);
  expect(state.aboutHeroAddsTopDistance).toBe(false);
  expect(state.aboutContentFirstChildAddsTopDistance).toBe(false);
  expect(state.aboutHeroFirstChildAddsTopDistance).toBe(false);
  expect(state.horizontalOverflow).toBeLessThanOrEqual(1);
};

test.describe('About layout', () => {
  test('desktop 幅では About が TOC なし 1 カラム中央配置になること', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(aboutPath);

    const state = await page.evaluate(readAboutLayout);

    if (state === null) {
      throw new Error('about layout elements were not found');
    }

    expectAboutLayoutContract(state);
  });

  test('1024px 未満でも About が旧 TOC gap 補正に依存しないこと', async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 900 });
    await page.goto(aboutPath);

    const state = await page.evaluate(readAboutLayout);

    if (state === null) {
      throw new Error('about layout elements were not found');
    }

    expectAboutLayoutContract(state);
    expect(state.shellWidth).toBeLessThanOrEqual(state.viewportWidth);
  });

  test('ページ別 wrapper の computed padding-block-start が effective token に一致すること', async ({
    page,
  }) => {
    await page.goto(notePath);
    const noteState = await page.evaluate(readWrapperPaddingState, {
      selector: '.layout-main-col',
      tokenName: '--note-content-padding-block-start',
    });
    expect(noteState.exists).toBe(true);
    expect(noteState.paddingBlockStart).toBe(noteState.resolvedToken);

    await page.goto('/');
    const homeState = await page.evaluate(readWrapperPaddingState, {
      selector: '.home-shell',
      tokenName: '--home-shell-padding-block-start',
    });
    expect(homeState.exists).toBe(true);
    expect(homeState.paddingBlockStart).toBe(homeState.resolvedToken);

    await page.goto('/404.html');
    const notFoundState = await page.evaluate(readWrapperPaddingState, {
      selector: '.home-shell',
      tokenName: '--home-shell-padding-block-start',
    });
    expect(notFoundState.exists).toBe(true);
    expect(notFoundState.paddingBlockStart).toBe(notFoundState.resolvedToken);

    await page.goto('/search/');
    await page.waitForFunction(() =>
      Boolean(document.querySelector('search-page')?.shadowRoot?.querySelector('.page-shell')),
    );
    const pageShellState = await page.evaluate(readSearchPageShellPaddingState);
    expect(pageShellState.exists).toBe(true);
    expect(pageShellState.paddingBlockStart).toBe(pageShellState.resolvedToken);
  });

  test('JS 有効時の About header は TOC absent trigger 契約を維持すること', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 900 });
    await page.goto(aboutPath);
    await page.waitForFunction(() => customElements.get('layout-header') !== undefined);
    await page.locator('layout-header').evaluate(async (header) => {
      const updatableHeader = header as HTMLElement & { updateComplete?: Promise<unknown> };
      await updatableHeader.updateComplete;
    });

    const state = await page.locator('layout-header').evaluate((header) => {
      const trigger = header.shadowRoot?.querySelector<HTMLButtonElement>('.toc-trigger') ?? null;
      const triggerStyle = trigger instanceof HTMLButtonElement ? getComputedStyle(trigger) : null;

      return {
        tocPresence: header.getAttribute('toc-presence'),
        tocTriggerReserved: header.getAttribute('toc-trigger-reserved'),
        tocRuntimeId: header.getAttribute('toc-runtime-id'),
        tocOwnerId: header.getAttribute('data-toc-owner-id'),
        triggerExists: trigger instanceof HTMLButtonElement,
        triggerDisabled: trigger?.disabled ?? null,
        triggerAriaControls: trigger?.getAttribute('aria-controls') ?? null,
        triggerDataVisible: trigger?.getAttribute('data-visible') ?? null,
        triggerDisplay: triggerStyle?.display ?? null,
      };
    });

    expect(state.tocPresence).toBe('absent');
    expect(state.tocTriggerReserved).toBe('false');
    expect(state.tocRuntimeId).toBeNull();
    expect(state.tocOwnerId).toBeNull();
    expect(state.triggerExists).toBe(true);
    expect(state.triggerDisabled).toBe(true);
    expect(state.triggerAriaControls).toBeNull();
    expect(state.triggerDataVisible).toBe('false');
    expect(state.triggerDisplay).toBe('none');
  });
});
