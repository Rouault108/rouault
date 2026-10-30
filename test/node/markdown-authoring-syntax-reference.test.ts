import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  findMarkdownTableRow as findRow,
  getMarkdownSection as getSection,
  parseMarkdownTable,
} from '../helpers/markdown-table.js';
import {
  directiveGrammar,
  supportedDirectiveNames,
} from '../../build/remark/directives/grammar/directive-grammar.js';
import { directiveAttributeSchemas } from '../../build/remark/directives/grammar/attribute-schemas.js';
import { directiveStructuralRules } from '../../build/remark/directives/grammar/structural-rules.js';
import type { DirectiveName } from '../../build/remark/directives/types.js';

const referencePath = 'docs/references/markdown-authoring-syntax.md';
const referenceAbsolutePath = resolve(process.cwd(), referencePath);

const expectedMetaKeys = [
  'filename',
  'label',
  'group-key',
  'tab-label',
  'copy-label',
  'copyable',
  'intent',
  'show-line-numbers',
  'copy-mode',
  'wrap',
  'highlight-lines',
  'layout',
] as const;

const allowedAuthoringStatuses = new Set([
  'recommended-top-level',
  'top-level-supported',
  'specialized-child-only',
  'child-only',
  'compatibility-supported',
]);

const expectedAuthoringStatus: Record<DirectiveName, string> = {
  callout: 'recommended-top-level',
  'code-group': 'recommended-top-level',
  'code-preview': 'recommended-top-level',
  'preview-sandbox': 'specialized-child-only',
  details: 'recommended-top-level',
  'info-box': 'recommended-top-level',
  'link-card': 'recommended-top-level',
  score: 'recommended-top-level',
  table: 'recommended-top-level',
  tabs: 'recommended-top-level',
  translation: 'recommended-top-level',
  'translation-overlay': 'top-level-supported',
  preview: 'child-only',
  toolbar: 'child-only',
  tab: 'child-only',
  panel: 'child-only',
  'syntax-card': 'recommended-top-level',
  'syntax-signature': 'child-only',
  'syntax-section': 'child-only',
  'syntax-fields': 'child-only',
  'syntax-field': 'child-only',
};

const readText = (path: string): string => readFileSync(resolve(process.cwd(), path), 'utf8');

