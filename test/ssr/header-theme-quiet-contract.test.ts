import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import postcss, {
  type AnyNode,
  type AtRule,
  type Declaration,
  type Root,
  type Rule,
} from 'postcss';
import selectorParser from 'postcss-selector-parser';
import { describe, expect, it } from 'vitest';

const cssDir = resolve(process.cwd(), 'src/assets/css');

const readRawCss = (fileName: string): string => readFileSync(resolve(cssDir, fileName), 'utf8');

const HEADER_CONTRACT_ERROR_CODES = [
  'EXACT_FORCED_COLORS_AT_RULE_COUNT',
  'DUPLICATE_CANONICAL_SELECTOR',
  'UNEXPECTED_COLOR_RECORD',
  'COLOR_RECORD_COUNT',
  'FORCED_COLORS_SOURCE_ORDER',
  'COLOR_RECORD_PLACEMENT',
  'N6_DIRECT_CHILD_COUNT',
  'F2_DIRECT_CHILD_COUNT',
  'N6_ADJACENCY',
  'F2_ADJACENCY',
  'MONITORED_DECLARATION_COVERAGE',
  'FONT_RECORD',
  'FONT_WEIGHT_RECORD',
  'COMMON_RULE_IDENTITY',
  'FONT_ORDER',
  'PRIVATE_TOKEN_OWNER',
  'SEMANTIC_TOKEN_REDEFINITION',
  'ZERO_OWNER_PROPERTY',
  'FORBIDDEN_KEYFRAMES',
  'FORBIDDEN_PROPERTY_AT_RULE',
  'NODE_IDENTITY_DUPLICATE',
  'NODE_IDENTITY_SET_MISMATCH',
] as const;

type HeaderContractErrorCode = (typeof HEADER_CONTRACT_ERROR_CODES)[number];
type Scope = 'normal' | 'exact-forced-colors';
interface HeaderDeclarationRecord {
  scope: Scope;
  selectors: readonly string[];
  property: string;
  value: string;
  important: boolean;
  rule: Rule;
  declaration: Declaration;
}
interface ExpectedRecord {
  id: string;
  selectors: readonly string[];
  value: string;
  scope: Scope;
}

const failHeaderContract = (code: HeaderContractErrorCode, detail: string): never => {
  throw new Error(`[${code}] ${detail}`);
};

const normalizeAttributeQuoteStyle = (selector: string): string =>
  selector.replace(/\[([^\]=~|^$*\s]+)="([^"]*)"\]/gu, "[$1='$2']");

const splitSelectors = (selector: string): readonly string[] =>
  selectorParser()
    .astSync(selector)
    .nodes.map((node) => node.toString());

const normalizeSelector = (selector: string): string =>
  normalizeAttributeQuoteStyle(selectorParser().processSync(selector))
    .trim()
    .replace(/\s*([>+~])\s*/gu, ' $1 ')
    .replace(/\s+/gu, ' ');

const normalizeHeaderContractSelector = (selector: string): string => {
  const selectors = splitSelectors(selector);
  if (selectors.length !== 1) throw new Error('expected one selector');
  return normalizeSelector(selectors[0] ?? '');
};

const selectors = (...values: string[]): readonly string[] =>
  values.map(normalizeHeaderContractSelector).sort();
const selectorKey = (values: readonly string[]): string => [...values].sort().join('\n');

const N1 = selectors('header[data-layout-header]');
const N2 = selectors(
  'header[data-layout-header] .sidebar-toggle',
  'header[data-layout-header] .toc-trigger',
  'header[data-layout-header] .search-trigger',
  'header[data-layout-header] [data-header-menu] > [data-header-menu-trigger]',
);
const N3 = selectors('header[data-layout-header] [data-header-menu-item]');
const N4 = selectors('header[data-layout-header] .search-trigger__icon');
const N5 = selectors('header[data-layout-header] .search-trigger__label');
const THEME = selectors(
  "header[data-layout-header] [data-header-menu='theme'] > [data-header-menu-trigger] .theme-trigger-icon",
  "header[data-layout-header] [data-header-menu='theme'] > [data-header-menu-trigger] .theme-trigger-text",
  "header[data-layout-header] [data-header-menu='theme'] > [data-header-menu-trigger] .theme-trigger-chevron",
);
const F1 = selectors(
  'header[data-layout-header] .search-trigger__icon',
  'header[data-layout-header] .search-trigger__label',
);

const COLOR_RECORDS: readonly ExpectedRecord[] = [
  { id: 'N1', selectors: N1, value: 'var(--fg-default)', scope: 'normal' },
  { id: 'N2', selectors: N2, value: 'var(--fg-default)', scope: 'normal' },
  { id: 'N3', selectors: N3, value: 'var(--fg-default)', scope: 'normal' },
  { id: 'N4', selectors: N4, value: 'var(--fg-muted)', scope: 'normal' },
  { id: 'N5', selectors: N5, value: 'var(--fg-subtle)', scope: 'normal' },
  { id: 'N6', selectors: THEME, value: 'var(--fg-subtle)', scope: 'normal' },
  {
    id: 'F1',
    selectors: F1,
    value: 'CanvasText',
    scope: 'exact-forced-colors',
  },
  {
    id: 'F2',
    selectors: THEME,
    value: 'CanvasText',
    scope: 'exact-forced-colors',
  },
];

