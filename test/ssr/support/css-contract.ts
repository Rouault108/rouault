import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

import postcss, { type AtRule, type Container, type Declaration, type Rule } from 'postcss';
import selectorParser from 'postcss-selector-parser';

export type CssRuleScope = 'screen' | 'forced-colors' | 'print' | 'reduced-motion' | 'any';

export interface CssDeclarationSearchOptions {
  readonly scope?: CssRuleScope;
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

// static CSS 横断契約用の helper。既存 css-contract-test-helpers.ts は個別 CSS の
// 文字列構造検査を担当し、ここでは selector / at-rule を AST で扱う。

const isAtRule = (node: Container['parent']): node is AtRule =>
  node !== undefined && node !== null && node.type === 'atrule';

const isPrintMedia = (params: string): boolean => /\bprint\b/u.test(params);

const isForcedColorsMedia = (params: string): boolean => /forced-colors\s*:\s*active/u.test(params);

const isReducedMotionMedia = (params: string): boolean =>
  /prefers-reduced-motion\s*:\s*reduce/u.test(params);

const normalizeCssDeclarationValue = (value: string): string =>
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

const parseCss = (cssText: string) => postcss.parse(cssText);

const listCssFilesInDirectory = (directoryPath: string): string[] => {
  return readdirSync(directoryPath, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(directoryPath, entry.name);
    if (entry.isDirectory()) {
      return listCssFilesInDirectory(entryPath);
    }
    return entry.isFile() && entry.name.endsWith('.css') ? [entryPath] : [];
  });
};

export const listCssFiles = (): string[] => listCssFilesInDirectory(CSS_ROOT).sort();

export const readCssFile = (filePath: string): { cssText: string } => ({
  cssText: readFileSync(filePath, 'utf8'),
});

export const hasDeclarationForSelector = (
  cssText: string,
  selector: string,
  property: string,
  expectedValue: string,
  options: CssDeclarationSearchOptions = {},
): boolean => {
  const scope = options.scope ?? 'screen';
  const expectedSelector = normalizeAttributeQuoteStyle(normalizeSelector(selector));
  let found = false;

  parseCss(cssText).walkRules((rule) => {
    if (found || !isRuleInScope(rule, scope)) {
      return;
    }
    if (!splitSelectors(rule.selector).includes(expectedSelector)) {
      return;
    }

    rule.walkDecls(property, (declaration) => {
      if (declaration.value.trim() === expectedValue) {
        found = true;
      }
    });
  });

  return found;
};

export const hasDeclarationForSelectorInMedia = (
  cssText: string,
  mediaPredicate: (params: string) => boolean,
  selector: string,
  property: string,
  expectedValue: string,
): boolean => {
  const expectedSelector = normalizeAttributeQuoteStyle(normalizeSelector(selector));
  const normalizedExpectedValue = normalizeCssDeclarationValue(expectedValue);
  let found = false;

  parseCss(cssText).walkRules((rule) => {
    if (found) {
      return;
    }
    if (!isRuleInScope(rule, 'screen')) {
      return;
    }

    const mediaAncestors = collectMediaAncestors(rule);
    if (!mediaAncestors.some((media) => mediaPredicate(media.params))) {
      return;
    }
    if (!splitSelectors(rule.selector).includes(expectedSelector)) {
      return;
    }

    rule.walkDecls(property, (declaration) => {
      if (normalizeCssDeclarationValue(declaration.value) === normalizedExpectedValue) {
        found = true;
      }
    });
  });

  return found;
};

export const hasRuleForSelector = (
  cssText: string,
  selector: string,
  options: CssDeclarationSearchOptions = {},
): boolean => {
  const scope = options.scope ?? 'screen';
  const expectedSelector = normalizeAttributeQuoteStyle(normalizeSelector(selector));
  let found = false;

  parseCss(cssText).walkRules((rule) => {
    if (found || !isRuleInScope(rule, scope)) {
      return;
    }
    found = splitSelectors(rule.selector).includes(expectedSelector);
  });

  return found;
};

export const lacksRuleForSelector = (
  cssText: string,
  selector: string,
  options?: CssDeclarationSearchOptions,
): boolean => !hasRuleForSelector(cssText, selector, options);

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
): boolean => {
  const scope = options.scope ?? 'screen';
  const expectedSelector = normalizeAttributeQuoteStyle(normalizeSelector(selector));
  let found = false;

  parseCss(cssText).walkRules((rule) => {
    if (found || !isRuleInScope(rule, scope)) {
      return;
    }
    if (!splitSelectors(rule.selector).includes(expectedSelector)) {
      return;
    }

    rule.walkDecls(property, (declaration) => {
      const tokens = declaration.value.split(/\s+/u).map((token) => token.trim());
      if (tokens.includes(expectedToken)) {
        found = true;
      }
    });
  });

  return found;
};

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

