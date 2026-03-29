import { bundledLanguages, bundledLanguagesAlias, codeToHast, type BundledLanguage } from 'shiki';
import {
  transformerMetaHighlight,
  transformerNotationDiff,
  transformerNotationHighlight,
  transformerRemoveNotationEscape,
} from '@shikijs/transformers';

import { type HastNode } from './hast-utils.js';

const SHIKI_THEMES = {
  light: 'github-light',
  dark: 'github-dark',
} as const;

const SHIKI_TRANSFORMERS = [
  transformerMetaHighlight(),
  transformerNotationHighlight(),
  transformerNotationDiff(),
  transformerRemoveNotationEscape(),
];

const isElement = (node: HastNode, tagName?: string): boolean => {
  if (node.type !== 'element' || typeof node.tagName !== 'string') {
    return false;
  }

  if (typeof tagName === 'string') {
    return node.tagName === tagName;
  }

  return true;
};

const getClassList = (value: unknown): string[] => {
  if (typeof value === 'string') {
    return value.split(/\s+/).filter((item) => item.length > 0);
  }

  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string' && item.length > 0);
  }

  return [];
};

const findCodeChild = (preNode: HastNode): HastNode | null => {
  if (!Array.isArray(preNode.children)) {
    return null;
  }

  return preNode.children.find((child) => isElement(child, 'code')) ?? null;
};

const getElementChildren = (node: HastNode): HastNode[] =>
  Array.isArray(node.children)
    ? node.children.filter((child) => child.type === 'element')
    : [];

const getTextContent = (node: HastNode): string => {
  if (node.type === 'text') {
    return typeof node.value === 'string' ? node.value : '';
  }

  if (!Array.isArray(node.children)) {
    return '';
  }

  return node.children.map((child) => getTextContent(child)).join('');
};

const pickOptionalString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const setOptionalProperty = (
  properties: Record<string, unknown>,
  key: string,
  value: string | undefined,
): void => {
  if (value !== undefined) {
    properties[key] = value;
  }
};

const parseHighlightLines = (value: string | undefined): Set<number> => {
  if (!value) {
    return new Set<number>();
  }

  const lines = new Set<number>();
  const tokens = value
    .split(',')
    .map((token) => token.trim())
    .filter((token) => token.length > 0);

  for (const token of tokens) {
    const rangeMatch = /^(\d+)-(\d+)$/.exec(token);
    if (rangeMatch) {
      const start = Number.parseInt(rangeMatch[1] ?? '', 10);
      const end = Number.parseInt(rangeMatch[2] ?? '', 10);
      if (!Number.isFinite(start) || !Number.isFinite(end) || start <= 0 || end < start) {
        continue;
      }

      for (let index = start; index <= end; index += 1) {
        lines.add(index);
      }
      continue;
    }

    const single = Number.parseInt(token, 10);
    if (Number.isFinite(single) && single > 0) {
      lines.add(single);
    }
  }

  return lines;
};

const addLineClass = (lineNode: HastNode, className: string): void => {
  const existing = getClassList(lineNode.properties?.['className']);
  if (existing.includes(className)) {
    return;
  }

  lineNode.properties = {
    ...(lineNode.properties ?? {}),
    className: [...existing, className],
  };
};

const annotateExplicitHighlights = (codeNode: HastNode, highlightLines: string | undefined): void => {
  const explicitLines = parseHighlightLines(highlightLines);
  if (explicitLines.size === 0) {
    return;
  }

  const lineNodes = getElementChildren(codeNode).filter((child) => child.tagName === 'span');
  lineNodes.forEach((lineNode, index) => {
    if (!explicitLines.has(index + 1)) {
      return;
    }

    addLineClass(lineNode, 'ui-explicit-highlight');
  });
};

const resolveLanguage = (language: string | undefined): string => {
  if (!language) {
    return 'text';
  }

  const normalized = language.trim().toLowerCase();
  if (normalized === '') {
    return 'text';
  }

  if (normalized in bundledLanguages) {
    return normalized;
  }

  const aliased = bundledLanguagesAlias[normalized as keyof typeof bundledLanguagesAlias];
  if (typeof aliased === 'string' && aliased in bundledLanguages) {
    return aliased;
  }

  return 'text';
};

const readLanguageFromCodeNode = (codeNode: HastNode): string | undefined => {
  const classList = getClassList(codeNode.properties?.['className']);
  for (const className of classList) {
    if (!className.startsWith('language-')) {
      continue;
    }

    const detected = className.slice('language-'.length).trim().toLowerCase();
    if (detected !== '') {
      return detected;
    }
  }

  return undefined;
};

const getPreElement = (tree: HastNode): HastNode | null => {
  if (!Array.isArray(tree.children)) {
    return null;
  }

  return tree.children.find((child) => isElement(child, 'pre')) ?? null;
};

const toShikiMeta = (codeNode: HastNode): Record<string, unknown> => {
  const properties = codeNode.properties ?? {};
  const meta: Record<string, unknown> = {};
  const rawMeta = pickOptionalString(properties['data-shiki-meta']);

  if (rawMeta) {
    meta['__raw'] = rawMeta;
  }

  for (const key of [
    'filename',
    'label',
    'intent',
    'show-line-numbers',
    'copy-mode',
    'group-key',
    'tab-label',
    'copy-label',
    'copyable',
    'wrap',
    'highlight-lines',
    'layout',
  ]) {
    const value = properties[key];
    if (value === undefined) {
      continue;
    }

    meta[key] = value;
  }

  return meta;
};

