import { type HastNode } from './hast-utils.js';

const CODE_BLOCK_INTENTS = new Set(['neutral', 'valid', 'invalid']);
const HIGHLIGHT_ORIGINS = new Set(['search', 'user']);

interface FootnoteDefinition {
  readonly refId: string;
  readonly index: number;
  readonly contentNodes: HastNode[];
}

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

const pickOptionalString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
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

const isWhitespaceText = (node: HastNode): boolean =>
  node.type === 'text' && (typeof node.value !== 'string' || node.value.trim().length === 0);

const normalizeWhitespace = (value: string): string => value.replace(/\s+/g, ' ').trim();

const toBooleanAttribute = (value: unknown): boolean => {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    return value !== 0;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized === '' || normalized === 'true' || normalized === '1' || normalized === 'on';
  }
  return false;
};

const toPositiveInteger = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const normalized = Math.trunc(value);
    return normalized > 0 ? normalized : null;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }
  return null;
};

const cloneNode = (node: HastNode): HastNode => {
  const clonedNode: HastNode = {};
  if (node.type !== undefined) {
    clonedNode.type = node.type;
  }
  if (node.tagName !== undefined) {
    clonedNode.tagName = node.tagName;
  }
  if (node.value !== undefined) {
    clonedNode.value = node.value;
  }
  if (node.properties !== undefined) {
    clonedNode.properties = { ...node.properties };
  }
  if (Array.isArray(node.children)) {
    clonedNode.children = node.children.map((child) => cloneNode(child));
  }
  return clonedNode;
};

const extractCodeLanguage = (preNode: HastNode): string | null => {
  const codeNode = findCodeChild(preNode);
  if (!codeNode) {
    return null;
  }

  const classList = getClassList(codeNode.properties?.['className']);
  for (const className of classList) {
    if (!className.startsWith('language-')) {
      continue;
    }

    const language = className.slice('language-'.length).trim().toLowerCase();
    if (language.length > 0) {
      return language;
    }
  }

  return null;
};

const isCodeBlockPre = (node: HastNode): boolean => {
  if (!isElement(node, 'pre') || !Array.isArray(node.children)) {
    return false;
  }

  return node.children.some((child) => isElement(child, 'code'));
};

const moveCodeMetaToHost = (preNode: HastNode, hostProperties: Record<string, unknown>): void => {
  const codeNode = findCodeChild(preNode);
  if (!codeNode?.properties) {
    return;
  }

  const codeProperties = codeNode.properties;
  const filename =
    pickOptionalString(codeProperties['filename']) ?? pickOptionalString(codeProperties['title']);
  if (filename) {
    hostProperties['filename'] = filename;
  }

  const label = pickOptionalString(codeProperties['label']);
  if (label) {
    hostProperties['label'] = label;
  }

  const intent = pickOptionalString(codeProperties['intent'])?.toLowerCase();
  if (intent && CODE_BLOCK_INTENTS.has(intent)) {
    hostProperties['intent'] = intent;
  }

  delete codeProperties['title'];
  delete codeProperties['filename'];
  delete codeProperties['label'];
  delete codeProperties['intent'];
};

const toUiCodeBlock = (node: HastNode): void => {
  const originalProperties = node.properties ?? {};
  const originalChildren = Array.isArray(node.children) ? node.children : [];
  const detectedLanguage = extractCodeLanguage(node);

  const hostProperties: Record<string, unknown> = {};
  if (
    typeof originalProperties['lang'] === 'string' &&
    originalProperties['lang'].trim().length > 0
  ) {
    hostProperties['lang'] = originalProperties['lang'].trim().toLowerCase();
  } else if (detectedLanguage !== null) {
    hostProperties['lang'] = detectedLanguage;
  }
  moveCodeMetaToHost(node, hostProperties);

  node.tagName = 'ui-code-block';
  node.properties = hostProperties;
  node.children = [
    {
      type: 'element',
      tagName: 'pre',
      properties: originalProperties,
      children: originalChildren,
    },
  ];
};

