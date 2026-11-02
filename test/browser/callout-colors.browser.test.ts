import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { fixture } from './harness/browser-fixture.js';
import { waitForStyleRecalc } from './harness/browser-test-utilities.js';
import { ensureMainCssLoaded } from './helpers/load-main-css.js';

const originalTheme = document.documentElement.getAttribute('data-theme');
const kinds = ['note', 'tip', 'success', 'warning', 'danger'] as const;
const colors = {
  note: [
    'var(--border-muted, var(--fg-muted))',
    'color-mix(in srgb, var(--bg-note-subtle) 70%, transparent)',
    'var(--fg-muted)',
  ],
  tip: ['var(--border-info-subtle)', 'var(--bg-info-subtle)', 'var(--fg-info)'],
  success: [
    'var(--fg-success)',
    'color-mix(in srgb, var(--bg-success-subtle) 50%, transparent)',
    'var(--fg-success)',
  ],
  warning: ['var(--fg-warning)', 'var(--bg-warning-subtle)', 'var(--fg-warning)'],
  danger: ['var(--fg-danger)', 'var(--bg-danger-subtle)', 'var(--fg-danger)'],
} as const;

beforeAll(ensureMainCssLoaded);
afterEach(() => {
  if (originalTheme === null) document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', originalTheme);
});

describe('callout computed colors', () => {
  for (const theme of ['light', 'dark', 'system']) {
    for (const overridden of [false, true]) {
      it(`${theme}: 本文と tabs の色・線幅・祖先 fg-success 継承 (${overridden})`, async () => {
        document.documentElement.setAttribute('data-theme', theme);
        const root = await fixture('<div></div>');
        if (overridden) root.style.setProperty('--fg-success', 'rgb(180, 30, 190)');
        // 未公開の旧 token override が左線へ影響しないことも固定する。
        root.style.setProperty('--border-success-subtle', 'rgb(255, 0, 0)');
        const themeProbe = document.createElement('div');
        themeProbe.style.backgroundColor = 'var(--bg-default)';
        root.append(themeProbe);
        const expectedTheme = document.createElement('div');
        const dark =
          theme === 'dark' ||
          (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
        expectedTheme.style.backgroundColor = dark ? 'oklch(12% 0 0)' : 'oklch(1 0 0)';
        root.append(expectedTheme);
        await waitForStyleRecalc();
        expect(getComputedStyle(themeProbe).backgroundColor).toBe(
          getComputedStyle(expectedTheme).backgroundColor,
        );

        for (const scope of ['prose', 'about-prose']) {
          for (const panel of [false, true]) {
            const surface = document.createElement('div');
            surface.className = scope;
            surface.innerHTML = panel ? '<div data-tabs-root><div data-tab-panel></div></div>' : '';
            root.append(surface);
            const parent = surface.querySelector('[data-tab-panel]') ?? surface;
            for (const kind of kinds) {
              const callout = document.createElement('div');
              callout.dataset['callout'] = '';
              callout.dataset['calloutKind'] = kind;
              callout.textContent = kind;
              parent.append(callout);
              const reference = document.createElement('div');
              const [border, background, accent] = colors[kind];
              reference.style.borderInlineStart = `${kind === 'danger' ? 'calc(var(--border-width-thick, 2px) * 2)' : 'var(--border-width-thick, 2px)'} solid ${border}`;
              reference.style.backgroundColor = background;
              reference.style.color = accent;
              parent.append(reference);
              const alias = document.createElement('span');
              alias.style.color = 'var(--callout-accent-color)';
              callout.append(alias);
              const actual = getComputedStyle(callout);
              const expected = getComputedStyle(reference);
              expect(actual.borderInlineStartColor, `${scope}/${panel}/${kind}`).toBe(
                expected.borderInlineStartColor,
              );
              expect(actual.borderInlineStartStyle).toBe('solid');
              expect(actual.borderInlineStartWidth).toBe(expected.borderInlineStartWidth);
              expect(Number.parseFloat(actual.borderInlineStartWidth)).toBeGreaterThan(0);
              expect(actual.backgroundColor).toBe(expected.backgroundColor);
              expect(getComputedStyle(alias).color).toBe(expected.color);
              if (overridden && kind === 'success')
                expect(actual.borderInlineStartColor).toBe('rgb(180, 30, 190)');
            }
          }
        }
      });
    }
  }
});
