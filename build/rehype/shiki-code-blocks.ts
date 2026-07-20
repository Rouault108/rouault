import { codeToHast } from 'shiki';
import {
  transformerMetaHighlight,
  transformerNotationDiff,
  transformerNotationHighlight,
  transformerRemoveNotationEscape,
} from '@shikijs/transformers';

import { createStaticCodeBlockRoot } from './static-code-block-root.js';
import { resolveShikiLanguage } from './shiki-language.js';
import { ROUAULT_SHIKI_THEMES } from './shiki-themes.js';
import { type HastNode } from './hast-utils.js';
import {
  createStaticRenderIdContext,
  type StaticRenderIdContext,
} from '../../shared/static-render-id-context.js';
import { type IconName } from '../../shared/icons/icon-paths.js';

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

const getNodeClassList = (node: HastNode): string[] => [
  ...getClassList(node.properties?.['className']),
  ...getClassList(node.properties?.['class']),
];

const isShikiLineElement = (node: HastNode): boolean =>
  isElement(node, 'span') && getNodeClassList(node).includes('line');

const isLineSeparatorTextNode = (node: HastNode): boolean =>
  node.type === 'text' && typeof node.value === 'string' && /^\n+$/u.test(node.value);

const removeShikiLineSeparatorTextNodes = (codeNode: HastNode): void => {
  if (!Array.isArray(codeNode.children)) {
    return;
  }

  const hasLineElements = codeNode.children.some((child) => isShikiLineElement(child));
  if (!hasLineElements) {
    return;
  }

  codeNode.children = codeNode.children.filter((child) => !isLineSeparatorTextNode(child));
};

const findCodeChild = (preNode: HastNode): HastNode | null => {
  if (!Array.isArray(preNode.children)) {
    return null;
  }

  return preNode.children.find((child) => isElement(child, 'code')) ?? null;
};

const getElementChildren = (node: HastNode): HastNode[] =>
  Array.isArray(node.children) ? node.children.filter((child) => child.type === 'element') : [];

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

