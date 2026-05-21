import { expect, test, type Page } from '@playwright/test';
import { e2eNoteFixtures } from './support/note-fixtures.js';

const themeSwitcherPath = e2eNoteFixtures.layoutRich.directPath;
const themeStorageKey = 'rouault-theme-preference';

const allowedConsoleErrorPatterns: readonly RegExp[] = [];

const collectBrowserDiagnostics = (
  page: Page,
): {
  consoleWarnings: string[];
  consoleErrors: string[];
  pageErrors: string[];
} => {
  const consoleWarnings: string[] = [];
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];

  page.on('console', (message) => {
    if (message.type() === 'warning') {
      consoleWarnings.push(message.text());
    }

    if (message.type() === 'error') {
      consoleErrors.push(message.text());
    }
  });

  page.on('pageerror', (error) => {
    pageErrors.push(error.message);
  });

  return { consoleWarnings, consoleErrors, pageErrors };
};

const expectNoUnexpectedConsoleErrors = (consoleErrors: readonly string[]): void => {
  const unexpected = consoleErrors.filter(
    (message) => !allowedConsoleErrorPatterns.some((pattern) => pattern.test(message)),
  );

  expect(unexpected).toEqual([]);
};

const expectNoBlockedAriaHiddenWarning = (messages: readonly string[]): void => {
  expect(
    messages.some((text) =>
      text.includes('Blocked aria-hidden on an element because its descendant retained focus'),
    ),
  ).toBe(false);
};

const expectCleanDiagnostics = (diagnostics: {
  consoleWarnings: readonly string[];
  consoleErrors: readonly string[];
  pageErrors: readonly string[];
}): void => {
  expectNoUnexpectedConsoleErrors(diagnostics.consoleErrors);
  expect(diagnostics.pageErrors).toEqual([]);
  expectNoBlockedAriaHiddenWarning([...diagnostics.consoleWarnings, ...diagnostics.consoleErrors]);
};

const waitForHeaderHydrated = async (page: Page): Promise<void> => {
  await page.evaluate(async () => {
    await customElements.whenDefined('layout-header');
    await customElements.whenDefined('ui-dropdown');
    await customElements.whenDefined('ui-menu-item');
    await customElements.whenDefined('ui-button');

    const assertLitElement = (
      element: Element | null | undefined,
      name: string,
    ): HTMLElement & { updateComplete: Promise<unknown> } => {
      if (!(element instanceof HTMLElement)) {
        throw new Error(`${name} が見つかりません`);
      }

      if (!('updateComplete' in element) || !(element.updateComplete instanceof Promise)) {
        throw new Error(`${name} が LitElement として upgrade されていません`);
      }

      return element as HTMLElement & { updateComplete: Promise<unknown> };
    };

    const header = assertLitElement(document.querySelector('layout-header'), 'layout-header');
    const LayoutHeaderCtor = customElements.get('layout-header');

    if (typeof LayoutHeaderCtor !== 'function' || !(header instanceof LayoutHeaderCtor)) {
      throw new Error('layout-header が登録済み custom element instance ではありません');
    }

    if (header.shadowRoot === null) {
      throw new Error('layout-header shadowRoot が見つかりません');
    }

    await header.updateComplete;
    await header.updateComplete;

    const dropdown = assertLitElement(
      header.shadowRoot.querySelector('[data-dropdown="theme"]'),
      'theme dropdown',
    );
    const trigger = assertLitElement(
      dropdown.querySelector('[slot="trigger"]'),
      'theme dropdown trigger',
    );
    const menuItems = [
      ...header.shadowRoot.querySelectorAll('[data-dropdown="theme"] ui-menu-item'),
    ].map((item, index) => assertLitElement(item, `theme menu item ${String(index)}`));

    const values = menuItems.map((item) => item.getAttribute('value')).sort();
    if (values.join(',') !== ['dark', 'light', 'system'].sort().join(',')) {
      throw new Error(`theme menu item values が不正です: ${values.join(',')}`);
    }

    await dropdown.updateComplete;
    await trigger.updateComplete;
    await Promise.all(menuItems.map((item) => item.updateComplete));
    await Promise.resolve();

    const mains = trigger.querySelectorAll('.theme-trigger-main');
    const icons = trigger.querySelectorAll('.theme-trigger-icon');
    const texts = trigger.querySelectorAll('.theme-trigger-text');

    if (mains.length !== 1 || icons.length !== 1 || texts.length !== 1) {
      throw new Error(
        `theme trigger DOM cardinality が不正です: main=${mains.length}, icon=${icons.length}, text=${texts.length}`,
      );
    }
  });
};

