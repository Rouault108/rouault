import * as parse5 from 'parse5';
import type { DefaultTreeAdapterMap } from 'parse5';

import {
  resolveImageAsset,
  serializeMediaSources,
  type ResolvedImageAsset,
} from '../media/image-resolver.js';
import { LUCIDE_SUBSET } from '../../src/generated/lucide-subset.js';
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

interface SurfaceNormalizationContext {
  calloutHeadingCount: number;
  infoBoxHeadingCount: number;
}

type Parse5Node = DefaultTreeAdapterMap['node'];
type Parse5Element = DefaultTreeAdapterMap['element'];
type Parse5TextNode = DefaultTreeAdapterMap['textNode'];

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

const createTextNode = (value: string): HastNode => ({
  type: 'text',
  value,
});

const createElement = (
  tagName: string,
  properties: Record<string, unknown> = {},
  children: HastNode[] = [],
): HastNode => ({
  type: 'element',
  tagName,
  properties,
  children,
});

const toHeadingLevel = (value: unknown): number | null => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 6) {
    return null;
  }
  return parsed;
};

const hasMeaningfulChildren = (children: readonly HastNode[]): boolean =>
  children.some((child) => {
    if (isElement(child)) {
      return true;
    }
    return child.type === 'text' && typeof child.value === 'string' && child.value.trim().length > 0;
  });

const isParse5Element = (node: Parse5Node): node is Parse5Element =>
  'tagName' in node && typeof node.tagName === 'string' && Array.isArray(node.attrs);

const isParse5Text = (node: Parse5Node): node is Parse5TextNode =>
  'nodeName' in node && node.nodeName === '#text' && 'value' in node;

const parse5NodeToHast = (node: Parse5Node): HastNode | null => {
  if (isParse5Text(node)) {
    return createTextNode(typeof node.value === 'string' ? node.value : '');
  }

  if (!isParse5Element(node)) {
    return null;
  }

  const properties = Object.fromEntries(node.attrs.map((attribute) => [attribute.name, attribute.value]));
  const children = ('childNodes' in node && Array.isArray(node.childNodes)
    ? node.childNodes.map((child) => parse5NodeToHast(child)).filter((child): child is HastNode => child !== null)
    : []);

  return createElement(node.tagName, properties, children);
};

const svgIconCache = new Map<string, HastNode | null>();

const createInlineIcon = (
  iconName: string | undefined,
  className: string,
  dataAttributeName: string,
): HastNode | null => {
  if (typeof iconName !== 'string' || iconName.trim().length === 0) {
    return null;
  }

  const normalizedIconName = iconName.trim();
  const cacheKey = `${className}:${dataAttributeName}:${normalizedIconName}`;
  if (svgIconCache.has(cacheKey)) {
    const cached = svgIconCache.get(cacheKey);
    return cached ? cloneNode(cached) : null;
  }

  const iconDefinition = (
    LUCIDE_SUBSET.icons as Record<string, { body?: string }>
  )[normalizedIconName];
  if (!iconDefinition?.body) {
    svgIconCache.set(cacheKey, null);
    return null;
  }

  const fragment = parse5.parseFragment(
    `<svg class="${className}" ${dataAttributeName}="${normalizedIconName}" viewBox="0 0 ${String(LUCIDE_SUBSET.width)} ${String(LUCIDE_SUBSET.height)}" fill="none" aria-hidden="true" focusable="false">${iconDefinition.body}</svg>`,
    {
      sourceCodeLocationInfo: false,
    },
  );

  const rootNode = fragment.childNodes
    .map((child) => parse5NodeToHast(child))
    .find((child): child is HastNode => child !== null) ?? null;

  svgIconCache.set(cacheKey, rootNode);
  return rootNode ? cloneNode(rootNode) : null;
};

const CALLOUT_KIND_CONFIG = {
  note: { icon: 'info', fallbackLabel: '補足' },
  tip: { icon: 'lightbulb', fallbackLabel: 'ヒント' },
  success: { icon: 'check-circle', fallbackLabel: '成功' },
  warning: { icon: 'alert-triangle', fallbackLabel: '警告' },
  danger: { icon: 'alert-octagon', fallbackLabel: '危険' },
} as const;

