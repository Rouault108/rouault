import { afterEach, describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { activateStaticCopyButtons } from '../../src/client/post-hydrate/static-copy-button-enhancer.js';
import { fixture } from './harness/browser-fixture.js';
import { waitForStyleRecalc } from './harness/browser-test-utilities.js';
import { ensureMainCssLoaded } from './helpers/load-main-css.js';

const rgba = (color: string): number[] => {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D が必要です');
  context.fillStyle = color;
  context.fillRect(0, 0, 1, 1);
  return Array.from(context.getImageData(0, 0, 1, 1).data);
};

describe('Copy button の computed focus token 契約', () => {
  afterEach(() => {
    document.documentElement.removeAttribute('data-theme');
  });

  for (const theme of ['light', 'dark', 'system'] as const) {
    it(`${theme}: keyboard focus で幅・色・offset が有効な token 値になる`, async () => {
      await ensureMainCssLoaded();
      document.documentElement.dataset['theme'] = theme;
      const root = await fixture<HTMLElement>(`
        <section>
          <button type="button" data-before>before</button>
          <button class="static-copy-button" type="button" data-copy-button data-copy-kind="short-text" data-copy-value="sample" data-copy-disabled-reason="no-js" disabled>Copy</button>
          <span data-reference style="outline: var(--focus-ring-width) solid var(--focus-ring-color); outline-offset: var(--focus-ring-offset)"></span>
        </section>
      `);
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: () => Promise.resolve() },
      });
      activateStaticCopyButtons(root);
      const before = root.querySelector<HTMLButtonElement>('[data-before]');
      const button = root.querySelector<HTMLButtonElement>('[data-copy-button]');
      const reference = root.querySelector<HTMLElement>('[data-reference]');
      if (!before || !button || !reference) throw new Error('focus fixture が不足しています');
      before.focus();
      await userEvent.tab();
      expect(document.activeElement).toBe(button);
      expect(button.matches(':focus-visible')).toBe(true);
      await waitForStyleRecalc();
      await Promise.all(button.getAnimations().map((animation) => animation.finished));
      const assertFocus = (width: string, offset: string): void => {
        const actual = getComputedStyle(button);
        expect(actual.outlineStyle).toBe('solid');
        expect(actual.outlineWidth).toBe(width);
        expect(actual.outlineOffset).toBe(offset);
        expect(rgba(actual.outlineColor)).toEqual(rgba(getComputedStyle(reference).outlineColor));
        expect(rgba(actual.outlineColor)[3]).toBe(255);
      };
      assertFocus('2px', '2px');
      // 値の偶然の一致ではなく、3 token への追従を確かめる。
      root.style.setProperty('--focus-ring-width', '5px');
      root.style.setProperty('--focus-ring-offset', '7px');
      root.style.setProperty('--focus-ring-color', 'rgb(12, 83, 177)');
      await waitForStyleRecalc();
      assertFocus('5px', '7px');
      expect(rgba(getComputedStyle(button).outlineColor)).toEqual([12, 83, 177, 255]);
    });
  }
});
