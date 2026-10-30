import { expect, test } from '@playwright/test';

import { loadNotesData } from '../../build/data/notes.js';
import { e2eNoteFixtures } from './support/note-fixtures.js';

const sizes = ['sm', 'md', 'lg', 'glow'] as const;
const lightShadows = [
  '0 1px 2px oklch(0% 0 0 / 0.05)',
  '0 4px 6px -1px oklch(0% 0 0 / 0.1)',
  '0 10px 15px -3px oklch(0% 0 0 / 0.1)',
  '0 0 8px oklch(55% 0.22 250 / 0.6)',
];
const darkShadows = [
  '0 1px 2px oklch(0% 0 0 / 0.3)',
  '0 4px 8px oklch(0% 0 0 / 0.4)',
  '0 8px 16px oklch(0% 0 0 / 0.5)',
  '0 0 12px oklch(65% 0.18 250 / 0.5)',
];
const sandbox = loadNotesData().find((note) => note.slug === 'testing/sandbox');
if (sandbox === undefined)
  throw new Error('testing/sandbox note is required for shadow verification.');
const sandboxPath = `${sandbox.permalink.replace(/\/+$/u, '')}/`;

test.use({ viewport: { width: 1440, height: 1000 } });

for (const os of ['light', 'dark'] as const) {
  for (const preference of ['system', 'light', 'dark'] as const) {
    test(`shadow tokens: OS ${os}, preference ${preference}`, async ({ page }, testInfo) => {
      const resolved = preference === 'system' ? os : preference;
      await page.emulateMedia({ colorScheme: os });
      await page.addInitScript((value) => {
        localStorage.setItem('rouault-theme-preference', value);
      }, preference);
      await page.goto(sandboxPath);
      await expect(page.locator('html')).toHaveAttribute('data-theme', preference);
      await expect(page.locator('html')).toHaveAttribute('data-resolved-theme', resolved);
      expect(await page.evaluate(() => matchMedia('(prefers-color-scheme: dark)').matches)).toBe(
        os === 'dark',
      );

      // 正本の token を期待値へ流用せず、同じ browser で literal を正規化する。
      const rootShadows = await page.evaluate(
        ({ names, literals }) => {
          const probe = document.createElement('div');
          document.body.append(probe);
          try {
            return names.map((name, index) => {
              probe.style.boxShadow = `var(--elevation-${name})`;
              const actual = getComputedStyle(probe).boxShadow;
              probe.style.boxShadow = literals[index] ?? '';
              const expected = getComputedStyle(probe).boxShadow;
              return {
                name,
                actual,
                expected,
                primitive: getComputedStyle(document.documentElement)
                  .getPropertyValue(`--shadow-dark-${name}`)
                  .trim(),
              };
            });
          } finally {
            probe.remove();
          }
        },
        { names: sizes, literals: resolved === 'dark' ? darkShadows : lightShadows },
      );
      for (const shadow of rootShadows) {
        expect(shadow.expected, `literal shadow ${shadow.name}`).not.toBe('none');
        if (resolved === 'dark')
          expect.soft(shadow.primitive, `dark primitive ${shadow.name}`).not.toBe('');
        expect.soft(shadow.actual, `root elevation ${shadow.name}`).toBe(shadow.expected);
      }

      const preview = page
        .locator('[data-code-preview-root]')
        .filter({ has: page.locator('[data-command-menu-trigger]') })
        .first();
      await preview.locator('[data-command-menu-trigger]').first().click();
      const panel = preview.locator('[data-command-menu-panel]').first();
      await expect(panel).toBeVisible();
      expect(await panel.evaluate((node) => node.closest('[data-preview-content]'))).toBeNull();
      const menuShadow = await panel.evaluate((node) => getComputedStyle(node).boxShadow);
      expect
        .soft(menuShadow, 'visible command menu')
        .toBe(rootShadows.find((item) => item.name === 'lg')?.expected);
      await testInfo.attach('command-menu', {
        body: await page.screenshot(),
        contentType: 'image/png',
      });

      const bridge = preview.locator('[data-preview-content]').first();
      await expect(bridge).toBeAttached();
      const bridgeShadows = await bridge.evaluate((node, names) => {
        const host = node.closest('[data-code-preview-root]');
        if (host === null) throw new Error('preview bridge host is required');
        const probe = document.createElement('div');
        node.append(probe);
        try {
          return names.map((name) => {
            probe.style.boxShadow = `var(--elevation-${name})`;
            const actual = getComputedStyle(probe).boxShadow;
            probe.style.boxShadow = getComputedStyle(host)
              .getPropertyValue(`--_note-preview-elevation-${name}`)
              .trim();
            return { name, actual, expected: getComputedStyle(probe).boxShadow };
          });
        } finally {
          probe.remove();
        }
      }, sizes);
      for (const shadow of bridgeShadows) {
        expect(shadow.actual, `preview bridge ${shadow.name}`).not.toBe('none');
        expect(shadow.actual, `preview bridge ${shadow.name}`).toBe(shadow.expected);
      }

      // root と同じ要素の hue 変更が再計算され、移動した primitive に反映される。
      const glow = await page.evaluate(
        (literal) => {
          const root = document.documentElement;
          const probe = document.createElement('div');
          document.body.append(probe);
          root.style.setProperty('--hue-primary', '123');
          try {
            probe.style.boxShadow = 'var(--elevation-glow)';
            const actual = getComputedStyle(probe).boxShadow;
            probe.style.boxShadow = literal;
            return { actual, expected: getComputedStyle(probe).boxShadow };
          } finally {
            probe.remove();
            root.style.removeProperty('--hue-primary');
          }
        },
        resolved === 'dark'
          ? '0 0 12px oklch(65% 0.18 123 / 0.5)'
          : '0 0 8px oklch(55% 0.22 123 / 0.6)',
      );
      expect.soft(glow.actual, 'glow follows root hue').toBe(glow.expected);

      await page.goto(e2eNoteFixtures.markdownBasic.directPath);
      await expect(page.locator('html')).toHaveAttribute('data-theme', preference);
      await expect(page.locator('html')).toHaveAttribute('data-resolved-theme', resolved);
      await page.locator('a[data-footnote-ref="true"]').first().click();
      const footnote = page.locator('[data-footnote-popover]').first();
      await expect(footnote).toBeVisible();
      const footnoteShadow = await footnote.evaluate((node) => getComputedStyle(node).boxShadow);
      expect
        .soft(footnoteShadow, 'visible footnote popover')
        .toBe(rootShadows.find((item) => item.name === 'lg')?.expected);
      await testInfo.attach('footnote-popover', {
        body: await page.screenshot(),
        contentType: 'image/png',
      });
      await testInfo.attach('shadow-values', {
        body: JSON.stringify(
          {
            os,
            preference,
            resolved,
            rootShadows,
            menuShadow,
            bridgeShadows,
            footnoteShadow,
            glow,
          },
          null,
          2,
        ),
        contentType: 'application/json',
      });
    });
  }
}
