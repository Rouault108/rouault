import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

import postcss, { type AtRule, type Container, type Declaration, type Rule } from 'postcss';
import selectorParser from 'postcss-selector-parser';

export type CssRuleScope = 'base' | 'screen' | 'forced-colors' | 'print' | 'reduced-motion' | 'any';
export type SelectorKind = 'element' | 'pseudo-before' | 'pseudo-after' | 'any';

export interface CssDeclarationSearchOptions {
  readonly scope?: CssRuleScope;
  readonly mediaPredicate?: (params: string) => boolean;
  readonly selectorKind?: SelectorKind;
}

export interface CssContractViolation {
  readonly filePath: string;
  readonly selector: string;
  readonly property: string;
  readonly value: string;
  readonly scope: CssRuleScope;
  readonly reason: string;
}

const CSS_ROOT = resolve(process.cwd(), 'src/assets/css');

const isAtRule = (node: Container['parent']): node is AtRule =>
  node !== undefined && node !== null && node.type === 'atrule';

const isPrintMedia = (params: string): boolean => /\bprint\b/u.test(params);
const isForcedColorsMedia = (params: string): boolean => /forced-colors\s*:\s*active/u.test(params);
const isReducedMotionMedia = (params: string): boolean =>
  /prefers-reduced-motion\s*:\s*reduce/u.test(params);

export const normalizeCssDeclarationValue = (value: string): string =>
  value
    .trim()
    .replace(/\s+/gu, ' ')
    .replace(/\s*,\s*/gu, ', ')
    .replace(/\(\s+/gu, '(')
    .replace(/\s+\)/gu, ')');

const collectMediaAncestors = (rule: Rule): AtRule[] => {
  const mediaAncestors: AtRule[] = [];
  let parent: Container['parent'] = rule.parent;

  while (parent !== undefined && parent !== null) {
    if (isAtRule(parent) && parent.name.toLowerCase() === 'media') {
      mediaAncestors.push(parent);
    }
    parent = parent.parent;
  }

  return mediaAncestors;
};

const isRuleInScope = (rule: Rule, scope: CssRuleScope): boolean => {
  const mediaAncestors = collectMediaAncestors(rule);

  switch (scope) {
    case 'base':
      return mediaAncestors.length === 0;
    case 'screen':
      return !mediaAncestors.some(
        (media) =>
          isPrintMedia(media.params) ||
          isForcedColorsMedia(media.params) ||
          isReducedMotionMedia(media.params),
      );
    case 'forced-colors':
      return mediaAncestors.some((media) => isForcedColorsMedia(media.params));
    case 'print':
      return mediaAncestors.some((media) => isPrintMedia(media.params));
    case 'reduced-motion':
      return mediaAncestors.some((media) => isReducedMotionMedia(media.params));
    case 'any':
      return true;
  }
};

const assertValidOptions = (options: CssDeclarationSearchOptions): void => {
  if (options.scope !== undefined && options.mediaPredicate !== undefined) {
    throw new Error('scope と mediaPredicate は同時指定できません');
  }
};

const normalizeAttributeQuoteStyle = (selector: string): string =>
  selector.replace(
    /\[([^=\]]+)=(?:"([^"]*)"|'([^']*)')\]/gu,
    (_match, name, doubleValue, singleValue) => {
      const value = typeof doubleValue === 'string' ? doubleValue : singleValue;
      return `[${String(name)}='${String(value)}']`;
    },
  );

const normalizeSelector = (selector: string): string =>
  selector
    .trim()
    .replace(/\s+/gu, ' ')
    .replace(/\s*([>+~(),])\s*/gu, '$1');

const splitSelectors = (selectorText: string): string[] => {
  const ast = selectorParser().astSync(selectorText);
  const selectors: string[] = [];
  ast.each((selector) => {
    selectors.push(normalizeAttributeQuoteStyle(normalizeSelector(selector.toString())));
  });
  return selectors;
};

const selectorMatchesKind = (selector: string, selectorKind: SelectorKind): boolean => {
  if (selectorKind === 'any') return true;
  const hasBefore = /::before\b/u.test(selector);
  const hasAfter = /::after\b/u.test(selector);
  if (selectorKind === 'pseudo-before') return hasBefore;
  if (selectorKind === 'pseudo-after') return hasAfter;
  return !hasBefore && !hasAfter;
};

