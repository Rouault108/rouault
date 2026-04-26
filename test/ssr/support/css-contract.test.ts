import { describe, expect, it } from 'vitest';

import {
  findLastDeclarationRuleOrderForSelector,
  hasDeclarationForSelector,
  hasDeclarationPropertyForSelector,
  hasDeclarationValueNotIncluding,
  lacksDeclarationPropertyForSelector,
} from './css-contract.js';

const cssText = `
  .base { color: red; }
  .base { color: green; }
  .grouped, .quoted[data-state="on"] { color: blue; }
  .absent-value { color: CanvasText; }
  .dead-value { color: CanvasText; color: GrayText; }
  .property-present { background-color: red; }

  @media (max-width: 639px) {
    .viewport { color: purple; }
  }

  @media (forced-colors: active) {
    .forced { color: CanvasText; }
  }

  @media (prefers-reduced-motion: reduce) {
    .motion { transition-duration: 0.01ms; }
  }

  @media print {
    .print { color: black; }
  }
`;

describe('css contract helper', () => {
  it('keeps screen scope out of forced-colors / print / reduced-motion media', () => {
    expect(hasDeclarationForSelector(cssText, '.base', 'color', 'red', { scope: 'screen' })).toBe(
      true,
    );
    expect(
      hasDeclarationForSelector(cssText, '.motion', 'transition-duration', '0.01ms', {
        scope: 'screen',
      }),
    ).toBe(false);
    expect(
      hasDeclarationForSelector(cssText, '.forced', 'color', 'CanvasText', { scope: 'screen' }),
    ).toBe(false);
    expect(
      hasDeclarationForSelector(cssText, '.print', 'color', 'black', { scope: 'screen' }),
    ).toBe(false);
  });

  it('matches reduced-motion / forced-colors / print scope explicitly', () => {
    expect(
      hasDeclarationForSelector(cssText, '.motion', 'transition-duration', '0.01ms', {
        scope: 'reduced-motion',
      }),
    ).toBe(true);
    expect(
      hasDeclarationForSelector(cssText, '.forced', 'color', 'CanvasText', {
        scope: 'forced-colors',
      }),
    ).toBe(true);
    expect(hasDeclarationForSelector(cssText, '.print', 'color', 'black', { scope: 'print' })).toBe(
      true,
    );
  });

  it('keeps viewport media query rules in screen scope', () => {
    expect(
      hasDeclarationForSelector(cssText, '.viewport', 'color', 'purple', { scope: 'screen' }),
    ).toBe(true);
  });

  it('handles grouped selectors and attribute quote normalization', () => {
    expect(hasDeclarationForSelector(cssText, '.grouped', 'color', 'blue')).toBe(true);
    expect(hasDeclarationForSelector(cssText, ".quoted[data-state='on']", 'color', 'blue')).toBe(
      true,
    );
  });

  it('returns the last rule order for selector and property', () => {
    const firstOrder = findLastDeclarationRuleOrderForSelector(cssText, '.grouped', 'color');
    const lastOrder = findLastDeclarationRuleOrderForSelector(cssText, '.base', 'color');

    expect(lastOrder).toBeGreaterThan(0);
    expect(firstOrder).toBeGreaterThan(lastOrder);
  });

  it('throws when the selector and property are not found', () => {
    expect(() => findLastDeclarationRuleOrderForSelector(cssText, '.missing', 'color')).toThrow(
      /見つかりません/u,
    );
  });

  it('requires selector and property presence for forbidden fragment absence', () => {
    expect(hasDeclarationValueNotIncluding(cssText, '.absent-value', 'color', 'GrayText')).toBe(
      true,
    );
    expect(hasDeclarationValueNotIncluding(cssText, '.missing', 'color', 'GrayText')).toBe(false);
    expect(hasDeclarationValueNotIncluding(cssText, '.dead-value', 'color', 'GrayText')).toBe(
      false,
    );
  });

  it('checks direct property absence for a selector', () => {
    expect(lacksDeclarationPropertyForSelector(cssText, '.property-present', 'background')).toBe(
      true,
    );
    expect(
      lacksDeclarationPropertyForSelector(cssText, '.property-present', 'background-color'),
    ).toBe(false);
    expect(
      hasDeclarationPropertyForSelector(cssText, '.property-present', 'background-color'),
    ).toBe(true);
  });
});