const FONT_RECORDS: readonly ExpectedRecord[] = [
  { id: 'FT1', selectors: N2, value: 'inherit', scope: 'normal' },
  { id: 'FT2', selectors: N3, value: 'inherit', scope: 'normal' },
];
const FONT_WEIGHT_RECORDS: readonly ExpectedRecord[] = [
  {
    id: 'FW1',
    selectors: N2,
    value: 'var(--_header-control-font-weight)',
    scope: 'normal',
  },
  {
    id: 'FW2',
    selectors: N3,
    value: 'var(--_header-control-font-weight)',
    scope: 'normal',
  },
  {
    id: 'FW3',
    selectors: selectors(
      "header[data-layout-header] [data-header-menu='theme'] [data-header-menu-item]",
    ),
    value: 'var(--font-normal, 400)',
    scope: 'normal',
  },
  {
    id: 'FW4',
    selectors: selectors(
      "header[data-layout-header] [data-header-menu='corpus'] [data-header-menu-item]",
    ),
    value: 'var(--font-normal, 400)',
    scope: 'normal',
  },
  {
    id: 'FW5',
    selectors: selectors(
      "header[data-layout-header] [data-header-menu='corpus'] [data-header-menu-item][aria-current='page']",
    ),
    value: 'var(--font-semibold, 600)',
    scope: 'normal',
  },
  {
    id: 'FW6',
    selectors: selectors(
      "header[data-layout-header] [data-header-menu='theme'] [data-header-menu-item][data-selected='true']",
    ),
    value: 'var(--font-semibold, 600)',
    scope: 'normal',
  },
];

const MONITORED_NORMAL_PROPERTIES = new Set([
  'color',
  'font',
  'font-weight',
  'opacity',
  'all',
  'fill',
  'stroke',
  'animation',
  'animation-name',
  '-webkit-animation',
  '-webkit-animation-name',
]);
const MONITORED_CUSTOM_PROPERTIES = new Set([
  '--_header-control-font-weight',
  '--fg-default',
  '--fg-muted',
  '--fg-subtle',
  '--font-medium',
  '--font-normal',
  '--font-semibold',
]);
const SEMANTIC_TOKENS = new Set([
  '--fg-default',
  '--fg-muted',
  '--fg-subtle',
  '--font-medium',
  '--font-normal',
  '--font-semibold',
]);
const ZERO_OWNER_PROPERTIES = new Set([
  'opacity',
  'all',
  'fill',
  'stroke',
  'animation',
  'animation-name',
  '-webkit-animation',
  '-webkit-animation-name',
]);

const isMonitoredDeclaration = (declaration: Declaration): boolean =>
  declaration.prop.startsWith('--')
    ? MONITORED_CUSTOM_PROPERTIES.has(declaration.prop)
    : MONITORED_NORMAL_PROPERTIES.has(declaration.prop.toLowerCase());

const isForbiddenKeyframesAtRule = (atRule: AtRule): boolean => {
  const name = atRule.name.toLowerCase();
  return name === 'keyframes' || /^-(?:[a-z0-9]+-)+keyframes$/u.test(name);
};
const normalizeExactMediaParams = (params: string): string =>
  params
    .trim()
    .toLowerCase()
    .replace(/\s+/gu, ' ')
    .replace(/\s*:\s*/gu, ':')
    .replace(/\(\s*/gu, '(')
    .replace(/\s*\)/gu, ')');
const isExactUnconditionalForcedColorsAtRule = (atRule: AtRule): boolean =>
  atRule.name.toLowerCase() === 'media' &&
  normalizeExactMediaParams(atRule.params) === '(forced-colors:active)' &&
  atRule.parent?.type === 'root';
const directNonCommentChildNodes = (container: Root | AtRule): readonly AnyNode[] =>
  (container.nodes ?? []).filter((node) => node.type !== 'comment');

const assertSameNodeIdentitySet = (
  collectedDeclarations: readonly Declaration[],
  walkedDeclarations: readonly Declaration[],
): void => {
  const collectedSet = new Set(collectedDeclarations);
  const walkedSet = new Set(walkedDeclarations);
  if (
    collectedDeclarations.length !== collectedSet.size ||
    walkedDeclarations.length !== walkedSet.size
  ) {
    failHeaderContract('NODE_IDENTITY_DUPLICATE', 'duplicate declaration reference');
  }
  if (collectedSet.size !== walkedSet.size)
    failHeaderContract('NODE_IDENTITY_SET_MISMATCH', 'declaration set size mismatch');
  for (const declaration of collectedSet) {
    if (!walkedSet.has(declaration))
      failHeaderContract('NODE_IDENTITY_SET_MISMATCH', 'collected node is missing');
  }
  for (const declaration of walkedSet) {
    if (!collectedSet.has(declaration))
      failHeaderContract('NODE_IDENTITY_SET_MISMATCH', 'walked node is missing');
  }
};

