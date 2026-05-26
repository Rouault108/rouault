import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import postcss, { type Declaration, type Rule } from 'postcss';
import selectorParser from 'postcss-selector-parser';
import type { Node, Selector } from 'postcss-selector-parser';
import { describe, expect, it } from 'vitest';

const readProjectFile = (path: string): string => readFileSync(resolve(process.cwd(), path), 'utf8');

const tokensCss = readProjectFile('src/assets/css/tokens.css');
const mainCss = readProjectFile('src/assets/css/main.css');
const appShellCss = readProjectFile('src/assets/css/app-shell.css');
const routerShellCss = readProjectFile('src/assets/css/router-shell.css');
const noteShellCss = readProjectFile('src/assets/css/note-shell.css');
const aboutShellCss = readProjectFile('src/assets/css/about-shell.css');
const homePageCss = readProjectFile('src/assets/css/home-page.css');
const pageShellCss = readProjectFile('src/assets/css/page-shell.css');
const layoutHeaderSource = readProjectFile('src/components/layout/layout-header.ts');
const uiHeaderSource = readProjectFile('src/components/ui/header/header.ts');

const extractFirstCssTemplate = (source: string, label: string): string => {
  const match = /css`([\s\S]*?)`;/u.exec(source);
  if (!match?.[1]) {
    throw new Error(`${label} の css template を抽出できませんでした`);
  }
  return match[1];
};

const layoutHeaderCss = extractFirstCssTemplate(layoutHeaderSource, 'layout-header.ts');
const uiHeaderCss = extractFirstCssTemplate(uiHeaderSource, 'ui/header/header.ts');

interface DeclarationSummary {
  readonly selector: string;
  readonly property: string;
  readonly value: string;
}

type SubjectMatcher = (selectorText: string) => boolean;

const normalizeCssValue = (value: string): string =>
  value
    .trim()
    .replace(/\s+/gu, ' ')
    .replace(/\s*,\s*/gu, ', ')
    .replace(/\(\s+/gu, '(')
    .replace(/\s+\)/gu, ')');

const parseCss = (cssText: string) => postcss.parse(cssText);

const isCombinatorNode = (node: Node): boolean => node.type === 'combinator';

const getSubjectCompoundTopLevelNodes = (selector: Selector): readonly Node[] => {
  const nodes = [...selector.nodes];
  let startIndex = 0;
  nodes.forEach((node, index) => {
    if (isCombinatorNode(node)) {
      startIndex = index + 1;
    }
  });
  return nodes.slice(startIndex).filter((node) => node.type !== 'comment');
};

const hasFunctionalPseudoAncestor = (node: Node, pseudoValues: readonly string[]): boolean => {
  const blocked = new Set(pseudoValues);
  let parent = node.parent as Node | undefined;
  while (parent !== undefined) {
    if (parent.type === 'pseudo' && blocked.has(parent.value)) {
      return true;
    }
    parent = parent.parent as Node | undefined;
  }
  return false;
};

const findTopLevelSubjectNode = (node: Node, selector: Selector): Node | null => {
  let current: Node = node;
  let parent = current.parent as Node | Selector | undefined;
  while (parent !== undefined && parent !== selector) {
    current = parent as Node;
    parent = current.parent as Node | Selector | undefined;
  }
  return parent === selector ? current : null;
};

const isInsideAllowedSubjectPseudo = (node: Node): boolean => {
  let parent = node.parent as Node | undefined;
  while (parent !== undefined) {
    if (parent.type === 'pseudo') {
      if (parent.value !== ':is' && parent.value !== ':where') {
        return false;
      }
    }
    parent = parent.parent as Node | undefined;
  }
  return true;
};

const selectorTargetsClassSubject = (selectorText: string, className: string): boolean => {
  const ast = selectorParser().astSync(selectorText);
  let targets = false;

  ast.each((selector) => {
    const subjectNodes = getSubjectCompoundTopLevelNodes(selector);
    selector.walkClasses((classNode) => {
      if (classNode.value !== className) return;
      if (hasFunctionalPseudoAncestor(classNode, [':has', ':not'])) return;

      const subjectNode = findTopLevelSubjectNode(classNode, selector);
      if (subjectNode === null || !subjectNodes.includes(subjectNode)) return;
      if (!isInsideAllowedSubjectPseudo(classNode)) return;
      targets = true;
    });
  });

  return targets;
};

