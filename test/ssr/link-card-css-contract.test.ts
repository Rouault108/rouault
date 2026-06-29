import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import postcss, { type AtRule, type Declaration, type Rule } from 'postcss';
import selectorParser from 'postcss-selector-parser';
import { describe, expect, it } from 'vitest';

import {
  hasDeclarationForSelector,
  hasDeclarationForSelectorContaining,
  hasDeclarationForSelectorContainingInMedia,
  hasDeclarationValueIncludingForSelectorContainingInMedia,
  hasDeclarationValueNotIncluding,
  hasNoDeclarationValueIncludingForSelectorContaining,
  lacksDeclarationPropertyForSelectorContaining,
  PROSE_TEXT_LINK_SELECTOR,
} from './support/css-contract.js';

const linkCardCss = readFileSync(resolve(process.cwd(), 'src/assets/css/link-card.css'), 'utf8');
const linkPrimitivesCss = readFileSync(
  resolve(process.cwd(), 'src/assets/css/link-primitives.css'),
  'utf8',
);
const footnotesCss = readFileSync(resolve(process.cwd(), 'src/assets/css/footnotes.css'), 'utf8');

const linkCardCssWithoutComments = linkCardCss.replace(/\/\*[\s\S]*?\*\//gu, '');
const focusVisibleSupportsParams = 'selector(.link-card:has(> .link-card__link:focus-visible))';
const forcedColorsMediaParams = '(forced-colors: active)';

const normalizeSelector = (selector: string): string =>
  selector
    .trim()
    .replace(/\s+/gu, ' ')
    .replace(/\s*([>+~(,])\s*/gu, '$1')
    .replace(/\s*\)/gu, ')');

const splitSelectors = (selectorText: string): string[] => {
  const ast = selectorParser().astSync(selectorText);
  const selectors: string[] = [];
  ast.each((selector) => {
    selectors.push(normalizeSelector(selector.toString()));
  });
  return selectors;
};

const ruleMatchesSelector = (rule: Rule, selector: string): boolean => {
  const normalizedSelector = normalizeSelector(selector);
  return splitSelectors(rule.selector).includes(normalizedSelector);
};

const declarationsFromRules = (rules: Rule[], property?: string): Declaration[] => {
  const declarations: Declaration[] = [];
  for (const rule of rules) {
    rule.walkDecls((declaration) => {
      if (property === undefined || declaration.prop === property) {
        declarations.push(declaration);
      }
    });
  }
  return declarations;
};

const blockForRules = (rules: Rule[]): string =>
  declarationsFromRules(rules)
    .map((declaration) => declaration.toString())
    .join('\n');

const rootRules = (css: string, selector: string): Rule[] => {
  const rules: Rule[] = [];
  postcss.parse(css).walkRules((rule: Rule) => {
    if (rule.parent?.type !== 'root' || !ruleMatchesSelector(rule, selector)) {
      return;
    }
    rules.push(rule);
  });
  return rules;
};

const topLevelSupportsRules = (css: string, supportsParams: string, selector: string): Rule[] => {
  const rules: Rule[] = [];
  postcss.parse(css).walkAtRules('supports', (atRule: AtRule) => {
    if (atRule.parent?.type !== 'root' || atRule.params.trim() !== supportsParams) {
      return;
    }

    for (const node of atRule.nodes ?? []) {
      if (node.type === 'rule' && ruleMatchesSelector(node, selector)) {
        rules.push(node);
      }
    }
  });
  return rules;
};

const topLevelMediaRules = (css: string, mediaParams: string, selector: string): Rule[] => {
  const rules: Rule[] = [];
  postcss.parse(css).walkAtRules('media', (atRule: AtRule) => {
    if (atRule.parent?.type !== 'root' || atRule.params.trim() !== mediaParams) {
      return;
    }

    for (const node of atRule.nodes ?? []) {
      if (node.type === 'rule' && ruleMatchesSelector(node, selector)) {
        rules.push(node);
      }
    }
  });
  return rules;
};

const mediaSupportsRules = (
  css: string,
  mediaParams: string,
  supportsParams: string,
  selector: string,
): Rule[] => {
  const rules: Rule[] = [];
  postcss.parse(css).walkAtRules('media', (mediaRule: AtRule) => {
    if (mediaRule.parent?.type !== 'root' || mediaRule.params.trim() !== mediaParams) {
      return;
    }

    for (const node of mediaRule.nodes ?? []) {
      if (
        node.type !== 'atrule' ||
        node.name !== 'supports' ||
        node.params.trim() !== supportsParams
      ) {
        continue;
      }

      for (const supportNode of node.nodes ?? []) {
        if (supportNode.type === 'rule' && ruleMatchesSelector(supportNode, selector)) {
          rules.push(supportNode);
        }
      }
    }
  });
  return rules;
};

const topLevelRuleBlock = (css: string, selector: string): string =>
  blockForRules(rootRules(css, selector));

const supportsRuleBlock = (css: string, supportsParams: string, selector: string): string =>
  blockForRules(topLevelSupportsRules(css, supportsParams, selector));

const mediaRuleBlock = (css: string, mediaParams: string, selector: string): string =>
  blockForRules(topLevelMediaRules(css, mediaParams, selector));

const mediaSupportsRuleBlock = (
  css: string,
  mediaParams: string,
  supportsParams: string,
  selector: string,
): string => blockForRules(mediaSupportsRules(css, mediaParams, supportsParams, selector));

describe('link-card css contract', () => {
  it('defines static link-card light DOM layout and text contract', () => {
    expect(
      hasDeclarationForSelector(
        linkCardCss,
        ':is(.prose, .about-prose) > [data-link-card]',
        'display',
        'block',
      ),
    ).toBe(true);
    expect(hasDeclarationForSelector(linkCardCss, '.link-card', 'break-inside', 'avoid')).toBe(
      true,
    );
    expect(hasDeclarationForSelector(linkCardCss, '.link-card__link', 'cursor', 'pointer')).toBe(
      true,
    );
    expect(
      hasDeclarationForSelector(linkCardCss, '.link-card__link', 'border-radius', 'inherit'),
    ).toBe(true);
    expect(hasDeclarationForSelector(linkCardCss, '.link-card__body', 'min-inline-size', '0')).toBe(
      true,
    );
    expect(
      hasDeclarationForSelector(linkCardCss, '.link-card__title', '-webkit-line-clamp', '2'),
    ).toBe(true);
    expect(
      hasDeclarationForSelector(linkCardCss, '.link-card__description', '-webkit-line-clamp', '2'),
    ).toBe(true);
    expect(hasDeclarationForSelector(linkCardCss, '.link-card__media', 'object-fit', 'cover')).toBe(
      true,
    );
    expect(
      hasDeclarationForSelector(
        linkCardCss,
        '.link-card__link--no-image',
        'grid-template-columns',
        'minmax(0, 1fr)',
      ),
    ).toBe(true);
  });

  it('uses link-card link focus-visible as the source of truth for focus projection', () => {
    expect(linkCardCssWithoutComments).not.toContain(':focus-within');

    expect(topLevelRuleBlock(linkCardCss, '.link-card__link:focus-visible')).toContain(
      'outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color)',
    );
    expect(topLevelRuleBlock(linkCardCss, '.link-card__link:focus-visible')).toContain(
      'outline-offset: calc(0px - var(--focus-ring-offset, 2px))',
    );
    expect(topLevelRuleBlock(linkCardCss, '.link-card__link:focus-visible')).toContain(
      'animation: var(--animation-focus)',
    );
    expect(topLevelRuleBlock(linkCardCss, '.link-card__link:focus-visible')).not.toContain(
      'outline: none',
    );

    expect(
      supportsRuleBlock(
        linkCardCss,
        focusVisibleSupportsParams,
        '.link-card:has(> .link-card__link:focus-visible)',
      ),
    ).toContain('border-color: var(--border-default)');
    expect(
      supportsRuleBlock(
        linkCardCss,
        focusVisibleSupportsParams,
        '.link-card:has(> .link-card__link:focus-visible)',
      ),
    ).toContain('box-shadow: none');
    expect(
      supportsRuleBlock(
        linkCardCss,
        focusVisibleSupportsParams,
        '.link-card:has(> .link-card__link:focus-visible)',
      ),
    ).toContain('outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color)');
    expect(
      supportsRuleBlock(
        linkCardCss,
        focusVisibleSupportsParams,
        '.link-card:has(> .link-card__link:focus-visible)',
      ),
    ).toContain('outline-offset: var(--focus-ring-offset, 2px)');
    expect(
      supportsRuleBlock(
        linkCardCss,
        focusVisibleSupportsParams,
        '.link-card:has(> .link-card__link:focus-visible)',
      ),
    ).toContain('animation: var(--animation-focus)');

    expect(
      supportsRuleBlock(linkCardCss, focusVisibleSupportsParams, '.link-card__link:focus-visible'),
    ).toContain('outline: none');
    expect(
      supportsRuleBlock(linkCardCss, focusVisibleSupportsParams, '.link-card__link:focus-visible'),
    ).toContain('animation: none');
  });

  it('keeps responsive, hover, forced-colors, print, and invalid contracts explicit', () => {
    expect(
      hasDeclarationForSelectorContainingInMedia(
        linkCardCss,
        (params) => /max-width:\s*480px/u.test(params),
        '.link-card__media',
        'aspect-ratio',
        '16 / 9',
      ),
    ).toBe(true);
    expect(
      hasDeclarationForSelectorContainingInMedia(
        linkCardCss,
        (params) => /hover:\s*hover/u.test(params) && /pointer:\s*fine/u.test(params),
        '.link-card:not(.link-card--invalid):hover',
        'border-color',
        'var(--border-default)',
      ),
    ).toBe(true);
    expect(
      hasDeclarationForSelectorContainingInMedia(
        linkCardCss,
        (params) => /hover:\s*hover/u.test(params) && /pointer:\s*fine/u.test(params),
        '.link-card:not(.link-card--invalid):hover',
        'box-shadow',
        'none',
      ),
    ).toBe(true);
    expect(
      hasDeclarationValueIncludingForSelectorContainingInMedia(
        linkCardCss,
        (params) => /hover:\s*hover/u.test(params) && /pointer:\s*fine/u.test(params),
        '.link-card:not(.link-card--invalid):hover',
        'background',
        'linear-gradient(var(--bg-hover), var(--bg-hover))',
      ),
    ).toBe(true);
    expect(
      hasDeclarationValueIncludingForSelectorContainingInMedia(
        linkCardCss,
        (params) => /hover:\s*hover/u.test(params) && /pointer:\s*fine/u.test(params),
        '.link-card:not(.link-card--invalid):hover',
        'background',
        'var(--bg-surface-2)',
      ),
    ).toBe(true);
    expect(
      lacksDeclarationPropertyForSelectorContaining(
        linkCardCss,
        '.link-card:not(.link-card--invalid):hover',
        'transform',
        {
          mediaPredicate: (params) =>
            /hover:\s*hover/u.test(params) && /pointer:\s*fine/u.test(params),
        },
      ),
    ).toBe(true);
    expect(
      hasNoDeclarationValueIncludingForSelectorContaining(
        linkCardCss,
        '.link-card:not(.link-card--invalid):hover',
        '--elevation-',
        {
          mediaPredicate: (params) =>
            /hover:\s*hover/u.test(params) && /pointer:\s*fine/u.test(params),
        },
      ),
    ).toBe(true);
    expect(
      hasNoDeclarationValueIncludingForSelectorContaining(
        linkCardCss,
        '.link-card:not(.link-card--invalid):hover',
        '--border-strong',
        {
          mediaPredicate: (params) =>
            /hover:\s*hover/u.test(params) && /pointer:\s*fine/u.test(params),
        },
      ),
    ).toBe(true);
    expect(
      hasDeclarationValueNotIncluding(linkCardCss, '.link-card', 'transition', 'box-shadow', {
        scope: 'base',
      }),
    ).toBe(true);
    expect(
      hasDeclarationValueNotIncluding(linkCardCss, '.link-card', 'transition', 'transform', {
        scope: 'base',
      }),
    ).toBe(true);
    expect(
      hasDeclarationForSelector(linkCardCss, '.link-card--invalid', 'border-style', 'dashed'),
    ).toBe(true);
    expect(
      hasDeclarationValueIncludingForSelectorContainingInMedia(
        linkCardCss,
        (params) => /forced-colors:\s*active/u.test(params),
        '.link-card:not(.link-card--invalid):hover',
        'outline',
        'CanvasText',
      ),
    ).toBe(true);
    expect(
      mediaRuleBlock(linkCardCss, forcedColorsMediaParams, '.link-card__link:focus-visible'),
    ).toContain('outline-color: Highlight');
    expect(
      mediaSupportsRuleBlock(
        linkCardCss,
        forcedColorsMediaParams,
        focusVisibleSupportsParams,
        '.link-card:has(> .link-card__link:focus-visible)',
      ),
    ).toContain('border-color: Highlight');
    expect(
      mediaSupportsRuleBlock(
        linkCardCss,
        forcedColorsMediaParams,
        focusVisibleSupportsParams,
        '.link-card:has(> .link-card__link:focus-visible)',
      ),
    ).toContain('outline: var(--focus-ring-width, 2px) solid Highlight');
    expect(
      mediaSupportsRuleBlock(
        linkCardCss,
        forcedColorsMediaParams,
        focusVisibleSupportsParams,
        '.link-card:has(> .link-card__link:focus-visible)',
      ),
    ).toContain('box-shadow: none');
    expect(
      hasDeclarationForSelectorContainingInMedia(
        linkCardCss,
        (params) => /\bprint\b/u.test(params),
        '.link-card',
        'transform',
        'none',
      ),
    ).toBe(true);
    expect(linkCardCss).not.toMatch(
      /@media\s+print\s*\{[\s\S]*\.link-card\s*\{[\s\S]*transform\s*:\s*none\s*!important/u,
    );
    expect(
      hasDeclarationForSelectorContainingInMedia(
        linkCardCss,
        (params) => /\bprint\b/u.test(params),
        '.link-card',
        'border-color',
        'currentColor',
      ),
    ).toBe(true);
    expect(linkCardCss).not.toMatch(/@media\s+print\s*\{[\s\S]*\.link-card\s*\{[\s\S]*box-shadow/u);
    expect(linkCardCss).not.toMatch(/@media\s+print\s*\{[\s\S]*\.link-card\s*\{[\s\S]*background/u);
  });

  it('keeps the link-card focus projection cascade order explicit', () => {
    const hoverIndex = linkCardCss.indexOf('.link-card:not(.link-card--invalid):hover');
    const fallbackIndex = linkCardCss.indexOf('.link-card__link:focus-visible');
    const supportsIndex = linkCardCss.indexOf(`@supports ${focusVisibleSupportsParams}`);
    const forcedColorsIndex = linkCardCss.indexOf(`@media ${forcedColorsMediaParams}`);
    const printIndex = linkCardCss.indexOf('@media print');

    expect(hoverIndex, 'hover ルールが存在する').toBeGreaterThanOrEqual(0);
    expect(fallbackIndex, 'fallback focus-visible ルールが存在する').toBeGreaterThanOrEqual(0);
    expect(supportsIndex, ':has() 投影 @supports が存在する').toBeGreaterThanOrEqual(0);
    expect(forcedColorsIndex, 'forced-colors 補正が存在する').toBeGreaterThanOrEqual(0);
    expect(printIndex, 'print 補正が存在する').toBeGreaterThanOrEqual(0);

    expect(fallbackIndex, 'fallback focus-visible は :has() 投影より前に置く').toBeLessThan(
      supportsIndex,
    );
    expect(supportsIndex, ':has() 投影は forced-colors 補正より前に置く').toBeLessThan(
      forcedColorsIndex,
    );
    expect(forcedColorsIndex, 'forced-colors 補正は print 補正より前に置く').toBeLessThan(
      printIndex,
    );
  });

  it('excludes card surface links from prose and footnote popover text link selectors', () => {
    expect(PROSE_TEXT_LINK_SELECTOR).toContain("[data-link-surface='card']");
    expect(
      hasDeclarationForSelector(
        linkPrimitivesCss,
        PROSE_TEXT_LINK_SELECTOR,
        'overflow-wrap',
        'anywhere',
        {
          scope: 'screen',
        },
      ),
    ).toBe(true);
    expect(
      hasDeclarationForSelectorContaining(
        footnotesCss,
        "[data-footnote-popover] .footnote-popover-body a[href]:not(:where([data-link-surface='card']",
        'text-decoration',
        'underline',
        { scope: 'screen' },
      ),
    ).toBe(true);
  });
});
