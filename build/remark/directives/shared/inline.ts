import type { MdastNode, VFileLike } from '../types.js';
import {
  EMOJI_SHORTCODE_MAP,
  INLINE_DIRECTIVE_PATTERN,
  INLINE_EMOJI_SHORTCODE_PATTERN,
  INLINE_HIGHLIGHT_PATTERN,
  INLINE_SUBSCRIPT_PATTERN,
  INLINE_SUPERSCRIPT_PATTERN,
} from './constants.js';
import { appendText, createInlineNode } from './ast.js';
import { parseAttributes, pickOptional } from '../parser-core/parse-attributes.js';
import { assertAllowedAttributes, parseBooleanAttribute } from '../payload/normalize-helpers.js';
import { toError } from './errors.js';

export interface InlineTransformContext {
  readonly insideTableCell: boolean;
  readonly insideTableCellLink: boolean;
}

const defaultInlineTransformContext: InlineTransformContext = {
  insideTableCell: false,
  insideTableCellLink: false,
};

const TABLE_CELL_BREAK_TOKEN = '{{break}}';
const tableCellBreakPattern = /\{\{break\}\}/gu;
const unicodeWhitespacePattern = /\s/u;

export const applyEmojiInlineAttributes = (
  attrs: Record<string, string>,
  node: MdastNode,
  file?: VFileLike,
): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  const allowedKeys = ['label', 'aria-label'] as const;
  assertAllowedAttributes(attrs, allowedKeys, node, file, 'emoji');

  const ariaLabel = pickOptional(attrs['aria-label']) ?? pickOptional(attrs['label']);
  if (ariaLabel) {
    result['role'] = 'img';
    result['aria-label'] = ariaLabel;
  }

  return result;
};

export const applyHighlightInlineAttributes = (
  attrs: Record<string, string>,
  node: MdastNode,
  file?: VFileLike,
): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  const allowedKeys = ['current-match'] as const;
  assertAllowedAttributes(attrs, allowedKeys, node, file, 'highlight');

  const current = parseBooleanAttribute(
    pickOptional(attrs['current-match']),
    node,
    file,
    'highlight',
    'current-match',
  );
  if (current === true) {
    result['data-current-match'] = true;
  }

  return result;
};

export const parseInlineText = (source: string, node: MdastNode, file?: VFileLike): MdastNode[] => {
  const result: MdastNode[] = [];
  let cursor = 0;

  while (cursor < source.length) {
    const rest = source.slice(cursor);

    const directiveMatch = INLINE_DIRECTIVE_PATTERN.exec(rest);
    if (directiveMatch) {
      const full = directiveMatch[0];
      const name = directiveMatch[1] ?? '';
      const text = directiveMatch[2] ?? '';
      const attrSource = directiveMatch[3] ?? '';
      const attrs = parseAttributes(attrSource, node, file);

      if (name === 'emoji') {
        result.push(
          createInlineNode(
            'span',
            text,
            applyEmojiInlineAttributes(attrs, node, file),
            'rouaultInlineEmoji',
          ),
        );
      } else if (name === 'subscript') {
        const allowed: readonly string[] = [];
        assertAllowedAttributes(attrs, allowed, node, file, 'subscript');
        result.push(createInlineNode('sub', text, undefined, 'rouaultInlineSubscript'));
      } else if (name === 'superscript') {
        const allowed: readonly string[] = [];
        assertAllowedAttributes(attrs, allowed, node, file, 'superscript');
        result.push(createInlineNode('sup', text, undefined, 'rouaultInlineSuperscript'));
      } else {
        result.push(
          createInlineNode(
            'mark',
            text,
            applyHighlightInlineAttributes(attrs, node, file),
            'rouaultInlineHighlight',
          ),
        );
      }

      cursor += full.length;
      continue;
    }

    const emojiMatch = INLINE_EMOJI_SHORTCODE_PATTERN.exec(rest);
    if (emojiMatch) {
      const full = emojiMatch[0];
      const shortcode = (emojiMatch[1] ?? '').toLowerCase();
      const emoji = EMOJI_SHORTCODE_MAP[shortcode];
      if (emoji) {
        appendText(result, emoji);
        cursor += full.length;
        continue;
      }
    }

    const highlightMatch = INLINE_HIGHLIGHT_PATTERN.exec(rest);
    if (highlightMatch) {
      const text = highlightMatch[1] ?? '';
      result.push(createInlineNode('mark', text, undefined, 'rouaultInlineHighlight'));
      cursor += highlightMatch[0].length;
      continue;
    }

    if (rest.startsWith('^')) {
      const superscriptMatch = INLINE_SUPERSCRIPT_PATTERN.exec(rest);
      if (superscriptMatch) {
        const text = superscriptMatch[1] ?? '';
        result.push(createInlineNode('sup', text, undefined, 'rouaultInlineSuperscript'));
        cursor += superscriptMatch[0].length;
        continue;
      }
    }

    if (rest.startsWith('~') && !rest.startsWith('~~')) {
      const subscriptMatch = INLINE_SUBSCRIPT_PATTERN.exec(rest);
      if (subscriptMatch) {
        const text = subscriptMatch[1] ?? '';
        result.push(createInlineNode('sub', text, undefined, 'rouaultInlineSubscript'));
        cursor += subscriptMatch[0].length;
        continue;
      }
    }

    appendText(result, rest.charAt(0));
    cursor += 1;
  }

  return result;
};