const assertSingleDeclarationChild = (
  rule: Rule,
  code: 'N6_DIRECT_CHILD_COUNT' | 'F2_DIRECT_CHILD_COUNT',
): Declaration => {
  const nodes = rule.nodes.filter((node) => node.type !== 'comment');
  const [onlyNode] = nodes;
  if (nodes.length !== 1 || onlyNode?.type !== 'decl')
    failHeaderContract(code, 'owner Rule must contain exactly one direct Declaration');
  return onlyNode as Declaration;
};

const rootRule = (record: HeaderDeclarationRecord): boolean => record.rule.parent?.type === 'root';
const signatureMatch = (record: HeaderDeclarationRecord, expected: ExpectedRecord): boolean =>
  selectorKey(record.selectors) === selectorKey(expected.selectors) &&
  record.value === expected.value &&
  !record.important;

const validateFamily = (
  records: readonly HeaderDeclarationRecord[],
  expectedRecords: readonly ExpectedRecord[],
  code: 'FONT_RECORD' | 'FONT_WEIGHT_RECORD',
): Map<string, HeaderDeclarationRecord> => {
  const matched = new Map<string, HeaderDeclarationRecord[]>();
  for (const record of records) {
    const expected = expectedRecords.find((candidate) => signatureMatch(record, candidate));
    if (!expected) return failHeaderContract(code, 'unexpected declaration record');
    if (record.scope !== 'normal' || !rootRule(record))
      failHeaderContract(code, 'record must be root-level');
    const group = matched.get(expected.id) ?? [];
    group.push(record);
    matched.set(expected.id, group);
  }
  const result = new Map<string, HeaderDeclarationRecord>();
  for (const expected of expectedRecords) {
    const group = matched.get(expected.id) ?? [];
    if (group.length !== 1) failHeaderContract(code, `${expected.id} count must be one`);
    result.set(expected.id, group[0] as HeaderDeclarationRecord);
  }
  return result;
};