const annotateExplicitHighlights = (
  codeNode: HastNode,
  highlightLines: string | undefined,
): void => {
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

const getIntentLabel = (intent: string | undefined): string | undefined => {
  switch (pickOptionalString(intent)?.toLowerCase()) {
    case 'valid':
      return '正しい例';
    case 'invalid':
      return '誤り例';
    default:
      return undefined;
  }
};

const getIntentIconName = (intent: string | undefined): IconName | undefined => {
  switch (pickOptionalString(intent)?.toLowerCase()) {
    case 'valid':
      return 'check-circle';
    case 'invalid':
      return 'triangle-alert';
    default:
      return undefined;
  }
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

const deleteHostOnlyCodeProperties = (properties: Record<string, unknown>): void => {
  const keysToRemove = new Set([
    'data-shiki-meta',
    'filename',
    'label',
    'group-key',
    'tab-label',
    'copy-label',
    'intent',
    'show-line-numbers',
    'copy-mode',
    'copyable',
    'wrap',
    'highlight-lines',
    'layout',
  ]);

  for (const key of Object.keys(properties)) {
    if (keysToRemove.has(key)) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete properties[key];
    }
  }
};

const createStandaloneCodeSurface = (
  preNode: HastNode,
  options: {
    assignHydrationRoot: boolean;
    filename?: string;
    intent?: string;
    language: string;
    source: string;
    copyMode?: string;
    copyable?: string;
    idContext: StaticRenderIdContext;
  },
): HastNode => {
  const intentLabel = getIntentLabel(options.intent);
  const intentIconName = getIntentIconName(options.intent);
  return createStaticCodeBlockRoot({
    idContext: options.idContext,
    preNode,
    source: options.source,
    language: options.language,
    groupOwned: false,
    assignHydrationRoot: options.assignHydrationRoot,
    renderStandaloneCopyButton: true,
    ...(options.filename ? { filename: options.filename } : {}),
    ...(intentLabel ? { intentLabel } : {}),
    ...(intentIconName ? { intentIconName } : {}),
    ...(options.copyMode ? { copyMode: options.copyMode } : {}),
    ...(options.copyable ? { copyable: options.copyable } : {}),
  });
};

interface HighlightCodeBlockResult {
  readonly assignedHydrationRoot: boolean;
}

const highlightCodeBlock = async (
  node: HastNode,
  options: { canAssignHydrationRoot: boolean; idContext: StaticRenderIdContext },
): Promise<HighlightCodeBlockResult> => {
  const codeNode = findCodeChild(node);
  if (!codeNode) {
    return { assignedHydrationRoot: false };
  }

  const source = normalizeLineEndings(getTextContent(codeNode));
  const language = resolveShikiLanguage(readLanguageFromCodeNode(codeNode)).resolvedLanguage;
  const shikiTree = await codeToHast(source, {
    lang: language,
    themes: ROUAULT_SHIKI_THEMES,
    meta: toShikiMeta(codeNode),
    transformers: SHIKI_TRANSFORMERS,
    tabindex: false,
  });
  const highlightedPre = getPreElement(shikiTree as unknown as HastNode);
  if (!highlightedPre) {
    return { assignedHydrationRoot: false };
  }

  const highlightedCode = findCodeChild(highlightedPre);
  if (!highlightedCode) {
    return { assignedHydrationRoot: false };
  }

  const mergedProperties = {
    ...(highlightedCode.properties ?? {}),
    ...(codeNode.properties ?? {}),
  };
  const filename = pickOptionalString(mergedProperties['filename']);
  const label = pickOptionalString(mergedProperties['label']);
  const groupKey = pickOptionalString(mergedProperties['group-key']);
  const tabLabel = pickOptionalString(mergedProperties['tab-label']);
  const copyLabel = pickOptionalString(mergedProperties['copy-label']);
  const intent = pickOptionalString(mergedProperties['intent'])?.toLowerCase();
  const copyMode = pickOptionalString(mergedProperties['copy-mode'])?.toLowerCase();
  const wrap = mergedProperties['wrap'] === true;
  const highlightLines = pickOptionalString(mergedProperties['highlight-lines']);
  const layout = pickOptionalString(mergedProperties['layout'])?.toLowerCase();
  const copyable =
    typeof mergedProperties['copyable'] === 'string' &&
    mergedProperties['copyable'].trim().toLowerCase() === 'false'
      ? 'false'
      : undefined;
  const showLineNumbers = mergedProperties['show-line-numbers'] === true;

  highlightedCode.properties = {
    ...mergedProperties,
    'data-lang': language,
  };

  deleteHostOnlyCodeProperties(highlightedCode.properties);
  removeShikiLineSeparatorTextNodes(highlightedCode);
  annotateExplicitHighlights(highlightedCode, highlightLines);

  const classList = getClassList(highlightedPre.properties?.['className']);
  if (!classList.includes('shiki')) {
    classList.push('shiki');
  }

  highlightedPre.tagName = 'pre';
  highlightedPre.properties = {
    ...(highlightedPre.properties ?? {}),
    className: classList,
    'data-code-block': true,
    'data-code-language': language,
    'data-code-copy-source': source,
    ...(filename ? { 'data-code-filename': filename } : {}),
    ...(label ? { 'data-code-label': label } : {}),
    ...(groupKey ? { 'data-code-group-key': groupKey } : {}),
    ...(tabLabel ? { 'data-code-tab-label': tabLabel } : {}),
    ...(copyLabel ? { 'data-code-copy-label': copyLabel } : {}),
    ...(intent ? { 'data-code-intent': intent } : {}),
    ...(showLineNumbers ? { 'data-code-line-numbers': 'true' } : {}),
    ...(copyMode ? { 'data-code-copy-mode': copyMode } : {}),
    ...(copyable ? { 'data-code-copyable': copyable } : {}),
    ...(wrap ? { 'data-code-wrap': 'true' } : {}),
    ...(highlightLines ? { 'data-code-highlight-lines': highlightLines } : {}),
    ...(layout ? { 'data-code-layout': layout } : {}),
  };

  const isGrouped = groupKey !== undefined;
  const assignHydrationRoot = !isGrouped && options.canAssignHydrationRoot;

  const standaloneSurfaceOptions: Parameters<typeof createStandaloneCodeSurface>[1] = {
    assignHydrationRoot,
    language,
    source,
    ...(filename ? { filename } : {}),
    ...(intent ? { intent } : {}),
    ...(copyMode ? { copyMode } : {}),
    ...(copyable ? { copyable } : {}),
    idContext: options.idContext,
  };

  const replacementNode = isGrouped
    ? highlightedPre
    : createStandaloneCodeSurface(highlightedPre, standaloneSurfaceOptions);

  if (typeof replacementNode.tagName !== 'string') {
    throw new Error('[markdown] standalone code surface replacement must be an element node');
  }

  node.tagName = replacementNode.tagName;
  node.properties = replacementNode.properties ?? {};
  node.children = replacementNode.children ?? [];

  return { assignedHydrationRoot: assignHydrationRoot };
};

const isCodeBlockPre = (node: HastNode): boolean => {
  if (!isElement(node, 'pre')) {
    return false;
  }

  return findCodeChild(node) !== null;
};

export function rehypeShikiCodeBlocks(
  options: { readonly idContext?: StaticRenderIdContext } = {},
) {
  return async (tree: unknown, file?: { path?: string }) => {
    let hydrationRootAssigned = false;
    const idContext =
      options.idContext ??
      createStaticRenderIdContext(file?.path ? `note:${file.path}:shiki` : 'note:shiki');
    const visit = async (node: HastNode): Promise<void> => {
      if (Array.isArray(node.children)) {
        for (const child of node.children) {
          await visit(child);
        }
      }

      if (isCodeBlockPre(node)) {
        const result = await highlightCodeBlock(node, {
          canAssignHydrationRoot: !hydrationRootAssigned,
          idContext,
        });
        if (result.assignedHydrationRoot) {
          hydrationRootAssigned = true;
        }
      }
    };

    if (tree && typeof tree === 'object') {
      await visit(tree as HastNode);
    }
  };
}
