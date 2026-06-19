import { expect, test, type Page } from '@playwright/test';

import { e2eNoteFixtures } from './support/note-fixtures.js';

const layoutRich = e2eNoteFixtures.layoutRich;
const markdownBasic = e2eNoteFixtures.markdownBasic;
const sidebarScrollTarget = e2eNoteFixtures.sidebarScrollTarget;

const waitForAppRouterReady = async (page: Page): Promise<void> => {
  await page.waitForFunction(() => {
    const router = document.querySelector('app-router');
    return (
      router instanceof HTMLElement &&
      typeof (router as { navigate?: unknown }).navigate === 'function' &&
      typeof (router as { whenReady?: unknown }).whenReady === 'function'
    );
  });
};

const navigateWithAppRouter = async (page: Page, url: string): Promise<void> => {
  await waitForAppRouterReady(page);
  await page.evaluate(async (targetUrl) => {
    const router = document.querySelector('app-router') as
      | (HTMLElement & {
          navigate: (nextUrl: string) => Promise<unknown>;
          whenReady: () => Promise<void>;
        })
      | null;
    if (router === null) throw new Error('app-router is missing.');
    await router.whenReady();
    await router.navigate(targetUrl);
  }, url);
};

const visibleDisplay = async (page: Page, selector: string): Promise<string> =>
  page.locator(selector).evaluate((element) => window.getComputedStyle(element).display);

const searchTriggerSelector = 'header[data-layout-header] [data-search-dialog-trigger]';
const searchDialogSelector = 'dialog[data-search-dialog-root]';
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