const validateHeaderDeclarationContracts = (css: string): void => {
  const root = postcss.parse(css);
  const allAtRules: AtRule[] = [];
  root.walkAtRules((atRule) => {
    allAtRules.push(atRule);
  });
  if (allAtRules.some(isForbiddenKeyframesAtRule))
    failHeaderContract('FORBIDDEN_KEYFRAMES', 'keyframes are forbidden');
  if (allAtRules.some((atRule) => atRule.name.toLowerCase() === 'property'))
    failHeaderContract('FORBIDDEN_PROPERTY_AT_RULE', '@property is forbidden');

  const exactAtRules = allAtRules.filter(isExactUnconditionalForcedColorsAtRule);
  if (exactAtRules.length !== 1)
    failHeaderContract(
      'EXACT_FORCED_COLORS_AT_RULE_COUNT',
      'expected one exact forced-colors block',
    );
  const exactAtRule = exactAtRules[0] as AtRule;
  const records: HeaderDeclarationRecord[] = [];

  root.walkRules((rule) => {
    const directDeclarations = rule.nodes.filter(
      (node): node is Declaration => node.type === 'decl' && isMonitoredDeclaration(node),
    );
    let canonicalSelectors: readonly string[] = [];
    if (directDeclarations.length > 0)
      canonicalSelectors = splitSelectors(rule.selector)
        .map(normalizeHeaderContractSelector)
        .sort();
    for (const declaration of directDeclarations) {
      records.push({
        scope: rule.parent === exactAtRule ? 'exact-forced-colors' : 'normal',
        selectors: canonicalSelectors,
        property: declaration.prop.startsWith('--')
          ? declaration.prop
          : declaration.prop.toLowerCase(),
        value: declaration.value.trim(),
        important: declaration.important,
        rule,
        declaration,
      });
    }
  });

  const walked: Declaration[] = [];
  root.walkDecls((declaration) => {
    if (!isMonitoredDeclaration(declaration)) return;
    if (declaration.parent?.type !== 'rule')
      failHeaderContract(
        'MONITORED_DECLARATION_COVERAGE',
        'monitored declaration must be owned by a Rule',
      );
    walked.push(declaration);
  });
  assertSameNodeIdentitySet(
    records.map((record) => record.declaration).filter(isMonitoredDeclaration),
    walked,
  );

  const privateTokens = records.filter(
    (record) => record.property === '--_header-control-font-weight',
  );
  if (
    privateTokens.length !== 1 ||
    selectorKey(privateTokens[0]?.selectors ?? []) !== selectorKey(N1) ||
    privateTokens[0]?.value !== 'var(--font-medium, 500)' ||
    privateTokens[0]?.important ||
    !rootRule(privateTokens[0])
  )
    failHeaderContract('PRIVATE_TOKEN_OWNER', 'invalid private token ownership');
  if (records.some((record) => SEMANTIC_TOKENS.has(record.property)))
    failHeaderContract('SEMANTIC_TOKEN_REDEFINITION', 'semantic token redefinition');
  if (records.some((record) => ZERO_OWNER_PROPERTIES.has(record.property)))
    failHeaderContract('ZERO_OWNER_PROPERTY', 'zero-owner property found');

  for (const rule of new Set(records.map((record) => record.rule))) {
    const canonical = splitSelectors(rule.selector).map(normalizeHeaderContractSelector);
    if (canonical.length !== new Set(canonical).size)
      failHeaderContract('DUPLICATE_CANONICAL_SELECTOR', 'duplicate canonical selector');
  }

  const colorRecords = records.filter((record) => record.property === 'color');
  const colorsById = new Map<string, HeaderDeclarationRecord[]>();
  for (const record of colorRecords) {
    const expected = COLOR_RECORDS.find((candidate) => signatureMatch(record, candidate));
    if (!expected) return failHeaderContract('UNEXPECTED_COLOR_RECORD', 'unexpected color record');
    const placement =
      expected.scope === 'normal'
        ? record.scope === 'normal' && rootRule(record)
        : record.scope === 'exact-forced-colors' && record.rule.parent === exactAtRule;
    if (!placement) failHeaderContract('COLOR_RECORD_PLACEMENT', `${expected.id} placement`);
    const group = colorsById.get(expected.id) ?? [];
    group.push(record);
    colorsById.set(expected.id, group);
  }
  const color = new Map<string, HeaderDeclarationRecord>();
  for (const expected of COLOR_RECORDS) {
    const group = colorsById.get(expected.id) ?? [];
    if (group.length !== 1)
      failHeaderContract('COLOR_RECORD_COUNT', `${expected.id} count must be one`);
    color.set(expected.id, group[0] as HeaderDeclarationRecord);
  }

  const rootNodes = directNonCommentChildNodes(root);
  const forcedNodes = directNonCommentChildNodes(exactAtRule);
  const forcedIndex = rootNodes.indexOf(exactAtRule);
  for (const id of ['N4', 'N5', 'N6']) {
    if (rootNodes.indexOf((color.get(id) as HeaderDeclarationRecord).rule) >= forcedIndex)
      failHeaderContract('FORCED_COLORS_SOURCE_ORDER', `${id} must precede forced colors`);
  }
  assertSingleDeclarationChild(
    (color.get('N6') as HeaderDeclarationRecord).rule,
    'N6_DIRECT_CHILD_COUNT',
  );
  assertSingleDeclarationChild(
    (color.get('F2') as HeaderDeclarationRecord).rule,
    'F2_DIRECT_CHILD_COUNT',
  );
  const n5Index = rootNodes.indexOf((color.get('N5') as HeaderDeclarationRecord).rule);
  if (rootNodes.indexOf((color.get('N6') as HeaderDeclarationRecord).rule) !== n5Index + 1)
    failHeaderContract('N6_ADJACENCY', 'N6 must follow N5');
  const f1Index = forcedNodes.indexOf((color.get('F1') as HeaderDeclarationRecord).rule);
  if (forcedNodes.indexOf((color.get('F2') as HeaderDeclarationRecord).rule) !== f1Index + 1)
    failHeaderContract('F2_ADJACENCY', 'F2 must follow F1');

  const fonts = validateFamily(
    records.filter((record) => record.property === 'font'),
    FONT_RECORDS,
    'FONT_RECORD',
  );
  const weights = validateFamily(
    records.filter((record) => record.property === 'font-weight'),
    FONT_WEIGHT_RECORDS,
    'FONT_WEIGHT_RECORD',
  );
  if (
    color.get('N2')?.rule !== fonts.get('FT1')?.rule ||
    color.get('N2')?.rule !== weights.get('FW1')?.rule ||
    color.get('N3')?.rule !== fonts.get('FT2')?.rule ||
    color.get('N3')?.rule !== weights.get('FW2')?.rule
  ) {
    failHeaderContract('COMMON_RULE_IDENTITY', 'common declarations must share Rule identity');
  }
  for (const [fontId, weightId] of [
    ['FT1', 'FW1'],
    ['FT2', 'FW2'],
  ] as const) {
    const rule = fonts.get(fontId)?.rule as Rule;
    if (
      rule.nodes.indexOf(fonts.get(fontId)?.declaration as Declaration) >=
      rule.nodes.indexOf(weights.get(weightId)?.declaration as Declaration)
    ) {
      failHeaderContract('FONT_ORDER', 'font must precede font-weight');
    }
  }
};

const N6_BLOCK = `header[data-layout-header] [data-header-menu='theme'] > [data-header-menu-trigger] .theme-trigger-icon,
header[data-layout-header] [data-header-menu='theme'] > [data-header-menu-trigger] .theme-trigger-text,
header[data-layout-header] [data-header-menu='theme'] > [data-header-menu-trigger] .theme-trigger-chevron {
  color: var(--fg-subtle);
}`;
const F2_BLOCK = N6_BLOCK.replace('var(--fg-subtle)', 'CanvasText');
const FT1_BLOCK = `header[data-layout-header] .sidebar-toggle,
header[data-layout-header] .toc-trigger,
header[data-layout-header] .search-trigger,
header[data-layout-header] [data-header-menu] > [data-header-menu-trigger] {
  color: var(--fg-default);
  font: inherit;
  font-weight: var(--_header-control-font-weight);
}`;
const FT1_COLOR_ONLY_BLOCK = FT1_BLOCK.replace(
  '  font: inherit;\n  font-weight: var(--_header-control-font-weight);\n',
  '',
);
const FT1_FONT_ONLY_BLOCK = FT1_BLOCK.replace('  color: var(--fg-default);\n', '');
const FW3_BLOCK = `header[data-layout-header] [data-header-menu='theme'] [data-header-menu-item] {
  font-weight: var(--font-normal, 400);
}`;
const FORCED_BLOCK = `@media (forced-colors: active) {
  header[data-layout-header] .search-trigger { border-color: ButtonText; }

  header[data-layout-header] .search-trigger__icon,
  header[data-layout-header] .search-trigger__label {
    color: CanvasText;
  }

  ${F2_BLOCK.replaceAll('\n', '\n  ')}
}`;