const readThemeState = async (page: Page) =>
  page.evaluate(() => {
    const header = document.querySelector('layout-header');

    if (!(header instanceof HTMLElement) || header.shadowRoot === null) {
      throw new Error('layout-header shadowRoot が見つかりません');
    }

    const trigger = header.shadowRoot.querySelector<HTMLElement>(
      '[data-dropdown="theme"] [slot="trigger"]',
    );

    if (!(trigger instanceof HTMLElement)) {
      throw new Error('theme dropdown trigger が見つかりません');
    }

    const triggerButton = trigger.shadowRoot?.querySelector<HTMLButtonElement>('button');
    if (!(triggerButton instanceof HTMLButtonElement)) {
      throw new Error('theme trigger 内部 button が見つかりません');
    }

    const themeIcons = [...trigger.querySelectorAll<HTMLElement>('.theme-trigger-icon')];
    const themeItems = [
      ...header.shadowRoot.querySelectorAll<HTMLElement>('[data-dropdown="theme"] ui-menu-item'),
    ];

    return {
      attrTheme: document.documentElement.getAttribute('data-theme'),
      resolvedTheme: document.documentElement.getAttribute('data-resolved-theme'),
      storage: localStorage.getItem('rouault-theme-preference'),
      icons: themeIcons.map((icon) => icon.getAttribute('data-icon')),
      iconGlyphs: themeIcons.map(
        (icon) => {
          const iconName = icon.getAttribute('data-icon');
          return iconName === null ? null : `lucide:${iconName}`;
        },
      ),
      labels: [...trigger.querySelectorAll<HTMLElement>('.theme-trigger-text')].map(
        (label) => label.textContent?.trim() ?? '',
      ),
      themePreferenceMarkers: [
        ...trigger.querySelectorAll<HTMLElement>('.theme-trigger-main'),
      ].map((node) => node.getAttribute('data-theme-preference')),
      triggerAccessibleName: trigger.getAttribute('accessible-name'),
      triggerAriaLabel: triggerButton.getAttribute('aria-label'),
      themeItemValues: themeItems.map((item) => item.getAttribute('value')),
      selectedItems: themeItems
        .filter((item) => item.hasAttribute('data-selected'))
        .map((item) => ({
          value: item.getAttribute('value'),
          icon: item.querySelector('[data-icon]')?.getAttribute('data-icon') ?? null,
        })),
    };
  });

const openThemeDropdown = async (page: Page): Promise<void> => {
  const isReady = async (): Promise<boolean> =>
    page.evaluate(() => {
      const header = document.querySelector('layout-header');
      const dropdown = header?.shadowRoot?.querySelector('[data-dropdown="theme"]');
      const panel = dropdown?.shadowRoot?.querySelector<HTMLElement>('[data-ui-dropdown-panel]');

      if (!(panel instanceof HTMLElement)) {
        return false;
      }

      const style = getComputedStyle(panel);
      return (
        panel.getAttribute('data-position-phase') === 'ready' &&
        panel.getAttribute('aria-hidden') === 'false' &&
        !panel.hasAttribute('inert') &&
        style.visibility === 'visible' &&
        style.pointerEvents === 'auto'
      );
    });

  if (await isReady()) {
    return;
  }

  await expect
    .poll(async () =>
      page.evaluate(() => {
        const header = document.querySelector('layout-header');
        const dropdown = header?.shadowRoot?.querySelector('[data-dropdown="theme"]');
        const panel = dropdown?.shadowRoot?.querySelector<HTMLElement>('[data-ui-dropdown-panel]');

        return panel?.getAttribute('data-position-phase') ?? null;
      }),
    )
    .not.toBe('positioning');

  const trigger = page.locator('layout-header [data-dropdown="theme"] [slot="trigger"] button');

  await expect(trigger).toHaveCount(1);
  await expect(trigger.first()).toBeVisible();
  await trigger.first().click();

  await expect.poll(isReady).toBe(true);
};

const selectThemeByPointer = async (
  page: Page,
  value: 'light' | 'dark' | 'system',
): Promise<void> => {
  const itemButton = page.locator(
    `layout-header [data-dropdown="theme"] ui-menu-item[value="${value}"] button`,
  );

  await expect(itemButton).toHaveCount(1);
  await expect(itemButton.first()).toBeVisible();
  await itemButton.first().click();
};