const parseCss = (cssText: string) => postcss.parse(cssText);

const listCssFilesInDirectory = (directoryPath: string): string[] => {
  return readdirSync(directoryPath, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(directoryPath, entry.name);
    if (entry.isDirectory()) return listCssFilesInDirectory(entryPath);
    return entry.isFile() && entry.name.endsWith('.css') ? [entryPath] : [];
  });
};

const ruleMatchesOptions = (rule: Rule, options: CssDeclarationSearchOptions): boolean => {
  assertValidOptions(options);
  if (options.mediaPredicate !== undefined) {
    return collectMediaAncestors(rule).some((media) => options.mediaPredicate?.(media.params) === true);
  }
  return isRuleInScope(rule, options.scope ?? 'screen');
};

const selectorFragmentMatches = (selector: string, fragment: string): boolean => {
  const normalizedSelector = normalizeAttributeQuoteStyle(normalizeSelector(selector));
  const normalizedFragment = normalizeAttributeQuoteStyle(normalizeSelector(fragment));
  return normalizedSelector.includes(normalizedFragment);
};

const selectorsForRule = (rule: Rule, selectorKind: SelectorKind): string[] =>
  splitSelectors(rule.selector).filter((selector) => selectorMatchesKind(selector, selectorKind));

const ruleHasSelector = (
  rule: Rule,
  selector: string,
  options: CssDeclarationSearchOptions,
  mode: 'exact' | 'fragment',
): boolean => {
  const selectorKind = options.selectorKind ?? 'any';
  const expectedSelector = normalizeAttributeQuoteStyle(normalizeSelector(selector));
  return selectorsForRule(rule, selectorKind).some((actualSelector) =>
    mode === 'exact' ? actualSelector === expectedSelector : selectorFragmentMatches(actualSelector, selector),
  );
};

const matchingRules = (
  cssText: string,
  selector: string,
  options: CssDeclarationSearchOptions,
  mode: 'exact' | 'fragment',
): Rule[] => {
  assertValidOptions(options);
  const rules: Rule[] = [];
  parseCss(cssText).walkRules((rule) => {
    if (!ruleMatchesOptions(rule, options)) return;
    if (!ruleHasSelector(rule, selector, options, mode)) return;
    rules.push(rule);
  });
  return rules;
};

const matchingDeclarations = (
  cssText: string,
  selector: string,
  property: string,
  options: CssDeclarationSearchOptions,
  mode: 'exact' | 'fragment',
): Declaration[] =>
  matchingRules(cssText, selector, options, mode).flatMap((rule) => {
    const declarations: Declaration[] = [];
    rule.walkDecls(property, (declaration) => {
      declarations.push(declaration);
    });
    return declarations;
  });

export const listCssFiles = (): string[] => listCssFilesInDirectory(CSS_ROOT).sort();

export const readCssFile = (filePath: string): { cssText: string } => ({
  cssText: readFileSync(filePath, 'utf8'),
});

export const hasRuleForSelector = (
  cssText: string,
  selector: string,
  options: CssDeclarationSearchOptions = {},
): boolean => matchingRules(cssText, selector, options, 'exact').length > 0;

export const lacksRuleForSelector = (
  cssText: string,
  selector: string,
  options?: CssDeclarationSearchOptions,
): boolean => !hasRuleForSelector(cssText, selector, options);

export const hasRuleContainingSelectorFragment = (
  cssText: string,
  selectorFragment: string,
  options: CssDeclarationSearchOptions = {},
): boolean => matchingRules(cssText, selectorFragment, options, 'fragment').length > 0;

export const hasDeclarationForSelector = (
  cssText: string,
  selector: string,
  property: string,
  expectedValue: string,
  options: CssDeclarationSearchOptions = {},
): boolean => {
  const expected = normalizeCssDeclarationValue(expectedValue);
  return matchingDeclarations(cssText, selector, property, options, 'exact').some(
    (declaration) => normalizeCssDeclarationValue(declaration.value) === expected,
  );
};

export const hasDeclarationForSelectorContaining = (
  cssText: string,
  selectorFragment: string,
  property: string,
  expectedValue: string,
  options: CssDeclarationSearchOptions = {},
): boolean => {
  const expected = normalizeCssDeclarationValue(expectedValue);
  return matchingDeclarations(cssText, selectorFragment, property, options, 'fragment').some(
    (declaration) => normalizeCssDeclarationValue(declaration.value) === expected,
  );
};