const VALID_HEADER_DECLARATION_CONTRACT_FIXTURE = String.raw`
header[data-layout-header] {
  --_header-control-font-weight: var(--font-medium, 500);
  color: var(--fg-default);
}

${FT1_BLOCK}

header[data-layout-header] [data-header-menu-item] {
  color: var(--fg-default);
  font: inherit;
  font-weight: var(--_header-control-font-weight);
}

header[data-layout-header] .search-trigger__icon { color: var(--fg-muted); }

header[data-layout-header] .search-trigger__label { color: var(--fg-subtle); }

${N6_BLOCK}

${FW3_BLOCK}

header[data-layout-header] [data-header-menu='corpus'] [data-header-menu-item] { font-weight: var(--font-normal, 400); }
header[data-layout-header] [data-header-menu='corpus'] [data-header-menu-item][aria-current='page'] { font-weight: var(--font-semibold, 600); }
header[data-layout-header] [data-header-menu='theme'] [data-header-menu-item][data-selected='true'] { font-weight: var(--font-semibold, 600); }

${FORCED_BLOCK}
`;

const replaceExactlyOnce = (source: string, from: string, to: string): string => {
  expect(from).not.toBe('');
  expect(source.split(from)).toHaveLength(2);
  return source.replace(from, to);
};
const insertAfterExactlyOnce = (source: string, marker: string, insertion: string): string =>
  replaceExactlyOnce(source, marker, `${marker}${insertion}`);
const moveExactlyOnceToStart = (source: string, block: string): string => {
  expect(block).not.toBe('');
  expect(source.split(block)).toHaveLength(2);
  return `${block.trim()}\n\n${source.replace(block, '').trimStart()}`;
};
const expectHeaderContractError = (
  css: string,
  code: HeaderContractErrorCode,
  context = '',
): void => {
  expect(() => validateHeaderDeclarationContracts(css), context).toThrowError(
    new RegExp(`\\[${code}\\]`, 'u'),
  );
};
const firstDeclaration = (root: Root): Declaration => {
  let found: Declaration | undefined;
  root.walkDecls((declaration) => {
    found ??= declaration;
  });
  if (!found) throw new Error('fixture declaration not found');
  return found;
};