const headerControlTargets = {
  corpus: {
    name: 'corpus switcher trigger',
    selector: 'header[data-layout-header] .corpus-switcher > summary',
  },
  search: {
    name: 'search trigger',
    selector: searchTriggerSelector,
  },
  theme: {
    name: 'theme switcher trigger',
    selector: 'header[data-layout-header] .theme-switcher > summary',
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

const expectHeaderControlHitTargetContract = (
  contract: HeaderControlHitTargetContract,
): void => {
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
    const placeholder = element.querySelector<HTMLElement>('.search-trigger__placeholder');
    const placeholderStyle = placeholder === null ? null : window.getComputedStyle(placeholder);
    const afterStyle = window.getComputedStyle(element, '::after');
    return {
      afterPosition: afterStyle.position,
      height: Number.parseFloat(style.height),
      placeholderDisplay: placeholderStyle?.display ?? null,
      position: style.position,
      width: Number.parseFloat(style.width),
    };
  });

const closeSearchDialog = async (page: Page): Promise<void> => {
  await page.keyboard.press('Escape');
  await expect(page.locator(searchDialogSelector)).not.toHaveAttribute('open', '');
};

const expectMenuOpen = async (
  page: Page,
  menu: 'corpus' | 'theme',
  open: boolean,
): Promise<void> => {
  const menuLocator = page.locator(`header[data-layout-header] [data-header-menu="${menu}"]`);
  const trigger = menuLocator.locator('[data-header-menu-trigger]');
  if (open) {
    await expect(menuLocator).toHaveAttribute('open', '');
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  } else {
    await expect(menuLocator).not.toHaveAttribute('open', '');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  }
};

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

const prepareHeaderMenuItems = async (
  page: Page,
  menu: 'corpus' | 'theme',
  labels: readonly string[],
): Promise<void> => {
  await page.locator(`header[data-layout-header] [data-header-menu="${menu}"]`).evaluate(
    (menuElement, itemLabels) => {
      const list = menuElement.querySelector('ul');
      if (list === null) {
        throw new Error(
          `${menuElement.getAttribute('data-header-menu') ?? 'header'} menu list is missing.`,
        );
      }

      const firstItem = list.querySelector('li');
      if (firstItem === null) {
        throw new Error(
          `${menuElement.getAttribute('data-header-menu') ?? 'header'} menu item is missing.`,
        );
      }

      while (list.children.length < itemLabels.length) {
        list.append(firstItem.cloneNode(true));
      }

      for (const [index, label] of itemLabels.entries()) {
        const item = list.querySelectorAll<HTMLElement>('[data-header-menu-item]').item(index);
        item.setAttribute('data-header-menu-text', label);
        const labelNode = item.querySelector('span') ?? item;
        labelNode.textContent = label;
      }
    },
    [...labels],
  );
};

test.describe('Static header migration', () => {
  test('SPA 遷移では shell.headerHtml で header 全体を置換すること', async ({ page }) => {
    await page.goto(layoutRich.directPath);
    await waitForAppRouterReady(page);

    await expect(page.locator('header[data-layout-header]')).toHaveAttribute(
      'data-note-layout',
      'true',
    );
    await navigateWithAppRouter(page, '/about/');

    await expect(page.locator('header[data-layout-header]')).toHaveAttribute(
      'data-note-layout',
      'false',
    );
    await expect(page.locator('header[data-layout-header]')).toHaveCount(1);
    await expect(page.locator('layout-header, ui-header')).toHaveCount(0);
  });

  test('検索 trigger は dialog が利用可能な時だけ progressive enhancement されること', async ({
    page,
  }) => {
    await page.goto('/about/');
    await waitForAppRouterReady(page);

    const trigger = page.locator(searchTriggerSelector);
    const dialog = page.locator(searchDialogSelector);
    const dialogId = await dialog.getAttribute('id');
    expect(dialogId).not.toBeNull();

    await expect(trigger).toHaveAttribute('href', '/search/');
    await expect(trigger).toHaveAttribute('aria-controls', dialogId ?? '');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await trigger.click();

    await expect(dialog).toHaveAttribute('open', '');
    await expect(trigger).toHaveAttribute('href', '/search/');
    await expect(trigger).toHaveAttribute('aria-controls', dialogId ?? '');
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(page).toHaveURL(/\/about\/$/u);

    await closeSearchDialog(page);
    await expect(trigger).toHaveAttribute('href', '/search/');
    await expect(trigger).toHaveAttribute('aria-controls', dialogId ?? '');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(trigger).toBeFocused();
  });

  test('検索 trigger は anchor semantics と accessible name を維持すること', async ({ page }) => {
    await page.goto('/about/');
    await waitForAppRouterReady(page);

    const trigger = page.locator(searchTriggerSelector);
    await expect(trigger).toHaveCount(1);
    await expect(trigger).toHaveAttribute('href', /\/search\/$/u);
    await expect(trigger).toHaveAttribute('aria-label', '検索ダイアログを開く');
    await expect(trigger.locator('.search-trigger__placeholder')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
    await expect(trigger.locator('.search-trigger__placeholder')).toHaveText('検索...');
    await expect(trigger).toHaveJSProperty('tagName', 'A');
  });

  test('静的 header は disclosure と search の ARIA seed contract を維持すること', async ({
    page,
  }) => {
    await page.goto('/about/');
    await waitForAppRouterReady(page);

    const corpusMenu = page.locator('header[data-layout-header] [data-header-menu="corpus"]');
    const corpusTrigger = corpusMenu.locator('[data-header-menu-trigger]');
    const corpusPanel = corpusMenu.locator('[data-header-menu-panel]');
    await expect(corpusPanel).toHaveJSProperty('tagName', 'NAV');
    await expect(corpusPanel).not.toHaveAttribute('role', 'menu');
    await expect(corpusMenu.locator('[role="menu"], [role="menuitem"]')).toHaveCount(0);
    await expect(corpusTrigger).toHaveAttribute('aria-expanded', 'false');
    await expect(corpusTrigger).toHaveAttribute('aria-controls', /.+/u);
    const corpusPanelId = await corpusTrigger.getAttribute('aria-controls');
    const corpusTriggerId = await corpusTrigger.getAttribute('id');
    expect(corpusPanelId).not.toBeNull();
    expect(corpusTriggerId).not.toBeNull();
    await expect(corpusTrigger).toHaveAttribute(
      'data-header-menu-trigger-id',
      corpusTriggerId ?? '',
    );
    await expect(corpusPanel).toHaveAttribute('id', corpusPanelId ?? '');
    await expect(corpusPanel).toHaveAttribute('data-header-menu-panel-id', corpusPanelId ?? '');
    await expect(corpusPanel).toHaveAttribute('aria-labelledby', corpusTriggerId ?? '');
    await expect(corpusPanel).toHaveAttribute('aria-label', 'コーパス');
    const corpusLinkage = await page.evaluate(() => {
      const trigger = document.querySelector(
        'header[data-layout-header] [data-header-menu="corpus"] [data-header-menu-trigger]',
      );
      const panel = document.querySelector(
        'header[data-layout-header] [data-header-menu="corpus"] [data-header-menu-panel]',
      );
      const controls = trigger?.getAttribute('aria-controls');
      return Boolean(controls && panel && document.getElementById(controls) === panel);
    });
    expect(corpusLinkage).toBe(true);

    const themeMenu = page.locator('header[data-layout-header] [data-header-menu="theme"]');
    const themeTrigger = themeMenu.locator('[data-header-menu-trigger]');
    const themePanel = themeMenu.locator('[data-header-menu-panel]');
    await expect(themePanel).toHaveAttribute('role', 'group');
    await expect(themePanel).not.toHaveAttribute('role', 'menu');
    await expect(themeMenu.locator('[role="menu"], [role="menuitem"]')).toHaveCount(0);
    await expect(themeTrigger).toHaveAttribute('aria-expanded', 'false');
    await expect(themeTrigger).toHaveAttribute('aria-controls', /.+/u);
    const themePanelId = await themeTrigger.getAttribute('aria-controls');
    const themeTriggerId = await themeTrigger.getAttribute('id');
    expect(themePanelId).not.toBeNull();
    expect(themeTriggerId).not.toBeNull();
    await expect(themeTrigger).toHaveAttribute('data-header-menu-trigger-id', themeTriggerId ?? '');
    await expect(themePanel).toHaveAttribute('id', themePanelId ?? '');
    await expect(themePanel).toHaveAttribute('data-header-menu-panel-id', themePanelId ?? '');
    await expect(themePanel).toHaveAttribute('aria-labelledby', themeTriggerId ?? '');
    await expect(themePanel).toHaveAttribute('aria-label', 'テーマ');
    const themeLinkage = await page.evaluate(() => {
      const trigger = document.querySelector(
        'header[data-layout-header] [data-header-menu="theme"] [data-header-menu-trigger]',
      );
      const panel = document.querySelector(
        'header[data-layout-header] [data-header-menu="theme"] [data-header-menu-panel]',
      );
      const controls = trigger?.getAttribute('aria-controls');
      return Boolean(controls && panel && document.getElementById(controls) === panel);
    });
    expect(themeLinkage).toBe(true);
    const themeOptions = themePanel.locator('[data-theme-value]');
    await expect(themeOptions.first()).toHaveJSProperty('tagName', 'BUTTON');
    await expect(themeOptions.first()).toHaveAttribute('aria-pressed', /true|false/u);

    const searchTrigger = page.locator(searchTriggerSelector);
    await expect(searchTrigger).toHaveAttribute('href', '/search/');
    await expect(searchTrigger).toHaveAttribute('data-no-router', 'true');
    await expect(searchTrigger).toHaveAttribute('aria-haspopup', 'dialog');
    await expect(searchTrigger).toHaveAttribute('aria-controls', /.+/u);
    await expect(searchTrigger).toHaveAttribute('aria-expanded', 'false');
    await expect(searchTrigger).toHaveAccessibleName('検索ダイアログを開く');
    await expect(searchTrigger.locator('.search-trigger__placeholder')).toBeVisible();
    await expect(searchTrigger.locator('.search-trigger__placeholder')).toHaveText('検索...');
  });

  test('検索 trigger は responsive density を復元すること', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 760 });
    await page.goto('/about/');
    await waitForAppRouterReady(page);
    const regular = await readSearchTriggerDensity(page);
    expect(regular.placeholderDisplay).not.toBe('none');
    expect(regular.width).toBeGreaterThan(regular.height * 3);

    await page.setViewportSize({ width: 959, height: 760 });
    const compact = await readSearchTriggerDensity(page);
    expect(compact.placeholderDisplay).not.toBe('none');
    expect(compact.width).toBeGreaterThan(compact.height * 2);
    expect(compact.width).toBeLessThan(regular.width);

    await page.setViewportSize({ width: 639, height: 760 });
    const iconOnly = await readSearchTriggerDensity(page);
    expect(iconOnly.placeholderDisplay).toBe('none');
    expect(iconOnly.width).toBeLessThanOrEqual(iconOnly.height + 2);

    await page.setViewportSize({ width: 400, height: 760 });
    const narrowBoundary = await readSearchTriggerDensity(page);
    expect(narrowBoundary.placeholderDisplay).toBe('none');
    expect(narrowBoundary.width).toBeLessThanOrEqual(narrowBoundary.height + 2);

    await page.setViewportSize({ width: 399, height: 760 });
    const minimum = await readSearchTriggerDensity(page);
    expect(minimum.placeholderDisplay).toBe('none');
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
    await waitForAppRouterReady(page);

    const geometry = await page.locator('header[data-layout-header]').evaluate((header) => {
      const headerStyle = window.getComputedStyle(header);
      const center = header.querySelector<HTMLElement>('.layout-header__center');
      const corpus = header.querySelector<HTMLElement>('.corpus-switcher');
      if (center === null || corpus === null) {
        throw new Error('header center or corpus switcher is missing.');
      }
      const centerStyle = window.getComputedStyle(center);
      const corpusStyle = window.getComputedStyle(corpus);
      return {
        centerEndInset: Number.parseFloat(centerStyle.insetInlineEnd),
        centerEndInsetProperty: centerStyle.getPropertyValue('--_header-center-end-inset').trim(),
        centerStartInset: Number.parseFloat(centerStyle.insetInlineStart),
        centerStartInsetProperty: centerStyle
          .getPropertyValue('--_header-center-start-inset')
          .trim(),
        corpusInlineStartOffset: Number.parseFloat(corpusStyle.marginInlineStart),
        corpusInlineStartOffsetProperty: corpusStyle
          .getPropertyValue('--_header-corpus-inline-start-offset')
          .trim(),
        primaryStartOffsetProperty: headerStyle
          .getPropertyValue('--_header-primary-start-offset')
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
    expect(geometry.corpusInlineStartOffsetProperty).not.toBe('');
    expect(geometry.corpusInlineStartOffsetProperty).not.toBe('0px');
    expect(geometry.primaryStartOffsetProperty).not.toBe('');
    expect(geometry.centerEndInsetProperty).not.toBe('');
    expect(geometry.centerEndInsetProperty).not.toBe('0px');
    expect(geometry.centerStartInset).toBeGreaterThan(0);
    expect(geometry.centerEndInset).toBeGreaterThan(0);
    expect(geometry.corpusInlineStartOffset).toBeGreaterThan(0);
    expect(geometry.corpusInlineStartOffset).toBeLessThan(geometry.centerStartInset);
  });

  test('検索 trigger は fallback link と状態別 CSS と 44px hit area contract を維持すること', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 399, height: 760 });
    await page.goto('/about/');
    await waitForAppRouterReady(page);

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
          boxShadow: style.boxShadow,
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

    await page.locator('header[data-layout-header] .corpus-switcher > summary').focus();
    await page.keyboard.press('Tab');
    await expect(trigger).toBeFocused();
    const focusVisibleStyle = await readInteractiveStyle();
    expect(focusVisibleStyle.outlineStyle).not.toBe('none');
    expect(focusVisibleStyle.outlineWidth).toBeGreaterThan(0);
    expect(focusVisibleStyle.boxShadow).not.toBe('none');

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

    expect(activeStyle.transform).not.toBe('none');
  });

  test('header controls は focus-visible で視認可能な focus ring を持つこと', async ({ page }) => {
    await page.goto('/about/');
    await waitForAppRouterReady(page);

    await page.locator('header[data-layout-header] .corpus-switcher > summary').focus();
    await page.keyboard.press('Tab');
    await expect(page.locator(searchTriggerSelector)).toBeFocused();

    const focusStyle = await page.locator(searchTriggerSelector).evaluate((element) => {
      const style = window.getComputedStyle(element);
      return {
        boxShadow: style.boxShadow,
        outlineColor: style.outlineColor,
        outlineStyle: style.outlineStyle,
        outlineWidth: Number.parseFloat(style.outlineWidth),
      };
    });

    expect(focusStyle.outlineStyle).not.toBe('none');
    expect(focusStyle.outlineWidth).toBeGreaterThan(0);
    expect(focusStyle.outlineColor).not.toBe('rgba(0, 0, 0, 0)');
    expect(focusStyle.boxShadow).not.toBe('none');

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

  test('検索 trigger は Enter 起動時に keyboard modality で dialog を開くこと', async ({
    page,
  }) => {
    await page.goto('/about/');
    await waitForAppRouterReady(page);

    await page.locator(searchTriggerSelector).focus();
    await page.keyboard.press('Enter');

    await expect(page.locator(searchDialogSelector)).toHaveAttribute('open', '');
    await expect(page.locator(searchDialogSelector)).toHaveAttribute(
      'data-search-dialog-open-modality',
      'keyboard',
    );
    await closeSearchDialog(page);
  });

  test('検索 trigger は mouse click 起動時に pointer modality で dialog を開くこと', async ({
    page,
  }) => {
    await page.goto('/about/');
    await waitForAppRouterReady(page);

    await page.locator(searchTriggerSelector).click();

    await expect(page.locator(searchDialogSelector)).toHaveAttribute('open', '');
    await expect(page.locator(searchDialogSelector)).toHaveAttribute(
      'data-search-dialog-open-modality',
      'pointer',
    );
    await closeSearchDialog(page);
  });

  test('検索 trigger は判定不能な click では controller の modalityTracker に委ねること', async ({
    page,
  }) => {
    await page.goto('/about/');
    await waitForAppRouterReady(page);

    await page.keyboard.press('Tab');
    await page.locator(searchTriggerSelector).evaluate((anchor) => {
      const event = new Event('click', { bubbles: true, cancelable: true, composed: true });
      Object.defineProperty(event, 'button', { value: 0 });
      anchor.dispatchEvent(event);
    });

    await expect(page.locator(searchDialogSelector)).toHaveAttribute('open', '');
    await expect(page.locator(searchDialogSelector)).toHaveAttribute(
      'data-search-dialog-open-modality',
      'keyboard',
    );
    await closeSearchDialog(page);
  });

  test('theme switcher は静的 header 置換後も delegation で同期すること', async ({ page }) => {
    await page.goto(markdownBasic.directPath);
    await waitForAppRouterReady(page);
    await navigateWithAppRouter(page, '/about/');

    await page.locator('header[data-layout-header] [data-theme-switcher] summary').click();
    await page.locator('header[data-layout-header] [data-theme-value="dark"]').click();

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('header[data-layout-header] [data-theme-current-label]')).toHaveText(
      'ダーク',
    );
    await expect(
      page.locator('header[data-layout-header] .theme-trigger-icon svg[data-icon]'),
    ).toHaveAttribute('data-icon', 'moon');
    await expect(
      page.locator('header[data-layout-header] [data-theme-value="dark"]'),
    ).toHaveAttribute('aria-pressed', 'true');
    await expect(
      page.locator('header[data-layout-header] [data-theme-value="dark"]'),
    ).toHaveAttribute('data-selected', 'true');
    await expect(
      page.locator('header[data-layout-header] [data-theme-value="dark"] svg[data-icon]'),
    ).toHaveAttribute('data-icon', 'check');
  });

  test('direct data-theme mutation でも header theme 表示だけを同期すること', async ({
    page,
  }) => {
    await page.goto('/about/');
    await waitForAppRouterReady(page);

    await page.evaluate(() => {
      document.documentElement.dataset['theme'] = 'light';
    });

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(page.locator('header[data-layout-header] [data-theme-current-label]')).toHaveText(
      'ライト',
    );
    await expect(
      page.locator('header[data-layout-header] [data-theme-switcher] summary'),
    ).toHaveAttribute('aria-label', 'テーマ: ライト');
    await expect(
      page.locator('header[data-layout-header] .theme-trigger-icon svg[data-icon]'),
    ).toHaveAttribute('data-icon', 'sun');
    await expect(
      page.locator('header[data-layout-header] [data-theme-value="light"]'),
    ).toHaveAttribute('aria-pressed', 'true');
    await expect(
      page.locator('header[data-layout-header] [data-theme-value="light"]'),
    ).toHaveAttribute('data-selected', 'true');
    await expect(
      page.locator('header[data-layout-header] [data-theme-value="light"] svg[data-icon]'),
    ).toHaveAttribute('data-icon', 'check');
  });

  test('header menu は Escape dismissal と summary focus restore を同期すること', async ({
    page,
  }) => {
    await page.goto(markdownBasic.directPath);
    await waitForAppRouterReady(page);

    for (const menu of ['corpus', 'theme'] as const) {
      const trigger = page.locator(
        `header[data-layout-header] [data-header-menu="${menu}"] [data-header-menu-trigger]`,
      );
      await trigger.click();
      await expectMenuOpen(page, menu, true);

      await page.keyboard.press('Escape');

      await expectMenuOpen(page, menu, false);
      await expect(trigger).toBeFocused();
    }
  });

  test('header menu は outside pointer と app-shell event で stale open state を閉じること', async ({
    page,
  }) => {
    await page.goto(markdownBasic.directPath);
    await waitForAppRouterReady(page);

    await page.locator('header[data-layout-header] [data-header-menu="corpus"] summary').click();
    await expectMenuOpen(page, 'corpus', true);
    await page.locator('main').click({ position: { x: 8, y: 8 } });
    await expectMenuOpen(page, 'corpus', false);

    await page.locator('header[data-layout-header] [data-header-menu="theme"] summary').click();
    await expectMenuOpen(page, 'theme', true);
    await page.evaluate(() => {
      document.dispatchEvent(new CustomEvent('app-shell:rollback-start'));
    });
    await expectMenuOpen(page, 'theme', false);

    for (const eventName of ['app-shell:committed', 'app-shell:restored'] as const) {
      await page.locator('header[data-layout-header] [data-header-menu="theme"] summary').click();
      await expectMenuOpen(page, 'theme', true);
      await page.evaluate((name) => {
        document.dispatchEvent(new CustomEvent(name));
      }, eventName);
      await expectMenuOpen(page, 'theme', false);
    }
  });

  test('header menu は one-menu-open と項目選択後 close を維持すること', async ({ page }) => {
    await page.goto(markdownBasic.directPath);
    await waitForAppRouterReady(page);

    await page.locator('header[data-layout-header] [data-header-menu="corpus"] summary').click();
    await expectMenuOpen(page, 'corpus', true);
    await expect(page.locator('header[data-layout-header] [data-header-menu][open]')).toHaveCount(
      1,
    );

    await page.locator('header[data-layout-header] [data-header-menu="theme"] summary').click();
    await expectMenuOpen(page, 'corpus', false);
    await expectMenuOpen(page, 'theme', true);
    await expect(page.locator('header[data-layout-header] [data-header-menu][open]')).toHaveCount(
      1,
    );

    await page.locator('header[data-layout-header] [data-theme-value="dark"]').click();
    await expectMenuOpen(page, 'theme', false);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('header menu は外部 scroll で閉じ、panel 内 scroll では閉じないこと', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 360 });
    await page.goto(markdownBasic.directPath);
    await waitForAppRouterReady(page);

    await page.locator('header[data-layout-header] [data-header-menu="corpus"] summary').click();
    await expectMenuOpen(page, 'corpus', true);
    await page.evaluate(() => window.dispatchEvent(new Event('scroll')));
    await expectMenuOpen(page, 'corpus', false);

    await page.locator('header[data-layout-header] [data-header-menu="corpus"] summary').click();
    await expectMenuOpen(page, 'corpus', true);
    await page
      .locator('header[data-layout-header] [data-header-menu="corpus"]')
      .evaluate((menu) => {
        const panel = menu.querySelector<HTMLElement>('[data-header-menu-panel]');
        const list = panel?.querySelector('ul');
        const item = list?.querySelector('li');
        if (panel === null || panel === undefined || list === null || list === undefined) {
          throw new Error('corpus menu panel is missing.');
        }
        if (item === null || item === undefined) {
          throw new Error('corpus menu panel is missing.');
        }
        for (let index = 0; index < 24; index += 1) {
          list.append(item.cloneNode(true));
        }
      });

    const panel = page.locator(
      'header[data-layout-header] [data-header-menu="corpus"] [data-header-menu-panel]',
    );
    await expect
      .poll(() =>
        panel.evaluate((element) => ({
          clientHeight: element.clientHeight,
          overflowY: window.getComputedStyle(element).overflowY,
          scrollHeight: element.scrollHeight,
          scrollbarWidth: window.getComputedStyle(element).scrollbarWidth,
        })),
      )
      .toMatchObject({
        overflowY: 'auto',
        scrollbarWidth: 'thin',
      });
    await expect
      .poll(() => panel.evaluate((element) => element.scrollHeight > element.clientHeight))
      .toBe(true);

    await panel.evaluate((element) => {
      element.scrollTop = 80;
      element.dispatchEvent(new Event('scroll', { bubbles: false }));
    });
    await expectMenuOpen(page, 'corpus', true);
  });

  test('summary click / Enter / Space は native details toggle と二重反転しないこと', async ({
    page,
  }) => {
    await page.goto(markdownBasic.directPath);
    await waitForAppRouterReady(page);

    const trigger = page.locator('header[data-layout-header] [data-header-menu="corpus"] summary');
    await trigger.click();
    await expectMenuOpen(page, 'corpus', true);
    await trigger.click();
    await expectMenuOpen(page, 'corpus', false);

    await trigger.focus();
    await page.keyboard.press('Enter');
    await expectMenuOpen(page, 'corpus', true);
    await page.keyboard.press('Enter');
    await expectMenuOpen(page, 'corpus', false);

    await page.keyboard.press('Space');
    await expectMenuOpen(page, 'corpus', true);
    await page.keyboard.press('Space');
    await expectMenuOpen(page, 'corpus', false);
  });

  test('header menu controller は Tab の通常 focus 移動と SPA 置換後の旧 header を壊さないこと', async ({
    page,
  }) => {
    await page.goto(markdownBasic.directPath);
    await waitForAppRouterReady(page);

    const corpusTrigger = page.locator(
      'header[data-layout-header] [data-header-menu="corpus"] summary',
    );
    await corpusTrigger.focus();
    await page.keyboard.press('Tab');
    await expect(
      page.locator('header[data-layout-header] [data-search-dialog-trigger]'),
    ).toBeFocused();

    await corpusTrigger.click();
    await expectMenuOpen(page, 'corpus', true);
    await page.evaluate(() => {
      const oldHeader = document.querySelector<HTMLElement>('header[data-layout-header]');
      if (oldHeader === null) throw new Error('static header is missing.');
      const state = window as unknown as {
        staticHeaderMenuOldHeader?: HTMLElement;
        readStaticHeaderMenuOldHeader?: () => Record<string, string | null>;
      };
      state.staticHeaderMenuOldHeader = oldHeader;
      state.readStaticHeaderMenuOldHeader = () => {
        const oldMenu = oldHeader.querySelector('details[data-header-menu="corpus"]');
        const oldTrigger = oldMenu?.querySelector('[data-header-menu-trigger]');
        return {
          connected: oldHeader.isConnected ? 'true' : 'false',
          open: oldMenu?.hasAttribute('open') === true ? 'true' : 'false',
          expanded: oldTrigger?.getAttribute('aria-expanded') ?? null,
        };
      };
    });

    await navigateWithAppRouter(page, '/about/');
    await page.locator('header[data-layout-header] [data-header-menu="theme"] summary').click();
    await page.evaluate(() => {
      document.dispatchEvent(new CustomEvent('app-shell:committed'));
      window.dispatchEvent(new Event('scroll'));
    });

    await expect
      .poll(async () =>
        page.evaluate(() => {
          const state = window as unknown as {
            readStaticHeaderMenuOldHeader?: () => Record<string, string | null>;
          };
          return state.readStaticHeaderMenuOldHeader?.() ?? {};
        }),
      )
      .toEqual({
        connected: 'false',
        open: 'true',
        expanded: 'true',
      });
    await expectMenuOpen(page, 'theme', false);
  });

  test('header menu は Arrow / Home / End で補助 focus 移動し runtime tabindex を導入しないこと', async ({
    page,
  }) => {
    await page.goto(markdownBasic.directPath);
    await waitForAppRouterReady(page);
    await prepareHeaderMenuItems(page, 'corpus', ['Alpha', 'Beta', 'Gamma']);

    for (const menu of ['corpus', 'theme'] as const) {
      const trigger = page.locator(
        `header[data-layout-header] [data-header-menu="${menu}"] summary`,
      );
      const items = page.locator(
        `header[data-layout-header] [data-header-menu="${menu}"] [data-header-menu-item]`,
      );

      await trigger.focus();
      await page.keyboard.press('ArrowDown');
      await expectMenuOpen(page, menu, true);
      await expect(items.first()).toBeFocused();
      await page.keyboard.press('ArrowDown');
      await expect(items.nth(1)).toBeFocused();
      await page.keyboard.press('ArrowUp');
      await expect(items.first()).toBeFocused();
      await page.keyboard.press('End');
      await expect(items.nth((await items.count()) - 1)).toBeFocused();
      await page.keyboard.press('Home');
      await expect(items.first()).toBeFocused();
      await expect(
        page.locator(
          `header[data-layout-header] [data-header-menu="${menu}"] [data-header-menu-item][tabindex]`,
        ),
      ).toHaveCount(0);

      await page.keyboard.press('Tab');
      await expectMenuOpen(page, menu, false);

      await trigger.focus();
      await page.keyboard.press('ArrowUp');
      await expectMenuOpen(page, menu, true);
      await expect(items.nth((await items.count()) - 1)).toBeFocused();

      await page.keyboard.press('Escape');
      await expectMenuOpen(page, menu, false);
      await expect(trigger).toBeFocused();
    }
  });

  test('header menu は closed trigger の ArrowDown / ArrowUp で first / last item に focus すること', async ({
    page,
  }) => {
    await page.goto(markdownBasic.directPath);
    await waitForAppRouterReady(page);
    const labels = ['Alpha', 'Beta', 'Gamma'] as const;
    await prepareHeaderMenuItems(page, 'corpus', labels);
    await prepareHeaderMenuItems(page, 'theme', labels);

    for (const menu of ['corpus', 'theme'] as const) {
      const trigger = page.locator(
        `header[data-layout-header] [data-header-menu="${menu}"] summary`,
      );
      const items = page.locator(
        `header[data-layout-header] [data-header-menu="${menu}"] [data-header-menu-item]`,
      );

      await expectMenuOpen(page, menu, false);
      await trigger.focus();
      await page.keyboard.press('ArrowDown');
      await expectMenuOpen(page, menu, true);
      await expect(items.first()).toBeFocused();

      await page.keyboard.press('Escape');
      await expectMenuOpen(page, menu, false);
      await expect(trigger).toBeFocused();

      await page.keyboard.press('ArrowUp');
      await expectMenuOpen(page, menu, true);
      await expect(items.nth((await items.count()) - 1)).toBeFocused();

      await page.keyboard.press('Escape');
      await expectMenuOpen(page, menu, false);
      await expect(trigger).toBeFocused();
    }
  });

  test('header menu は typeahead と close 後の buffer reset を同期すること', async ({ page }) => {
    await page.goto(markdownBasic.directPath);
    await waitForAppRouterReady(page);
    const labels = ['Gamma', 'Gala', 'Alpha'] as const;
    await prepareHeaderMenuItems(page, 'corpus', labels);
    await prepareHeaderMenuItems(page, 'theme', labels);

    const corpusTrigger = page.locator(
      'header[data-layout-header] [data-header-menu="corpus"] summary',
    );
    const corpusItems = page.locator(
      'header[data-layout-header] [data-header-menu="corpus"] [data-header-menu-item]',
    );

    await corpusTrigger.click();
    await expectMenuOpen(page, 'corpus', true);

    await page.keyboard.press('G');
    await expect(corpusItems.first()).toBeFocused();

    await page.keyboard.press('A');
    await expect(corpusItems.nth(1)).toBeFocused();

    await page.waitForTimeout(1100);
    await expectMenuOpen(page, 'corpus', true);

    await page.keyboard.press('A');
    await expect(corpusItems.nth(2)).toBeFocused();

    await page.keyboard.press('Escape');
    await expectMenuOpen(page, 'corpus', false);

    await corpusTrigger.click();
    await expectMenuOpen(page, 'corpus', true);

    await page.keyboard.press('G');
    await expect(corpusItems.first()).toBeFocused();

    await page.keyboard.press('Escape');
    await expectMenuOpen(page, 'corpus', false);

    await corpusTrigger.click();
    await expectMenuOpen(page, 'corpus', true);

    await page.keyboard.press('A');
    await expect(corpusItems.nth(2)).toBeFocused();

    await page.keyboard.press('Escape');
    await expectMenuOpen(page, 'corpus', false);

    for (const menu of ['corpus', 'theme'] as const) {
      const trigger = page.locator(
        `header[data-layout-header] [data-header-menu="${menu}"] summary`,
      );
      const items = page.locator(
        `header[data-layout-header] [data-header-menu="${menu}"] [data-header-menu-item]`,
      );

      await trigger.click();
      await expectMenuOpen(page, menu, true);

      await page.keyboard.press('G');
      await expect(items.first()).toBeFocused();

      await page.keyboard.press('Escape');
      await expectMenuOpen(page, menu, false);

      await trigger.click();
      await expectMenuOpen(page, menu, true);

      await page.keyboard.press('A');
      await expect(items.nth(2)).toBeFocused();

      await page.evaluate(() => {
        document.dispatchEvent(new CustomEvent('app-shell:rollback-start'));
      });
      await expectMenuOpen(page, menu, false);

      await trigger.click();
      await expectMenuOpen(page, menu, true);

      await page.keyboard.press('G');
      await expect(items.first()).toBeFocused();

      await page.keyboard.press('Escape');
      await expectMenuOpen(page, menu, false);
    }
  });

  test('mobile TOC trigger は validated 後の controller activation で panel を開くこと', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 760 });
    await page.goto(layoutRich.directPath);
    await waitForAppRouterReady(page);

    const trigger = page.locator('header[data-layout-header] [data-toc-trigger]');
    await expect(trigger).toHaveAttribute('data-visible', 'true');
    await expect(trigger).toHaveAttribute('data-toc-trigger-interactive', 'true');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(trigger).toHaveAttribute('aria-label', '目次を開く');
    const staticTocRootId = await trigger.getAttribute('data-toc-static-root-id');
    expect(staticTocRootId).not.toBeNull();
    await expect(trigger).toHaveAttribute('href', `#${staticTocRootId ?? ''}`);
    await expect(trigger).toHaveAttribute('aria-controls', /layout-toc-panel-/u);
    const hydratedTocPanelId = await trigger.getAttribute('aria-controls');
    expect(hydratedTocPanelId).not.toBeNull();
    await expect(trigger).toHaveAttribute('data-toc-mobile-panel-id', hydratedTocPanelId ?? '');
    await expect(page.locator(`#${hydratedTocPanelId ?? ''}`)).toHaveAttribute(
      'data-layout-toc-mobile-panel',
      '',
    );
    await trigger.click();

    await expect(page.locator('[data-layout-toc-mobile-panel]')).toBeVisible();
    await expect(trigger).toHaveAttribute('href', `#${staticTocRootId ?? ''}`);
    await expect(trigger).toHaveAttribute('aria-controls', hydratedTocPanelId ?? '');
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(trigger).toHaveAttribute('aria-label', '目次を閉じる');

    await trigger.click();
    await expect(page.locator('[data-layout-toc-mobile-panel]')).toBeHidden();
    await expect(trigger).toHaveAttribute('href', `#${staticTocRootId ?? ''}`);
    await expect(trigger).toHaveAttribute('aria-controls', hydratedTocPanelId ?? '');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(trigger).toHaveAttribute('aria-label', '目次を開く');
    await expect(trigger).toBeFocused();
  });

  test('header responsive CSS は TOC trigger の 640px 境界を維持すること', async ({ page }) => {
    await page.setViewportSize({ width: 639, height: 760 });
    await page.goto(layoutRich.directPath);
    await waitForAppRouterReady(page);

    const triggerSelector = 'header[data-layout-header] [data-toc-trigger]';
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
    await waitForAppRouterReady(page);
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

  test('sidebar toggle は controller state と aria を同期し focus return trigger を渡すこと', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 760 });
    await page.goto(layoutRich.directPath);
    await waitForAppRouterReady(page);

    const header = page.locator('header[data-layout-header]');
    const trigger = page.locator('header[data-layout-header] [data-layout-sidebar-toggle]');

    await expect(header).toHaveAttribute('data-sidebar-mode', 'overlay');
    await expect(header).toHaveAttribute('data-sidebar-state', 'collapsed');
    await expect(header).toHaveAttribute('data-overlay-sidebar-open', 'false');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(trigger).toHaveAttribute('aria-label', 'サイドバーを開く');

    await trigger.click();

    await expect(header).toHaveAttribute('data-sidebar-mode', 'overlay');
    await expect(header).toHaveAttribute('data-sidebar-state', 'expanded');
    await expect(header).toHaveAttribute('data-overlay-sidebar-open', 'true');
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(trigger).toHaveAttribute('aria-label', 'サイドバーを閉じる');
    await expect(page.locator('layout-sidebar-surface ui-sidebar-shell')).toHaveAttribute(
      'data-state',
      'expanded',
    );

    await page.locator('layout-sidebar-surface ui-sidebar-shell').evaluate((element) => {
      const scrim = element.shadowRoot?.querySelector<HTMLElement>('.scrim');
      if (scrim === undefined || scrim === null) {
        throw new Error('sidebar scrim is missing.');
      }
      scrim.click();
    });

    await expect(header).toHaveAttribute('data-sidebar-state', 'collapsed');
    await expect(header).toHaveAttribute('data-overlay-sidebar-open', 'false');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(trigger).toHaveAttribute('aria-label', 'サイドバーを開く');
    await expect(trigger).toBeFocused();
  });

  test('app-shell commit 後は theme と sidebar state を header へ再同期すること', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 760 });
    await page.goto(layoutRich.directPath);
    await waitForAppRouterReady(page);

    const header = page.locator('header[data-layout-header]');
    const sidebarTrigger = page.locator('header[data-layout-header] [data-layout-sidebar-toggle]');

    await sidebarTrigger.click();
    await expect(header).toHaveAttribute('data-sidebar-state', 'expanded');
    await expect(header).toHaveAttribute('data-overlay-sidebar-open', 'true');
    await expect(sidebarTrigger).toHaveAttribute('aria-expanded', 'true');

    await page.evaluate(() => {
      document.documentElement.dataset['theme'] = 'dark';
    });
    await expect(page.locator('header[data-layout-header] [data-theme-current-label]')).toHaveText(
      'ダーク',
    );

    await page.locator('header[data-layout-header]').evaluate((element) => {
      element.setAttribute('data-sidebar-mode', 'fixed');
      element.setAttribute('data-sidebar-state', 'collapsed');
      element.setAttribute('data-overlay-sidebar-open', 'false');
      element
        .querySelector<HTMLElement>('[data-layout-sidebar-toggle]')
        ?.setAttribute('aria-expanded', 'false');
      const label = element.querySelector<HTMLElement>('[data-theme-current-label]');
      if (label !== null) label.textContent = 'stale';
      element
        .querySelector<HTMLElement>('[data-theme-value="dark"]')
        ?.setAttribute('aria-pressed', 'false');
      element.querySelector<HTMLElement>('[data-theme-value="dark"]')?.removeAttribute(
        'data-selected',
      );
    });

    await page.evaluate(() => {
      document.dispatchEvent(new CustomEvent('app-shell:committed'));
    });

    await expect(header).toHaveAttribute('data-sidebar-mode', 'overlay');
    await expect(header).toHaveAttribute('data-sidebar-state', 'expanded');
    await expect(header).toHaveAttribute('data-overlay-sidebar-open', 'true');
    await expect(sidebarTrigger).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('header[data-layout-header] [data-theme-current-label]')).toHaveText(
      'ダーク',
    );
    await expect(
      page.locator('header[data-layout-header] [data-theme-value="dark"]'),
    ).toHaveAttribute('aria-pressed', 'true');
    await expect(
      page.locator('header[data-layout-header] [data-theme-value="dark"]'),
    ).toHaveAttribute('data-selected', 'true');
  });

  test('SPA header replacement 後は旧 header の sidebar subscription を解除すること', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 760 });
    await page.goto(layoutRich.directPath);
    await waitForAppRouterReady(page);

    await expect(page.locator('header[data-layout-header]')).toHaveAttribute(
      'data-overlay-sidebar-open',
      'false',
    );
    await page.evaluate(() => {
      const oldHeader = document.querySelector<HTMLElement>('header[data-layout-header]');
      if (oldHeader === null) throw new Error('static header is missing.');
      const state = window as unknown as {
        staticHeaderMigrationOldHeader?: HTMLElement;
        readStaticHeaderMigrationOldHeader?: () => Record<string, string | null>;
      };
      state.staticHeaderMigrationOldHeader = oldHeader;
      state.readStaticHeaderMigrationOldHeader = () => ({
        connected: oldHeader.isConnected ? 'true' : 'false',
        mode: oldHeader.getAttribute('data-sidebar-mode'),
        state: oldHeader.getAttribute('data-sidebar-state'),
        overlayOpen: oldHeader.getAttribute('data-overlay-sidebar-open'),
      });
    });

    await navigateWithAppRouter(page, sidebarScrollTarget.normalizedPath);
    await expect(page.locator('header[data-layout-header]')).toHaveCount(1);
    await expect(page.locator('header[data-layout-header]')).toHaveAttribute(
      'data-sidebar-enabled',
      'true',
    );
    await expect(page.locator('header[data-layout-header]')).toHaveAttribute(
      'data-overlay-sidebar-open',
      'false',
    );

    await page.locator('header[data-layout-header] [data-layout-sidebar-toggle]').click();
    await expect(page.locator('header[data-layout-header]')).toHaveAttribute(
      'data-overlay-sidebar-open',
      'true',
    );

    await expect
      .poll(async () =>
        page.evaluate(() => {
          const state = window as unknown as {
            readStaticHeaderMigrationOldHeader?: () => Record<string, string | null>;
          };
          return state.readStaticHeaderMigrationOldHeader?.() ?? {};
        }),
      )
      .toEqual({
        connected: 'false',
        mode: 'overlay',
        state: 'collapsed',
        overlayOpen: 'false',
      });
  });

  test('top page header controls は responsive 幅でも header 内に収まること', async ({ page }) => {
    const widths = [390, 640, 960, 1280] as const;

    for (const width of widths) {
      await page.setViewportSize({ width, height: 760 });
      await page.goto('/');
      await waitForAppRouterReady(page);

      await expect(page.locator('header[data-layout-header]')).toHaveAttribute(
        'data-note-layout',
        'false',
      );
      await expect(
        page.locator('header[data-layout-header] [data-layout-sidebar-toggle]'),
      ).toHaveCount(0);
      await expect(page.locator('header[data-layout-header] [data-toc-trigger]')).toHaveCount(0);

      await expectHeaderControlWithinHeader(
        page,
        'header[data-layout-header] .corpus-switcher > summary',
      );
      await expectHeaderControlWithinHeader(
        page,
        'header[data-layout-header] [data-search-dialog-trigger]',
      );
      await expectHeaderControlWithinHeader(
        page,
        'header[data-layout-header] [data-theme-switcher] > summary',
      );
    }
  });

  test('commit 後 link contract 失敗時は rollback 完了後に app-shell:restored を発火すること', async ({
    page,
  }) => {
    await page.goto(markdownBasic.directPath);
    await waitForAppRouterReady(page);
    const originalUrl = page.url();

    await page.route('**/__router/about/index.router.json', async (route) => {
      const response = await route.fetch();
      const envelope = (await response.json()) as {
        shell: { headerHtml: string };
      };
      envelope.shell.headerHtml = envelope.shell.headerHtml.replace(
        '</header>',
        '<a href="https://example.com/" data-link-kind="external-web" data-link-surface="header">invalid</a></header>',
      );
      await route.fulfill({
        status: response.status(),
        contentType: 'application/json',
        body: `${JSON.stringify(envelope)}\n`,
      });
    });

    const restored = page.evaluate(
      () =>
        new Promise((resolve) => {
          document.addEventListener('app-shell:restored', () => resolve(true), { once: true });
        }),
    );

    await page.evaluate(async () => {
      const router = document.querySelector('app-router') as
        | (HTMLElement & {
            navigate: (nextUrl: string) => Promise<unknown>;
            whenReady: () => Promise<void>;
          })
        | null;
      if (router === null) throw new Error('app-router is missing.');
      await router.whenReady();
      await router.navigate('/about/');
    });

    await expect(restored).resolves.toBe(true);
    await expect(page).toHaveURL(originalUrl);
    await expect(page.locator('header[data-layout-header]')).toHaveAttribute(
      'data-note-layout',
      'true',
    );
  });

  test('app-shell:validated 後の history 失敗時も rollback 後に TOC bridge を旧 shell へ再同期すること', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 760 });
    await page.goto(layoutRich.directPath);
    await waitForAppRouterReady(page);
    const originalUrl = page.url();
    const originalNavigationUrl = layoutRich.normalizedPath;

    await expect(page.locator('header[data-layout-header] [data-toc-trigger]')).toHaveAttribute(
      'data-toc-trigger-interactive',
      'true',
    );

    await page.evaluate(() => {
      const state = window as unknown as {
        staticHeaderHistoryFailureEvents?: string[];
        restoreStaticHeaderHistoryPatch?: () => void;
      };
      state.staticHeaderHistoryFailureEvents = [];
      document.addEventListener('app-shell:validated', (event) => {
        const detail = (event as CustomEvent<{ navigationUrl?: string }>).detail;
        state.staticHeaderHistoryFailureEvents?.push(`validated:${detail.navigationUrl ?? ''}`);
      });
      document.addEventListener('app-shell:restored', (event) => {
        const detail = (event as CustomEvent<{ restoredUrl?: string }>).detail;
        state.staticHeaderHistoryFailureEvents?.push(`restored:${detail.restoredUrl ?? ''}`);
      });

      const originalPushState = history.pushState.bind(history);
      history.pushState = (() => {
        throw new Error('forced history failure after app-shell:validated');
      }) as typeof history.pushState;
      state.restoreStaticHeaderHistoryPatch = () => {
        history.pushState = originalPushState;
      };
    });

    await page.evaluate(async () => {
      const router = document.querySelector('app-router') as
        | (HTMLElement & {
            navigate: (nextUrl: string) => Promise<unknown>;
            whenReady: () => Promise<void>;
          })
        | null;
      if (router === null) throw new Error('app-router is missing.');
      await router.whenReady();
      await router.navigate('/about/');
    });

    await page.evaluate(() => {
      (
        window as unknown as {
          restoreStaticHeaderHistoryPatch?: () => void;
        }
      ).restoreStaticHeaderHistoryPatch?.();
    });

    await expect(page).toHaveURL(originalUrl);
    await expect(page.locator('header[data-layout-header]')).toHaveAttribute(
      'data-note-layout',
      'true',
    );
    await expect
      .poll(async () =>
        page.evaluate(
          () =>
            (
              window as unknown as {
                staticHeaderHistoryFailureEvents?: string[];
              }
            ).staticHeaderHistoryFailureEvents ?? [],
        ),
      )
      .toEqual(['validated:/about/', `restored:${originalNavigationUrl}`]);

    const trigger = page.locator('header[data-layout-header] [data-toc-trigger]');
    await expect(trigger).toHaveAttribute('data-toc-trigger-interactive', 'true');
    await expect(page.locator('[data-layout-toc-mobile-panel]')).toHaveCount(1);
    await trigger.click();
    await expect(page.locator('[data-layout-toc-mobile-panel]')).toHaveCount(1);
    await expect(page.locator('[data-layout-toc-mobile-panel]')).toBeVisible();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });
});