const toUiTable = (node: HastNode): void => {
  const originalProperties = node.properties ?? {};
  const originalChildren = Array.isArray(node.children) ? node.children : [];

  const tableChild: HastNode = {
    type: 'element',
    tagName: 'table',
    properties: originalProperties,
    children: originalChildren,
  };

  const caption = originalChildren.find((child) => isElement(child, 'caption'));
  const captionText = caption ? getTextContent(caption).trim() : '';
  const hostProperties: Record<string, unknown> = {};
  if (captionText.length > 0) {
    hostProperties['aria-label'] = captionText;
  }

  node.tagName = 'ui-table';
  node.properties = hostProperties;
  node.children = [tableChild];
};

const toUiDivider = (node: HastNode): void => {
  node.tagName = 'ui-divider';
  node.properties = {};
  node.children = [
    {
      type: 'element',
      tagName: 'hr',
      properties: {},
      children: [],
    },
  ];
};

const isCheckboxInput = (node: HastNode): boolean => {
  if (!isElement(node, 'input')) {
    return false;
  }
  const type = pickOptionalString(node.properties?.['type']);
  return type?.toLowerCase() === 'checkbox';
};

const toUiTaskListItem = (node: HastNode): void => {
  if (!isElement(node, 'li') || !Array.isArray(node.children)) {
    return;
  }

  const children = node.children;
  const checkboxIndex = children.findIndex((child) => isCheckboxInput(child));
  if (checkboxIndex < 0) {
    return;
  }

  const checkboxNode = children[checkboxIndex];
  if (!checkboxNode?.properties) {
    return;
  }

  const nestedListIndex = children.findIndex(
    (child, index) => index > checkboxIndex && (isElement(child, 'ul') || isElement(child, 'ol')),
  );
  const contentEnd = nestedListIndex < 0 ? children.length : nestedListIndex;
  const labelNodes = children.slice(checkboxIndex + 1, contentEnd);
  const label = normalizeWhitespace(labelNodes.map((item) => getTextContent(item)).join(' '));

  const hostProperties: Record<string, unknown> = {};
  if (toBooleanAttribute(checkboxNode.properties['checked'])) {
    hostProperties['checked'] = true;
  }
  if (toBooleanAttribute(checkboxNode.properties['disabled'])) {
    hostProperties['disabled'] = true;
  }
  if (toBooleanAttribute(checkboxNode.properties['required'])) {
    hostProperties['required'] = true;
  }

  const name = pickOptionalString(checkboxNode.properties['name']);
  if (name) {
    hostProperties['name'] = name;
  }
  const value = pickOptionalString(checkboxNode.properties['value']);
  if (value) {
    hostProperties['value'] = value;
  }
  if (label.length > 0) {
    hostProperties['label'] = label;
  }

  const tailChildren = nestedListIndex < 0 ? [] : children.slice(nestedListIndex);
  node.children = [
    {
      type: 'element',
      tagName: 'ui-checkbox',
      properties: hostProperties,
      children: [],
    },
    ...tailChildren,
  ];
};

const toUiSearchHighlight = (node: HastNode): void => {
  if (!isElement(node, 'mark')) {
    return;
  }

  const originalProperties = node.properties ?? {};
  const hostProperties: Record<string, unknown> = {};
  const origin = pickOptionalString(
    originalProperties['origin'] ?? originalProperties['data-origin'],
  )?.toLowerCase();
  if (origin && HIGHLIGHT_ORIGINS.has(origin)) {
    hostProperties['origin'] = origin;
  }

  const current =
    toBooleanAttribute(originalProperties['current']) ||
    toBooleanAttribute(originalProperties['data-current']) ||
    toBooleanAttribute(originalProperties['aria-current']);
  if (current) {
    hostProperties['current'] = true;
  }

  node.tagName = 'ui-search-highlight';
  node.properties = hostProperties;
};