const selectorTargetsElementSubject = (selectorText: string, elementName: string): boolean => {
  const ast = selectorParser().astSync(selectorText);
  let targets = false;

  ast.each((selector) => {
    const subjectNodes = getSubjectCompoundTopLevelNodes(selector);
    selector.walkTags((tagNode) => {
      if (tagNode.value.toLowerCase() !== elementName.toLowerCase()) return;
      if (hasFunctionalPseudoAncestor(tagNode, [':has', ':not'])) return;

      const subjectNode = findTopLevelSubjectNode(tagNode, selector);
      if (subjectNode === null || !subjectNodes.includes(subjectNode)) return;
      if (!isInsideAllowedSubjectPseudo(tagNode)) return;
      targets = true;
    });
  });

  return targets;
};

const selectorTargetsIdSubject = (selectorText: string, idName: string): boolean => {
  const ast = selectorParser().astSync(selectorText);
  let targets = false;

  ast.each((selector) => {
    const subjectNodes = getSubjectCompoundTopLevelNodes(selector);
    selector.walkIds((idNode) => {
      if (idNode.value !== idName) return;
      if (hasFunctionalPseudoAncestor(idNode, [':has', ':not'])) return;

      const subjectNode = findTopLevelSubjectNode(idNode, selector);
      if (subjectNode === null || !subjectNodes.includes(subjectNode)) return;
      if (!isInsideAllowedSubjectPseudo(idNode)) return;
      targets = true;
    });
  });

  return targets;
};

const selectorTargetsHostSubject = (selectorText: string): boolean => {
  const ast = selectorParser().astSync(selectorText);
  let targets = false;

  ast.each((selector) => {
    const subjectNodes = getSubjectCompoundTopLevelNodes(selector);
    for (const node of subjectNodes) {
      if (node.type === 'pseudo' && (node.value === ':host' || node.value.startsWith(':host('))) {
        targets = true;
      }
    }
  });

  return targets;
};

const collectDeclarationsForSubject = (
  cssText: string,
  matcher: SubjectMatcher,
): DeclarationSummary[] => {
  const declarations: DeclarationSummary[] = [];
  parseCss(cssText).walkRules((rule: Rule) => {
    if (!matcher(rule.selector)) return;
    rule.walkDecls((declaration: Declaration) => {
      declarations.push({
        selector: rule.selector,
        property: declaration.prop,
        value: normalizeCssValue(declaration.value),
      });
    });
  });
  return declarations;
};

const classSubject = (className: string): SubjectMatcher => (selector) =>
  selectorTargetsClassSubject(selector, className);

const elementSubject = (elementName: string): SubjectMatcher => (selector) =>
  selectorTargetsElementSubject(selector, elementName);

const mainContentSubject: SubjectMatcher = (selector) => selectorTargetsIdSubject(selector, 'main-content');
const appShellSubject: SubjectMatcher = (selector) =>
  selectorTargetsIdSubject(selector, 'app') || selectorTargetsClassSubject(selector, 'app-root');

const ABOUT_SHELL_PADDING_PROPERTIES = new Set([
  'padding',
  'padding-block',
  'padding-block-start',
  'padding-block-end',
  'padding-top',
  'padding-bottom',
  'padding-inline',
  'padding-inline-start',
  'padding-inline-end',
  'padding-left',
  'padding-right',
]);

const BLOCK_START_PADDING_PROPERTIES = new Set([
  'padding',
  'padding-block',
  'padding-block-start',
  'padding-top',
]);

const BLOCK_START_MARGIN_PROPERTIES = new Set([
  'margin',
  'margin-block',
  'margin-block-start',
  'margin-top',
]);

const WIDTH_LIMIT_PROPERTIES = new Set([
  'max-width',
  'max-inline-size',
  'margin-inline',
  'margin-left',
  'margin-right',
]);

const ABOUT_SHELL_INLINE_SIZE_PROPERTIES = new Set(['width', 'inline-size']);
const ABOUT_SHELL_ALLOWED_INLINE_SIZE_VALUES = new Set(['auto', '100%']);
const ABOUT_SHELL_ALLOWED_DISPLAY_VALUES = new Set([
  'block',
  'flow-root',
  'block flow',
  'block flow-root',
]);