export const hasDeclarationForSelectorInMedia = (
  cssText: string,
  mediaPredicate: (params: string) => boolean,
  selector: string,
  property: string,
  expectedValue: string,
): boolean =>
  hasDeclarationForSelector(cssText, selector, property, expectedValue, { mediaPredicate });

export const hasDeclarationForSelectorContainingInMedia = (
  cssText: string,
  mediaPredicate: (params: string) => boolean,
  selectorFragment: string,
  property: string,
  expectedValue: string,
): boolean =>
  hasDeclarationForSelectorContaining(cssText, selectorFragment, property, expectedValue, {
    mediaPredicate,
  });

export const hasDeclarationForAllSelectors = (
  cssText: string,
  selectors: readonly string[],
  property: string,
  expectedValue: string,
  options?: CssDeclarationSearchOptions,
): boolean =>
  selectors.every((selector) =>
    hasDeclarationForSelector(cssText, selector, property, expectedValue, options),
  );

export const hasDeclarationTokenForSelector = (
  cssText: string,
  selector: string,
  property: string,
  expectedToken: string,
  options: CssDeclarationSearchOptions = {},
): boolean =>
  matchingDeclarations(cssText, selector, property, options, 'exact').some((declaration) =>
    declaration.value
      .split(/\s+/u)
      .map((token) => token.trim())
      .includes(expectedToken),
  );

export const hasDeclarationTokenForAllSelectors = (
  cssText: string,
  selectors: readonly string[],
  property: string,
  expectedToken: string,
  options?: CssDeclarationSearchOptions,
): boolean =>
  selectors.every((selector) =>
    hasDeclarationTokenForSelector(cssText, selector, property, expectedToken, options),
  );

export const hasAnyDeclarationValueIncludingForSelectorContaining = (
  cssText: string,
  selectorFragment: string,
  property: string,
  expectedFragment: string,
  options: CssDeclarationSearchOptions = {},
): boolean => {
  const fragment = normalizeCssDeclarationValue(expectedFragment);
  return matchingDeclarations(cssText, selectorFragment, property, options, 'fragment').some(
    (declaration) => normalizeCssDeclarationValue(declaration.value).includes(fragment),
  );
};

export const hasAllDeclarationValuesIncludingForSelectorContaining = (
  cssText: string,
  selectorFragment: string,
  property: string,
  expectedFragment: string,
  options: CssDeclarationSearchOptions = {},
): boolean => {
  const declarations = matchingDeclarations(cssText, selectorFragment, property, options, 'fragment');
  if (declarations.length === 0) return false;
  const fragment = normalizeCssDeclarationValue(expectedFragment);
  return declarations.every((declaration) =>
    normalizeCssDeclarationValue(declaration.value).includes(fragment),
  );
};

export const hasDeclarationValueIncluding = (
  cssText: string,
  selector: string,
  property: string,
  expectedFragment: string,
  options: CssDeclarationSearchOptions = {},
): boolean => {
  const fragment = normalizeCssDeclarationValue(expectedFragment);
  return matchingDeclarations(cssText, selector, property, options, 'exact').some((declaration) =>
    normalizeCssDeclarationValue(declaration.value).includes(fragment),
  );
};

export const hasDeclarationValueIncludingForSelectorContaining =
  hasAnyDeclarationValueIncludingForSelectorContaining;

export const hasDeclarationValueIncludingForSelectorContainingInMedia = (
  cssText: string,
  mediaPredicate: (params: string) => boolean,
  selectorFragment: string,
  property: string,
  expectedFragment: string,
): boolean =>
  hasAnyDeclarationValueIncludingForSelectorContaining(
    cssText,
    selectorFragment,
    property,
    expectedFragment,
    { mediaPredicate },
  );

export const hasDeclarationValueIncludingForAllSelectors = (
  cssText: string,
  selectors: readonly string[],
  property: string,
  expectedFragment: string,
  options?: CssDeclarationSearchOptions,
): boolean =>
  selectors.every((selector) =>
    hasDeclarationValueIncluding(cssText, selector, property, expectedFragment, options),
  );

