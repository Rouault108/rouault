import { expect, test, type Locator, type Page } from '@playwright/test';

import { e2eNoteFixtures } from './support/note-fixtures.js';
import {
  expectMenuOpen,
  headerMenuTriggerSelector,
  prepareHeaderMenuItems,
  searchTriggerSelector,
  themeTriggerRootSelector,
} from './support/header-contract.js';
import { waitForRouterDocumentHostReady } from './support/router-document-host.js';

const layoutRich = e2eNoteFixtures.layoutRich;
const markdownBasic = e2eNoteFixtures.markdownBasic;

const visibleDisplay = async (page: Page, selector: string): Promise<string> =>
  page.locator(selector).evaluate((element) => window.getComputedStyle(element).display);

const HEADER_CONTROL_MIN_HIT_TARGET_PX = 44;

const CSS_PIXEL_ROUNDING_TOLERANCE_PX = 0.01;

interface HeaderControlTarget {
  name: string;
  selector: string;
}

interface HeaderControlRawContract {
  afterInsetBlockEnd: string;
  afterInsetBlockStart: string;
  afterInsetInlineEnd: string;
  afterInsetInlineStart: string;
  fontFeatureSettings: string;
  fontWeight: string;
  height: string;
  letterSpacing: string;
  lineHeight: string;
  width: string;
}

interface HeaderControlHitTargetContract {
  expandedHeight: number;
  expandedWidth: number;
  name: string;
}

interface HeaderControlContract extends HeaderControlHitTargetContract {
  fontFeatureSettings: string;
  fontWeight: number;
  letterSpacing: string;
  lineHeight: string;
}

interface HeaderCorpusOffsetGeometry {
  corpusInlineStartOffset: number;
  corpusLeft: number;
  corpusOffsetToken: string;
  noteLayout: string | null;
  sidebarEnabled: string | null;
  triggerLeft: number;
}

const headerControlTargets = {
  corpus: {
    name: 'corpus switcher trigger',
    selector: headerMenuTriggerSelector('corpus'),
  },
  search: {
    name: 'search trigger',
    selector: searchTriggerSelector,
  },
  theme: {
    name: 'theme switcher trigger',
    selector: themeTriggerRootSelector,
  },
} as const satisfies Record<string, HeaderControlTarget>;