const LAYOUT_TRACK_PROPERTIES = new Set([
  'grid-template-columns',
  'grid-template-rows',
  'gap',
  'row-gap',
  'column-gap',
  'place-self',
  'justify-self',
]);

const VISUAL_OFFSET_PROPERTIES = new Set([
  'top',
  'bottom',
  'inset',
  'inset-block',
  'inset-block-start',
  'inset-block-end',
  'transform',
  'translate',
]);

const BLOCK_START_BORDER_PROPERTIES = new Set([
  'border',
  'border-top',
  'border-block',
  'border-block-start',
  'border-width',
  'border-top-width',
  'border-block-width',
  'border-block-start-width',
  'border-style',
  'border-top-style',
  'border-block-style',
  'border-block-start-style',
]);

const PSEUDO_SPACER_PROPERTIES = new Set(['content', 'display', 'block-size', 'height']);

const isZeroOrNone = (value: string): boolean =>
  value === '0' ||
  value === '0px' ||
  value === 'none' ||
  value === 'normal' ||
  value === 'auto' ||
  value === '0 0' ||
  value === '0px 0px';

const isZeroLengthToken = (value: string): boolean =>
  value === '0' || value === '0px' || value === '0rem' || value === '0em' || value === '0%';

const splitCssFunctionArguments = (value: string): string[] =>
  value
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

const hasNonZeroSecondComponent = (value: string): boolean => {
  const parts = value.split(/\s+/u).filter((part) => part.length > 0);
  const secondComponent = parts[1];
  return secondComponent !== undefined && !isZeroLengthToken(secondComponent);
};

const hasBlockAxisTranslateOffset = (value: string): boolean => {
  const normalized = normalizeCssValue(value).toLowerCase();
  if (normalized.length === 0 || normalized === 'none' || normalized === '0' || normalized === '0px') {
    return false;
  }

  if (normalized.startsWith('translatey(')) {
    const args = splitCssFunctionArguments(normalized.slice('translatey('.length, -1));
    const y = args[0];
    return y !== undefined && !isZeroLengthToken(y);
  }

  if (normalized.startsWith('translate3d(')) {
    const args = splitCssFunctionArguments(normalized.slice('translate3d('.length, -1));
    const y = args[1];
    return y !== undefined && !isZeroLengthToken(y);
  }

  if (normalized.startsWith('translate(')) {
    const args = splitCssFunctionArguments(normalized.slice('translate('.length, -1));
    const y = args[1];
    if (y !== undefined) return !isZeroLengthToken(y);
    return hasNonZeroSecondComponent(args[0] ?? '');
  }

  if (normalized.startsWith('translatex(')) return false;
  return hasNonZeroSecondComponent(normalized);
};

const hasBlockAxisTransformOffset = (value: string): boolean => {
  const normalized = normalizeCssValue(value).toLowerCase();
  if (normalized.length === 0 || normalized === 'none') return false;
  for (const match of normalized.matchAll(/translatey\(([^)]*)\)/gu)) {
    const args = splitCssFunctionArguments(match[1] ?? '');
    const y = args[0];
    if (y !== undefined && !isZeroLengthToken(y)) return true;
  }
  for (const match of normalized.matchAll(/translate3d\(([^)]*)\)/gu)) {
    const args = splitCssFunctionArguments(match[1] ?? '');
    const y = args[1];
    if (y !== undefined && !isZeroLengthToken(y)) return true;
  }
  for (const match of normalized.matchAll(/translate\(([^)]*)\)/gu)) {
    const args = splitCssFunctionArguments(match[1] ?? '');
    const y = args[1];
    if (y !== undefined && !isZeroLengthToken(y)) return true;
  }
  for (const match of normalized.matchAll(/matrix\(([^)]*)\)/gu)) {
    const args = splitCssFunctionArguments(match[1] ?? '');
    const y = args[5];
    if (y !== undefined && !isZeroLengthToken(y)) return true;
  }
  for (const match of normalized.matchAll(/matrix3d\(([^)]*)\)/gu)) {
    const args = splitCssFunctionArguments(match[1] ?? '');
    const y = args[13];
    if (y !== undefined && !isZeroLengthToken(y)) return true;
  }
  return false;
};

const isVisualOffsetDeclaration = (declaration: DeclarationSummary): boolean => {
  if (!VISUAL_OFFSET_PROPERTIES.has(declaration.property)) return false;
  if (declaration.property === 'transform') return hasBlockAxisTransformOffset(declaration.value);
  if (declaration.property === 'translate') return hasBlockAxisTranslateOffset(declaration.value);
  return !isZeroOrNone(declaration.value);
};