const toUiImage = (node: HastNode): void => {
  if (!isElement(node, 'img')) {
    return;
  }

  const originalProperties = node.properties ?? {};
  const hostProperties: Record<string, unknown> = {};
  const src = pickOptionalString(originalProperties['src']);
  if (src) {
    hostProperties['src'] = src;
  }

  if (typeof originalProperties['alt'] === 'string') {
    hostProperties['alt'] = originalProperties['alt'];
  } else {
    hostProperties['alt'] = '';
  }

  const caption = pickOptionalString(originalProperties['title']);
  if (caption) {
    hostProperties['caption'] = caption;
  }

  const loading = pickOptionalString(originalProperties['loading'])?.toLowerCase();
  if (loading === 'lazy' || loading === 'eager') {
    hostProperties['loading'] = loading;
  }

  const width = toPositiveInteger(originalProperties['width']);
  if (width !== null) {
    hostProperties['width'] = width;
  }
  const height = toPositiveInteger(originalProperties['height']);
  if (height !== null) {
    hostProperties['height'] = height;
  }

  node.tagName = 'ui-image';
  node.properties = hostProperties;
  node.children = [];
};

const toUiFigureImage = (node: HastNode): void => {
  if (!isElement(node, 'figure') || !Array.isArray(node.children)) {
    return;
  }

  let imageNode: HastNode | null = null;
  let captionText = '';

  for (const child of node.children) {
    if (isWhitespaceText(child)) {
      continue;
    }

    if (!imageNode && (isElement(child, 'ui-image') || isElement(child, 'img'))) {
      imageNode = child;
      continue;
    }

    if (captionText.length === 0 && isElement(child, 'figcaption')) {
      captionText = getTextContent(child).trim();
      continue;
    }

    return;
  }

  if (!imageNode) {
    return;
  }

  if (isElement(imageNode, 'img')) {
    toUiImage(imageNode);
  }
  if (!isElement(imageNode, 'ui-image')) {
    return;
  }

  const hostProperties: Record<string, unknown> = { ...(imageNode.properties ?? {}) };
  if (captionText.length > 0 && pickOptionalString(hostProperties['caption']) === undefined) {
    hostProperties['caption'] = captionText;
  }

  node.tagName = 'ui-image';
  node.properties = hostProperties;
  node.children = [];
};

