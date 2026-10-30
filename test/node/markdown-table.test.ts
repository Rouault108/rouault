import { describe, expect, it } from 'vitest';
import {
  findMarkdownTableRow,
  getMarkdownSection,
  parseMarkdownTable,
} from '../helpers/markdown-table.js';

const headers = ['Key', 'Value'];
const table = '| Key | Value |\n| --- | --- |\n| `target` | 24px |\n';

describe('document table contracts', () => {
  it.each([
    table,
    table.replace(/\n/gu, '\r\n'),
    '|Key|Value|\n|---------|-----|\n|`target`|24px|\n',
    '| Key      | Value |\n| -------- | ----- |\n| `target` | 24px  |\n',
  ])('accepts padding and unaligned separator widths', (source) => {
    expect(findMarkdownTableRow(parseMarkdownTable(source, headers), 'Key', 'target')).toEqual({
      Key: 'target',
      Value: '24px',
    });
  });

  it.each([
    '| Value | Key |\n| --- | --- |\n| 24px | target |\n',
    '| Key | Key |\n| --- | --- |\n| target | 24px |\n',
    '| Key | Value | Extra |\n| --- | --- | --- |\n| target | 24px | x |\n',
    '| Key |\n| --- |\n| target |\n',
    table.replace('| `target` | 24px |', '| `target` | 24px | extra |'),
    table.replace('| `target` | 24px |', '| `target` |'),
    table.replace('| `target` | 24px |', '| | 24px |'),
    table.replace('| `target` | 24px |', '| `target` | |'),
    table + '| `target` | 25px |\n',
    table.replace('| --- | --- |', '| :--- | ---: |'),
    table.replace('| --- | --- |', '| -- | --- |'),
    '| Key | Value |\n| --- | --- |\n',
    '```md\n' + table + '```\n',
    '~~~markdown\n' + table + '~~~\n',
    '| Key | Value |\n| --- |\n\n' + table,
  ])('rejects malformed, ambiguous or fenced tables', (source) => {
    expect(() => parseMarkdownTable(source, headers)).toThrow();
  });

  it('uses the first real table, and never a later matching table', () => {
    const wrong = '| Wrong | Value |\n| --- | --- |\n| target | 24px |\n';
    expect(() => parseMarkdownTable(wrong + '\n' + table, headers)).toThrow();
    const source = '```md\n' + wrong + '```\n\n' + table;
    expect(parseMarkdownTable(source, headers).rows).toHaveLength(1);
  });

  it('respects section boundaries and ignores headings inside code fences', () => {
    const source = '```md\n## Target\n' + table + '```\n\n## Target\n' + table + '\n## Next\n';
    expect(parseMarkdownTable(getMarkdownSection(source, 'Target'), headers).rows).toHaveLength(1);
    expect(() => getMarkdownSection('```md\n## Target\n' + table + '```\n', 'Target')).toThrow();
    expect(() => getMarkdownSection('## Target\n## Target\n' + table, 'Target')).toThrow();
    expect(() =>
      parseMarkdownTable(getMarkdownSection('## Target\n\n## Next\n' + table, 'Target'), headers),
    ).toThrow();
  });

  it('requires the requested key exactly once and preserves escaped pipe values', () => {
    const parsed = parseMarkdownTable(
      '| Key | Value |\n| --- | --- |\n| target | `a\\|b` |\n',
      headers,
    );
    expect(findMarkdownTableRow(parsed, 'Key', 'target')['Value']).toBe('a|b');
    expect(() => findMarkdownTableRow(parsed, 'Key', 'missing')).toThrow();
    const repeatedValue = parseMarkdownTable(table + '| another | 24px |\n', headers);
    expect(() => findMarkdownTableRow(repeatedValue, 'Value', '24px')).toThrow();
  });
});