type CalloutKind = keyof typeof CALLOUT_KIND_CONFIG;

const normalizeCalloutKind = (value: unknown): CalloutKind => {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized in CALLOUT_KIND_CONFIG) {
    return normalized as CalloutKind;
  }
  return 'note';
};

const normalizeInfoBoxVariant = (value: unknown): 'default' | 'filled' => {
  const normalized = String(value ?? '').trim().toLowerCase();
  return normalized === 'filled' ? 'filled' : 'default';
};

const normalizeInfoBoxDensity = (value: unknown): 'comfortable' | 'compact' => {
  const normalized = String(value ?? '').trim().toLowerCase();
  return normalized === 'compact' ? 'compact' : 'comfortable';
};

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
    case 'ui-tabs':
      return { capability: 'interactive', trigger: 'initial' };

    case 'ui-card':
    case 'ui-code-block':
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

    case 'figure':
      if (
        node.properties?.['data-image'] !== undefined &&
        node.properties?.['data-image-zoomable'] !== 'false'
      ) {
        return { capability: 'progressive', trigger: 'visible' };
      }
      return null;

    case 'a':
      if (node.properties?.['data-footnote-ref'] !== undefined) {
        return { capability: 'progressive', trigger: 'post-commit' };
      }
      return null;

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

const toStaticTable = (node: HastNode): void => {
  const originalProperties = node.properties ?? {};
  const originalChildren = Array.isArray(node.children) ? node.children : [];

  const density = pickOptionalString(originalProperties['density']);
  const existingAriaLabel = pickOptionalString(originalProperties['aria-label']);

  let tableChild: HastNode;
  if (node.tagName === 'table') {
    tableChild = createElement('table', originalProperties, originalChildren);
  } else {
    const firstTable = originalChildren.find((child) => isElement(child, 'table'));
    tableChild = firstTable ? cloneNode(firstTable) : createElement('table', {}, []);
  }

  const tableChildren = Array.isArray(tableChild.children) ? tableChild.children : [];
  const caption = tableChildren.find((child) => isElement(child, 'caption'));
  const captionText = caption ? getTextContent(caption).trim() : '';
  const ariaLabel = existingAriaLabel ?? (captionText.length > 0 ? captionText : 'Data table');

  node.tagName = 'div';
  node.properties = {
    'data-table-root': 'true',
    role: 'region',
    tabindex: '0',
    'aria-label': ariaLabel,
    ...(density === 'compact' ? { 'data-density': 'compact' } : {}),
  };
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

const toStaticBlockquote = (node: HastNode): void => {
  const properties = node.properties ?? {};
  const source = pickOptionalString(properties['source']);
  const cite = pickOptionalString(properties['cite']);
  const quoteLang = pickOptionalString(properties['quote-lang']) ?? pickOptionalString(properties['quoteLang']);
  const variant = pickOptionalString(properties['variant']);
  const children = Array.isArray(node.children) ? node.children : [];

  const sourceSlotNodes = children
    .filter((child) => isElement(child) && child.properties?.['slot'] === 'source')
    .map((child) => cloneNode(child));
  const quoteChildren = children
    .filter((child) => !(isElement(child) && child.properties?.['slot'] === 'source'))
    .map((child) => cloneNode(child));

  const blockquoteProperties: Record<string, unknown> = {};
  if (variant && variant !== 'default') {
    blockquoteProperties['data-blockquote-variant'] = variant;
  }
  if (cite) {
    blockquoteProperties['cite'] = cite;
  }
  if (quoteLang) {
    blockquoteProperties['lang'] = quoteLang;
  }

  const blockquoteNode = createElement('blockquote', blockquoteProperties, quoteChildren);
  if (source || sourceSlotNodes.length > 0) {
    const sourceChildren = sourceSlotNodes.length > 0 ? sourceSlotNodes : [createTextNode(source ?? '')];
    node.tagName = 'figure';
    node.properties = variant && variant !== 'default' ? { 'data-blockquote-variant': variant } : {};
    node.children = [
      blockquoteNode,
      createElement('figcaption', { className: ['source'] }, [createElement('cite', {}, sourceChildren)]),
    ];
    return;
  }

  node.tagName = 'blockquote';
  node.properties = blockquoteProperties;
  node.children = quoteChildren;
};

const toStaticCallout = (node: HastNode, context: SurfaceNormalizationContext): void => {
  const properties = node.properties ?? {};
  const children = Array.isArray(node.children) ? node.children.map((child) => cloneNode(child)) : [];

  const kind = normalizeCalloutKind(properties['data-callout-kind'] ?? properties['kind']);
  const heading = pickOptionalString(properties['data-callout-heading'] ?? properties['heading']);
  const headingLevel = toHeadingLevel(
    properties['data-callout-heading-level'] ?? properties['heading-level'],
  );
  const label =
    pickOptionalString(properties['data-callout-label'] ?? properties['label']) ??
    CALLOUT_KIND_CONFIG[kind].fallbackLabel;
  const iconName =
    pickOptionalString(properties['data-callout-icon'] ?? properties['icon']) ??
    CALLOUT_KIND_CONFIG[kind].icon;
  const headingId = heading ? `callout-heading-${String(++context.calloutHeadingCount)}` : undefined;
  const headingTagName = headingLevel ? `h${String(headingLevel)}` : 'p';

  node.tagName = 'aside';
  node.properties = {
    'data-callout': 'true',
    'data-callout-kind': kind,
    ...(iconName ? { 'data-callout-icon': iconName } : {}),
    ...(headingId ? { 'aria-labelledby': headingId } : { 'aria-label': label }),
  };

  const contentChildren: HastNode[] = [];
  if (heading) {
    contentChildren.push(
      createElement(
        headingTagName,
        {
          id: headingId,
          'data-callout-heading': 'true',
        },
        [createTextNode(heading)],
      ),
    );
  }

  contentChildren.push(createElement('div', { 'data-callout-body': 'true' }, children));

  const iconNode = createInlineIcon(iconName, 'callout-icon', 'data-callout-icon-svg');
  node.children = [
    ...(iconNode ? [iconNode] : []),
    createElement('div', { 'data-callout-content': 'true' }, contentChildren),
  ];
};

const toStaticInfoBox = (node: HastNode, context: SurfaceNormalizationContext): void => {
  const properties = node.properties ?? {};
  const children = Array.isArray(node.children) ? node.children.map((child) => cloneNode(child)) : [];

  if (!hasMeaningfulChildren(children)) {
    node.type = 'text';
    node.value = '';
    delete node.tagName;
    delete node.properties;
    node.children = [];
    return;
  }

  const heading = pickOptionalString(properties['data-info-box-heading'] ?? properties['heading']);
  const headingLevel = toHeadingLevel(
    properties['data-info-box-heading-level'] ?? properties['heading-level'],
  );
  const landmark =
    toBooleanAttribute(properties['data-info-box-landmark'] ?? properties['landmark']);
  const iconName = pickOptionalString(properties['data-info-box-icon'] ?? properties['icon']);
  const variant = normalizeInfoBoxVariant(properties['data-variant'] ?? properties['variant']);
  const density = normalizeInfoBoxDensity(properties['data-density'] ?? properties['density']);
  const headingId = heading ? `info-box-heading-${String(++context.infoBoxHeadingCount)}` : undefined;
  const headingTagName = headingLevel ? `h${String(headingLevel)}` : 'p';

  node.tagName = 'section';
  node.properties = {
    'data-info-box': 'true',
    'data-variant': variant,
    'data-density': density,
    ...(iconName ? { 'data-info-box-icon': iconName } : {}),
    ...(landmark && headingId && headingLevel ? { role: 'region', 'aria-labelledby': headingId } : {}),
  };

  const nextChildren: HastNode[] = [];
  if (heading) {
    const headerChildren: HastNode[] = [];
    const iconNode = createInlineIcon(iconName, 'info-box-icon', 'data-info-box-icon-svg');
    if (iconNode) {
      headerChildren.push(iconNode);
    }
    headerChildren.push(
      createElement(
        headingTagName,
        {
          id: headingId,
          'data-info-box-heading': 'true',
        },
        [createTextNode(heading)],
      ),
    );
    nextChildren.push(createElement('div', { 'data-info-box-header': 'true' }, headerChildren));
  }

  nextChildren.push(createElement('div', { 'data-info-box-body': 'true' }, children));
  node.children = nextChildren;
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

const createPictureNode = (
  asset: ResolvedImageAsset | null,
  fallbackSrc: string | undefined,
  alt: string,
  loading: 'lazy' | 'eager' | undefined,
): HastNode => {
  const pictureChildren: HastNode[] = [];

  if (asset) {
    for (const source of asset.inline.sources) {
      const sourceProperties: Record<string, unknown> = {
        type: source.type,
        srcset: source.srcset,
      };
      if (source.sizes) {
        sourceProperties['sizes'] = source.sizes;
      }
      pictureChildren.push(createElement('source', sourceProperties, []));
    }
  }

  const imgProperties: Record<string, unknown> = {
    src: asset?.inline.src ?? fallbackSrc ?? '',
    alt,
  };

  if (asset?.inline.srcset) {
    imgProperties['srcset'] = asset.inline.srcset;
  }
  if (asset?.inline.sizes) {
    imgProperties['sizes'] = asset.inline.sizes;
  }
  if (loading) {
    imgProperties['loading'] = loading;
  }
  if (typeof asset?.width === 'number') {
    imgProperties['width'] = asset.width;
  }
  if (typeof asset?.height === 'number') {
    imgProperties['height'] = asset.height;
  }

  pictureChildren.push(createElement('img', imgProperties, []));
  return createElement('picture', {}, pictureChildren);
};

const toStaticImage = (
  node: HastNode,
  context: ImageNormalizationContext,
  file?: VFileLike,
): void => {
  if (!isElement(node, 'img')) {
    return;
  }

  const originalProperties = node.properties ?? {};
  const sourcePath = pickOptionalString(originalProperties['src']);
  const alt = typeof originalProperties['alt'] === 'string' ? originalProperties['alt'] : '';
  const caption = pickOptionalString(originalProperties['title']);
  const loading = pickOptionalString(originalProperties['loading'])?.toLowerCase();

  let normalizedLoading: 'lazy' | 'eager' | undefined;
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
    normalizedLoading = loading;
  }

  const zoomable = Object.hasOwn(originalProperties, 'zoomable')
    ? toBooleanAttribute(originalProperties['zoomable'])
    : true;

  const resolvedAsset = sourcePath
    ? resolveImageAsset(sourcePath, {
        inlineVariant: 'reading',
        lightboxVariant: 'full',
        inlineSizes: '(min-width: 768px) min(100vw - 4rem, 1200px), 100vw',
        lightboxSizes: '100vw',
      })
    : null;

  const figureProperties: Record<string, unknown> = {
    'data-image': 'true',
    'data-image-zoomable': zoomable ? 'true' : 'false',
  };

  if (zoomable) {
    figureProperties['data-hydration-key'] = 'image-lightbox-enhancer';
    figureProperties['data-hydration-capability'] = 'progressive';
    figureProperties['data-hydration-trigger'] = 'visible';
  }

  if (resolvedAsset) {
    figureProperties['data-image-lightbox-src'] = resolvedAsset.lightbox.src;
    if (resolvedAsset.lightbox.srcset) {
      figureProperties['data-image-lightbox-srcset'] = resolvedAsset.lightbox.srcset;
    }
    if (resolvedAsset.lightbox.sizes) {
      figureProperties['data-image-lightbox-sizes'] = resolvedAsset.lightbox.sizes;
    }
    if (resolvedAsset.lightbox.sources.length > 0) {
      figureProperties['data-image-lightbox-sources'] = serializeMediaSources(
        resolvedAsset.lightbox.sources,
      );
    }
  } else if (sourcePath) {
    figureProperties['data-image-lightbox-src'] = sourcePath;
  }

  const children: HastNode[] = [];

  if (zoomable) {
    children.push(
      createElement(
        'button',
        {
          type: 'button',
          'data-image-zoom-trigger': 'true',
          'aria-label': alt.trim().length > 0 ? `画像を拡大して表示: ${alt}` : '画像を拡大して表示',
        },
        [createElement('span', { className: 'sr-only' }, [createTextNode('画像を拡大して表示')])],
      ),
    );
  }

  children.push(createPictureNode(resolvedAsset, sourcePath, alt, normalizedLoading));

  if (caption) {
    children.push(createElement('figcaption', {}, [createTextNode(caption)]));
  }

  node.tagName = 'figure';
  node.properties = figureProperties;
  node.children = children;
};

const toStaticFigureImage = (
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

    if (!imageNode && (isElement(child, 'img') || (isElement(child, 'figure') && child.properties?.['data-image'] !== undefined))) {
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
    toStaticImage(imageNode, context, file);
  }

  if (!isElement(imageNode, 'figure') || imageNode.properties?.['data-image'] === undefined) {
    return;
  }

  const nextProperties: Record<string, unknown> = { ...(imageNode.properties ?? {}) };
  const nextChildren = Array.isArray(imageNode.children)
    ? imageNode.children.map((child) => cloneNode(child))
    : [];

  const hasFigcaption = nextChildren.some((child) => isElement(child, 'figcaption'));
  if (captionText.length > 0 && !hasFigcaption) {
    nextChildren.push(createElement('figcaption', {}, [createTextNode(captionText)]));
  }

  node.tagName = 'figure';
  node.properties = nextProperties;
  node.children = nextChildren;
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

const toStaticFootnoteReference = (
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

  node.tagName = 'a';
  node.properties = {
    id: `${refId}-ref-${String(nextInstance)}`,
    href: `#${refId}`,
    role: 'doc-noteref',
    'data-footnote-ref': 'true',
    'data-footnote-id': refId,
    'data-footnote-index': String(resolvedIndex),
    'data-footnote-ref-instance': String(nextInstance),
    'data-footnote-role': nextInstance === 1 ? 'primary' : 'secondary',
    'data-hydration-key': 'footnote-popover-enhancer',
    'data-hydration-capability': 'progressive',
    'data-hydration-trigger': 'post-commit',
    'aria-label': `脚注 ${String(resolvedIndex)} を開く`,
  };
  node.children = [
    createElement('sup', {}, [createTextNode(String(resolvedIndex))]),
  ];
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
    const surfaceContext: SurfaceNormalizationContext = {
      calloutHeadingCount: 0,
      infoBoxHeadingCount: 0,
    };

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
        const footnoteTransformed = toStaticFootnoteReference(
          current,
          footnoteDefinitions,
          footnoteRefCounters,
        );

        if (!footnoteTransformed) {
          if (current.tagName === 'figure') {
            toStaticFigureImage(current, imageContext, file);
          } else if (current.tagName === 'img') {
            toStaticImage(current, imageContext, file);
          } else if (current.tagName === 'mark') {
            normalizeHighlightMark(current);
          } else if (current.tagName === 'table' || current.tagName === 'ui-table') {
            toStaticTable(current);
          } else if (current.tagName === 'ui-blockquote') {
            toStaticBlockquote(current);
          } else if (
            current.tagName === 'ui-callout' ||
            (current.tagName === 'aside' && current.properties?.['data-callout'] !== undefined)
          ) {
            toStaticCallout(current, surfaceContext);
          } else if (
            current.tagName === 'ui-info-box' ||
            (current.tagName === 'section' && current.properties?.['data-info-box'] !== undefined)
          ) {
            toStaticInfoBox(current, surfaceContext);
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