const createTableCellBreakNode = (): MdastNode => ({
  type: 'rouaultInlineTableCellBreak',
  data: {
    hName: 'br',
    hProperties: {
      'data-table-cell-break': 'true',
    },
  },
});

const hasWhitespaceAdjacentBreak = (source: string, index: number): boolean => {
  const before = index > 0 ? source.charAt(index - 1) : '';
  const afterIndex = index + TABLE_CELL_BREAK_TOKEN.length;
  const after = afterIndex < source.length ? source.charAt(afterIndex) : '';

  return unicodeWhitespacePattern.test(before) || unicodeWhitespacePattern.test(after);
};

const transformTableCellBreakText = (
  source: string,
  node: MdastNode,
  file: VFileLike | undefined,
  context: InlineTransformContext,
): MdastNode[] | null => {
  tableCellBreakPattern.lastIndex = 0;
  const firstMatch = tableCellBreakPattern.exec(source);
  if (!firstMatch) {
    return null;
  }

  if (!context.insideTableCell) {
    throw toError(file, node, '{{break}} は table cell 内でのみ使用できます');
  }

  if (context.insideTableCellLink) {
    throw toError(file, node, '{{break}} は table cell 内の link では使用できません');
  }

  const result: MdastNode[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null = firstMatch;

  while (match) {
    const index = match.index;
    const afterIndex = index + TABLE_CELL_BREAK_TOKEN.length;

    if (hasWhitespaceAdjacentBreak(source, index)) {
      throw toError(file, node, '{{break}} の隣に whitespace は置けません');
    }

    if (source.startsWith(TABLE_CELL_BREAK_TOKEN, afterIndex)) {
      throw toError(file, node, '{{break}} は連続して配置できません');
    }

    result.push(...parseInlineText(source.slice(cursor, index), node, file));
    result.push(createTableCellBreakNode());
    cursor = afterIndex;
    match = tableCellBreakPattern.exec(source);
  }

  result.push(...parseInlineText(source.slice(cursor), node, file));
  return result;
};

export const extractNodeSource = (node: MdastNode, file?: VFileLike): string | null => {
  if (typeof file?.value !== 'string') {
    return null;
  }

  const startOffset = node.position?.start?.offset;
  const endOffset = node.position?.end?.offset;
  if (typeof startOffset !== 'number' || typeof endOffset !== 'number') {
    return null;
  }

  if (startOffset < 0 || endOffset < startOffset || endOffset > file.value.length) {
    return null;
  }

  return file.value.slice(startOffset, endOffset);
};

export const isSingleTildeWrapped = (source: string): boolean =>
  source.startsWith('~') &&
  !source.startsWith('~~') &&
  source.endsWith('~') &&
  !source.endsWith('~~');

export const transformInlineTextNode = (
  node: MdastNode,
  file?: VFileLike,
  context: InlineTransformContext = defaultInlineTransformContext,
): MdastNode[] => {
  if (node.type !== 'text' || typeof node.value !== 'string') {
    if (node.type === 'delete') {
      const source = extractNodeSource(node, file);
      if (source && isSingleTildeWrapped(source)) {
        return [
          {
            type: 'rouaultInlineSubscript',
            data: { hName: 'sub' },
            children: node.children ?? [],
          },
        ];
      }
    }

    return [node];
  }

  return (
    transformTableCellBreakText(node.value, node, file, context) ??
    parseInlineText(node.value, node, file)
  );
};

const hasNonWhitespaceText = (value: string | undefined): boolean =>
  typeof value === 'string' && value.trim().length > 0;

const collectTableCellInlineMarkers = (
  nodes: readonly MdastNode[],
  result: ('break' | 'meaningful')[],
): void => {
  for (const node of nodes) {
    if (node.type === 'rouaultInlineTableCellBreak') {
      result.push('break');
      continue;
    }

    if (node.type === 'text' && hasNonWhitespaceText(node.value)) {
      result.push('meaningful');
      continue;
    }

    if (node.type === 'inlineCode' && hasNonWhitespaceText(node.value)) {
      result.push('meaningful');
      continue;
    }

    if (node.type === 'image') {
      continue;
    }

    if (Array.isArray(node.children)) {
      collectTableCellInlineMarkers(node.children, result);
    }
  }
};

export const validateTableCellBreakPlacement = (node: MdastNode, file?: VFileLike): void => {
  const markers: ('break' | 'meaningful')[] = [];
  collectTableCellInlineMarkers(node.children ?? [], markers);

  for (const [index, marker] of markers.entries()) {
    if (marker !== 'break') {
      continue;
    }

    const hasBefore = markers.slice(0, index).includes('meaningful');
    const hasAfter = markers.slice(index + 1).includes('meaningful');
    if (!hasBefore || !hasAfter) {
      throw toError(file, node, '{{break}} は table cell の実質先頭または実質末尾に配置できません');
    }
  }
};