const readRequiredNumber = (value: string, label: string): number => {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${label} must be finite. Received: ${value}`);
  }

  return parsed;
};

const readRequiredCssPx = (value: string, label: string): number =>
  readRequiredNumber(value, `${label} CSS px`);

const toHeaderControlContract = (
  target: HeaderControlTarget,
  raw: HeaderControlRawContract,
): HeaderControlContract => {
  const width = readRequiredCssPx(raw.width, `${target.name} width`);
  const height = readRequiredCssPx(raw.height, `${target.name} height`);
  const afterInsetInlineStart = readRequiredCssPx(
    raw.afterInsetInlineStart,
    `${target.name} ::after inset-inline-start`,
  );
  const afterInsetInlineEnd = readRequiredCssPx(
    raw.afterInsetInlineEnd,
    `${target.name} ::after inset-inline-end`,
  );
  const afterInsetBlockStart = readRequiredCssPx(
    raw.afterInsetBlockStart,
    `${target.name} ::after inset-block-start`,
  );
  const afterInsetBlockEnd = readRequiredCssPx(
    raw.afterInsetBlockEnd,
    `${target.name} ::after inset-block-end`,
  );

  return {
    expandedHeight: height - afterInsetBlockStart - afterInsetBlockEnd,
    expandedWidth: width - afterInsetInlineStart - afterInsetInlineEnd,
    fontFeatureSettings: raw.fontFeatureSettings,
    fontWeight: readRequiredNumber(raw.fontWeight, `${target.name} font-weight`),
    letterSpacing: raw.letterSpacing,
    lineHeight: raw.lineHeight,
    name: target.name,
  };
};

const readHeaderControlContract = async (
  page: Page,
  target: HeaderControlTarget,
): Promise<HeaderControlContract> => {
  const raw = await page.locator(target.selector).evaluate((element) => {
    const style = window.getComputedStyle(element);
    const afterStyle = window.getComputedStyle(element, '::after');

    return {
      afterInsetBlockEnd: afterStyle.insetBlockEnd,
      afterInsetBlockStart: afterStyle.insetBlockStart,
      afterInsetInlineEnd: afterStyle.insetInlineEnd,
      afterInsetInlineStart: afterStyle.insetInlineStart,
      fontFeatureSettings: style.fontFeatureSettings,
      fontWeight: style.fontWeight,
      height: style.height,
      letterSpacing: style.letterSpacing,
      lineHeight: style.lineHeight,
      width: style.width,
    };
  });

  return toHeaderControlContract(target, raw);
};

const readHeaderControlContracts = async (
  page: Page,
  targets: readonly HeaderControlTarget[],
): Promise<HeaderControlContract[]> =>
  Promise.all(targets.map((target) => readHeaderControlContract(page, target)));

const expectCssPixelAtLeast = (actual: number, expected: number, label: string): void => {
  expect(
    actual,
    `${label}: expected >= ${expected}px within ${CSS_PIXEL_ROUNDING_TOLERANCE_PX}px CSS pixel rounding tolerance, received ${actual}px`,
  ).toBeGreaterThanOrEqual(expected - CSS_PIXEL_ROUNDING_TOLERANCE_PX);
};

const isTransparentColor = (color: string): boolean => {
  const normalized = color.trim().toLowerCase();
  return (
    normalized === 'transparent' ||
    normalized === 'rgba(0, 0, 0, 0)' ||
    /(?:rgba|oklch|color-mix|color)\([^)]+(?:,\s*0|\/\s*0(?:\.0+)?%?)\)$/u.test(normalized)
  );
};

const readFocusIndicator = async (locator: Locator) =>
  locator.evaluate((element) => {
    const style = window.getComputedStyle(element);
    return {
      outlineColor: style.outlineColor,
      outlineOffset: Number.parseFloat(style.outlineOffset),
      outlineStyle: style.outlineStyle,
      outlineWidth: Number.parseFloat(style.outlineWidth),
    };
  });

const expectVisibleFocusIndicator = (
  focusStyle: Awaited<ReturnType<typeof readFocusIndicator>>,
): void => {
  expect(focusStyle.outlineStyle).not.toBe('none');
  expect(focusStyle.outlineWidth).toBeGreaterThan(0);
  expect(isTransparentColor(focusStyle.outlineColor)).toBe(false);
  expect(Number.isFinite(focusStyle.outlineOffset)).toBe(true);
};

const focusHeaderControlByKeyboard = async (page: Page, selector: string): Promise<void> => {
  await page.locator('body').click({ position: { x: 1, y: 1 } });

  for (let attempt = 0; attempt < 24; attempt += 1) {
    await page.keyboard.press('Tab');
    const isFocused = await page
      .locator(selector)
      .evaluate((element) => element === document.activeElement);
    if (isFocused) return;
  }

  throw new Error(`Header control was not reached by keyboard Tab navigation: ${selector}`);
};

const expectHeaderControlHitTargetContract = (contract: HeaderControlHitTargetContract): void => {
  expectCssPixelAtLeast(
    contract.expandedWidth,
    HEADER_CONTROL_MIN_HIT_TARGET_PX,
    `${contract.name} expanded hit target width`,
  );
  expectCssPixelAtLeast(
    contract.expandedHeight,
    HEADER_CONTROL_MIN_HIT_TARGET_PX,
    `${contract.name} expanded hit target height`,
  );
};

const readSearchTriggerDensity = async (page: Page) =>
  page.locator(searchTriggerSelector).evaluate((element) => {
    const style = window.getComputedStyle(element);
    const label = element.querySelector<HTMLElement>('.search-trigger__label');
    const labelStyle = label === null ? null : window.getComputedStyle(label);
    const afterStyle = window.getComputedStyle(element, '::after');
    return {
      afterPosition: afterStyle.position,
      height: Number.parseFloat(style.height),
      labelDisplay: labelStyle?.display ?? null,
      position: style.position,
      width: Number.parseFloat(style.width),
    };
  });

const expectHeaderControlWithinHeader = async (page: Page, selector: string): Promise<void> => {
  const header = page.locator('header[data-layout-header]');
  const control = page.locator(selector);

  await expect(control).toBeVisible();

  const [headerBox, controlBox] = await Promise.all([header.boundingBox(), control.boundingBox()]);
  if (headerBox === null || controlBox === null) {
    throw new Error(`Header or control box is missing for selector: ${selector}`);
  }

  expect(controlBox.x).toBeGreaterThanOrEqual(headerBox.x - 1);
  expect(controlBox.y).toBeGreaterThanOrEqual(headerBox.y - 1);
  expect(controlBox.x + controlBox.width).toBeLessThanOrEqual(headerBox.x + headerBox.width + 1);
  expect(controlBox.y + controlBox.height).toBeLessThanOrEqual(headerBox.y + headerBox.height + 1);
};

const movePointerOutsideHeader = async (page: Page): Promise<void> => {
  const mainBox = await page.locator('main').boundingBox();
  if (mainBox !== null) {
    await page.mouse.move(mainBox.x + 1, mainBox.y + 1);
    return;
  }

  const viewport = page.viewportSize();
  if (viewport === null) {
    throw new Error('Viewport is missing.');
  }

  await page.mouse.move(1, viewport.height - 1);
};

const readHeaderCorpusOffsetGeometry = async (page: Page): Promise<HeaderCorpusOffsetGeometry> =>
  page.evaluate(() => {
    const header = document.querySelector<HTMLElement>('header[data-layout-header]');
    if (header === null) {
      throw new Error('header[data-layout-header] was not found');
    }

    const corpus = header.querySelector<HTMLElement>("[data-header-menu='corpus']");
    if (corpus === null) {
      throw new Error("[data-header-menu='corpus'] was not found");
    }

    const trigger = corpus.querySelector<HTMLElement>(':scope > [data-header-menu-trigger]');
    if (trigger === null) {
      throw new Error('corpus trigger was not found');
    }

    const corpusStyle = window.getComputedStyle(corpus);
    const corpusRect = corpus.getBoundingClientRect();
    const triggerRect = trigger.getBoundingClientRect();

    return {
      noteLayout: header.getAttribute('data-note-layout'),
      sidebarEnabled: header.getAttribute('data-sidebar-enabled'),
      corpusLeft: corpusRect.left,
      triggerLeft: triggerRect.left,
      corpusInlineStartOffset: Number.parseFloat(corpusStyle.marginInlineStart),
      corpusOffsetToken: corpusStyle
        .getPropertyValue('--_header-corpus-inline-start-offset')
        .trim(),
    };
  });

test.describe('header layout contract', () => {
  test('検索 trigger は quiet launcher として responsive density を維持すること', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 760 });
    await page.goto('/about/');
    await waitForRouterDocumentHostReady(page);
    const regular = await readSearchTriggerDensity(page);
    expect(regular.labelDisplay).not.toBe('none');
    expect(regular.width).toBeGreaterThan(regular.height * 1.5);
    expect(regular.width).toBeLessThanOrEqual(144);

    await page.setViewportSize({ width: 959, height: 760 });
    const compact = await readSearchTriggerDensity(page);
    expect(compact.labelDisplay).not.toBe('none');
    expect(compact.width).toBeLessThanOrEqual(regular.width);
    expect(compact.width).toBeLessThanOrEqual(128);

    await page.setViewportSize({ width: 639, height: 760 });
    const iconOnly = await readSearchTriggerDensity(page);
    expect(iconOnly.labelDisplay).toBe('none');
    expect(iconOnly.width).toBeLessThanOrEqual(iconOnly.height + 2);

    await page.setViewportSize({ width: 400, height: 760 });
    const narrowBoundary = await readSearchTriggerDensity(page);
    expect(narrowBoundary.labelDisplay).toBe('none');
    expect(narrowBoundary.width).toBeLessThanOrEqual(narrowBoundary.height + 2);

    await page.setViewportSize({ width: 399, height: 760 });
    const minimum = await readSearchTriggerDensity(page);
    expect(minimum.labelDisplay).toBe('none');
    expect(minimum.width).toBeLessThan(iconOnly.width);
    expect(minimum.height).toBeLessThan(iconOnly.height);
    expect(minimum.position).toBe('relative');
    expect(minimum.afterPosition).toBe('absolute');
  });

  test('note layout desktop header geometry は sidebar と TOC inset を CSS で適用すること', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 760 });
    await page.goto(layoutRich.directPath);
    await waitForRouterDocumentHostReady(page);

    const geometry = await page.locator('header[data-layout-header]').evaluate((header) => {
      const center = header.querySelector<HTMLElement>('.layout-header__center');
      if (center === null) {
        throw new Error('header center is missing.');
      }
      const centerStyle = window.getComputedStyle(center);
      return {
        centerEndInset: Number.parseFloat(centerStyle.insetInlineEnd),
        centerEndInsetProperty: centerStyle.getPropertyValue('--_header-center-end-inset').trim(),
        centerStartInset: Number.parseFloat(centerStyle.insetInlineStart),
        centerStartInsetProperty: centerStyle
          .getPropertyValue('--_header-center-start-inset')
          .trim(),
        noteLayout: header.getAttribute('data-note-layout'),
        sidebarEnabled: header.getAttribute('data-sidebar-enabled'),
        tocPresence: header.getAttribute('data-toc-presence'),
      };
    });

    expect(geometry.noteLayout).toBe('true');
    expect(geometry.sidebarEnabled).toBe('true');
    expect(geometry.tocPresence).toBe('present');
    expect(geometry.centerStartInsetProperty).not.toBe('');
    expect(geometry.centerStartInsetProperty).not.toBe('0px');
    expect(geometry.centerEndInsetProperty).not.toBe('');
    expect(geometry.centerEndInsetProperty).not.toBe('0px');
    expect(geometry.centerStartInset).toBeGreaterThan(0);
    expect(geometry.centerEndInset).toBeGreaterThan(0);
  });

  test('desktop header corpus switcher は note/sidebar 有無に依存せず primary start offset を持つこと', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 760 });

    await page.goto(layoutRich.directPath);
    await waitForRouterDocumentHostReady(page);
    const notePage = await readHeaderCorpusOffsetGeometry(page);

    await page.goto('/corpora/library/');
    await waitForRouterDocumentHostReady(page);
    const corpusPage = await readHeaderCorpusOffsetGeometry(page);

    expect(notePage.noteLayout).toBe('true');
    expect(notePage.sidebarEnabled).toBe('true');
    expect(notePage.corpusOffsetToken).not.toBe('');
    expect(notePage.corpusOffsetToken).not.toBe('0px');
    expect(notePage.corpusInlineStartOffset).toBeGreaterThan(0);

    expect(corpusPage.noteLayout).toBe('false');
    expect(corpusPage.sidebarEnabled).toBe('false');
    expect(corpusPage.corpusOffsetToken).not.toBe('');
    expect(corpusPage.corpusOffsetToken).not.toBe('0px');
    expect(corpusPage.corpusInlineStartOffset).toBeGreaterThan(0);

    expect(Math.abs(corpusPage.triggerLeft - notePage.triggerLeft)).toBeLessThanOrEqual(1);
    expect(
      Math.abs(corpusPage.corpusInlineStartOffset - notePage.corpusInlineStartOffset),
    ).toBeLessThanOrEqual(1);
  });

  test('検索 trigger は fallback link と状態別 CSS と 44px hit area contract を維持すること', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 399, height: 760 });
    await page.goto('/about/');
    await waitForRouterDocumentHostReady(page);

    const trigger = page.locator(searchTriggerSelector);
    await expect(trigger).toHaveAttribute('href', /\/search\/$/u);
    await expect(trigger).toHaveJSProperty('tagName', 'A');

    const hitTargetContract = await readHeaderControlContract(page, headerControlTargets.search);
    expectHeaderControlHitTargetContract(hitTargetContract);

    const readInteractiveStyle = async () =>
      trigger.evaluate((element) => {
        const style = window.getComputedStyle(element);
        return {
          backgroundColor: style.backgroundColor,
          borderColor: style.borderTopColor,
          outlineColor: style.outlineColor,
          outlineStyle: style.outlineStyle,
          outlineWidth: Number.parseFloat(style.outlineWidth),
          transform: style.transform,
        };
      });

    const restStyle = await readInteractiveStyle();

    await trigger.hover();
    const hoverStyle = await readInteractiveStyle();
    expect(
      hoverStyle.backgroundColor !== restStyle.backgroundColor ||
        hoverStyle.borderColor !== restStyle.borderColor,
    ).toBe(true);

    await page.locator(headerControlTargets.corpus.selector).focus();
    await page.keyboard.press('Tab');
    await expect(trigger).toBeFocused();
    const focusVisibleStyle = await readInteractiveStyle();
    expect(focusVisibleStyle.outlineStyle).not.toBe('none');
    expect(focusVisibleStyle.outlineWidth).toBeGreaterThan(0);
    expect(isTransparentColor(focusVisibleStyle.outlineColor)).toBe(false);

    const triggerBox = await trigger.boundingBox();
    if (triggerBox === null) {
      throw new Error('Search trigger bounding box is missing.');
    }

    await page.mouse.move(
      triggerBox.x + triggerBox.width / 2,
      triggerBox.y + triggerBox.height / 2,
    );
    await page.mouse.down();
    const activeStyle = await readInteractiveStyle();
    await page.mouse.up();

    expect(activeStyle.transform).toBe('none');
  });

  test('header controls は focus-visible で視認可能な focus ring を持つこと', async ({ page }) => {
    await page.goto('/about/');
    await waitForRouterDocumentHostReady(page);

    for (const target of [
      headerControlTargets.corpus,
      headerControlTargets.search,
      headerControlTargets.theme,
    ] as const) {
      await focusHeaderControlByKeyboard(page, target.selector);
      await expect(page.locator(target.selector)).toBeFocused();

      expectVisibleFocusIndicator(await readFocusIndicator(page.locator(target.selector)));
    }

    const controlContracts = await readHeaderControlContracts(page, [
      headerControlTargets.corpus,
      headerControlTargets.search,
      headerControlTargets.theme,
    ]);

    for (const contract of controlContracts) {
      expectHeaderControlHitTargetContract(contract);
      expect(contract.fontWeight).toBeGreaterThanOrEqual(500);
      expect(contract.fontFeatureSettings).toContain('palt');
      expect(contract.letterSpacing).not.toBe('normal');
      expect(contract.lineHeight).not.toBe('normal');
    }
  });

  test('corpus trigger は visual padding と 44px hit area contract を維持すること', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 760 });
    await page.goto('/about/');
    await waitForRouterDocumentHostReady(page);

    const density = await page.locator(headerControlTargets.corpus.selector).evaluate((element) => {
      const style = window.getComputedStyle(element);
      return {
        minBlockSize: Number.parseFloat(style.minBlockSize),
        paddingInlineEnd: Number.parseFloat(style.paddingInlineEnd),
        paddingInlineStart: Number.parseFloat(style.paddingInlineStart),
      };
    });

    expect(density.paddingInlineStart).toBeGreaterThan(0);
    expect(density.paddingInlineEnd).toBeGreaterThan(0);
    expect(density.minBlockSize).toBeGreaterThan(0);

    const hitTargetContract = await readHeaderControlContract(page, headerControlTargets.corpus);
    expectHeaderControlHitTargetContract(hitTargetContract);

    await page.setViewportSize({ width: 399, height: 760 });
    const compactDensity = await page
      .locator(headerControlTargets.corpus.selector)
      .evaluate((element) => {
        const style = window.getComputedStyle(element);
        return {
          paddingInlineEnd: Number.parseFloat(style.paddingInlineEnd),
          paddingInlineStart: Number.parseFloat(style.paddingInlineStart),
        };
      });

    expect(compactDensity.paddingInlineStart).toBeGreaterThan(0);
    expect(compactDensity.paddingInlineEnd).toBeGreaterThan(0);
  });

  test('theme trigger root は padding と hover surface と focus-visible outline を維持すること', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 760 });
    await page.goto('/about/');
    await waitForRouterDocumentHostReady(page);

    const themeTrigger = page.locator(themeTriggerRootSelector);
    await expect(themeTrigger).toHaveCount(1);

    const readThemeTriggerStyle = async () =>
      themeTrigger.evaluate((element) => {
        const style = window.getComputedStyle(element);
        return {
          backgroundColor: style.backgroundColor,
          outlineColor: style.outlineColor,
          outlineOffset: Number.parseFloat(style.outlineOffset),
          outlineStyle: style.outlineStyle,
          outlineWidth: Number.parseFloat(style.outlineWidth),
          paddingInlineEnd: Number.parseFloat(style.paddingInlineEnd),
          paddingInlineStart: Number.parseFloat(style.paddingInlineStart),
        };
      });

    await movePointerOutsideHeader(page);
    const restStyle = await readThemeTriggerStyle();
    expect(restStyle.paddingInlineStart).toBeGreaterThan(0);
    expect(restStyle.paddingInlineEnd).toBeGreaterThan(0);

    await themeTrigger.hover();
    await expect
      .poll(async () => (await readThemeTriggerStyle()).backgroundColor)
      .not.toBe(restStyle.backgroundColor);

    await movePointerOutsideHeader(page);
    await focusHeaderControlByKeyboard(page, themeTriggerRootSelector);
    await expect(themeTrigger).toBeFocused();
    const focusVisibleStyle = await readThemeTriggerStyle();
    expectVisibleFocusIndicator(focusVisibleStyle);

    await page.setViewportSize({ width: 399, height: 760 });
    const compactStyle = await readThemeTriggerStyle();
    expect(compactStyle.paddingInlineStart).toBeGreaterThan(0);
    expect(compactStyle.paddingInlineEnd).toBeGreaterThan(0);
    const compactContract = await readHeaderControlContract(page, headerControlTargets.theme);
    expectHeaderControlHitTargetContract(compactContract);
    await expect(themeTrigger).toHaveAttribute('aria-label', /テーマ: .+/u);
    await expect(
      page.locator('header[data-layout-header] .theme-trigger-icon svg[data-icon]'),
    ).toHaveAttribute('data-icon', /sun|moon|monitor/u);
    await expect(page.locator('header[data-layout-header] .theme-trigger-text')).toBeHidden();

    await themeTrigger.click();
    await expectMenuOpen(page, 'theme', true);
    const selectedThemeItem = page.locator(
      'header[data-layout-header] [data-theme-value][aria-pressed="true"][data-selected="true"]',
    );
    await expect(selectedThemeItem).toHaveCount(1);
    await expect(selectedThemeItem.locator('svg[data-icon]')).toHaveAttribute(
      'data-icon',
      /sun|moon|monitor/u,
    );
    const selectedThemeWeight = await selectedThemeItem.evaluate((element) =>
      Number.parseFloat(window.getComputedStyle(element).fontWeight),
    );
    expect(selectedThemeWeight).toBeGreaterThanOrEqual(600);
  });

  test('header menu item は keyboard focus 時に視認可能な focus indicator を維持すること', async ({
    page,
  }) => {
    await page.goto(markdownBasic.directPath);
    await waitForRouterDocumentHostReady(page);
    await prepareHeaderMenuItems(page, 'corpus', ['Alpha', 'Beta', 'Gamma']);

    for (const menu of ['corpus', 'theme'] as const) {
      const trigger = page.locator(
        `header[data-layout-header] [data-header-menu="${menu}"] [data-header-menu-trigger]`,
      );
      const firstItem = page
        .locator(`header[data-layout-header] [data-header-menu="${menu}"] [data-header-menu-item]`)
        .first();

      await trigger.focus();
      await page.keyboard.press('ArrowDown');
      await expectMenuOpen(page, menu, true);
      await expect(firstItem).toBeFocused();
      expectVisibleFocusIndicator(await readFocusIndicator(firstItem));

      if (menu === 'theme') {
        await expect(firstItem).toHaveAttribute('aria-pressed', /true|false/u);
      }

      await page.keyboard.press('Escape');
      await expectMenuOpen(page, menu, false);
      await expect(trigger).toBeFocused();
    }
  });

  test('corpus trigger label は長文でも ellipsis され header 内に収まること', async ({ page }) => {
    await page.setViewportSize({ width: 640, height: 760 });
    await page.goto('/about/');
    await waitForRouterDocumentHostReady(page);

    await page.locator('header[data-layout-header] .corpus-trigger-text').evaluate((element) => {
      element.textContent =
        'Extremely long corpus label for static header migration visual overflow contract';
    });

    const triggerTextContract = await page
      .locator('header[data-layout-header] .corpus-trigger-text')
      .evaluate((element) => {
        const style = window.getComputedStyle(element);
        const declaredDisplay = Array.from(document.styleSheets).some((sheet) =>
          Array.from(sheet.cssRules).some((rule) => {
            if (!(rule instanceof CSSStyleRule)) return false;
            return (
              rule.selectorText === 'header[data-layout-header] .corpus-trigger-text' &&
              rule.style.display === 'inline-block'
            );
          }),
        );
        return {
          declaredDisplay,
          display: style.display,
          maxInlineSize: style.maxInlineSize,
          overflow: style.overflow,
          scrollWidth: element.scrollWidth,
          textOverflow: style.textOverflow,
          whiteSpace: style.whiteSpace,
          width: element.clientWidth,
        };
      });

    expect(triggerTextContract.declaredDisplay).toBe(true);
    expect(['block', 'inline-block']).toContain(triggerTextContract.display);
    expect(triggerTextContract.overflow).toBe('hidden');
    expect(triggerTextContract.textOverflow).toBe('ellipsis');
    expect(triggerTextContract.whiteSpace).toBe('nowrap');
    expect(triggerTextContract.maxInlineSize).not.toBe('none');
    expect(triggerTextContract.scrollWidth).toBeGreaterThan(triggerTextContract.width);

    const triggerBox = await page.locator(headerControlTargets.corpus.selector).boundingBox();
    const viewport = page.viewportSize();
    if (triggerBox === null || viewport === null) {
      throw new Error('Corpus trigger box or viewport is missing.');
    }
    expect(triggerBox.x).toBeGreaterThanOrEqual(-1);
    expect(triggerBox.x + triggerBox.width).toBeLessThanOrEqual(viewport.width + 1);
    await expectHeaderControlWithinHeader(page, headerControlTargets.corpus.selector);
  });

  test('default corpus menu は content-constrained 幅で default label を省略しないこと', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 760 });
    await page.goto('/about/');
    await waitForRouterDocumentHostReady(page);

    const trigger = page.locator(headerMenuTriggerSelector('corpus'));
    await trigger.click();
    await expectMenuOpen(page, 'corpus', true);

    const panel = page.locator(
      'header[data-layout-header] [data-header-menu="corpus"] [data-header-menu-panel]',
    );
    const [triggerBox, panelBox] = await Promise.all([trigger.boundingBox(), panel.boundingBox()]);
    const viewport = page.viewportSize();
    const rootFontSize = await page.locator('html').evaluate((element) => {
      const style = window.getComputedStyle(element);
      return Number.parseFloat(style.fontSize);
    });

    if (triggerBox === null || panelBox === null || viewport === null) {
      throw new Error('Corpus trigger, panel box, or viewport is missing.');
    }

    expect(panelBox.width).toBeGreaterThanOrEqual(triggerBox.width);
    expect(panelBox.x).toBeGreaterThanOrEqual(-1);
    expect(panelBox.x + panelBox.width).toBeLessThanOrEqual(viewport.width + 1);
    expect(panelBox.width).toBeLessThan(rootFontSize * 18);

    const defaultItemOverflow = await panel
      .locator('[data-header-menu-item]')
      .evaluateAll((items) =>
        items.map((item) => ({
          clientWidth: item.clientWidth,
          scrollWidth: item.scrollWidth,
        })),
      );

    for (const item of defaultItemOverflow) {
      expect(item.scrollWidth).toBeLessThanOrEqual(item.clientWidth + 1);
    }
  });

  test('theme menu は content-constrained 幅で短い option label に対して過剰に広がらないこと', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 760 });
    await page.goto('/about/');
    await waitForRouterDocumentHostReady(page);

    const trigger = page.locator(headerMenuTriggerSelector('theme'));
    await trigger.click();
    await expectMenuOpen(page, 'theme', true);

    const panel = page.locator(
      'header[data-layout-header] [data-header-menu="theme"] [data-header-menu-panel]',
    );
    const [triggerBox, panelBox] = await Promise.all([trigger.boundingBox(), panel.boundingBox()]);
    const viewport = page.viewportSize();
    const rootFontSize = await page.locator('html').evaluate((element) => {
      const style = window.getComputedStyle(element);
      return Number.parseFloat(style.fontSize);
    });

    if (triggerBox === null || panelBox === null || viewport === null) {
      throw new Error('Theme trigger, panel box, or viewport is missing.');
    }

    expect(panelBox.width).toBeGreaterThanOrEqual(triggerBox.width);
    expect(panelBox.x).toBeGreaterThanOrEqual(-1);
    expect(panelBox.x + panelBox.width).toBeLessThanOrEqual(viewport.width + 1);
    // 現行theme triggerが旧10rem floor未満である前提を固定し、旧floorへの退行を検出する。
    expect(triggerBox.width).toBeLessThan(rootFontSize * 10);
    expect(panelBox.width).toBeLessThan(rootFontSize * 10);

    const optionContracts = await panel.locator('[data-header-menu-item]').evaluateAll((items) =>
      items.map((item) => {
        const style = window.getComputedStyle(item);
        return {
          clientWidth: item.clientWidth,
          scrollWidth: item.scrollWidth,
          whiteSpace: style.whiteSpace,
        };
      }),
    );

    for (const item of optionContracts) {
      expect(item.whiteSpace).toBe('nowrap');
      expect(item.scrollWidth).toBeLessThanOrEqual(item.clientWidth + 1);
    }
  });

  test('corpus menu panel と item は長文でも inline 方向へ overflow しないこと', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 760 });
    await page.goto('/about/');
    await waitForRouterDocumentHostReady(page);
    await prepareHeaderMenuItems(page, 'corpus', [
      'ExtremelyLongCorpusMenuItemLabelForStaticHeaderMigrationVisualOverflowContract'.repeat(4),
      'AnotherExtremelyLongCorpusMenuItemLabelThatShouldRemainOnOneVisualLine'.repeat(4),
    ]);

    await page.locator(headerMenuTriggerSelector('corpus')).click();
    await expectMenuOpen(page, 'corpus', true);

    const panel = page.locator(
      'header[data-layout-header] [data-header-menu="corpus"] [data-header-menu-panel]',
    );
    const panelContract = await panel.evaluate((element) => {
      const style = window.getComputedStyle(element);
      return {
        boxSizing: style.boxSizing,
        width: Number.parseFloat(style.width),
      };
    });
    const viewport = page.viewportSize();
    if (viewport === null) {
      throw new Error('Viewport is missing.');
    }
    expect(panelContract.boxSizing).toBe('border-box');
    expect(panelContract.width).toBeLessThanOrEqual(viewport.width);

    const firstItem = panel.locator('[data-header-menu-item]').first();
    const itemContract = await firstItem.evaluate((element) => {
      const label = element.querySelector('.corpus-menu-item__label');
      if (!(label instanceof HTMLElement)) {
        throw new Error('Corpus menu item label is missing.');
      }
      const style = window.getComputedStyle(element);
      const labelStyle = window.getComputedStyle(label);
      const height = element.getBoundingClientRect().height;
      return {
        boxSizing: style.boxSizing,
        display: style.display,
        gridTemplateColumns: style.gridTemplateColumns,
        height,
        labelOverflow: labelStyle.overflow,
        labelMinInlineSize: labelStyle.minInlineSize,
        labelTextOverflow: labelStyle.textOverflow,
        labelWhiteSpace: labelStyle.whiteSpace,
      };
    });

    expect(itemContract.gridTemplateColumns).not.toContain('1em');
    expect(itemContract.boxSizing).toBe('border-box');
    expect(itemContract.labelWhiteSpace).toBe('nowrap');
    expect(itemContract.labelOverflow).toBe('hidden');
    expect(itemContract.labelMinInlineSize).toBe('0px');
    expect(itemContract.labelTextOverflow).toBe('ellipsis');
    expect(itemContract.height).toBeGreaterThanOrEqual(32);

    const panelBox = await panel.boundingBox();
    if (panelBox === null) {
      throw new Error('Corpus menu panel box is missing.');
    }
    expect(panelBox.x).toBeGreaterThanOrEqual(-1);
    expect(panelBox.x + panelBox.width).toBeLessThanOrEqual(viewport.width + 1);
  });

  test('current corpus item は quiet selected surface と text emphasis で非current item と区別できること', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 760 });
    await page.goto('/about/');
    await waitForRouterDocumentHostReady(page);

    await page.locator(headerMenuTriggerSelector('corpus')).click();
    await expectMenuOpen(page, 'corpus', true);

    const panel = page.locator(
      'header[data-layout-header] [data-header-menu="corpus"] [data-header-menu-panel]',
    );
    await expect(panel).toBeVisible();

    const viewport = page.viewportSize();
    if (viewport !== null) {
      await page.mouse.move(viewport.width - 1, viewport.height - 1);
    }
    await expect(panel).toBeVisible();

    const visualState = await panel.evaluate((panelElement) => {
      const currentItems = Array.from(
        panelElement.querySelectorAll('[data-header-menu-item][aria-current="page"]'),
      );
      const current = currentItems[0];
      const nonCurrent = Array.from(panelElement.querySelectorAll('[data-header-menu-item]')).find(
        (item) => item.getAttribute('aria-current') !== 'page',
      );

      if (!(current instanceof HTMLElement) || !(nonCurrent instanceof HTMLElement)) {
        return null;
      }

      const read = (element: HTMLElement) => {
        const style = window.getComputedStyle(element);
        const label = element.querySelector('.corpus-menu-item__label');
        return {
          ariaCurrent: element.getAttribute('aria-current'),
          backgroundColor: style.backgroundColor,
          borderInlineStartWidth: Number.parseFloat(style.borderInlineStartWidth),
          fontWeight: Number.parseFloat(style.fontWeight),
          hasCheckIcon: element.querySelector('svg[data-icon="check"]') !== null,
          hasIndicator: element.querySelector('.corpus-menu-item__indicator') !== null,
          hasLabel: label instanceof HTMLElement,
          label: element.getAttribute('data-header-menu-text') ?? '',
          rawFontWeight: style.fontWeight,
        };
      };

      return {
        current: read(current),
        currentCount: currentItems.length,
        nonCurrent: read(nonCurrent),
      };
    });

    expect(visualState).not.toBeNull();
    expect(visualState?.currentCount).toBe(1);

    expect(visualState?.current.ariaCurrent).toBe('page');
    expect(visualState?.nonCurrent.ariaCurrent).toBeNull();
    expect(visualState?.current.hasIndicator).toBe(false);
    expect(visualState?.nonCurrent.hasIndicator).toBe(false);
    expect(visualState?.current.hasCheckIcon).toBe(false);
    expect(visualState?.nonCurrent.hasCheckIcon).toBe(false);
    expect(visualState?.current.hasLabel).toBe(true);
    expect(visualState?.nonCurrent.hasLabel).toBe(true);
    expect(visualState?.current.label).not.toBe('');
    expect(visualState?.nonCurrent.label).not.toBe('');
    expect(visualState?.current.borderInlineStartWidth).toBe(0);
    expect(visualState?.nonCurrent.borderInlineStartWidth).toBe(0);
    expect(visualState?.current.backgroundColor).not.toBe(visualState?.nonCurrent.backgroundColor);

    const currentWeight = visualState?.current.fontWeight ?? Number.NaN;
    const nonCurrentWeight = visualState?.nonCurrent.fontWeight ?? Number.NaN;

    if (Number.isFinite(currentWeight) && Number.isFinite(nonCurrentWeight)) {
      expect(currentWeight).toBeGreaterThan(nonCurrentWeight);
      expect(currentWeight).toBeGreaterThanOrEqual(600);
      expect(nonCurrentWeight).toBeLessThanOrEqual(500);
    } else {
      expect(visualState?.current.rawFontWeight).not.toBe(visualState?.nonCurrent.rawFontWeight);
    }
  });

  test('header responsive CSS は TOC trigger の 640px 境界を維持すること', async ({ page }) => {
    await page.setViewportSize({ width: 639, height: 760 });
    await page.goto(layoutRich.directPath);
    await waitForRouterDocumentHostReady(page);

    const triggerSelector = 'header[data-layout-header] [data-toc-trigger]';
    await expect(page.locator(triggerSelector)).toHaveAttribute(
      'data-toc-trigger-interactive',
      'true',
    );
    await page.locator(triggerSelector).evaluate((element) => {
      element.setAttribute('data-visible', 'true');
    });
    await expect.poll(() => visibleDisplay(page, triggerSelector)).not.toBe('none');

    await page.locator(triggerSelector).evaluate((element) => {
      element.setAttribute('data-visible', 'false');
      element.focus();
    });
    await expect.poll(() => visibleDisplay(page, triggerSelector)).toBe('none');
    await expect
      .poll(() =>
        page.locator(triggerSelector).evaluate((element) => document.activeElement === element),
      )
      .toBe(false);

    await page.locator(triggerSelector).evaluate((element) => {
      element.setAttribute('data-visible', 'true');
    });
    await page.setViewportSize({ width: 640, height: 760 });
    await expect.poll(() => visibleDisplay(page, triggerSelector)).toBe('none');
  });

  test('header responsive CSS は sidebar toggle の 1024px 境界を維持すること', async ({ page }) => {
    const triggerSelector = 'header[data-layout-header] [data-layout-sidebar-toggle]';

    await page.setViewportSize({ width: 1023, height: 760 });
    await page.goto(layoutRich.directPath);
    await waitForRouterDocumentHostReady(page);
    await expect.poll(() => visibleDisplay(page, triggerSelector)).not.toBe('none');

    await page.setViewportSize({ width: 1024, height: 760 });
    await expect.poll(() => visibleDisplay(page, triggerSelector)).toBe('none');
    await expect(page.locator('header[data-layout-header]')).toHaveAttribute(
      'data-sidebar-mode',
      'fixed',
    );
    await expect(page.locator('header[data-layout-header]')).toHaveAttribute(
      'data-sidebar-state',
      'expanded',
    );
    await expect(page.locator('header[data-layout-header]')).toHaveAttribute(
      'data-overlay-sidebar-open',
      'false',
    );
    await expect(page.locator(triggerSelector)).toHaveAttribute('aria-expanded', 'true');
  });

  test('top page header controls は responsive 幅でも header 内に収まること', async ({ page }) => {
    const widths = [390, 640, 960, 1280] as const;

    for (const width of widths) {
      await page.setViewportSize({ width, height: 760 });
      await page.goto('/');
      await waitForRouterDocumentHostReady(page);

      await expect(page.locator('header[data-layout-header]')).toHaveAttribute(
        'data-note-layout',
        'false',
      );
      await expect(
        page.locator('header[data-layout-header] [data-layout-sidebar-toggle]'),
      ).toHaveCount(0);
      await expect(page.locator('header[data-layout-header] [data-toc-trigger]')).toHaveCount(0);

      await expectHeaderControlWithinHeader(page, headerControlTargets.corpus.selector);
      await expectHeaderControlWithinHeader(
        page,
        'header[data-layout-header] [data-search-dialog-trigger]',
      );
      await expectHeaderControlWithinHeader(page, themeTriggerRootSelector);
    }
  });
});