const expectThemeState = async (
  page: Page,
  expected: {
    readonly attrTheme: string;
    readonly resolvedTheme: string;
    readonly storage: string;
    readonly icons: readonly string[];
    readonly iconGlyphs: readonly string[];
    readonly labels: readonly string[];
    readonly themePreferenceMarkers: readonly string[];
    readonly triggerAccessibleName: string;
    readonly triggerAriaLabel: string;
    readonly selectedItems: readonly {
      readonly value: string;
      readonly icon: string;
    }[];
  },
): Promise<void> => {
  await expect.poll(() => readThemeState(page)).toMatchObject({
    attrTheme: expected.attrTheme,
    resolvedTheme: expected.resolvedTheme,
    storage: expected.storage,
    triggerAccessibleName: expected.triggerAccessibleName,
    triggerAriaLabel: expected.triggerAriaLabel,
  });

  await expect
    .poll(async () => [...(await readThemeState(page)).themeItemValues].sort())
    .toEqual(['dark', 'light', 'system']);
  await expect.poll(async () => (await readThemeState(page)).icons).toEqual([...expected.icons]);
  await expect
    .poll(async () => (await readThemeState(page)).iconGlyphs)
    .toEqual([...expected.iconGlyphs]);
  await expect.poll(async () => (await readThemeState(page)).labels).toEqual([...expected.labels]);
  await expect
    .poll(async () => (await readThemeState(page)).themePreferenceMarkers)
    .toEqual([...expected.themePreferenceMarkers]);
  await expect
    .poll(async () => (await readThemeState(page)).selectedItems)
    .toEqual(expected.selectedItems.map((item) => ({ ...item })));
};

const expectFocusState = async (
  page: Page,
): Promise<{
  panelContainsDeepFocus: boolean;
  focusedMenuItemCount: number;
  triggerContainsDeepFocus: boolean;
  forwardSentinelFocused: boolean;
  backwardSentinelFocused: boolean;
  bodyFocused: boolean;
}> =>
  page.evaluate(() => {
    const getDeepActiveElement = (root: Document | ShadowRoot = document): Element | null => {
      let activeElement = root.activeElement;

      while (activeElement?.shadowRoot?.activeElement) {
        activeElement = activeElement.shadowRoot.activeElement;
      }

      return activeElement;
    };

    const header = document.querySelector('layout-header');
    const dropdown = header?.shadowRoot?.querySelector<HTMLElement>('[data-dropdown="theme"]');
    const trigger = dropdown?.querySelector<HTMLElement>('[slot="trigger"]') ?? null;
    const panel =
      dropdown?.shadowRoot?.querySelector<HTMLElement>('[data-ui-dropdown-panel]') ?? null;
    const activeElement = getDeepActiveElement();
    const focusedMenuItemCount = [
      ...(dropdown?.querySelectorAll<HTMLElement>('ui-menu-item') ?? []),
    ].filter((item) => item.shadowRoot?.activeElement instanceof HTMLElement).length;
    const forwardSentinel = document.querySelector('[data-theme-forward-sentinel]');
    const backwardSentinel = document.querySelector('[data-theme-backward-sentinel]');

    return {
      panelContainsDeepFocus: activeElement instanceof Node && panel?.contains(activeElement) === true,
      focusedMenuItemCount,
      triggerContainsDeepFocus:
        trigger instanceof HTMLElement &&
        (document.activeElement === trigger ||
          activeElement === trigger ||
          (activeElement instanceof Node &&
            (trigger.contains(activeElement) ||
              trigger.shadowRoot?.contains(activeElement) === true))),
      forwardSentinelFocused: document.activeElement === forwardSentinel,
      backwardSentinelFocused: document.activeElement === backwardSentinel,
      bodyFocused: document.activeElement === document.body,
    };
  });