describe('header theme quiet declaration contract', () => {
  it('keeps the frozen error code set', () => {
    expect(HEADER_CONTRACT_ERROR_CODES).toHaveLength(22);
  });

  it('accepts production CSS', () => {
    validateHeaderDeclarationContracts(readRawCss('layout-header.css'));
  });

  it('keeps selector canonicalization fail-closed', () => {
    expect(normalizeHeaderContractSelector("a[data-x='y']>b")).toBe(
      normalizeHeaderContractSelector('a[data-x="y"] > b'),
    );
    expect(splitSelectors('a:is(.x, .y), b')).toHaveLength(2);
    expect(() => normalizeHeaderContractSelector('a, b')).toThrow();
    expect(() => normalizeHeaderContractSelector('a[')).toThrow();
    const canonical = normalizeHeaderContractSelector("a[data-x='y'] > b");
    expect(normalizeHeaderContractSelector(canonical)).toBe(canonical);
  });

  it('accepts the baseline and allowed syntactic variations', () => {
    expect(() =>
      validateHeaderDeclarationContracts(VALID_HEADER_DECLARATION_CONTRACT_FIXTURE),
    ).not.toThrow();
    const comments = VALID_HEADER_DECLARATION_CONTRACT_FIXTURE.replace(
      N6_BLOCK,
      `/* adjacency */\n${N6_BLOCK}`,
    ).replace(
      F2_BLOCK.replaceAll('\n', '\n  '),
      `/* adjacency */\n  ${F2_BLOCK.replaceAll('\n', '\n  ')}`,
    );
    expect(() => validateHeaderDeclarationContracts(comments)).not.toThrow();
    const reordered = VALID_HEADER_DECLARATION_CONTRACT_FIXTURE.replaceAll(
      N6_BLOCK,
      N6_BLOCK.replace(
        `${THEME[0]},\n${THEME[1]},\n${THEME[2]}`,
        `${THEME[2]},\n${THEME[0]},\n${THEME[1]}`,
      ),
    );
    expect(() => validateHeaderDeclarationContracts(reordered)).not.toThrow();
    expect(() =>
      validateHeaderDeclarationContracts(
        VALID_HEADER_DECLARATION_CONTRACT_FIXTURE.replace(
          '@media (forced-colors: active)',
          '@MEDIA ( FORCED-COLORS : ACTIVE )',
        ),
      ),
    ).not.toThrow();
  });

  it('rejects color, placement, child, and adjacency violations with fixed primary codes', () => {
    const cases: readonly (readonly [string, HeaderContractErrorCode])[] = [
      [
        VALID_HEADER_DECLARATION_CONTRACT_FIXTURE.replace(FORCED_BLOCK, ''),
        'EXACT_FORCED_COLORS_AT_RULE_COUNT',
      ],
      [
        insertAfterExactlyOnce(
          VALID_HEADER_DECLARATION_CONTRACT_FIXTURE,
          FORCED_BLOCK,
          `\n${FORCED_BLOCK}`,
        ),
        'EXACT_FORCED_COLORS_AT_RULE_COUNT',
      ],
      [
        insertAfterExactlyOnce(
          VALID_HEADER_DECLARATION_CONTRACT_FIXTURE,
          N6_BLOCK,
          '\n.x { color: red; }',
        ),
        'UNEXPECTED_COLOR_RECORD',
      ],
      [
        insertAfterExactlyOnce(
          VALID_HEADER_DECLARATION_CONTRACT_FIXTURE,
          N6_BLOCK,
          `\n${N6_BLOCK}`,
        ),
        'COLOR_RECORD_COUNT',
      ],
      [
        replaceExactlyOnce(
          VALID_HEADER_DECLARATION_CONTRACT_FIXTURE,
          `\n${N6_BLOCK}`,
          '',
        ),
        'COLOR_RECORD_COUNT',
      ],
      [
        replaceExactlyOnce(
          VALID_HEADER_DECLARATION_CONTRACT_FIXTURE,
          N6_BLOCK,
          N6_BLOCK.replace('var(--fg-subtle)', 'var(--fg-muted)'),
        ),
        'UNEXPECTED_COLOR_RECORD',
      ],
      [
        replaceExactlyOnce(
          VALID_HEADER_DECLARATION_CONTRACT_FIXTURE,
          N6_BLOCK,
          N6_BLOCK.replace(';', ' !important;'),
        ),
        'UNEXPECTED_COLOR_RECORD',
      ],
      [
        replaceExactlyOnce(
          VALID_HEADER_DECLARATION_CONTRACT_FIXTURE,
          N6_BLOCK,
          N6_BLOCK.replace(
            '.theme-trigger-chevron {',
            '.theme-trigger-chevron,\nheader[data-layout-header] .extra {',
          ),
        ),
        'UNEXPECTED_COLOR_RECORD',
      ],
      [
        replaceExactlyOnce(
          VALID_HEADER_DECLARATION_CONTRACT_FIXTURE,
          N6_BLOCK,
          N6_BLOCK.replace(
            "header[data-layout-header] [data-header-menu='theme'] > [data-header-menu-trigger] .theme-trigger-chevron {",
            'header[data-layout-header] [data-header-menu="theme"]>[data-header-menu-trigger] .theme-trigger-chevron,\nheader[data-layout-header] [data-header-menu=\'theme\'] > [data-header-menu-trigger] .theme-trigger-chevron {',
          ),
        ),
        'DUPLICATE_CANONICAL_SELECTOR',
      ],
      [
        replaceExactlyOnce(
          VALID_HEADER_DECLARATION_CONTRACT_FIXTURE,
          N6_BLOCK,
          `@media (width > 0px) {\n${N6_BLOCK.replaceAll('\n', '\n  ')}\n}`,
        ),
        'COLOR_RECORD_PLACEMENT',
      ],
      [
        moveExactlyOnceToStart(VALID_HEADER_DECLARATION_CONTRACT_FIXTURE, FORCED_BLOCK),
        'FORCED_COLORS_SOURCE_ORDER',
      ],
      [
        replaceExactlyOnce(
          VALID_HEADER_DECLARATION_CONTRACT_FIXTURE,
          `\n${N6_BLOCK}`,
          `\n.x {}\n\n${N6_BLOCK}`,
        ),
        'N6_ADJACENCY',
      ],
      [
        replaceExactlyOnce(
          VALID_HEADER_DECLARATION_CONTRACT_FIXTURE,
          `  ${F2_BLOCK.replaceAll('\n', '\n  ')}`,
          `  .x {}\n\n  ${F2_BLOCK.replaceAll('\n', '\n  ')}`,
        ),
        'F2_ADJACENCY',
      ],
      [
        replaceExactlyOnce(
          VALID_HEADER_DECLARATION_CONTRACT_FIXTURE,
          N6_BLOCK,
          N6_BLOCK.replace('  color:', '  background: transparent;\n  color:'),
        ),
        'N6_DIRECT_CHILD_COUNT',
      ],
      [
        replaceExactlyOnce(
          VALID_HEADER_DECLARATION_CONTRACT_FIXTURE,
          `  ${F2_BLOCK.replaceAll('\n', '\n  ')}`,
          `  ${F2_BLOCK.replaceAll('\n', '\n  ').replace('    color:', '    border-color: CanvasText;\n    color:')}`,
        ),
        'F2_DIRECT_CHILD_COUNT',
      ],
      [
        replaceExactlyOnce(
          VALID_HEADER_DECLARATION_CONTRACT_FIXTURE,
          N6_BLOCK,
          N6_BLOCK.replace('\n}', '\n  .x {}\n}'),
        ),
        'N6_DIRECT_CHILD_COUNT',
      ],
      [
        replaceExactlyOnce(
          VALID_HEADER_DECLARATION_CONTRACT_FIXTURE,
          N6_BLOCK,
          N6_BLOCK.replace('\n}', '\n  @supports (display: grid) {}\n}'),
        ),
        'N6_DIRECT_CHILD_COUNT',
      ],
    ];
    for (const [index, [fixture, code]] of cases.entries())
      expectHeaderContractError(fixture, code, `color fixture ${index}`);
  });

  it('rejects coverage, forced-colors lookalikes, and zero-owner constructs', () => {
    const appended = (value: string): string =>
      `${VALID_HEADER_DECLARATION_CONTRACT_FIXTURE}\n${value}`;
    const cases: readonly (readonly [string, HeaderContractErrorCode])[] = [
      [
        appended('@media (forced-colors: active) and (width > 0px) { .x { color: red; } }'),
        'UNEXPECTED_COLOR_RECORD',
      ],
      [
        appended('@media (forced-colors: active), (color) { .x { color: red; } }'),
        'UNEXPECTED_COLOR_RECORD',
      ],
      [
        appended('@media not (forced-colors: active) { .x { color: red; } }'),
        'UNEXPECTED_COLOR_RECORD',
      ],
      [
        appended(
          '@supports (display: grid) { @media (forced-colors: active) { .x { color: red; } } }',
        ),
        'UNEXPECTED_COLOR_RECORD',
      ],
      [appended('@media (width > 0px) { color: red; }'), 'MONITORED_DECLARATION_COVERAGE'],
      [appended('.x { --fg-subtle: red; }'), 'SEMANTIC_TOKEN_REDEFINITION'],
      ...[
        'OpAcItY: 0.5',
        'all: initial',
        'fill: currentColor',
        'stroke: currentColor',
        'animation: none',
        'animation-name: none',
        '-WebKit-Animation: none',
        '-webkit-animation-name: none',
      ].map((declaration) => [appended(`.x { ${declaration}; }`), 'ZERO_OWNER_PROPERTY'] as const),
      ...[
        '@keyframes x {}',
        '@KEYFRAMES x {}',
        '@-webkit-keyframes x {}',
        '@-moz-keyframes x {}',
        '@-foo-keyframes x {}',
        '@-foo-bar-keyframes x {}',
      ].map((value) => [appended(value), 'FORBIDDEN_KEYFRAMES'] as const),
      [appended('@PROPERTY --example;'), 'FORBIDDEN_PROPERTY_AT_RULE'],
      [appended('@notkeyframes x { .x { color: red; } }'), 'UNEXPECTED_COLOR_RECORD'],
    ];
    for (const [fixture, code] of cases) expectHeaderContractError(fixture, code);
  });

  it('rejects font and font-weight record violations', () => {
    const appended = (value: string): string =>
      `${VALID_HEADER_DECLARATION_CONTRACT_FIXTURE}\n${value}`;
    const cases: readonly (readonly [string, HeaderContractErrorCode])[] = [
      [appended('.x { font: inherit; }'), 'FONT_RECORD'],
      [
        replaceExactlyOnce(
          VALID_HEADER_DECLARATION_CONTRACT_FIXTURE,
          FT1_BLOCK,
          FT1_BLOCK.replace('font: inherit', 'font: normal'),
        ),
        'FONT_RECORD',
      ],
      [
        replaceExactlyOnce(
          VALID_HEADER_DECLARATION_CONTRACT_FIXTURE,
          FT1_BLOCK,
          FT1_BLOCK.replace('font: inherit', 'font: inherit !important'),
        ),
        'FONT_RECORD',
      ],
      [
        replaceExactlyOnce(
          VALID_HEADER_DECLARATION_CONTRACT_FIXTURE,
          FT1_BLOCK,
          FT1_BLOCK.replace('  font: inherit;\n', '') +
            `\n@layer x {\n${FT1_BLOCK.replaceAll('\n', '\n  ').replace('  color: var(--fg-default);\n', '').replace('  font-weight: var(--_header-control-font-weight);\n', '')}\n}`,
        ),
        'FONT_RECORD',
      ],
      [
        replaceExactlyOnce(
          VALID_HEADER_DECLARATION_CONTRACT_FIXTURE,
          FT1_BLOCK,
          FT1_BLOCK.replace('  font: inherit;\n', ''),
        ),
        'FONT_RECORD',
      ],
      [
        replaceExactlyOnce(
          VALID_HEADER_DECLARATION_CONTRACT_FIXTURE,
          FT1_BLOCK,
          FT1_BLOCK.replace('  font: inherit;\n', '  font: inherit;\n  font: inherit;\n'),
        ),
        'FONT_RECORD',
      ],
      [appended('.x { font-weight: 500; }'), 'FONT_WEIGHT_RECORD'],
      [
        replaceExactlyOnce(
          VALID_HEADER_DECLARATION_CONTRACT_FIXTURE,
          FW3_BLOCK,
          FW3_BLOCK.replace('var(--font-normal, 400)', '500'),
        ),
        'FONT_WEIGHT_RECORD',
      ],
      [
        replaceExactlyOnce(
          VALID_HEADER_DECLARATION_CONTRACT_FIXTURE,
          FW3_BLOCK,
          FW3_BLOCK.replace(';', ' !important;'),
        ),
        'FONT_WEIGHT_RECORD',
      ],
      [
        replaceExactlyOnce(
          VALID_HEADER_DECLARATION_CONTRACT_FIXTURE,
          FW3_BLOCK,
          `@container x (width > 0px) {\n${FW3_BLOCK.replaceAll('\n', '\n  ')}\n}`,
        ),
        'FONT_WEIGHT_RECORD',
      ],
      [
        replaceExactlyOnce(VALID_HEADER_DECLARATION_CONTRACT_FIXTURE, FW3_BLOCK, ''),
        'FONT_WEIGHT_RECORD',
      ],
      [
        insertAfterExactlyOnce(
          VALID_HEADER_DECLARATION_CONTRACT_FIXTURE,
          FW3_BLOCK,
          `\n${FW3_BLOCK}`,
        ),
        'FONT_WEIGHT_RECORD',
      ],
      [
        replaceExactlyOnce(
          VALID_HEADER_DECLARATION_CONTRACT_FIXTURE,
          FT1_BLOCK,
          `${FT1_COLOR_ONLY_BLOCK}\n\n${FT1_FONT_ONLY_BLOCK}`,
        ),
        'COMMON_RULE_IDENTITY',
      ],
      [
        replaceExactlyOnce(
          VALID_HEADER_DECLARATION_CONTRACT_FIXTURE,
          FT1_BLOCK,
          FT1_BLOCK.replace(
            '  font: inherit;\n  font-weight: var(--_header-control-font-weight);',
            '  font-weight: var(--_header-control-font-weight);\n  font: inherit;',
          ),
        ),
        'FONT_ORDER',
      ],
    ];
    for (const [fixture, code] of cases) expectHeaderContractError(fixture, code);
  });

  it('rejects private token ownership variants', () => {
    const declaration = '--_header-control-font-weight: var(--font-medium, 500);';
    const cases = [
      replaceExactlyOnce(
        VALID_HEADER_DECLARATION_CONTRACT_FIXTURE,
        declaration,
        '--_header-control-font-weight: var(--font-normal, 400);',
      ),
      replaceExactlyOnce(
        VALID_HEADER_DECLARATION_CONTRACT_FIXTURE,
        declaration,
        `${declaration.slice(0, -1)} !important;`,
      ),
      replaceExactlyOnce(VALID_HEADER_DECLARATION_CONTRACT_FIXTURE, `  ${declaration}\n`, ''),
      replaceExactlyOnce(
        VALID_HEADER_DECLARATION_CONTRACT_FIXTURE,
        `  ${declaration}\n`,
        `  ${declaration}\n  ${declaration}\n`,
      ),
      `${VALID_HEADER_DECLARATION_CONTRACT_FIXTURE}\n.x { ${declaration} }`,
    ];
    for (const fixture of cases) expectHeaderContractError(fixture, 'PRIVATE_TOKEN_OWNER');
  });
});

