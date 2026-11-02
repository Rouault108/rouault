import { expect, test } from '@playwright/test';

// OS media の操作は Playwright が所有する。通常の computed contract は Browser Mode で検証する。
for (const os of ['light', 'dark'] as const) {
  for (const theme of ['light', 'dark', 'system'] as const) {
    test(`success callout: OS ${os}, theme ${theme}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: os });
      await page.addInitScript(
        (value) => localStorage.setItem('rouault-theme-preference', value),
        theme,
      );
      await page.goto('/');
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      const resolved = theme === 'system' ? os : theme;
      await expect(page.locator('html')).toHaveAttribute('data-resolved-theme', resolved);
      const paint = await page.evaluate(() => {
        const root = document.createElement('div');
        document.body.append(root);
        try {
          const probe = document.createElement('div');
          probe.style.backgroundColor = 'var(--bg-default)';
          root.append(probe);
          const html = document.documentElement;
          const preference = html.dataset['theme'];
          const actualBackground = getComputedStyle(probe).backgroundColor;
          // production CSS の色空間最適化に依存せず、テーマ適用と明暗差を確認する。
          html.dataset['theme'] = 'light';
          const light = getComputedStyle(probe).backgroundColor;
          html.dataset['theme'] = 'dark';
          const dark = getComputedStyle(probe).backgroundColor;
          if (preference === undefined) delete html.dataset['theme'];
          else html.dataset['theme'] = preference;
          const backgrounds = { actual: actualBackground, light, dark };
          const borders = [];
          for (const override of ['', 'rgb(180, 30, 190)']) {
            root.style.setProperty('--fg-success', override);
            for (const scope of ['prose', 'about-prose']) {
              for (const panel of [false, true]) {
                const surface = document.createElement('div');
                surface.className = scope;
                surface.innerHTML = panel
                  ? '<div data-tabs-root><div data-tab-panel></div></div>'
                  : '';
                root.append(surface);
                const parent = surface.querySelector('[data-tab-panel]') ?? surface;
                const callout = document.createElement('div');
                callout.dataset['callout'] = '';
                callout.dataset['calloutKind'] = 'success';
                const reference = document.createElement('div');
                reference.style.borderInlineStart =
                  'var(--border-width-thick, 2px) solid var(--fg-success)';
                reference.style.backgroundColor =
                  'color-mix(in srgb, var(--bg-success-subtle) 50%, transparent)';
                parent.append(callout, reference);
                const actual = getComputedStyle(callout);
                const expected = getComputedStyle(reference);
                borders.push({
                  actual: actual.borderInlineStartColor,
                  expected: expected.borderInlineStartColor,
                  width: actual.borderInlineStartWidth,
                  expectedWidth: expected.borderInlineStartWidth,
                  style: actual.borderInlineStartStyle,
                  background: actual.backgroundColor,
                  expectedBackground: expected.backgroundColor,
                  override,
                });
              }
            }
          }
          return {
            backgrounds,
            borders,
            osDark: matchMedia('(prefers-color-scheme: dark)').matches,
          };
        } finally {
          root.remove();
        }
      });
      expect(paint.osDark).toBe(os === 'dark');
      expect(paint.backgrounds.light).not.toBe(paint.backgrounds.dark);
      expect(paint.backgrounds.actual).toBe(paint.backgrounds[resolved]);
      expect(paint.borders).toHaveLength(8);
      for (const border of paint.borders) {
        expect(border.actual).toBe(border.expected);
        if (border.override) expect(border.actual).toBe(border.override);
        expect(border.style).toBe('solid');
        expect(border.width).toBe(border.expectedWidth);
        expect(Number.parseFloat(border.width)).toBeGreaterThan(0);
        expect(border.background).toBe(border.expectedBackground);
      }
    });
  }
}

test('forced colors は専用の背景・左線と danger の線幅を維持する', async ({ page }) => {
  await page.emulateMedia({ forcedColors: 'active' });
  await page.goto('/');
  const paint = await page.evaluate(() => {
    const root = document.createElement('div');
    document.body.append(root);
    try {
      const reference = document.createElement('div');
      reference.style.backgroundColor = 'Canvas';
      reference.style.color = 'CanvasText';
      root.append(reference);
      const results = [];
      for (const scope of ['prose', 'about-prose']) {
        for (const panel of [false, true]) {
          const surface = document.createElement('div');
          surface.className = scope;
          surface.innerHTML = panel ? '<div data-tabs-root><div data-tab-panel></div></div>' : '';
          root.append(surface);
          const parent = surface.querySelector('[data-tab-panel]') ?? surface;
          for (const kind of ['success', 'danger']) {
            const callout = document.createElement('div');
            callout.dataset['callout'] = '';
            callout.dataset['calloutKind'] = kind;
            parent.append(callout);
            const style = getComputedStyle(callout);
            results.push({
              kind,
              background: style.backgroundColor,
              color: style.color,
              line: style.borderInlineStartStyle,
              width: style.borderInlineStartWidth,
              otherLine: style.borderInlineEndStyle,
              otherWidth: style.borderInlineEndWidth,
            });
          }
        }
      }
      return {
        active: matchMedia('(forced-colors: active)').matches,
        results,
        background: getComputedStyle(reference).backgroundColor,
        color: getComputedStyle(reference).color,
      };
    } finally {
      root.remove();
    }
  });
  expect(paint.active).toBe(true);
  expect(paint.results).toHaveLength(8);
  for (const result of paint.results) {
    expect(result.background).toBe(paint.background);
    expect(result.color).toBe(paint.color);
    expect(result.line).toBe('solid');
    expect(result.width).toBe(result.kind === 'danger' ? '4px' : '2px');
    expect(result.otherLine).toBe('solid');
    expect(result.otherWidth).toBe('1px');
  }
});