const isZeroMarginValue = (value: string): boolean =>
  value
    .split(/\s+/u)
    .filter((part) => part.length > 0)
    .every((part) => isZeroLengthToken(part));

const expectNoDeclarations = (
  cssText: string,
  matcher: SubjectMatcher,
  properties: ReadonlySet<string>,
  label: string,
): void => {
  const violations = collectDeclarationsForSubject(cssText, matcher).filter((declaration) =>
    properties.has(declaration.property),
  );
  expect(violations, label).toEqual([]);
};

const expectOnlyAllowedDeclarations = (
  cssText: string,
  matcher: SubjectMatcher,
  properties: ReadonlySet<string>,
  allowedValues: ReadonlySet<string>,
  label: string,
): void => {
  const violations = collectDeclarationsForSubject(cssText, matcher).filter(
    (declaration) =>
      properties.has(declaration.property) && !allowedValues.has(normalizeCssValue(declaration.value)),
  );
  expect(violations, label).toEqual([]);
};

const expectNoNonZeroDeclarations = (
  cssText: string,
  matcher: SubjectMatcher,
  properties: ReadonlySet<string>,
  label: string,
): void => {
  const violations = collectDeclarationsForSubject(cssText, matcher).filter(
    (declaration) => properties.has(declaration.property) && !isZeroOrNone(declaration.value),
  );
  expect(violations, label).toEqual([]);
};

const expectOnlyZeroMarginDeclarations = (
  cssText: string,
  matcher: SubjectMatcher,
  properties: ReadonlySet<string>,
  label: string,
): void => {
  const violations = collectDeclarationsForSubject(cssText, matcher).filter(
    (declaration) => properties.has(declaration.property) && !isZeroMarginValue(declaration.value),
  );
  expect(violations, label).toEqual([]);
};

const expectNoVisualOffsetDeclarations = (
  cssText: string,
  matcher: SubjectMatcher,
  label: string,
): void => {
  const violations = collectDeclarationsForSubject(cssText, matcher).filter(isVisualOffsetDeclaration);
  expect(violations, label).toEqual([]);
};

const expectPaddingUsesRequiredToken = (
  cssText: string,
  matcher: SubjectMatcher,
  requiredToken: string,
  label: string,
): void => {
  const declarations = collectDeclarationsForSubject(cssText, matcher).filter((declaration) =>
    BLOCK_START_PADDING_PROPERTIES.has(declaration.property),
  );

  expect(
    declarations.some((declaration) => declaration.value.includes(requiredToken)),
    `${label} が ${requiredToken} を参照していません`,
  ).toBe(true);

  const destructiveOverrides = declarations.filter(
    (declaration) => !declaration.value.includes(requiredToken),
  );
  expect(destructiveOverrides, `${label} の block-start padding が required token を迂回しています`).toEqual([]);
};

const expectNoPseudoSpacer = (cssText: string, matcher: SubjectMatcher, label: string): void => {
  const declarations = collectDeclarationsForSubject(cssText, (selector) => {
    if (!/(::before|::after)\b/u.test(selector)) return false;
    return matcher(selector.replace(/::(?:before|after)\b/gu, ''));
  }).filter((declaration) => PSEUDO_SPACER_PROPERTIES.has(declaration.property));

  const violations = declarations.filter((declaration) => !isZeroOrNone(declaration.value));
  expect(violations, `${label} の疑似要素 spacer 禁止`).toEqual([]);
};