describe('node identity helpers', () => {
  it('rejects structurally equal declarations from another root', () => {
    expect(() =>
      assertSameNodeIdentitySet(
        [firstDeclaration(postcss.parse('.a { color: red; }'))],
        [firstDeclaration(postcss.parse('.a { color: red; }'))],
      ),
    ).toThrowError(/\[NODE_IDENTITY_SET_MISMATCH\]/u);
  });

  it('rejects duplicate declaration references on either side', () => {
    const declaration = firstDeclaration(postcss.parse('.a { color: red; }'));
    expect(() => assertSameNodeIdentitySet([declaration, declaration], [declaration])).toThrowError(
      /\[NODE_IDENTITY_DUPLICATE\]/u,
    );
    expect(() => assertSameNodeIdentitySet([declaration], [declaration, declaration])).toThrowError(
      /\[NODE_IDENTITY_DUPLICATE\]/u,
    );
  });

  it('rejects a missing node in either direction', () => {
    const root = postcss.parse('.a { color: red; font: inherit; }');
    const declarations: Declaration[] = [];
    root.walkDecls((declaration) => {
      declarations.push(declaration);
    });
    const [color, font] = declarations;
    if (!color || !font) throw new Error('fixture declarations not found');
    expect(() => assertSameNodeIdentitySet([color], [color, font])).toThrowError(
      /\[NODE_IDENTITY_SET_MISMATCH\]/u,
    );
    expect(() => assertSameNodeIdentitySet([color, font], [color])).toThrowError(
      /\[NODE_IDENTITY_SET_MISMATCH\]/u,
    );
  });

  it('keeps custom property names case-sensitive', () => {
    expect(
      isMonitoredDeclaration(firstDeclaration(postcss.parse('.a { --fg-subtle: red; }'))),
    ).toBe(true);
    expect(
      isMonitoredDeclaration(firstDeclaration(postcss.parse('.a { --FG-SUBTLE: red; }'))),
    ).toBe(false);
  });
});
