import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import postcss, { type AtRule, type Declaration, type Rule } from 'postcss';
import selectorParser from 'postcss-selector-parser';
import { describe, expect, it } from 'vitest';

const readResultCardCss = (): string =>
  readFileSync(resolve(process.cwd(), 'src/assets/css/result-card.css'), 'utf8').replace(
    /\/\*[\s\S]*?\*\//gu,
    '',
  );

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

const declarationsForSelector = (
  css: string,
  selector: string,
  property?: string,
): Declaration[] => {
  const declarations: Declaration[] = [];
  const normalizedSelector = normalizeSelector(selector);
  postcss.parse(css).walkRules((rule: Rule) => {
    if (!splitSelectors(rule.selector).includes(normalizedSelector)) {
      return;
    }
    rule.walkDecls((declaration) => {
      if (property === undefined || declaration.prop === property) {
        declarations.push(declaration);
      }
    });
  });
  return declarations;
};

const declarationValues = (css: string, selector: string, property: string): string[] =>
  declarationsForSelector(css, selector, property).map((declaration) => declaration.value.trim());

const ruleBlock = (css: string, selector: string): string =>
  declarationsForSelector(css, selector)
    .map((declaration) => declaration.toString())
    .join('\n');

const mediaBlock = (css: string, params: string): string => {
  let block = '';
  postcss.parse(css).walkAtRules('media', (atRule: AtRule) => {
    if (atRule.params.trim() === params) {
      block += atRule.nodes?.map((node) => node.toString()).join('\n') ?? '';
    }
  });
  return block;
};

describe('result card static CSS contract', () => {
  it('moves the clickable surface padding from the card to the direct result link', () => {
    const css = readResultCardCss();

    expect(declarationValues(css, '.page-shell .result-card', 'padding')).toEqual([]);
    expect(declarationValues(css, '.page-shell .result-link', 'padding')).toEqual([
      'var(--space-5, 20px)',
    ]);
    expect(ruleBlock(css, '.page-shell .result-link')).toContain('display: grid');
    expect(ruleBlock(css, '.page-shell .result-link')).toContain('box-sizing: border-box');
    expect(ruleBlock(css, '.page-shell .result-link')).toContain('inline-size: 100%');
    expect(ruleBlock(css, '.page-shell .result-link')).toContain('border-radius: inherit');
    expect(ruleBlock(css, '.page-shell .result-link')).toContain('cursor: pointer');
  });

  it('keeps focus on the card outline while suppressing the inner link outline', () => {
    const css = readResultCardCss();

    expect(ruleBlock(css, '.page-shell .result-card:focus-within')).toContain(
      'outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color)',
    );
    expect(ruleBlock(css, '.page-shell .result-card:focus-within')).toContain(
      'outline-offset: var(--focus-ring-offset, 2px)',
    );
    expect(ruleBlock(css, '.page-shell .result-card:focus-within')).toContain(
      'animation: var(--animation-focus)',
    );
    expect(ruleBlock(css, '.page-shell .result-link:focus-visible')).toContain('outline: none');
  });

  it('restores outlined clickable hover and focus-within treatment without height contracts', () => {
    const css = readResultCardCss();

    expect(ruleBlock(css, '.page-shell .result-card')).toContain('overflow: hidden');
    expect(ruleBlock(css, '.page-shell .result-card')).toContain('transition:');
    expect(ruleBlock(css, '.page-shell .result-card:hover')).toContain(
      'border-color: var(--border-muted)',
    );
    expect(ruleBlock(css, '.page-shell .result-card:hover')).toContain(
      'box-shadow: var(--elevation-md)',
    );
    expect(ruleBlock(css, '.page-shell .result-card:focus-within')).toContain(
      'border-color: var(--border-muted)',
    );
    expect(ruleBlock(css, '.page-shell .result-card:focus-within')).toContain(
      'box-shadow: var(--elevation-md)',
    );

    const heightContractProperties = new Set([
      'block-size',
      'min-block-size',
      'max-block-size',
      'height',
      'min-height',
      'max-height',
    ]);
    const heightContracts: string[] = [];
    postcss.parse(css).walkDecls((declaration) => {
      if (heightContractProperties.has(declaration.prop)) {
        heightContracts.push(declaration.toString());
      }
    });

    expect(heightContracts).toEqual([]);
  });

  it('keeps the mobile result-title density at the legacy static size', () => {
    const css = readResultCardCss();
    const mobile = mediaBlock(css, '(max-width: 768px)');

    expect(ruleBlock(mobile, '.page-shell .result-title')).toContain(
      'font-size: var(--text-base, 14px)',
    );
  });
});