export const hasDeclarationValueNotIncludingForSelectorContaining = (
  cssText: string,
  selectorFragment: string,
  property: string,
  forbiddenFragment: string,
  options: CssDeclarationSearchOptions = {},
): boolean => {
  const declarations = matchingDeclarations(cssText, selectorFragment, property, options, 'fragment');
  if (declarations.length === 0) return false;
  const fragment = normalizeCssDeclarationValue(forbiddenFragment);
  return declarations.every(
    (declaration) => !normalizeCssDeclarationValue(declaration.value).includes(fragment),
  );
};

export const hasDeclarationValueNotIncluding = (
  cssText: string,
  selector: string,
  property: string,
  forbiddenFragment: string,
  options: CssDeclarationSearchOptions = {},
): boolean => {
  const declarations = matchingDeclarations(cssText, selector, property, options, 'exact');
  if (declarations.length === 0) return false;
  const fragment = normalizeCssDeclarationValue(forbiddenFragment);
  return declarations.every(
    (declaration) => !normalizeCssDeclarationValue(declaration.value).includes(fragment),
  );
};

export const hasDeclarationValueNotIncludingForSelectorContainingInMedia = (
  cssText: string,
  mediaPredicate: (params: string) => boolean,
  selectorFragment: string,
  property: string,
  forbiddenFragment: string,
): boolean =>
  hasDeclarationValueNotIncludingForSelectorContaining(
    cssText,
    selectorFragment,
    property,
    forbiddenFragment,
    { mediaPredicate },
  );

export const hasDeclarationValueNotIncludingForAllSelectors = (
  cssText: string,
  selectors: readonly string[],
  property: string,
  forbiddenFragment: string,
  options?: CssDeclarationSearchOptions,
): boolean =>
  selectors.every((selector) =>
    hasDeclarationValueNotIncluding(cssText, selector, property, forbiddenFragment, options),
  );

export const hasOnlyAllowedDeclarationValuesForSelectorContaining = (
  cssText: string,
  selectorFragment: string,
  property: string,
  allowedValues: readonly string[],
  options: CssDeclarationSearchOptions & { readonly requireDeclaration?: boolean } = {},
): boolean => {
  const declarations = matchingDeclarations(cssText, selectorFragment, property, options, 'fragment');
  if (declarations.length === 0) return options.requireDeclaration === true ? false : true;
  const allowed = new Set(allowedValues.map((value) => normalizeCssDeclarationValue(value)));
  return declarations.every((declaration) => allowed.has(normalizeCssDeclarationValue(declaration.value)));
};

export const hasNoDeclarationValueIncludingForSelectorContaining = (
  cssText: string,
  selectorFragment: string,
  forbiddenFragment: string,
  options: CssDeclarationSearchOptions & { readonly allowMissingRule?: boolean } = {},
): boolean => {
  const rules = matchingRules(cssText, selectorFragment, options, 'fragment');
  if (rules.length === 0) return options.allowMissingRule === true;
  const fragment = normalizeCssDeclarationValue(forbiddenFragment);
  return rules.every((rule) => {
    let ok = true;
    rule.walkDecls((declaration) => {
      if (normalizeCssDeclarationValue(declaration.value).includes(fragment)) ok = false;
    });
    return ok;
  });
};

export const hasDeclarationPropertyForSelector = (
  cssText: string,
  selector: string,
  property: string,
  options: CssDeclarationSearchOptions = {},
): boolean => matchingDeclarations(cssText, selector, property, options, 'exact').length > 0;

export const hasDeclarationPropertyForSelectorContaining = (
  cssText: string,
  selectorFragment: string,
  property: string,
  options: CssDeclarationSearchOptions = {},
): boolean => matchingDeclarations(cssText, selectorFragment, property, options, 'fragment').length > 0;

export const lacksDeclarationPropertyForSelector = (
  cssText: string,
  selector: string,
  property: string,
  options: CssDeclarationSearchOptions = {},
): boolean => !hasDeclarationPropertyForSelector(cssText, selector, property, options);

export const lacksDeclarationPropertyForSelectorContaining = (
  cssText: string,
  selectorFragment: string,
  property: string,
  options: CssDeclarationSearchOptions = {},
): boolean => !hasDeclarationPropertyForSelectorContaining(cssText, selectorFragment, property, options);

export const lacksDeclarationPropertyForAllSelectors = (
  cssText: string,
  selectors: readonly string[],
  property: string,
  options?: CssDeclarationSearchOptions,
): boolean =>
  selectors.every((selector) => lacksDeclarationPropertyForSelector(cssText, selector, property, options));