const stripHash = (value: string): string => value.replace(/^#/, '');
const stripUserContentPrefix = (value: string): string => value.replace(/^user-content-/, '');

const normalizeFootnoteId = (value: string, fallbackIndex: number): string => {
  const trimmed = value.trim();
  const raw = stripUserContentPrefix(stripHash(trimmed));
  const compact = raw.replace(/\s+/g, '-');

  const prefixed = /^fn-(\d+)$/.exec(compact);
  if (prefixed) {
    return `fn-${prefixed[1] ?? ''}`;
  }
  const compactFn = /^fn(\d+)$/.exec(compact);
  if (compactFn) {
    return `fn-${compactFn[1] ?? ''}`;
  }
  const numberOnly = /^(\d+)$/.exec(compact);
  if (numberOnly) {
    return `fn-${numberOnly[1] ?? ''}`;
  }

  if (compact.length > 0) {
    return compact;
  }
  return `fn-${String(fallbackIndex)}`;
};

const parseFootnoteIndexFromText = (value: string): number | null => {
  const matched = /(\d+)/.exec(value);
  if (!matched) {
    return null;
  }

  const parsed = Number.parseInt(matched[1] ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const parseFootnoteIndexFromId = (value: string): number | null => {
  const matched = /fn-(\d+)/.exec(value);
  if (!matched) {
    return null;
  }

  const parsed = Number.parseInt(matched[1] ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const hasFootnoteReferenceMarker = (properties: Record<string, unknown>): boolean => {
  if (
    toBooleanAttribute(properties['dataFootnoteRef']) ||
    toBooleanAttribute(properties['data-footnote-ref'])
  ) {
    return true;
  }

  const classList = getClassList(properties['className']);
  return classList.includes('data-footnote-ref');
};

const isFootnoteReferenceAnchor = (node: HastNode, allowHrefFallback: boolean): boolean => {
  if (!isElement(node, 'a')) {
    return false;
  }

  const properties = node.properties ?? {};
  if (hasFootnoteReferenceMarker(properties)) {
    return true;
  }
  if (!allowHrefFallback) {
    return false;
  }

  const href = pickOptionalString(properties['href']);
  if (!href) {
    return false;
  }

  const target = stripUserContentPrefix(stripHash(href));
  return target.startsWith('fn-');
};

const isFootnoteBackrefAnchor = (node: HastNode): boolean => {
  if (!isElement(node, 'a')) {
    return false;
  }

  const properties = node.properties ?? {};
  if (
    toBooleanAttribute(properties['dataFootnoteBackref']) ||
    toBooleanAttribute(properties['data-footnote-backref'])
  ) {
    return true;
  }

  const classList = getClassList(properties['className']);
  if (classList.includes('data-footnote-backref')) {
    return true;
  }

  const href = pickOptionalString(properties['href']);
  if (!href) {
    return false;
  }

  const target = stripUserContentPrefix(stripHash(href));
  return target.startsWith('fnref-');
};

const cloneWithoutFootnoteBackrefs = (node: HastNode): HastNode | null => {
  if (isFootnoteBackrefAnchor(node)) {
    return null;
  }

  const clonedChildren = Array.isArray(node.children)
    ? node.children
        .map((child) => cloneWithoutFootnoteBackrefs(child))
        .filter((child): child is HastNode => child !== null)
    : undefined;

  const clonedNode: HastNode = {};
  if (node.type !== undefined) {
    clonedNode.type = node.type;
  }
  if (node.tagName !== undefined) {
    clonedNode.tagName = node.tagName;
  }
  if (node.value !== undefined) {
    clonedNode.value = node.value;
  }
  if (node.properties !== undefined) {
    clonedNode.properties = { ...node.properties };
  }
  if (clonedChildren !== undefined) {
    clonedNode.children = clonedChildren;
  }

  if (isElement(clonedNode, 'p')) {
    const hasMeaningfulChild = Array.isArray(clonedNode.children)
      ? clonedNode.children.some((child) => !isWhitespaceText(child))
      : false;
    if (!hasMeaningfulChild) {
      return null;
    }
  }

  return clonedNode;
};

const rewriteFootnoteBackrefs = (node: HastNode, index: number): void => {
  if (isFootnoteBackrefAnchor(node)) {
    node.properties ??= {};
    node.properties['href'] = `#fnref-${String(index)}-1`;
  }

  if (!Array.isArray(node.children)) {
    return;
  }
  for (const child of node.children) {
    rewriteFootnoteBackrefs(child, index);
  }
};

const isFootnotesSection = (node: HastNode): boolean => {
  if (!isElement(node, 'section')) {
    return false;
  }

  const classList = getClassList(node.properties?.['className']);
  if (classList.includes('footnotes')) {
    return true;
  }
  return (
    toBooleanAttribute(node.properties?.['dataFootnotes']) ||
    toBooleanAttribute(node.properties?.['data-footnotes'])
  );
};

const collectFootnoteDefinitions = (
  node: HastNode,
  definitions: Map<string, FootnoteDefinition>,
): void => {
  if (isFootnotesSection(node)) {
    node.properties ??= {};
    if (!pickOptionalString(node.properties['role'])) {
      node.properties['role'] = 'doc-endnotes';
    }

    const listNode =
      (node.children ?? []).find((child): child is HastNode => isElement(child, 'ol')) ?? null;
    if (listNode && Array.isArray(listNode.children)) {
      let listIndex = 0;
      for (const item of listNode.children) {
        if (!isElement(item, 'li')) {
          continue;
        }

        listIndex += 1;
        item.properties ??= {};
        const rawId = pickOptionalString(item.properties['id']) ?? `fn-${String(listIndex)}`;
        const refId = normalizeFootnoteId(rawId, listIndex);
        const resolvedIndex = parseFootnoteIndexFromId(refId) ?? listIndex;
        item.properties['id'] = refId;

        rewriteFootnoteBackrefs(item, resolvedIndex);

        if (!definitions.has(refId)) {
          const contentNodes =
            (item.children ?? [])
              .map((child) => cloneWithoutFootnoteBackrefs(child))
              .filter((child): child is HastNode => child !== null);

          definitions.set(refId, {
            refId,
            index: resolvedIndex,
            contentNodes,
          });
        }
      }
    }
  }

  if (!Array.isArray(node.children)) {
    return;
  }
  for (const child of node.children) {
    collectFootnoteDefinitions(child, definitions);
  }
};

const resolveFootnoteReferenceAnchor = (node: HastNode): HastNode | null => {
  if (isElement(node, 'sup') && Array.isArray(node.children)) {
    const candidates = node.children.filter((child) => !isWhitespaceText(child));
    if (candidates.length !== 1) {
      return null;
    }
    const [anchor] = candidates;
    if (!anchor) {
      return null;
    }
    return isFootnoteReferenceAnchor(anchor, true) ? anchor : null;
  }

  return null;
};

const toUiFootnoteReference = (
  node: HastNode,
  definitions: Map<string, FootnoteDefinition>,
  refCounters: Map<string, number>,
): boolean => {
  const anchor = resolveFootnoteReferenceAnchor(node);
  if (!anchor) {
    return false;
  }

  const href = pickOptionalString(anchor.properties?.['href']);
  if (!href) {
    return false;
  }

  const anchorTextIndex = parseFootnoteIndexFromText(getTextContent(anchor));
  const fallbackIndex = anchorTextIndex ?? 1;
  const refId = normalizeFootnoteId(href, fallbackIndex);
  const definition = definitions.get(refId);
  const resolvedIndex = definition?.index ?? parseFootnoteIndexFromId(refId) ?? fallbackIndex;
  const nextInstance = (refCounters.get(refId) ?? 0) + 1;
  refCounters.set(refId, nextInstance);

  const hostProperties: Record<string, unknown> = {
    'ref-id': refId,
    index: String(resolvedIndex),
    'ref-instance': String(nextInstance),
  };
  if (nextInstance > 1) {
    hostProperties['shared'] = true;
  }

  node.tagName = 'ui-footnote';
  node.properties = hostProperties;
  node.children =
    definition && nextInstance === 1
      ? definition.contentNodes.map((contentNode) => cloneNode(contentNode))
      : [];
  return true;
};

/**
 * CommonMark由来の標準要素を Rouault の Web Components へ正規化する。
 */
export function rehypeRouaultComponents() {
  return (tree: unknown) => {
    const footnoteDefinitions = new Map<string, FootnoteDefinition>();
    if (tree && typeof tree === 'object') {
      collectFootnoteDefinitions(tree as HastNode, footnoteDefinitions);
    }
    const footnoteRefCounters = new Map<string, number>();

    const visit = (node: unknown): void => {
      if (!node || typeof node !== 'object') {
        return;
      }

      const current = node as HastNode;
      if (Array.isArray(current.children)) {
        for (const child of current.children) {
          visit(child);
        }
      }

      if (!isElement(current)) {
        return;
      }

      if (isCodeBlockPre(current)) {
        toUiCodeBlock(current);
        return;
      }

      if (isElement(current, 'li')) {
        toUiTaskListItem(current);
        return;
      }

      if (toUiFootnoteReference(current, footnoteDefinitions, footnoteRefCounters)) {
        return;
      }

      if (current.tagName === 'figure') {
        toUiFigureImage(current);
        return;
      }

      if (current.tagName === 'img') {
        toUiImage(current);
        return;
      }

      if (current.tagName === 'mark') {
        toUiSearchHighlight(current);
        return;
      }

      if (current.tagName === 'table') {
        toUiTable(current);
        return;
      }

      if (current.tagName === 'blockquote') {
        current.tagName = 'ui-blockquote';
        return;
      }

      if (current.tagName === 'hr') {
        toUiDivider(current);
      }
    };

    visit(tree);
  };
}