test.describe('theme switcher hydration regression', () => {
  test.skip(
    ({ browserName }) => browserName !== 'chromium',
    'theme switcher hydration regression is scoped to chromium-integration',
  );

  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
  });

  test('初期 system(light) から light を初回選択しても header 表示が stale にならない', async ({
    page,
  }) => {
    await page.addInitScript(({ key }) => {
      localStorage.removeItem(key);
    }, { key: themeStorageKey });
    const diagnostics = collectBrowserDiagnostics(page);

    await page.goto(themeSwitcherPath);
    await waitForHeaderHydrated(page);
    await openThemeDropdown(page);
    await selectThemeByPointer(page, 'light');

    await expectThemeState(page, {
      attrTheme: 'light',
      resolvedTheme: 'light',
      storage: 'light',
      icons: ['sun'],
      iconGlyphs: ['lucide:sun'],
      labels: ['ライト'],
      themePreferenceMarkers: ['light'],
      triggerAccessibleName: 'テーマ: ライト',
      triggerAriaLabel: 'テーマ: ライト',
      selectedItems: [{ value: 'light', icon: 'check' }],
    });
    expectCleanDiagnostics(diagnostics);
  });

  test('persisted light で初期 hydration 後の header 表示が stale にならない', async ({
    page,
  }) => {
    await page.addInitScript(
      ({ key, value }) => {
        localStorage.setItem(key, value);
      },
      { key: themeStorageKey, value: 'light' },
    );
    const diagnostics = collectBrowserDiagnostics(page);

    await page.goto(themeSwitcherPath);
    await waitForHeaderHydrated(page);

    await expectThemeState(page, {
      attrTheme: 'light',
      resolvedTheme: 'light',
      storage: 'light',
      icons: ['sun'],
      iconGlyphs: ['lucide:sun'],
      labels: ['ライト'],
      themePreferenceMarkers: ['light'],
      triggerAccessibleName: 'テーマ: ライト',
      triggerAriaLabel: 'テーマ: ライト',
      selectedItems: [{ value: 'light', icon: 'check' }],
    });
    expectCleanDiagnostics(diagnostics);
  });

  test('連続切り替えでも header 表示が stale にならない', async ({ page }) => {
    await page.addInitScript(({ key }) => {
      localStorage.removeItem(key);
    }, { key: themeStorageKey });
    const diagnostics = collectBrowserDiagnostics(page);

    await page.goto(themeSwitcherPath);
    await waitForHeaderHydrated(page);

    const expectations = {
      dark: {
        attrTheme: 'dark',
        resolvedTheme: 'dark',
        storage: 'dark',
        icons: ['moon'],
        iconGlyphs: ['lucide:moon'],
        labels: ['ダーク'],
        themePreferenceMarkers: ['dark'],
        triggerAccessibleName: 'テーマ: ダーク',
        triggerAriaLabel: 'テーマ: ダーク',
        selectedItems: [{ value: 'dark', icon: 'check' }],
      },
      system: {
        attrTheme: 'system',
        resolvedTheme: 'light',
        storage: 'system',
        icons: ['monitor'],
        iconGlyphs: ['lucide:monitor'],
        labels: ['OSテーマ'],
        themePreferenceMarkers: ['system'],
        triggerAccessibleName: 'テーマ: OSテーマ',
        triggerAriaLabel: 'テーマ: OSテーマ',
        selectedItems: [{ value: 'system', icon: 'check' }],
      },
      light: {
        attrTheme: 'light',
        resolvedTheme: 'light',
        storage: 'light',
        icons: ['sun'],
        iconGlyphs: ['lucide:sun'],
        labels: ['ライト'],
        themePreferenceMarkers: ['light'],
        triggerAccessibleName: 'テーマ: ライト',
        triggerAriaLabel: 'テーマ: ライト',
        selectedItems: [{ value: 'light', icon: 'check' }],
      },
    } as const;

    for (const value of ['light', 'dark', 'system', 'dark', 'light'] as const) {
      await openThemeDropdown(page);
      await selectThemeByPointer(page, value);
      await expectThemeState(page, expectations[value]);
    }
    expectCleanDiagnostics(diagnostics);
  });

  test('Tab close で forward focus 移動を阻害しない', async ({ page }) => {
    await page.addInitScript(({ key }) => {
      localStorage.removeItem(key);
    }, { key: themeStorageKey });
    const diagnostics = collectBrowserDiagnostics(page);

    await page.goto(themeSwitcherPath);
    await waitForHeaderHydrated(page);
    await page.evaluate(() => {
      const header = document.querySelector('layout-header');
      const sentinel = document.createElement('button');
      sentinel.type = 'button';
      sentinel.textContent = 'forward sentinel';
      sentinel.setAttribute('data-theme-forward-sentinel', '');
      header?.insertAdjacentElement('afterend', sentinel);
    });

    await openThemeDropdown(page);
    await page.keyboard.press('Tab');
    await expect.poll(async () => await expectFocusState(page)).toMatchObject({
      panelContainsDeepFocus: false,
      focusedMenuItemCount: 0,
      forwardSentinelFocused: true,
      bodyFocused: false,
    });
    expectCleanDiagnostics(diagnostics);
  });

  test('Shift+Tab close で backward focus 移動を阻害しない', async ({ page }) => {
    await page.addInitScript(({ key }) => {
      localStorage.removeItem(key);
    }, { key: themeStorageKey });
    const diagnostics = collectBrowserDiagnostics(page);

    await page.goto(themeSwitcherPath);
    await waitForHeaderHydrated(page);
    await page.evaluate(() => {
      const header = document.querySelector('layout-header');
      const sentinel = document.createElement('button');
      sentinel.type = 'button';
      sentinel.textContent = 'backward sentinel';
      sentinel.setAttribute('data-theme-backward-sentinel', '');
      header?.insertAdjacentElement('beforebegin', sentinel);
    });

    await openThemeDropdown(page);
    await page.keyboard.press('Shift+Tab');
    await expect.poll(async () => await expectFocusState(page)).toMatchObject({
      panelContainsDeepFocus: false,
      focusedMenuItemCount: 0,
      bodyFocused: false,
    });
    const focusState = await expectFocusState(page);
    expect(focusState.triggerContainsDeepFocus || focusState.backwardSentinelFocused).toBe(true);
    expectCleanDiagnostics(diagnostics);
  });
});
