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

  for (const key of ['filename', 'label', 'intent', 'show-line-numbers']) {
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
    highlightedCode.properties = {
      ...(highlightedCode.properties ?? {}),
      ...codeNode.properties,
    };
    delete highlightedCode.properties['data-shiki-meta'];
  }

  highlightedPre.properties = {
    ...(highlightedPre.properties ?? {}),
    'data-raw': source,
    lang: language,
  };

  node.tagName = 'pre';
  node.properties = highlightedPre.properties;
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