const normalizeLineEndings = (value: string): string =>
  value.replace(/\r\n?/g, '\n').replace(/\n$/, '');

const highlightCodeBlock = async (node: HastNode): Promise<void> => {
  const codeNode = findCodeChild(node);
  if (!codeNode) {
    return;
  }

  const source = normalizeLineEndings(getTextContent(codeNode));
  const language = resolveLanguage(readLanguageFromCodeNode(codeNode));
  const shikiTree = await codeToHast(source, {
    lang: language as BundledLanguage | 'text',
    themes: SHIKI_THEMES,
    meta: toShikiMeta(codeNode),
    transformers: SHIKI_TRANSFORMERS,
    tabindex: false,
  });
  const highlightedPre = getPreElement(shikiTree as unknown as HastNode);
  if (!highlightedPre) {
    return;
  }

  const highlightedCode = findCodeChild(highlightedPre);
  if (highlightedCode) {
    const mergedProperties = {
      ...(highlightedCode.properties ?? {}),
      ...codeNode.properties,
    };
    const filename = pickOptionalString(mergedProperties['filename']);
    const label = pickOptionalString(mergedProperties['label']);
    const groupKey = pickOptionalString(mergedProperties['group-key']);
    const tabLabel = pickOptionalString(mergedProperties['tab-label']);
    const copyLabel = pickOptionalString(mergedProperties['copy-label']);
    const intent = pickOptionalString(mergedProperties['intent'])?.toLowerCase();
    const copyMode = pickOptionalString(mergedProperties['copy-mode'])?.toLowerCase();
    const wrap = mergedProperties['wrap'] === true ? 'true' : undefined;
    const highlightLines = pickOptionalString(mergedProperties['highlight-lines']);
    const layout = pickOptionalString(mergedProperties['layout'])?.toLowerCase();
    const copyable =
      typeof mergedProperties['copyable'] === 'string' &&
      mergedProperties['copyable'].trim().toLowerCase() === 'false'
        ? 'false'
        : undefined;
    const lineNumbers = mergedProperties['show-line-numbers'] === true ? 'true' : undefined;

    highlightedCode.properties = {
      ...mergedProperties,
      'data-lang': language,
    };

    delete highlightedCode.properties['data-shiki-meta'];
    delete highlightedCode.properties['filename'];
    delete highlightedCode.properties['label'];
    delete highlightedCode.properties['group-key'];
    delete highlightedCode.properties['tab-label'];
    delete highlightedCode.properties['copy-label'];
    delete highlightedCode.properties['intent'];
    delete highlightedCode.properties['show-line-numbers'];
    delete highlightedCode.properties['copy-mode'];
    delete highlightedCode.properties['copyable'];
    delete highlightedCode.properties['wrap'];
    delete highlightedCode.properties['highlight-lines'];
    delete highlightedCode.properties['layout'];

    annotateExplicitHighlights(highlightedCode, highlightLines);

    highlightedPre.properties = {
      ...(highlightedPre.properties ?? {}),
      'data-code-block': true,
      'data-code-language': language,
      'data-code-raw': source,
      ...(intent ? { 'data-code-intent': intent } : {}),
      ...(lineNumbers ? { 'data-code-line-numbers': lineNumbers } : {}),
      ...(copyMode ? { 'data-code-copy-mode': copyMode } : {}),
      ...(wrap ? { 'data-code-wrap': wrap } : {}),
      ...(highlightLines ? { 'data-code-highlight-lines': highlightLines } : {}),
      ...(layout ? { 'data-code-layout': layout } : {}),
      ...(copyable ? { 'data-code-copyable': copyable } : {}),
    };
    setOptionalProperty(highlightedPre.properties, 'data-code-filename', filename);
    setOptionalProperty(highlightedPre.properties, 'data-code-label', label);
    setOptionalProperty(highlightedPre.properties, 'data-code-group-key', groupKey);
    setOptionalProperty(highlightedPre.properties, 'data-code-tab-label', tabLabel);
    setOptionalProperty(highlightedPre.properties, 'data-code-copy-label', copyLabel);
  }

  node.tagName = 'pre';
  node.properties = highlightedPre.properties ?? {};
  node.children = highlightedPre.children ?? [];
};

const isCodeBlockPre = (node: HastNode): boolean => {
  if (!isElement(node, 'pre')) {
    return false;
  }

  return findCodeChild(node) !== null;
};

/**
 * fenced code block を Shiki の build-time 出力へ置換する。
 */
export function rehypeShikiCodeBlocks() {
  return async (tree: unknown) => {
    const visit = async (node: HastNode): Promise<void> => {
      if (Array.isArray(node.children)) {
        for (const child of node.children) {
          await visit(child);
        }
      }

      if (isCodeBlockPre(node)) {
        await highlightCodeBlock(node);
      }
    };

    if (tree && typeof tree === 'object') {
      await visit(tree as HastNode);
    }
  };
}