const stripBackticks = (value: string): string => value.replace(/`/g, '').trim();

const parseListCell = (value: string): string[] => {
  const normalized = stripBackticks(value);
  if (normalized === 'none') {
    return [];
  }
  return normalized.split(',').map((item) => item.trim());
};

const formatList = (values: readonly string[] | undefined): string[] => (values ? [...values] : []);

const assertMetaInventory = (reference: string): void => {
  const fencedCodeBlockMeta = getSection(reference, 'Fenced Code Block Meta Syntax');
  const metaKeyInventory = getSection(fencedCodeBlockMeta, 'Meta Key Inventory');
  const metaTable = parseMarkdownTable(metaKeyInventory, [
    'Key',
    'Authoring key',
    'Source / Notes',
  ]);

  const metaKeys = metaTable.rows.map((row) => stripBackticks(row['Key'] ?? ''));
  expect(metaKeys).toEqual(expectedMetaKeys);
  expect(metaKeys).not.toContain('data-shiki-meta');
  for (const key of expectedMetaKeys) {
    expect(metaKeys).toContain(key);
    const row = findRow(metaTable, 'Key', key);
    expect(row['Authoring key']).toBe('true');
  }
};

const assertDirectiveInventory = (reference: string): void => {
  const directiveInventory = getSection(reference, 'Rouault Directive Inventory');
  const table = parseMarkdownTable(directiveInventory, [
    'Directive',
    'Kind',
    'Allows children',
    'Authoring status',
    'Parent restriction',
    'Required fenced code languages',
    'Mutual exclusion',
    'Max occurrences within parent',
    'Attributes',
    'Value / normalization source',
  ]);

  const documentedDirectiveNames = table.rows.map((row) => stripBackticks(row['Directive'] ?? ''));
  expect(documentedDirectiveNames).toEqual(supportedDirectiveNames);

  for (const name of supportedDirectiveNames) {
    const row = findRow(table, 'Directive', name);
    const structuralRule = directiveStructuralRules[name];
    const attributes = directiveAttributeSchemas[name].allowedKeys;
    const authoringStatus = stripBackticks(row['Authoring status'] ?? '');
    const allowsChildren = stripBackticks(row['Allows children'] ?? '');
    const maxOccurrences = stripBackticks(row['Max occurrences within parent'] ?? '');

    expect(stripBackticks(row['Kind'] ?? '')).toBe(directiveGrammar[name].kind);
    expect(['true', 'false']).toContain(allowsChildren);
    expect(allowsChildren).toBe(String(structuralRule.allowsChildren));
    expect(parseListCell(row['Attributes'] ?? '')).toEqual([...attributes]);
    expect(parseListCell(row['Parent restriction'] ?? '')).toEqual(
      formatList(structuralRule.allowedParentDirectives),
    );
    expect(parseListCell(row['Required fenced code languages'] ?? '')).toEqual(
      formatList(structuralRule.requiresFenceCodeLanguages),
    );
    expect(parseListCell(row['Mutual exclusion'] ?? '')).toEqual(
      formatList(structuralRule.mutuallyExclusiveWith),
    );
    expect(maxOccurrences).toMatch(/^(none|\d+)$/);
    expect(maxOccurrences).toBe(
      structuralRule.maxOccurrencesWithinParent === undefined
        ? 'none'
        : String(structuralRule.maxOccurrencesWithinParent),
    );
    expect(allowedAuthoringStatuses.has(authoringStatus)).toBe(true);
    expect(authoringStatus).toBe(expectedAuthoringStatus[name]);
  }
};

describe('Markdown authoring syntax reference', () => {
  it('exists and documents non-directive Markdown input extensions', () => {
    expect(existsSync(referenceAbsolutePath)).toBe(true);

    const reference = readText(referencePath);
    const syntaxInventory = getSection(reference, 'Markdown Syntax Inventory');
    expect(syntaxInventory).toContain('CommonMark / GFM');
    expect(syntaxInventory).toContain('Math');

    getSection(reference, 'CommonMark / GFM');
    getSection(reference, 'Math');

    const fencedCodeBlockMeta = getSection(reference, 'Fenced Code Block Meta Syntax');
    assertMetaInventory(reference);

    const lineStateConflict = getSection(fencedCodeBlockMeta, 'Code Line State Conflict');
    expect(lineStateConflict).toContain('highlight-lines');
    expect(lineStateConflict).toContain('highlight notation');
    expect(lineStateConflict).toContain('同一highlight');
    expect(lineStateConflict).toContain('`highlight + add`');
    expect(lineStateConflict).toContain('`highlight + remove`');
    expect(lineStateConflict).toContain('`add + remove`');
    expect(lineStateConflict).toContain('silent precedence');

    const autoLinkCardTransform = getSection(reference, 'Auto Link Card Transform');
    expect(autoLinkCardTransform).toContain('::link-card');
    expect(autoLinkCardTransform).toContain('auto link-card');

    const tableAuthoringExtension = getSection(reference, 'Table Authoring Extension');
    expect(tableAuthoringExtension).toContain('::table');
    expect(tableAuthoringExtension).toContain('column-widths');

    const tableCellBreakEscape = getSection(reference, 'Table Cell Break Escape');
    expect(tableCellBreakEscape).toContain('{{break}}');

    const prohibitedSyntax = getSection(reference, 'Prohibited Syntax');
    expect(prohibitedSyntax).toMatch(/raw HTML/i);
    expect(prohibitedSyntax).toMatch(/dangerous URL/i);
    expect(prohibitedSyntax).toMatch(/dangerous props/i);
  });

  it('keeps the Rouault Directive Inventory table synchronized with directive definitions', () => {
    assertDirectiveInventory(readText(referencePath));
  });

  it.each([
    [
      'missing metadata key',
      (source: string) => source.replace(/^\|\s*filename\s*\|[^\n]*\n/mu, ''),
    ],
    [
      'duplicate metadata key',
      (source: string) => source.replace(/^(\|\s*filename\s*\|[^\n]*)$/mu, '$1\n$1'),
    ],
    [
      'incorrect authoring flag',
      (source: string) => source.replace(/(\|\s*filename\s*\|)\s*true(\s*\|)/u, '$1 false$2'),
    ],
    [
      'extra metadata cell',
      (source: string) => source.replace(/^(\|\s*filename\s*\|[^\n]*)$/mu, '$1 extra |'),
    ],
    [
      'missing metadata cell',
      (source: string) => source.replace(/^\|\s*filename\s*\|[^\n]*$/mu, '| filename | true |'),
    ],
  ] as const)('rejects %s', (_name, mutate) => {
    expect(() => assertMetaInventory(mutate(readText(referencePath)))).toThrow();
  });

  it.each([
    ['missing directive', (source: string) => source.replace(/^\|\s*callout\s*\|[^\n]*\n/mu, '')],
    [
      'duplicate directive',
      (source: string) => source.replace(/^(\|\s*callout\s*\|[^\n]*)$/mu, '$1\n$1'),
    ],
    [
      'incorrect directive kind',
      (source: string) => source.replace(/(\|\s*callout\s*\|)\s*container(\s*\|)/u, '$1 leaf$2'),
    ],
    [
      'incorrect child metadata',
      (source: string) =>
        source.replace(/(\|\s*callout\s*\|\s*container\s*\|)\s*true(\s*\|)/u, '$1 false$2'),
    ],
    [
      'incorrect status',
      (source: string) =>
        source.replace(
          /(\|\s*callout\s*\|\s*container\s*\|\s*true\s*\|)\s*recommended-top-level(\s*\|)/u,
          '$1 unknown$2',
        ),
    ],
    [
      'incorrect attribute inventory',
      (source: string) => source.replace('`kind`, `heading`,', '`kind`,'),
    ],
    [
      'extra directive cell',
      (source: string) => source.replace(/^(\|\s*callout\s*\|[^\n]*)$/mu, '$1 extra |'),
    ],
  ] as const)('rejects %s', (_name, mutate) => {
    expect(() => assertDirectiveInventory(mutate(readText(referencePath)))).toThrow();
  });

  it('links the guide, output reference, contract, and docs README to the new reference', () => {
    expect(readText('docs/guides/markdown-authoring.md')).toContain(referencePath);
    expect(readText('docs/references/markdown-output.md')).toContain(referencePath);
    expect(readText('docs/contracts/markdown.md')).toContain(referencePath);

    const docsReadme = readText('docs/README.md');
    expect(docsReadme).toContain(`- \`${referencePath}\``);
  });
});
