import { resolve } from 'node:path';

import postcss, { type AtRule, type Declaration, type Rule } from 'postcss';
import { describe, expect, it } from 'vitest';

import {
  hasDeclarationForSelector,
  hasNoDeclarationValueIncludingForSelectorContaining,
  hasRuleForSelector,
  lacksDeclarationPropertyForSelector,
  lacksDeclarationPropertyForSelectorContaining,
  lacksRuleForSelector,
  listDeclarationsForSelectorContaining,
  readCssFile,
} from './support/css-contract.js';

const cssDir = resolve(process.cwd(), 'src/assets/css');
const { cssText: linkPrimitivesCss } = readCssFile(resolve(cssDir, 'link-primitives.css'));
const { cssText: homePageCss } = readCssFile(resolve(cssDir, 'home-page.css'));

const metadataMutedSelector = ".link-text.link-text--muted[href][data-link-surface='metadata']";
const metadataRelativeColorSupports = '(color: oklch(from white l c h / 0.65))';
const forbiddenVariantTokens = [
  'var(--primary)',
  'var(--primary-hover)',
  'var(--link-decoration-color)',
  'var(--link-decoration-color-touch)',
] as const;

const homeMetaForbiddenProperties = [
  'color',
  'text-decoration',
  'text-decoration-line',
  'text-decoration-color',
  'text-decoration-thickness',
  'text-underline-offset',
  'outline',
  'outline-style',
  'outline-width',
  'outline-offset',
  'outline-color',
  'border-radius',
] as const;

const normalizeCssValue = (value: string): string => value.trim().replace(/\s+/gu, ' ');

const declarationsForSelectorInSupports = (
  cssText: string,
  supportsParams: string,
  selector: string,
): Declaration[] => {
  const declarations: Declaration[] = [];

  postcss.parse(cssText).walkAtRules('supports', (atRule: AtRule) => {
    if (atRule.params.trim() !== supportsParams) return;

    atRule.walkRules((rule: Rule) => {
      if (rule.selector !== selector) return;

      rule.walkDecls((declaration) => {
        declarations.push(declaration);
      });
    });
  });

  return declarations;
};

const hasDeclarationInSupports = (
  cssText: string,
  supportsParams: string,
  selector: string,
  property: string,
  expectedValue: string,
): boolean =>
  declarationsForSelectorInSupports(cssText, supportsParams, selector).some(
    (declaration) =>
      declaration.prop === property &&
      normalizeCssValue(declaration.value) === normalizeCssValue(expectedValue),
  );

const normalizeSelectorForSearch = (selector: string): string =>
  selector.replace(/\[([^=\]]+)="([^"]*)"\]/gu, "[$1='$2']");

const listSelectorsContaining = (cssText: string, selectorFragment: string): string[] => {
  const selectors = new Set<string>();
  const normalizedFragment = normalizeSelectorForSearch(selectorFragment);

  postcss.parse(cssText).walkRules((rule: Rule) => {
    for (const selector of rule.selectors) {
      const normalizedSelector = normalizeSelectorForSearch(selector);

      if (normalizedSelector.includes(normalizedFragment)) {
        selectors.add(normalizedSelector);
      }
    }
  });

  return [...selectors].sort();
};

