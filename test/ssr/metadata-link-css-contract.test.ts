import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  hasDeclarationForSelector,
  hasDeclarationPropertyForSelector,
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
          'currentColor',
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
        hasDeclarationPropertyForSelector(
          linkPrimitivesCss,
          metadataMutedSelector,
          'text-underline-offset',
          { scope: 'base' },
        ),
      ).toBe(true);
    });

    it('keeps visited ownership to color differences only', () => {
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
          'currentColor',
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