describe('header body spacing css contract', () => {
  it('defines the canonical body-start spacing token hierarchy', () => {
    expect(tokensCss).toContain('--page-content-padding-block-start: var(--space-8);');
    expect(tokensCss).toContain(
      '--note-content-padding-block-start: var(--page-content-padding-block-start);',
    );
    expect(tokensCss).toContain(
      '--page-shell-padding-block-start: var(--page-content-padding-block-start);',
    );
    expect(tokensCss).toContain(
      '--home-shell-padding-block-start: var(--page-content-padding-block-start);',
    );
    expect(tokensCss).toContain(
      '--about-content-padding-block-start: var(--page-content-padding-block-start);',
    );
    expect(tokensCss).not.toMatch(/--page-shell-padding-block-start:\s*[^;]*--space-10/u);
    expect(pageShellCss).not.toMatch(/--space-10/u);
  });

  it('keeps page wrapper padding-block-start attached to each effective token', () => {
    expectPaddingUsesRequiredToken(
      noteShellCss,
      classSubject('layout-main-col'),
      '--note-content-padding-block-start',
      '.layout-main-col',
    );
    expectPaddingUsesRequiredToken(
      aboutShellCss,
      classSubject('about-main-col'),
      '--about-content-padding-block-start',
      '.about-main-col',
    );
    expectPaddingUsesRequiredToken(
      homePageCss,
      classSubject('home-shell'),
      '--home-shell-padding-block-start',
      '.home-shell',
    );
    expectPaddingUsesRequiredToken(
      pageShellCss,
      classSubject('page-shell'),
      '--page-shell-padding-block-start',
      '.page-shell',
    );
  });

  it('keeps about-shell as an outer shell without body-start spacing responsibility', () => {
    const aboutShell = classSubject('about-shell');
    expectNoDeclarations(aboutShellCss, aboutShell, ABOUT_SHELL_PADDING_PROPERTIES, '.about-shell padding');
    expectOnlyZeroMarginDeclarations(aboutShellCss, aboutShell, BLOCK_START_MARGIN_PROPERTIES, '.about-shell block-start margin');
    expectNoDeclarations(aboutShellCss, aboutShell, WIDTH_LIMIT_PROPERTIES, '.about-shell width responsibility');
    expectOnlyAllowedDeclarations(
      aboutShellCss,
      aboutShell,
      ABOUT_SHELL_INLINE_SIZE_PROPERTIES,
      ABOUT_SHELL_ALLOWED_INLINE_SIZE_VALUES,
      '.about-shell inline-size allowlist',
    );
    expectOnlyAllowedDeclarations(
      aboutShellCss,
      aboutShell,
      new Set(['display']),
      ABOUT_SHELL_ALLOWED_DISPLAY_VALUES,
      '.about-shell display allowlist',
    );
    expectNoDeclarations(aboutShellCss, aboutShell, LAYOUT_TRACK_PROPERTIES, '.about-shell layout track responsibility');
    expectNoVisualOffsetDeclarations(aboutShellCss, aboutShell, '.about-shell visual offset');
    expectNoNonZeroDeclarations(aboutShellCss, aboutShell, BLOCK_START_BORDER_PROPERTIES, '.about-shell block-start border');
    expectNoPseudoSpacer(aboutShellCss, aboutShell, '.about-shell');

    const forbiddenTokenReferences = collectDeclarationsForSubject(aboutShellCss, aboutShell).filter(
      (declaration) => /--page-shell-padding-(block-start|block-end|inline)\b/u.test(declaration.value),
    );
    expect(forbiddenTokenReferences, '.about-shell must not consume page shell padding tokens').toEqual([]);
  });

  it('keeps about-main-col as the about content box and border-box controller', () => {
    const declarations = collectDeclarationsForSubject(aboutShellCss, classSubject('about-main-col'));
    expect(declarations.some((declaration) => declaration.property === 'margin-inline' && declaration.value === 'auto')).toBe(true);
    expect(declarations.some((declaration) => declaration.property === 'padding-inline')).toBe(true);
    expect(declarations.some((declaration) => declaration.property === 'padding-block-end')).toBe(true);
    expect(declarations.some((declaration) => declaration.property === 'width' && declaration.value.includes('--about-content-max-inline-size'))).toBe(true);

    expectNoDeclarations(aboutShellCss, classSubject('about-main-col'), BLOCK_START_MARGIN_PROPERTIES, '.about-main-col block-start margin');
    expectNoVisualOffsetDeclarations(aboutShellCss, classSubject('about-main-col'), '.about-main-col visual offset');
    expectNoNonZeroDeclarations(aboutShellCss, classSubject('about-main-col'), BLOCK_START_BORDER_PROPERTIES, '.about-main-col block-start border');
    expectNoPseudoSpacer(aboutShellCss, classSubject('about-main-col'), '.about-main-col');
  });

  it('prevents about-content and about-hero from creating extra top distance', () => {
    for (const className of ['about-content', 'about-hero']) {
      const matcher = classSubject(className);
      expectNoDeclarations(aboutShellCss, matcher, BLOCK_START_MARGIN_PROPERTIES, `.${className} block-start margin`);
      expectNoDeclarations(aboutShellCss, matcher, BLOCK_START_PADDING_PROPERTIES, `.${className} block-start padding`);
      expectNoVisualOffsetDeclarations(aboutShellCss, matcher, `.${className} visual offset`);
      expectNoNonZeroDeclarations(aboutShellCss, matcher, BLOCK_START_BORDER_PROPERTIES, `.${className} block-start border`);
      expectNoPseudoSpacer(aboutShellCss, matcher, `.${className}`);
    }
  });

  it('does not move body-start spacing responsibility to header, router, main, or app shell parents', () => {
    const blockedSpacingProperties = new Set([
      ...BLOCK_START_PADDING_PROPERTIES,
      ...BLOCK_START_MARGIN_PROPERTIES,
    ]);

    expectNoDeclarations(layoutHeaderCss, elementSubject('layout-header'), blockedSpacingProperties, 'layout-header spacing');
    expectNoDeclarations(routerShellCss, elementSubject('app-router'), blockedSpacingProperties, 'app-router spacing');
    expectNoDeclarations(routerShellCss, mainContentSubject, blockedSpacingProperties, 'main#main-content spacing');
    expectNoVisualOffsetDeclarations(layoutHeaderCss, elementSubject('layout-header'), 'layout-header visual offset');
    expectNoVisualOffsetDeclarations(routerShellCss, elementSubject('app-router'), 'app-router visual offset');
    expectNoVisualOffsetDeclarations(routerShellCss, mainContentSubject, 'main#main-content visual offset');
    expectNoPseudoSpacer(layoutHeaderCss, elementSubject('layout-header'), 'layout-header');
    expectNoPseudoSpacer(routerShellCss, elementSubject('app-router'), 'app-router');
    expectNoPseudoSpacer(routerShellCss, mainContentSubject, 'main#main-content');

    const appShellGapViolations = collectDeclarationsForSubject(appShellCss, appShellSubject).filter(
      (declaration) => declaration.property === 'gap' || declaration.property === 'row-gap' || declaration.property === 'grid-template-rows',
    );
    expect(appShellGapViolations, 'app shell parent must not create header-body spacing by gap or grid row track').toEqual([]);
  });

  it('keeps layout-header and ui-header component CSS from creating body-start spacing', () => {
    expect(layoutHeaderCss).toContain('position: sticky;');
    expect(layoutHeaderCss).toContain('top: 0;');
    expect(uiHeaderCss).toContain('display: contents;');
    expect(uiHeaderCss).toContain('position: sticky;');
    expect(uiHeaderCss).toContain('top: 0;');

    const blockedSpacingProperties = new Set([
      ...BLOCK_START_PADDING_PROPERTIES,
      ...BLOCK_START_MARGIN_PROPERTIES,
    ]);
    expectNoDeclarations(layoutHeaderCss, selectorTargetsHostSubject, blockedSpacingProperties, 'layout-header :host spacing');
    expectNoVisualOffsetDeclarations(layoutHeaderCss, selectorTargetsHostSubject, 'layout-header :host visual offset except top:0');
    expectNoPseudoSpacer(layoutHeaderCss, selectorTargetsHostSubject, 'layout-header :host');

    expectNoDeclarations(uiHeaderCss, selectorTargetsHostSubject, blockedSpacingProperties, 'ui-header :host spacing');
    expectNoDeclarations(uiHeaderCss, elementSubject('header'), blockedSpacingProperties, 'ui-header header spacing');
    expectNoVisualOffsetDeclarations(uiHeaderCss, elementSubject('header'), 'ui-header header visual offset except top:0');
    expectNoNonZeroDeclarations(uiHeaderCss, elementSubject('header'), BLOCK_START_BORDER_PROPERTIES, 'ui-header header block-start border');
    expectNoPseudoSpacer(uiHeaderCss, selectorTargetsHostSubject, 'ui-header :host');
    expectNoPseudoSpacer(uiHeaderCss, elementSubject('header'), 'ui-header header');
  });

  it('keeps anchor scroll compensation separate from normal body-start spacing', () => {
    expect(mainCss).toContain('scroll-padding-top: var(--header-height, 48px);');
    expect(mainCss).toContain('scroll-margin-top: var(--toc-heading-scroll-margin-top');
  });
});