export const hasDeclarationValueIncluding = (
  cssText: string,
  selector: string,
  property: string,
  expectedFragment: string,
  options: CssDeclarationSearchOptions = {},
): boolean => {
  const scope = options.scope ?? 'screen';
  const expectedSelector = normalizeAttributeQuoteStyle(normalizeSelector(selector));
  const normalizedExpectedFragment = normalizeCssDeclarationValue(expectedFragment);
  let found = false;

  parseCss(cssText).walkRules((rule) => {
    if (found || !isRuleInScope(rule, scope)) {
      return;
    }
    if (!splitSelectors(rule.selector).includes(expectedSelector)) {
      return;
    }

    rule.walkDecls(property, (declaration) => {
      if (normalizeCssDeclarationValue(declaration.value).includes(normalizedExpectedFragment)) {
        found = true;
      }
    });
  });

  return found;
};

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

export const hasDeclarationValueNotIncluding = (
  cssText: string,
  selector: string,
  property: string,
  forbiddenFragment: string,
  options: CssDeclarationSearchOptions = {},
): boolean => {
  const scope = options.scope ?? 'screen';
  const expectedSelector = normalizeAttributeQuoteStyle(normalizeSelector(selector));
  const normalizedForbiddenFragment = normalizeCssDeclarationValue(forbiddenFragment);
  let foundSelectorProperty = false;
  let hasForbiddenValue = false;

  parseCss(cssText).walkRules((rule) => {
    if (!isRuleInScope(rule, scope)) {
      return;
    }
    if (!splitSelectors(rule.selector).includes(expectedSelector)) {
      return;
    }

    rule.walkDecls(property, (declaration) => {
      foundSelectorProperty = true;
      if (normalizeCssDeclarationValue(declaration.value).includes(normalizedForbiddenFragment)) {
        hasForbiddenValue = true;
      }
    });
  });

  return foundSelectorProperty && !hasForbiddenValue;
};

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

export const hasDeclarationPropertyForSelector = (
  cssText: string,
  selector: string,
  property: string,
  options: CssDeclarationSearchOptions = {},
): boolean => {
  const scope = options.scope ?? 'screen';
  const expectedSelector = normalizeAttributeQuoteStyle(normalizeSelector(selector));
  let found = false;

  parseCss(cssText).walkRules((rule) => {
    if (found || !isRuleInScope(rule, scope)) {
      return;
    }
    if (!splitSelectors(rule.selector).includes(expectedSelector)) {
      return;
    }

    rule.walkDecls(property, () => {
      found = true;
    });
  });

  return found;
};

export const hasDeclarationPropertyForAllSelectors = (
  cssText: string,
  selectors: readonly string[],
  property: string,
  options?: CssDeclarationSearchOptions,
): boolean =>
  selectors.every((selector) =>
    hasDeclarationPropertyForSelector(cssText, selector, property, options),
  );

export const lacksDeclarationPropertyForSelector = (
  cssText: string,
  selector: string,
  property: string,
  options?: CssDeclarationSearchOptions,
): boolean => !hasDeclarationPropertyForSelector(cssText, selector, property, options);

export const lacksDeclarationPropertyForAllSelectors = (
  cssText: string,
  selectors: readonly string[],
  property: string,
  options?: CssDeclarationSearchOptions,
): boolean =>
  selectors.every((selector) =>
    lacksDeclarationPropertyForSelector(cssText, selector, property, options),
  );

export const findLastDeclarationRuleOrderForSelector = (
  cssText: string,
  selector: string,
  property: string,
  options: CssDeclarationSearchOptions = {},
): number => {
  const scope = options.scope ?? 'screen';
  const expectedSelector = normalizeAttributeQuoteStyle(normalizeSelector(selector));
  let order = 0;
  let foundOrder = -1;

  parseCss(cssText).walkRules((rule) => {
    if (!isRuleInScope(rule, scope)) {
      return;
    }

    order += 1;

    if (!splitSelectors(rule.selector).includes(expectedSelector)) {
      return;
    }

    let hasProperty = false;
    rule.walkDecls(property, () => {
      hasProperty = true;
    });

    if (hasProperty) {
      foundOrder = order;
    }
  });

  if (foundOrder < 0) {
    throw new Error(`${selector} の ${property} が ${scope} scope に見つかりません`);
  }

  return foundOrder;
};

const isUnderlineDeclaration = (property: string, value: string): boolean => {
  if (property !== 'text-decoration' && property !== 'text-decoration-line') {
    return false;
  }
  return value.split(/\s+/u).includes('underline');
};

const isDeclaration = (node: Rule['nodes'][number]): node is Declaration => node.type === 'decl';

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

    const underlineDeclarations = rule.nodes.filter(
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
