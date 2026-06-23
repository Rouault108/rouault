import { pickOptional } from '../parser-core/parse-attributes.js';
import { toError } from '../shared/errors.js';
import type { MdastNode, VFileLike } from '../types.js';
import type { TableColumnWidth, TablePayload } from './payload-types.js';

const allowedColumnWidths = ['auto', 'fit', 'narrow', 'medium', 'wide', 'numeric'] as const;

const parseColumnWidths = (
  value: string | undefined,
  node: MdastNode,
  file?: VFileLike,
): readonly TableColumnWidth[] | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (value.includes(',')) {
    throw toError(file, node, 'table の column-widths は空白区切りで指定してください');
  }

  const normalized = pickOptional(value);
  if (!normalized) {
    throw toError(file, node, 'table の column-widths に空値は指定できません');
  }

  const allowed = new Set<string>(allowedColumnWidths);
  const tokens = normalized.split(/\s+/u);

  for (const token of tokens) {
    if (!allowed.has(token)) {
      throw toError(
        file,
        node,
        `table の column-widths は ${allowedColumnWidths.join('/')} のみ指定可能です`,
      );
    }
  }

  return tokens as readonly TableColumnWidth[];
};

export const normalizeTablePayload = (
  attrs: Record<string, string>,
  node: MdastNode,
  file?: VFileLike,
): TablePayload => ({
  kind: 'table',
  columnWidths: parseColumnWidths(attrs['column-widths'], node, file),
});
