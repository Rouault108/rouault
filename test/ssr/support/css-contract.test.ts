import { describe, expect, it } from 'vitest';

import {
  findLastDeclarationRuleOrderForSelector,
  hasDeclarationForSelector,
  hasDeclarationPropertyForSelector,
  hasDeclarationValueNotIncluding,
  hasAllDeclarationValuesIncludingForSelectorContaining,
  hasImportantDeclarationForSelector,
  hasNoDeclarationValueIncludingForSelectorContaining,
  hasOnlyAllowedDeclarationValuesForSelectorContaining,
  hasRuleContainingSelectorFragment,
  lacksDeclarationPropertyForSelector,
} from './css-contract.js';

const cssText = `
  .base { color: red; }
  .base { color: green; }
  .grouped, .quoted[data-state="on"] { color: blue; }
  .absent-value { color: CanvasText; }
  .dead-value { color: CanvasText; color: GrayText; }
  .property-present { background-color: red; }
  .important { display: none !important; }
  .not-important { display: none; }
  .pseudo::before { content: ''; background: transparent; }
  .pseudo::after { content: ''; background: currentColor; }
  .mixed { color: var(--x); }
  .mixed { color: red; }

  @media (max-width: 639px) {
    .viewport { color: purple; }
    .base-in-media { color: orange; }
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

  it('supports base scope and does not collect media descendants', () => {
    expect(hasDeclarationForSelector(cssText, '.base', 'color', 'red', { scope: 'base' })).toBe(
      true,
    );
    expect(
      hasDeclarationForSelector(cssText, '.base-in-media', 'color', 'orange', { scope: 'base' }),
    ).toBe(false);
  });

  it('supports selector fragments and pseudo-element kinds', () => {
    expect(
      hasRuleContainingSelectorFragment(cssText, '.pseudo', {
        scope: 'base',
        selectorKind: 'pseudo-before',
      }),
    ).toBe(true);
    expect(
      hasRuleContainingSelectorFragment(cssText, '.pseudo', {
        scope: 'base',
        selectorKind: 'element',
      }),
    ).toBe(false);
  });

  it('separates allowed-values, all-including, and whole declaration forbidden checks', () => {
    expect(
      hasOnlyAllowedDeclarationValuesForSelectorContaining(
        cssText,
        '.pseudo::before',
        'background',
        ['transparent'],
        { scope: 'base', selectorKind: 'pseudo-before', requireDeclaration: true },
      ),
    ).toBe(true);
    expect(
      hasAllDeclarationValuesIncludingForSelectorContaining(
        cssText,
        '.mixed',
        'color',
        'var(--x)',
        {
          scope: 'base',
        },
      ),
    ).toBe(false);
    expect(
      hasNoDeclarationValueIncludingForSelectorContaining(cssText, '.mixed', 'var(--x)', {
        scope: 'base',
      }),
    ).toBe(false);
    expect(
      hasNoDeclarationValueIncludingForSelectorContaining(cssText, '.missing', 'var(--x)', {
        scope: 'base',
        allowMissingRule: true,
      }),
    ).toBe(true);
  });

  it('throws when scope and mediaPredicate are specified together', () => {
    expect(() =>
      hasDeclarationForSelector(cssText, '.base', 'color', 'red', {
        scope: 'base',
        mediaPredicate: () => true,
      }),
    ).toThrow(/scope と mediaPredicate/u);
  });

  it('tag token 用の完全な root 祖先経路と直下宣言だけを受け入れる', () => {
    const tokenCss = `
      :root {
        --tag-token: 96%;
      }
      :root[data-theme="light"] {
        --tag-token: var(--light);
      }
      :root[data-theme='dark'] {
        --tag-token: 17%;
      }
      @media ( prefers-color-scheme : dark ) {
        :root {
          --tag-token: 17%;
        }
      }
    `;

    expect(
      hasDeclarationPropertyForSelector(tokenCss, ':root', '--tag-token', {
        tokenRuleAncestry: 'root',
      }),
    ).toBe(true);
    expect(
      hasDeclarationForSelector(
        tokenCss,
        ":root[data-theme='light']",
        '--tag-token',
        'var(--light)',
        { tokenRuleAncestry: 'root' },
      ),
    ).toBe(true);
    expect(
      hasDeclarationForSelector(tokenCss, ":root[data-theme='dark']", '--tag-token', '17%', {
        tokenRuleAncestry: 'root',
      }),
    ).toBe(true);
    expect(
      hasDeclarationForSelector(tokenCss, ':root', '--tag-token', '17%', {
        tokenRuleAncestry: 'root-os-dark-media',
      }),
    ).toBe(true);
  });

  it('tag token の selector、宣言所有、完全な祖先経路の逸脱を拒否する', () => {
    const rejectsRoot = [
      `.wrong { --tag-token: 96%; }`,
      `:root { .wrong { --tag-token: 96%; } }`,
      `:root { @media print { --tag-token: 96%; } }`,
      `.wrong { :root { --tag-token: 96%; } }`,
      `@supports (display: definitely-not-a-real-value) { :root { --tag-token: 96%; } }`,
      `@container card { :root { --tag-token: 96%; } }`,
      `@layer tokens { :root { --tag-token: 96%; } }`,
    ];
    for (const candidate of rejectsRoot) {
      expect(
        hasDeclarationPropertyForSelector(candidate, ':root', '--tag-token', {
          tokenRuleAncestry: 'root',
        }),
        candidate,
      ).toBe(false);
    }
    for (const selector of [":root[data-theme='light']", ":root[data-theme='dark']"]) {
      expect(
        hasDeclarationForSelector(
          `@supports (display: definitely-not-a-real-value) { ${selector} { --tag-token: 96%; } }`,
          selector,
          '--tag-token',
          '96%',
          { tokenRuleAncestry: 'root' },
        ),
        selector,
      ).toBe(false);
    }
    expect(
      hasDeclarationForSelector(
        `:root[data-theme='dark'] { --tag-token: 17%; }`,
        ":root[data-theme='light']",
        '--tag-token',
        '17%',
        { tokenRuleAncestry: 'root' },
      ),
    ).toBe(false);
    expect(
      hasDeclarationForSelector(
        `:root { --tag-token: 0%; } .wrong { --tag-token: 96%; }`,
        ':root',
        '--tag-token',
        '96%',
        { tokenRuleAncestry: 'root' },
      ),
    ).toBe(false);
    expect(
      hasDeclarationPropertyForSelector(':root { --other-token: 96%; }', ':root', '--tag-token', {
        tokenRuleAncestry: 'root',
      }),
    ).toBe(false);

    const rejectsDarkMedia = [
      `:root { --tag-token: 17%; }`,
      `@media (prefers-color-scheme: light) { :root { --tag-token: 17%; } }`,
      `@media screen and (prefers-color-scheme: dark) { :root { --tag-token: 17%; } }`,
      `@supports (display: definitely-not-a-real-value) { @media (prefers-color-scheme: dark) { :root { --tag-token: 17%; } } }`,
      `@media (prefers-color-scheme: dark) { @supports (display: definitely-not-a-real-value) { :root { --tag-token: 17%; } } }`,
      `@media (prefers-color-scheme: dark) { :root { @supports (display: definitely-not-a-real-value) { --tag-token: 17%; } } }`,
      `@media (prefers-color-scheme: dark) { @media (prefers-color-scheme: dark) { :root { --tag-token: 17%; } } }`,
    ];
    for (const candidate of rejectsDarkMedia) {
      expect(
        hasDeclarationForSelector(candidate, ':root', '--tag-token', '17%', {
          tokenRuleAncestry: 'root-os-dark-media',
        }),
        candidate,
      ).toBe(false);
    }
  });

  it('tag token option の競合を拒否し、未指定時の再帰探索を維持する', () => {
    const nestedDeclaration = `:root { @media print { --tag-token: 96%; } }`;

    expect(
      hasDeclarationForSelector(nestedDeclaration, ':root', '--tag-token', '96%', {
        scope: 'base',
      }),
    ).toBe(true);
    expect(() =>
      hasDeclarationForSelector(':root { --tag-token: 96%; }', ':root', '--tag-token', '96%', {
        scope: 'base',
        tokenRuleAncestry: 'root',
      }),
    ).toThrow(/tokenRuleAncestry/u);
    expect(() =>
      hasDeclarationForSelector(':root { --tag-token: 96%; }', ':root', '--tag-token', '96%', {
        mediaPredicate: () => true,
        tokenRuleAncestry: 'root',
      }),
    ).toThrow(/tokenRuleAncestry/u);
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

  it('checks important declarations from the parsed declaration flag', () => {
    expect(
      hasImportantDeclarationForSelector(cssText, '.important', 'display', 'none', {
        scope: 'base',
      }),
    ).toBe(true);
  });

  it('rejects matching declarations that are not important', () => {
    expect(
      hasImportantDeclarationForSelector(cssText, '.not-important', 'display', 'none', {
        scope: 'base',
      }),
    ).toBe(false);
    expect(
      hasImportantDeclarationForSelector(cssText, '.important', 'display', 'block', {
        scope: 'base',
      }),
    ).toBe(false);
  });
});