export const findLastDeclarationRuleOrderForSelector = (
  cssText: string,
  selector: string,
  property: string,
  options: CssDeclarationSearchOptions = {},
): number => {
  let order = 0;
  let lastOrder = -1;
  parseCss(cssText).walkRules((rule) => {
    order += 1;
    if (!ruleMatchesOptions(rule, options)) return;
    if (!ruleHasSelector(rule, selector, options, 'exact')) return;
    let hasProperty = false;
    rule.walkDecls(property, () => {
      hasProperty = true;
    });
    if (hasProperty) lastOrder = order;
  });

  if (lastOrder < 0) {
    throw new Error(`${selector} の ${property} が見つかりません`);
  }
  return lastOrder;
};


const isUnderlineDeclaration = (property: string, value: string): boolean => {
  if (property !== 'text-decoration' && property !== 'text-decoration-line') {
    return false;
  }
  return value.split(/\s+/u).includes('underline');
};

const isDeclaration = (node: { readonly type: string }): node is Declaration => node.type === 'decl';

const ALLOWED_BROAD_UNDERLINE_SELECTORS = new Set([
  ':is(.prose,.about-prose) a[href]:not(.heading-anchor)',
  ':is(.prose,.about-prose) a[href]:not(.heading-anchor):hover',
  ':is(.prose,.about-prose) a[href]:not(.heading-anchor):focus-visible',
  ':is(.prose,.about-prose) a[href]:not(.heading-anchor):visited',
  "ui-list-item>a[slot][href]:not([slot='actions'])",
  "ui-list-item>[slot]:not([slot='actions']) a[href]",
  "ui-list-item>a[slot][href]:not([slot='actions']):hover",
  "ui-list-item>[slot]:not([slot='actions']) a[href]:hover",
  "ui-list-item>a[slot][href]:not([slot='actions']):focus-visible",
  "ui-list-item>[slot]:not([slot='actions']) a[href]:focus-visible",
  "ui-list-item>a[slot][href]:not([slot='actions']):visited",
  "ui-list-item>[slot]:not([slot='actions']) a[href]:visited",
  'a[data-footnote-ref]:hover',
  'a[data-footnote-ref]:focus-visible',
]);

const LINK_PSEUDO_PATTERN = /(^|[>+~\s,(]):(?:any-link|link|visited)\b/u;
const ANCHOR_SURFACE_PATTERN = /(^|[>+~\s,(])a(?:[#.:[\s]|$)/u;

const isAllowedBroadUnderlineSelector = (selector: string): boolean =>
  ALLOWED_BROAD_UNDERLINE_SELECTORS.has(selector) ||
  selector.startsWith(':is(.prose,.about-prose) a[href]:not(.heading-anchor):is(') ||
  selector.startsWith('ui-list-item>') ||
  selector.includes(' a[href]:not(.heading-anchor):is(');

const isBroadLinkSelector = (selector: string): boolean =>
  LINK_PSEUDO_PATTERN.test(selector) ||
  ANCHOR_SURFACE_PATTERN.test(selector) ||
  selector.includes(':is(a[') ||
  selector.includes(':where(a[') ||
  selector.includes(':is(a:') ||
  selector.includes(':where(a:') ||
  selector.includes(':any-link');

export const findLinkUnderlineContractViolations = (
  filePath: string,
  cssText: string,
): CssContractViolation[] => {
  const violations: CssContractViolation[] = [];

  parseCss(cssText).walkRules((rule) => {
    if (!isRuleInScope(rule, 'screen')) {
      return;
    }

    const underlineDeclarations = (rule.nodes ?? []).filter(
      (node): node is Declaration =>
        isDeclaration(node) && isUnderlineDeclaration(node.prop, node.value.trim()),
    );
    if (underlineDeclarations.length === 0) {
      return;
    }

    for (const selector of splitSelectors(rule.selector)) {
      if (!isBroadLinkSelector(selector) || isAllowedBroadUnderlineSelector(selector)) {
        continue;
      }

      for (const declaration of underlineDeclarations) {
        violations.push({
          filePath,
          selector,
          property: declaration.prop,
          value: declaration.value.trim(),
          scope: 'screen',
          reason: 'broad link underline must use an explicit link surface',
        });
      }
    }
  });

  return violations;
};
