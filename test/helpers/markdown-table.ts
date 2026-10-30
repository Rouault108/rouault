import type { Nodes } from 'mdast';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import { unified } from 'unified';

const parser = unified().use(remarkParse).use(remarkGfm, { singleTilde: false });

export interface MarkdownTable {
  readonly headers: readonly string[];
  readonly rows: readonly Record<string, string>[];
}

const nodeText = (node: Nodes): string => {
  if ('value' in node) return node.value;
  if ('children' in node) return node.children.map(nodeText).join('');
  return '';
};

export const getMarkdownSection = (source: string, heading: string): string => {
  const nodes = parser.parse(source).children;
  const matches = nodes.filter((node) => node.type === 'heading' && nodeText(node) === heading);
  const marker = matches[0];
  if (matches.length !== 1 || marker?.type !== 'heading') {
    throw new Error(`${heading}: section must exist exactly once outside code fences`);
  }
  const start = marker.position?.end.offset;
  const next = nodes
    .slice(nodes.indexOf(marker) + 1)
    .find((node) => node.type === 'heading' && node.depth <= marker.depth);
  if (start === undefined) throw new Error(`${heading}: section position is missing`);
  return source.slice(start, next?.position?.start.offset ?? source.length);
};

export const parseMarkdownTable = (
  source: string,
  expectedHeaders: readonly string[],
): MarkdownTable => {
  // 不正な先頭表を捨てて後続の表で合格させず、code fence内の例示は対象にしない。
  const first = parser.parse(source).children.find((node) => {
    if (node.type === 'table') return true;
    const raw = source.slice(node.position?.start.offset, node.position?.end.offset);
    return node.type === 'paragraph' && raw.trimStart().startsWith('|');
  });
  if (first?.type !== 'table') throw new Error('first Markdown table is missing or malformed');

  const header = first.children[0];
  if (!header) throw new Error('table header is missing');
  const headers = header.children.map((cell) => nodeText(cell).trim());
  if (
    headers.length !== expectedHeaders.length ||
    headers.some((name, index) => name !== expectedHeaders[index]) ||
    headers.some((name) => name === '') ||
    new Set(headers).size !== headers.length
  ) {
    throw new Error('table headers must match the required order and column count');
  }

  const headerEndLine = header.position?.end.line;
  const delimiter = headerEndLine === undefined ? '' : source.split(/\r?\n/u)[headerEndLine];
  const separators = (delimiter ?? '')
    .trim()
    .replace(/^\|/u, '')
    .replace(/\|$/u, '')
    .split('|')
    .map((cell) => cell.trim());
  // 配置指定なしという既存規約は保ち、formatterによるハイフン長とpaddingだけを許す。
  if (
    separators.length !== headers.length ||
    separators.some((cell) => !/^-{3,}$/u.test(cell)) ||
    first.align?.some((alignment) => alignment !== null)
  ) {
    throw new Error('table separators require at least three hyphens without alignment');
  }
  if (first.children.length < 2) throw new Error('table must contain a data row');

  const keys = new Set<string>();
  const rows = first.children.slice(1).map((row) => {
    const cells = row.children.map((cell) => nodeText(cell).trim());
    if (cells.length !== headers.length) throw new Error('table row column count is incorrect');
    if (cells.some((cell) => cell === '')) throw new Error('table cells must not be empty; use none for absence');
    const key = cells[0];
    if (key === undefined || key === '' || keys.has(key)) {
      throw new Error('table row keys must be nonempty and unique');
    }
    keys.add(key);
    return Object.fromEntries(headers.map((name, index) => [name, cells[index] ?? '']));
  });
  return { headers, rows };
};

export const findMarkdownTableRow = (
  table: MarkdownTable,
  column: string,
  value: string,
): Record<string, string> => {
  if (!table.headers.includes(column)) throw new Error(`unknown table column: ${column}`);
  const matches = table.rows.filter((row) => row[column] === value);
  const row = matches[0];
  if (matches.length !== 1 || !row) throw new Error(`${value}: table row must exist exactly once`);
  return row;
};