describe('metadata muted text link CSS contract', () => {
  describe('Design System ownership', () => {
    it('defines the metadata muted text link surface as a text link variant', () => {
      expect(hasRuleForSelector(linkPrimitivesCss, metadataMutedSelector, { scope: 'base' })).toBe(
        true,
      );
      expect(
        hasDeclarationForSelector(
          linkPrimitivesCss,
          metadataMutedSelector,
          '--_metadata-link-decoration-color',
          'var(--fg-subtle, var(--fg-muted))',
          { scope: 'base' },
        ),
      ).toBe(true);
      expect(
        hasDeclarationForSelector(
          linkPrimitivesCss,
          metadataMutedSelector,
          'color',
          'var(--fg-muted)',
          { scope: 'base' },
        ),
      ).toBe(true);
      expect(
        hasDeclarationForSelector(
          linkPrimitivesCss,
          metadataMutedSelector,
          'text-decoration-line',
          'underline',
          { scope: 'base' },
        ),
      ).toBe(true);
      expect(
        hasDeclarationForSelector(
          linkPrimitivesCss,
          metadataMutedSelector,
          'text-decoration-color',
          'var(--_metadata-link-decoration-color)',
          { scope: 'base' },
        ),
      ).toBe(true);
      expect(
        hasDeclarationForSelector(
          linkPrimitivesCss,
          metadataMutedSelector,
          'text-decoration-thickness',
          'var(--border-width)',
          { scope: 'base' },
        ),
      ).toBe(true);
      expect(
        hasDeclarationForSelector(
          linkPrimitivesCss,
          metadataMutedSelector,
          'text-underline-offset',
          '0.18em',
          { scope: 'base' },
        ),
      ).toBe(true);
    });

    it('places the relative-color decoration value inside the metadata supports rule', () => {
      expect(linkPrimitivesCss).toContain(
        '@supports (color: oklch(from white l c h / 0.65))',
      );
      expect(
        hasDeclarationForSelector(
          linkPrimitivesCss,
          metadataMutedSelector,
          '--_metadata-link-decoration-color',
          'oklch(from var(--fg-muted) l c h / 0.65)',
          { scope: 'base' },
        ),
      ).toBe(true);
      expect(
        hasDeclarationInSupports(
          linkPrimitivesCss,
          metadataRelativeColorSupports,
          metadataMutedSelector,
          '--_metadata-link-decoration-color',
          'oklch(from var(--fg-muted) l c h / 0.65)',
        ),
      ).toBe(true);
    });

    it('keeps visited ownership to color and decoration color only', () => {
      const visitedSelector = `${metadataMutedSelector}:visited`;

      expect(hasRuleForSelector(linkPrimitivesCss, visitedSelector, { scope: 'base' })).toBe(true);
      expect(
        hasDeclarationForSelector(linkPrimitivesCss, visitedSelector, 'color', 'var(--fg-muted)', {
          scope: 'base',
        }),
      ).toBe(true);
      expect(
        hasDeclarationForSelector(
          linkPrimitivesCss,
          visitedSelector,
          'text-decoration-color',
          'var(--_metadata-link-decoration-color)',
          { scope: 'base' },
        ),
      ).toBe(true);

      for (const property of [
        'text-decoration-line',
        'text-decoration-thickness',
        'text-underline-offset',
      ] as const) {
        expect(
          lacksDeclarationPropertyForSelector(linkPrimitivesCss, visitedSelector, property, {
            scope: 'base',
          }),
        ).toBe(true);
      }

      for (const token of forbiddenVariantTokens) {
        expect(
          hasNoDeclarationValueIncludingForSelectorContaining(
            linkPrimitivesCss,
            visitedSelector,
            token,
            { scope: 'screen' },
          ),
        ).toBe(true);
      }
    });

    it('raises hover and focus-visible text color without suppressing the focus ring', () => {
      const hoverSelector = `${metadataMutedSelector}:hover`;
      const focusVisibleSelector = `${metadataMutedSelector}:focus-visible`;

      expect(hasRuleForSelector(linkPrimitivesCss, hoverSelector, { scope: 'base' })).toBe(true);
      expect(hasRuleForSelector(linkPrimitivesCss, focusVisibleSelector, { scope: 'base' })).toBe(
        true,
      );
      expect(
        hasDeclarationForSelector(linkPrimitivesCss, hoverSelector, 'color', 'var(--fg-default)', {
          scope: 'base',
        }),
      ).toBe(true);
      expect(
        hasDeclarationForSelector(
          linkPrimitivesCss,
          focusVisibleSelector,
          'color',
          'var(--fg-default)',
          { scope: 'base' },
        ),
      ).toBe(true);

      expect(
        hasDeclarationForSelector(
          linkPrimitivesCss,
          hoverSelector,
          'text-decoration-color',
          'currentColor',
          { scope: 'base' },
        ),
      ).toBe(true);
      expect(
        hasDeclarationForSelector(
          linkPrimitivesCss,
          focusVisibleSelector,
          'text-decoration-color',
          'currentColor',
          { scope: 'base' },
        ),
      ).toBe(true);

      const focusOutlineValues = listDeclarationsForSelectorContaining(
        linkPrimitivesCss,
        focusVisibleSelector,
        { scope: 'base' },
      ).filter((declaration) => declaration.property === 'outline');
      expect(focusOutlineValues.map((declaration) => declaration.value)).not.toContain('none');
      expect(focusOutlineValues.map((declaration) => declaration.value)).not.toContain('0');
    });

    it('keeps primary and standard text-link decoration tokens out of the variant rules', () => {
      for (const token of forbiddenVariantTokens) {
        expect(
          hasNoDeclarationValueIncludingForSelectorContaining(
            linkPrimitivesCss,
            metadataMutedSelector,
            token,
            { scope: 'screen' },
          ),
        ).toBe(true);
      }
    });

    it('uses currentColor for metadata underline in forced-colors', () => {
      expect(
        hasDeclarationForSelector(
          linkPrimitivesCss,
          metadataMutedSelector,
          '--_metadata-link-decoration-color',
          'currentColor',
          { scope: 'forced-colors' },
        ),
      ).toBe(true);
      expect(
        hasDeclarationForSelector(
          linkPrimitivesCss,
          metadataMutedSelector,
          'text-decoration-color',
          'currentColor',
          { scope: 'forced-colors' },
        ),
      ).toBe(true);
    });
  });

  describe('surface isolation', () => {
    it('limits the muted text link variant to metadata surface selectors', () => {
      expect(hasRuleForSelector(linkPrimitivesCss, metadataMutedSelector, { scope: 'screen' })).toBe(
        true,
      );
      expect(
        lacksRuleForSelector(linkPrimitivesCss, '.link-text--muted[href]', { scope: 'screen' }),
      ).toBe(true);

      const variantDeclarations = listDeclarationsForSelectorContaining(
        linkPrimitivesCss,
        '.link-text--muted',
        { scope: 'screen' },
      );

      expect(variantDeclarations.length).toBeGreaterThan(0);
      expect(
        variantDeclarations.every((declaration) =>
          declaration.selector.includes("[data-link-surface='metadata']"),
        ),
      ).toBe(true);
      expect(
        variantDeclarations.some((declaration) =>
          declaration.selector.includes("[data-link-surface='control']"),
        ),
      ).toBe(false);
    });

    it('detects metadata surface selectors regardless of attribute quote style', () => {
      const css = `
        .link-text.link-text--muted[href][data-link-surface="metadata"] {
          text-decoration-color: currentColor;
        }
      `;

      expect(listSelectorsContaining(css, "[data-link-surface='metadata']")).toEqual([
        ".link-text.link-text--muted[href][data-link-surface='metadata']",
      ]);
    });

    it('does not generalize metadata surface selectors beyond muted text links', () => {
      const metadataSurfaceSelectors = listSelectorsContaining(
        linkPrimitivesCss,
        "[data-link-surface='metadata']",
      );

      expect(metadataSurfaceSelectors.length).toBeGreaterThan(0);
      expect(
        metadataSurfaceSelectors.every(
          (selector) =>
            selector.includes('.link-text') && selector.includes('.link-text--muted'),
        ),
      ).toBe(true);
      expect(linkPrimitivesCss).not.toContain('.article-header__source-link');
    });
  });

  describe('home-side non-ownership', () => {
    it('does not let home-meta-link own color, underline, or focus-ring appearance', () => {
      for (const property of homeMetaForbiddenProperties) {
        expect(
          lacksDeclarationPropertyForSelectorContaining(homePageCss, '.home-meta-link', property, {
            scope: 'screen',
          }),
        ).toBe(true);
      }
    });
  });
});
