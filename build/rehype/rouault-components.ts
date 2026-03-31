import {
  resolveImageAsset,
  serializeMediaSources,
  type ResolvedImageAsset,
} from '../media/image-resolver.js';
import { type HastNode } from './hast-utils.js';

interface FootnoteDefinition {
  readonly refId: string;
  readonly index: number;
  readonly contentNodes: HastNode[];
  readonly itemNode: HastNode;
}

interface VFileLike {
  path?: string;
}

interface ImageNormalizationContext {
  eagerImageCount: number;
}

interface HydrationDirective {
  readonly capability: 'progressive' | 'interactive' | 'sandboxed';
  readonly trigger: 'initial' | 'post-commit' | 'visible' | 'interaction';
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

const setHydrationDirective = (node: HastNode, directive: HydrationDirective): void => {
  const properties = node.properties ?? {};
  if (properties['data-hydration-capability'] === undefined) {
    properties['data-hydration-capability'] = directive.capability;
  }
  if (properties['data-hydration-trigger'] === undefined) {
    properties['data-hydration-trigger'] = directive.trigger;
  }
  node.properties = properties;
};

const hasToolbarSlot = (node: HastNode): boolean =>
  Array.isArray(node.children) &&
  node.children.some(
    (child) =>
      isElement(child) &&
      typeof child.properties?.['slot'] === 'string' &&
      child.properties['slot'] === 'toolbar',
  );

const resolveHydrationDirective = (node: HastNode): HydrationDirective | null => {
  switch (node.tagName) {
    case 'layout-sidebar':
    case 'layout-toc':
    case 'ui-checkbox':
    case 'ui-code-group':
    case 'ui-details':
    case 'ui-footnote':
    case 'ui-tabs':
      return { capability: 'interactive', trigger: 'initial' };

    case 'ui-blockquote':
    case 'ui-callout':
    case 'ui-card':
    case 'ui-code-block':
    case 'ui-info-box':
    case 'ui-table':
      return { capability: 'progressive', trigger: 'initial' };

    case 'ui-code-preview': {
      const controls = pickOptionalString(node.properties?.['controls']);
      if (controls || hasToolbarSlot(node)) {
        return { capability: 'interactive', trigger: 'visible' };
      }
      return null;
    }

    case 'ui-translation':
      return { capability: 'interactive', trigger: 'visible' };

    case 'ui-preview-sandbox':
      return { capability: 'sandboxed', trigger: 'interaction' };

    case 'ui-score':
      return { capability: 'progressive', trigger: 'visible' };

    case 'ui-image': {
      const zoomable = node.properties?.['zoomable'];
      if (zoomable === 'false' || zoomable === false) {
        return null;
      }
      return { capability: 'progressive', trigger: 'visible' };
    }

    default:
      return null;
  }
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

const normalizeDivider = (node: HastNode): void => {
  if (!isElement(node, 'hr')) {
    return;
  }

  const properties = node.properties ?? {};
  if (pickOptionalString(properties['data-divider-variant']) === undefined) {
    properties['data-divider-variant'] = 'section';
  }
  node.properties = properties;
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

  const checkboxHost = node.children[0];
  if (checkboxHost && isElement(checkboxHost, 'ui-checkbox')) {
    setHydrationDirective(checkboxHost, { capability: 'interactive', trigger: 'initial' });
  }
};

const normalizeHighlightMark = (node: HastNode): void => {
  if (!isElement(node, 'mark')) {
    return;
  }

  const properties = {
    ...(node.properties ?? {}),
  };
  const current =
    toBooleanAttribute(properties['current-match']) ||
    toBooleanAttribute(properties['data-current-match']) ||
    toBooleanAttribute(properties['current']) ||
    toBooleanAttribute(properties['data-current']) ||
    toBooleanAttribute(properties['aria-current']);

  delete properties['current-match'];
  delete properties['current'];
  delete properties['data-current'];
  delete properties['aria-current'];

  if (current) {
    properties['data-current-match'] = 'true';
  } else {
    delete properties['data-current-match'];
  }

  node.properties = properties;
};

const applyResolvedImageProperties = (
  hostProperties: Record<string, unknown>,
  resolvedAsset: ResolvedImageAsset,
): void => {
  hostProperties['src'] = resolvedAsset.inline.src;
  if (resolvedAsset.inline.srcset) {
    hostProperties['srcset'] = resolvedAsset.inline.srcset;
  }
  if (resolvedAsset.inline.sizes) {
    hostProperties['sizes'] = resolvedAsset.inline.sizes;
  }
  if (resolvedAsset.inline.sources.length > 0) {
    hostProperties['sources'] = serializeMediaSources(resolvedAsset.inline.sources);
  }

  hostProperties['lightbox-src'] = resolvedAsset.lightbox.src;
  if (resolvedAsset.lightbox.srcset) {
    hostProperties['lightbox-srcset'] = resolvedAsset.lightbox.srcset;
  }
  if (resolvedAsset.lightbox.sizes) {
    hostProperties['lightbox-sizes'] = resolvedAsset.lightbox.sizes;
  }
  if (resolvedAsset.lightbox.sources.length > 0) {
    hostProperties['lightbox-sources'] = serializeMediaSources(resolvedAsset.lightbox.sources);
  }

  if (typeof resolvedAsset.width === 'number') {
    hostProperties['width'] = resolvedAsset.width;
  }
  if (typeof resolvedAsset.height === 'number') {
    hostProperties['height'] = resolvedAsset.height;
  }
  if (resolvedAsset.placeholder) {
    hostProperties['placeholder'] = resolvedAsset.placeholder;
  }
};

const toUiImage = (
  node: HastNode,
  context: ImageNormalizationContext,
  file?: VFileLike,
): void => {
  if (!isElement(node, 'img')) {
    return;
  }

  const originalProperties = node.properties ?? {};
  const hostProperties: Record<string, unknown> = {};
  const sourcePath = pickOptionalString(originalProperties['src']);
  if (sourcePath) {
    const resolvedAsset = resolveImageAsset(sourcePath, {
      inlineVariant: 'reading',
      lightboxVariant: 'full',
      inlineSizes: '(min-width: 768px) min(100vw - 4rem, 1200px), 100vw',
      lightboxSizes: '100vw',
    });
    applyResolvedImageProperties(hostProperties, resolvedAsset);
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
    if (loading === 'eager') {
      if (context.eagerImageCount >= 1) {
        const sourceLabel = file?.path ? `${file.path}: ` : '';
        throw new Error(
          `[markdown] ${sourceLabel}本文画像で loading="eager" を許可できるのは LCP 候補 1 枚だけです`,
        );
      }
      context.eagerImageCount += 1;
    }
    hostProperties['loading'] = loading;
  }

  if (Object.hasOwn(originalProperties, 'zoomable')) {
    hostProperties['zoomable'] = toBooleanAttribute(originalProperties['zoomable'])
      ? 'true'
      : 'false';
  }

  node.tagName = 'ui-image';
  node.properties = hostProperties;
  node.children = [];
};

const toUiFigureImage = (
  node: HastNode,
  context: ImageNormalizationContext,
  file?: VFileLike,
): void => {
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
    toUiImage(imageNode, context, file);
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
  return /-ref-\d+$/.test(target);
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

const createFootnoteBackrefAnchor = (refId: string, refInstance: number): HastNode => ({
  type: 'element',
  tagName: 'a',
  properties: {
    href: `#${refId}-ref-${String(refInstance)}`,
    role: 'doc-backlink',
    'data-footnote-backref': true,
    'aria-label': `脚注参照 ${String(refInstance)} に戻る`,
  },
  children: [
    {
      type: 'text',
      value: refInstance === 1 ? '↩︎' : `↩︎${String(refInstance)}`,
    },
  ],
});

const synchronizeFootnoteBackrefs = (
  definitions: Map<string, FootnoteDefinition>,
  refCounters: Map<string, number>,
): void => {
  for (const definition of definitions.values()) {
    const refCount = refCounters.get(definition.refId) ?? 1;
    definition.itemNode.children = definition.contentNodes.map((contentNode) => cloneNode(contentNode));

    for (let refInstance = 1; refInstance <= refCount; refInstance += 1) {
      definition.itemNode.children.push({
        type: 'text',
        value: ' ',
      });
      definition.itemNode.children.push(createFootnoteBackrefAnchor(definition.refId, refInstance));
    }
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

        if (!definitions.has(refId)) {
          const contentNodes = (item.children ?? [])
            .map((child) => cloneWithoutFootnoteBackrefs(child))
            .filter((child): child is HastNode => child !== null);

          definitions.set(refId, {
            refId,
            index: resolvedIndex,
            contentNodes,
            itemNode: item,
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
  return (tree: unknown, file?: VFileLike) => {
    const footnoteDefinitions = new Map<string, FootnoteDefinition>();
    if (tree && typeof tree === 'object') {
      collectFootnoteDefinitions(tree as HastNode, footnoteDefinitions);
    }
    const footnoteRefCounters = new Map<string, number>();
    const imageContext: ImageNormalizationContext = { eagerImageCount: 0 };

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

      if (isElement(current, 'li')) {
        toUiTaskListItem(current);
      } else {
        const footnoteTransformed = toUiFootnoteReference(
          current,
          footnoteDefinitions,
          footnoteRefCounters,
        );

        if (!footnoteTransformed) {
          if (current.tagName === 'figure') {
            toUiFigureImage(current, imageContext, file);
          } else if (current.tagName === 'img') {
            toUiImage(current, imageContext, file);
          } else if (current.tagName === 'mark') {
            normalizeHighlightMark(current);
          } else if (current.tagName === 'table') {
            toUiTable(current);
          } else if (current.tagName === 'blockquote') {
            current.tagName = 'ui-blockquote';
          } else if (current.tagName === 'hr') {
            normalizeDivider(current);
          }
        }
      }

      const hydrationDirective = resolveHydrationDirective(current);
      if (hydrationDirective) {
        setHydrationDirective(current, hydrationDirective);
      }
    };

    visit(tree);
    synchronizeFootnoteBackrefs(footnoteDefinitions, footnoteRefCounters);
  };
}