test.describe('Static header migration no-JS', () => {
  test.use({ javaScriptEnabled: false });

  test('narrow note page は hydration 前の静的 CSS で sidebar toggle を表示可能にすること', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1023, height: 760 });
    await page.goto(layoutRich.directPath);

    await expect(
      page.locator('header[data-layout-header] [data-layout-sidebar-toggle]'),
    ).toBeVisible();
  });

  test('desktop note page は hydration 前の静的 CSS で sidebar toggle を隠すこと', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1024, height: 760 });
    await page.goto(layoutRich.directPath);

    await expect(
      page.locator('header[data-layout-header] [data-layout-sidebar-toggle]'),
    ).toBeHidden();
  });

  test('検索リンクは JS 無効時も検索ページへ通常遷移すること', async ({ page }) => {
    await page.goto('/about/');
    const trigger = page.locator('header[data-layout-header] [data-search-dialog-trigger]');
    await expect(trigger).toHaveAttribute('href', '/search/');
    await expect(trigger).toHaveAttribute('aria-controls', 'global-search-dialog');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await trigger.click();

    await expect(page).toHaveURL(/\/search\/$/u);
    await expect(page.locator('#main-content h1').first()).toHaveText('検索');
  });

  test('TOC trigger は JS 無効時の fallback href と static aria-controls を維持すること', async ({
    page,
  }) => {
    await page.goto(layoutRich.directPath);

    const trigger = page.locator('header[data-layout-header] [data-toc-trigger]');
    const staticTocRootId = await trigger.getAttribute('data-toc-static-root-id');
    expect(staticTocRootId).not.toBeNull();

    await expect(trigger).toHaveAttribute('href', `#${staticTocRootId ?? ''}`);
    await expect(trigger).toHaveAttribute('aria-controls', staticTocRootId ?? '');
    await expect(page.locator(`#${staticTocRootId ?? ''}`)).toHaveCount(1);

    await page.goto(`${layoutRich.directPath}#${staticTocRootId ?? ''}`);
    await expect(page).toHaveURL(new RegExp(`#${staticTocRootId ?? ''}$`, 'u'));
    await expect(page.locator(`#${staticTocRootId ?? ''}`)).toHaveCount(1);
  });

  test('corpus link は JS 無効時も通常リンクとして遷移すること', async ({ page }) => {
    await page.goto('/about/');

    await page.locator('header[data-layout-header] [data-header-menu="corpus"] summary').click();
    const link = page.locator(
      'header[data-layout-header] [data-header-menu="corpus"] [data-header-menu-item]',
    ).first();
    const href = await link.getAttribute('href');
    expect(href).not.toBeNull();
    const expectedUrl = new URL(href ?? '/', page.url()).href;

    await link.click();

    await expect(page).toHaveURL(expectedUrl);
  });
});
