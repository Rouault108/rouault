import { toHtml } from 'hast-util-to-html';
import * as parse5 from 'parse5';
import type { DefaultTreeAdapterMap } from 'parse5';

import {
  resolveImageAsset,
  serializeMediaSources,
  type ResolvedImageAsset,
} from '../media/image-resolver.js';
import { type HastNode } from './hast-utils.js';
import { createStaticIconHast } from './static-icon-hast.js';
import {
  canonicalizeFootnoteId,
  createFootnoteRefId,
  parseFootnoteBackrefHref,
  parseFootnoteRefHref,
} from '../../shared/footnotes/footnote-id.js';
import { isIconName } from '../../shared/icons/icon-paths.js';

interface FootnoteDefinition {
  readonly refId: string;
  readonly index: number;
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
  syntaxSectionHeadingCount: number;
  scoreDescriptionCount: number;
}

type Parse5Node = DefaultTreeAdapterMap['node'];
type Parse5Element = DefaultTreeAdapterMap['element'];
type Parse5TextNode = DefaultTreeAdapterMap['textNode'];

interface HydrationDirective {
  readonly capability: 'progressive' | 'interactive' | 'sandboxed';
  readonly trigger: 'initial' | 'post-commit' | 'visible' | 'interaction';
}

let taskListItemCounter = 0;

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

const toSyntaxHeadingLevel = (value: unknown): number => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isInteger(parsed) && parsed >= 2 && parsed <= 6 ? parsed : 4;
};

const hasMeaningfulChildren = (children: readonly HastNode[]): boolean =>
  children.some((child) => {
    if (isElement(child)) {
      return true;
    }
    return (
      child.type === 'text' && typeof child.value === 'string' && child.value.trim().length > 0
    );
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

  const properties = Object.fromEntries(
    node.attrs.map((attribute) => [attribute.name, attribute.value]),
  );
  const children =
    'childNodes' in node && Array.isArray(node.childNodes)
      ? node.childNodes
          .map((child) => parse5NodeToHast(child))
          .filter((child): child is HastNode => child !== null)
      : [];

  return createElement(node.tagName, properties, children);
};

const createInlineIcon = (
  iconName: string | undefined,
  className: string,
  dataAttributeName: string,
): HastNode | null => {
  if (typeof iconName !== 'string' || iconName.trim().length === 0) {
    return null;
  }

  const normalizedIconName = iconName.trim();
  if (!isIconName(normalizedIconName)) {
    return null;
  }

  return createElement(
    'span',
    {
      className: [className, 'static-icon'],
      [dataAttributeName]: normalizedIconName,
      'aria-hidden': 'true',
    },
    [createStaticIconHast(normalizedIconName)],
  );
};

const CALLOUT_KIND_CONFIG = {
  note: { icon: 'info', fallbackLabel: '補足' },
  tip: { icon: 'lightbulb', fallbackLabel: 'ヒント' },
  success: { icon: 'check-circle', fallbackLabel: '成功' },
  warning: { icon: 'alert-triangle', fallbackLabel: '警告' },
  danger: { icon: 'alert-octagon', fallbackLabel: '危険' },
} as const;

type CalloutKind = keyof typeof CALLOUT_KIND_CONFIG;

const FOOTNOTES_SECTION_LABEL = '脚注';
const FOOTNOTES_SECTION_HEADING_ID = 'footnote-label';

const normalizeCalloutKind = (value: unknown): CalloutKind => {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase();
  if (normalized in CALLOUT_KIND_CONFIG) {
    return normalized as CalloutKind;
  }
  return 'note';
};

const normalizeInfoBoxVariant = (value: unknown): 'default' | 'filled' => {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase();
  return normalized === 'filled' ? 'filled' : 'default';
};

const normalizeInfoBoxDensity = (value: unknown): 'comfortable' | 'compact' => {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase();
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
    case 'ui-tabs':
      return { capability: 'interactive', trigger: 'initial' };

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

    case 'figure':
      if (
        node.properties?.['data-image'] !== undefined &&
        node.properties?.['data-image-zoomable'] !== 'false'
      ) {
        return { capability: 'progressive', trigger: 'visible' };
      }
      return null;

    case 'a':
      if (
        node.properties?.['data-footnote-ref'] === 'true' &&
        node.properties?.['role'] === 'doc-noteref'
      ) {
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

const unwrapTableNode = (node: HastNode): HastNode | null => {
  if (isElement(node, 'table')) {
    return cloneNode(node);
  }

  if (!isElement(node)) {
    return null;
  }

  const directChildren = Array.isArray(node.children) ? node.children : [];
  const nestedTableRoot = directChildren.find(
    (child) =>
      isElement(child, 'div') &&
      child.properties?.['data-table-root'] === 'true' &&
      Array.isArray(child.children) &&
      child.children[0] !== undefined &&
      isElement(child.children[0], 'table'),
  );

  if (nestedTableRoot && Array.isArray(nestedTableRoot.children)) {
    const table = nestedTableRoot.children[0];
    if (table && isElement(table, 'table')) {
      return cloneNode(table);
    }
  }

  return null;
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
    const firstTable = originalChildren
      .map((child) => unwrapTableNode(child))
      .find((child): child is HastNode => child !== null);
    tableChild = firstTable ?? createElement('table', {}, []);
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
  const quoteLang =
    pickOptionalString(properties['quote-lang']) ?? pickOptionalString(properties['quoteLang']);
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
    const sourceChildren =
      sourceSlotNodes.length > 0 ? sourceSlotNodes : [createTextNode(source ?? '')];
    node.tagName = 'figure';
    node.properties =
      variant && variant !== 'default' ? { 'data-blockquote-variant': variant } : {};
    node.children = [
      blockquoteNode,
      createElement('figcaption', { className: ['source'] }, [
        createElement('cite', {}, sourceChildren),
      ]),
    ];
    return;
  }

  node.tagName = 'blockquote';
  node.properties = blockquoteProperties;
  node.children = quoteChildren;
};

const findDirectChildElement = (
  node: HastNode,
  predicate: (candidate: HastNode) => boolean,
): HastNode | undefined => {
  if (!Array.isArray(node.children)) {
    return undefined;
  }

  return node.children.find((child) => isElement(child) && predicate(child));
};

const hasCanonicalStaticCallout = (node: HastNode): boolean => {
  if (!isElement(node, 'aside') || node.properties?.['data-callout'] === undefined) {
    return false;
  }

  const contentRoot = findDirectChildElement(
    node,
    (child) => child.tagName === 'div' && child.properties?.['data-callout-content'] !== undefined,
  );

  if (!contentRoot || !Array.isArray(contentRoot.children)) {
    return false;
  }

  return contentRoot.children.some(
    (child) => isElement(child, 'div') && child.properties?.['data-callout-body'] !== undefined,
  );
};

const hasCanonicalStaticInfoBox = (node: HastNode): boolean => {
  if (!isElement(node, 'section') || node.properties?.['data-info-box'] === undefined) {
    return false;
  }

  return Array.isArray(node.children)
    ? node.children.some(
        (child) =>
          isElement(child, 'div') && child.properties?.['data-info-box-body'] !== undefined,
      )
    : false;
};

const toStaticCallout = (node: HastNode, context: SurfaceNormalizationContext): void => {
  if (hasCanonicalStaticCallout(node)) {
    return;
  }

  const properties = node.properties ?? {};
  const children = Array.isArray(node.children)
    ? node.children.map((child) => cloneNode(child))
    : [];

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
  const headingId = heading
    ? `callout-heading-${String(++context.calloutHeadingCount)}`
    : undefined;
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
  if (hasCanonicalStaticInfoBox(node)) {
    return;
  }

  const properties = node.properties ?? {};
  const children = Array.isArray(node.children)
    ? node.children.map((child) => cloneNode(child))
    : [];

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
  const landmark = toBooleanAttribute(
    properties['data-info-box-landmark'] ?? properties['landmark'],
  );
  const iconName = pickOptionalString(properties['data-info-box-icon'] ?? properties['icon']);
  const variant = normalizeInfoBoxVariant(properties['data-variant'] ?? properties['variant']);
  const density = normalizeInfoBoxDensity(properties['data-density'] ?? properties['density']);
  const headingId = heading
    ? `info-box-heading-${String(++context.infoBoxHeadingCount)}`
    : undefined;
  const headingTagName = headingLevel ? `h${String(headingLevel)}` : 'p';

  node.tagName = 'section';
  node.properties = {
    'data-info-box': 'true',
    'data-variant': variant,
    'data-density': density,
    ...(iconName ? { 'data-info-box-icon': iconName } : {}),
    ...(landmark && headingId && headingLevel
      ? { role: 'region', 'aria-labelledby': headingId }
      : {}),
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

const toStaticLinkCard = (node: HastNode): void => {
  const properties = node.properties ?? {};
  const href = pickOptionalString(properties['href'] ?? properties['url']);
  const title =
    pickOptionalString(properties['card-title'] ?? properties['title']) ?? href ?? 'Link';
  const description = pickOptionalString(properties['description']);
  const imageSrc = pickOptionalString(properties['image-src'] ?? properties['image']);
  const siteName = pickOptionalString(properties['site-name']);

  if (!href) {
    node.tagName = 'article';
    node.properties = {
      className: ['link-card', 'link-card--invalid'],
      'data-link-card': 'true',
      'data-link-card-invalid': 'true',
    };
    node.children = [
      createElement(
        'div',
        {
          className: ['link-card__invalid'],
          role: 'note',
          'aria-label': '無効なリンクカード',
        },
        [
          createElement('div', { className: ['link-card__body'] }, [
            createElement('p', { className: ['link-card__eyebrow'] }, [
              createTextNode('Invalid link card'),
            ]),
            createElement('p', { className: ['link-card__title'] }, [createTextNode(title)]),
            createElement('p', { className: ['link-card__description'] }, [
              createTextNode('リンク先 URL が指定されていません。'),
            ]),
          ]),
        ],
      ),
    ];
    return;
  }

  const bodyChildren: HastNode[] = [];
  if (siteName) {
    bodyChildren.push(
      createElement('p', { className: ['link-card__eyebrow'] }, [createTextNode(siteName)]),
    );
  }
  bodyChildren.push(createElement('p', { className: ['link-card__title'] }, [createTextNode(title)]));
  if (description) {
    bodyChildren.push(
      createElement('p', { className: ['link-card__description'] }, [
        createTextNode(description),
      ]),
    );
  }

  const linkChildren: HastNode[] = [createElement('div', { className: ['link-card__body'] }, bodyChildren)];
  if (imageSrc) {
    linkChildren.push(
      createElement('img', {
        className: ['link-card__media'],
        src: imageSrc,
        alt: '',
        loading: 'lazy',
      }),
    );
  }

  node.tagName = 'article';
  node.properties = {
    className: ['link-card'],
    'data-link-card': 'true',
  };
  const linkKind = resolveStaticLinkKindLike(href);
  const linkClassNames = [
    'link-card__link',
    ...(imageSrc ? [] : ['link-card__link--no-image']),
  ];
  node.children = [
    createElement(
      'a',
      {
        className: linkClassNames,
        href,
        'data-link-kind': linkKind,
        'data-link-surface': 'card',
        ...(linkKind === 'external-web' ? { 'data-external': 'true', rel: 'noreferrer' } : {}),
      },
      linkChildren,
    ),
  ];
};

const resolveStaticLinkKindLike = (href: string): string =>
  /^https?:/iu.test(href)
    ? 'external-web'
    : /^(mailto:|tel:)/iu.test(href)
      ? 'external-action'
      : 'internal-document';

const isScoreFigure = (node: HastNode): boolean =>
  isElement(node, 'figure') && node.properties?.['data-score'] !== undefined;

const hasStaticSourceProperty = (node: HastNode, kebabName: string, camelName: string): boolean =>
  node.properties?.[kebabName] !== undefined || node.properties?.[camelName] !== undefined;

const isLinkCardSource = (node: HastNode): boolean =>
  isElement(node, 'div') &&
  hasStaticSourceProperty(node, 'data-link-card-source', 'dataLinkCardSource');

const isDetailsSource = (node: HastNode): boolean =>
  isElement(node, 'details') &&
  hasStaticSourceProperty(node, 'data-details-source', 'dataDetailsSource');

const isSyntaxFieldSource = (node: HastNode): boolean =>
  isElement(node, 'div') &&
  hasStaticSourceProperty(node, 'data-syntax-field-source', 'dataSyntaxFieldSource');

const isSyntaxSectionSource = (node: HastNode): boolean =>
  isElement(node, 'section') &&
  hasStaticSourceProperty(node, 'data-syntax-section-source', 'dataSyntaxSectionSource');

const isSyntaxCardSource = (node: HastNode): boolean =>
  isElement(node, 'section') &&
  hasStaticSourceProperty(node, 'data-syntax-card-source', 'dataSyntaxCardSource');

const normalizeScoreAspectRatio = (value: unknown): string | undefined => {
  const text = pickOptionalString(value);
  if (!text) {
    return undefined;
  }
  const match = /^([0-9]+(?:\.[0-9]+)?)\s*\/\s*([0-9]+(?:\.[0-9]+)?)$/u.exec(text);
  if (!match) {
    return undefined;
  }
  const left = Number(match[1]);
  const right = Number(match[2]);
  if (!Number.isFinite(left) || !Number.isFinite(right) || left <= 0 || right <= 0) {
    return undefined;
  }
  return `${match[1]} / ${match[2]}`;
};

const toStaticScore = (node: HastNode, context: SurfaceNormalizationContext): void => {
  const properties = node.properties ?? {};
  const children = Array.isArray(node.children) ? node.children.map((child) => cloneNode(child)) : [];
  const caption = pickOptionalString(properties['data-score-caption']);
  const label = pickOptionalString(properties['data-score-label']) ?? '譜面';
  const description = pickOptionalString(properties['data-score-description']);
  const primary = properties['data-score-primary'] === 'true';
  const aspectRatio = normalizeScoreAspectRatio(properties['data-score-aspect-ratio']);
  const descriptionId = description
    ? `score-description-${String(++context.scoreDescriptionCount)}`
    : undefined;
  const existingClasses = getClassList(properties['className']).filter((className) => className !== 'score');
  const stageStyle = aspectRatio ? `--_score-aspect-ratio: ${aspectRatio};` : undefined;

  const nextProperties: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(properties)) {
    if (key === 'id' || key.startsWith('aria-') || key === 'role') {
      nextProperties[key] = value;
    }
  }
  nextProperties['className'] = ['score', ...existingClasses];
  nextProperties['data-score'] = 'true';
  nextProperties['data-hydration-key'] = 'score-scroll-enhancer';
  nextProperties['data-hydration-capability'] = 'progressive';
  nextProperties['data-hydration-trigger'] = 'visible';

  node.tagName = 'figure';
  node.properties = nextProperties;
  node.children = [
    createElement(
      'div',
      {
        className: ['score__scroll'],
        'data-score-scroll': 'true',
        tabindex: '0',
        'aria-label': label,
        ...(primary ? { role: 'region' } : {}),
        ...(descriptionId ? { 'aria-describedby': descriptionId } : {}),
      },
      [
        createElement(
          'div',
          {
            className: ['score__stage'],
            'data-score-stage': 'true',
            ...(stageStyle ? { style: stageStyle } : {}),
          },
          [
            createElement('div', { className: ['score__svg'] }, children),
          ],
        ),
      ],
    ),
    ...(description && descriptionId
      ? [createElement('p', { id: descriptionId, className: ['score__sr-only'] }, [createTextNode(description)])]
      : []),
    ...(caption
      ? [createElement('figcaption', { className: ['score__caption'] }, [createTextNode(caption)])]
      : []),
  ];
};

const toStaticDetails = (node: HastNode): void => {
  const properties = node.properties ?? {};
  const summary = pickOptionalString(properties['summary']) ?? '詳細';
  const open = toBooleanAttribute(properties['open']);
  const children = Array.isArray(node.children) ? node.children.map((child) => cloneNode(child)) : [];

  node.tagName = 'details';
  node.properties = {
    className: ['details-block'],
    'data-details': 'true',
    ...(open ? { open: true } : {}),
  };
  node.children = [
    createElement('summary', { className: ['details-block__summary'] }, [
      createElement('span', { className: ['details-block__summary-label'] }, [
        createTextNode(summary),
      ]),
    ]),
    createElement('div', { className: ['details-block__body-wrapper'] }, [
      createElement('div', { className: ['details-block__body'] }, children),
    ]),
  ];
};

const toStaticSyntaxField = (node: HastNode): void => {
  const properties = node.properties ?? {};
  const name = pickOptionalString(properties['name']) ?? '';
  const type = pickOptionalString(properties['type']);
  const defaultValue = pickOptionalString(properties['default']);
  const required = toBooleanAttribute(properties['required']);
  const children = Array.isArray(node.children) ? node.children.map((child) => cloneNode(child)) : [];

  node.tagName = 'dl';
  node.properties = {
    className: ['syntax-field'],
    'data-syntax-field': 'true',
  };
  node.children = [
    createElement('dt', { className: ['syntax-field__term'] }, [
      createElement('code', { className: ['syntax-field__name'] }, [createTextNode(name)]),
      ...(required
        ? [
            createElement(
              'span',
              { className: ['syntax-field__required'], 'aria-label': '必須' },
              [createTextNode('必須')],
            ),
          ]
        : []),
      ...(type ? [createElement('span', { className: ['syntax-field__type'] }, [createTextNode(type)])] : []),
      ...(defaultValue
        ? [
            createElement(
              'span',
              {
                className: [
                  'syntax-field__default',
                  ...(type ? ['syntax-field__default--with-type'] : []),
                ],
              },
              [createTextNode(`default: ${defaultValue}`)],
            ),
          ]
        : []),
    ]),
    createElement('dd', { className: ['syntax-field__description'] }, children),
  ];
};

const toStaticSyntaxSection = (node: HastNode, context: SurfaceNormalizationContext): void => {
  const properties = node.properties ?? {};
  const label = pickOptionalString(properties['label']) ?? 'Section';
  const children = Array.isArray(node.children) ? node.children.map((child) => cloneNode(child)) : [];
  const headingId = `syntax-section-heading-${String(++context.syntaxSectionHeadingCount)}`;

  node.tagName = 'section';
  node.properties = {
    className: ['syntax-section'],
    'data-syntax-section': 'true',
    'aria-labelledby': headingId,
  };
  node.children = [
    createElement('h3', { id: headingId, className: ['syntax-section__heading'] }, [
      createTextNode(label),
    ]),
    createElement('div', { className: ['syntax-section__content'] }, children),
  ];
};

const toStaticSyntaxCard = (node: HastNode): void => {
  const properties = node.properties ?? {};
  const kind = pickOptionalString(properties['kind']);
  const name = pickOptionalString(properties['name']) ?? 'Syntax';
  const lang = pickOptionalString(properties['data-lang']);
  const headingLevel = toSyntaxHeadingLevel(properties['heading-level']);
  const children = Array.isArray(node.children) ? node.children.map((child) => cloneNode(child)) : [];
  const signatureChildren = children.filter(
    (child) => isElement(child) && child.properties?.['slot'] === 'signature',
  );
  const contentChildren = children.filter(
    (child) => !(isElement(child) && child.properties?.['slot'] === 'signature'),
  );
  const hasContent = hasMeaningfulChildren(contentChildren);
  const hasSignature = hasMeaningfulChildren(signatureChildren);

  node.tagName = 'section';
  node.properties = {
    className: ['syntax-card'],
    'data-syntax-card': 'true',
    'data-content-empty': String(!hasContent),
    ...(lang ? { 'data-lang': lang } : {}),
  };
  node.children = [
    createElement('header', { className: ['syntax-card__header'] }, [
      ...(kind ? [createElement('p', { className: ['syntax-card__kind'] }, [createTextNode(kind)])] : []),
      createElement(`h${String(headingLevel)}`, { className: ['syntax-card__name'] }, [
        createTextNode(name),
      ]),
    ]),
    ...(hasSignature
      ? [createElement('div', { className: ['syntax-card__signature'] }, signatureChildren)]
      : []),
    ...(hasContent
      ? [createElement('div', { className: ['syntax-card__content'] }, contentChildren)]
      : []),
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
  const checked = toBooleanAttribute(checkboxNode.properties['checked']);
  const labelNodes = children.slice(checkboxIndex + 1, contentEnd).map((child) => cloneNode(child));
  const tailChildren = nestedListIndex < 0 ? [] : children.slice(nestedListIndex);
  const labelId = `task-list-item-label-${String(++taskListItemCounter)}`;
  node.properties = {
    ...(node.properties ?? {}),
    className: [
      ...getClassList(node.properties?.['className']).filter((className) => className !== 'contains-task-list'),
      'task-list-item',
    ],
    'data-task-list-item': 'true',
    'data-task-state': checked ? 'checked' : 'unchecked',
  };
  node.children = [
    createElement('input', {
      className: ['static-checkbox', 'task-list-item__checkbox'],
      type: 'checkbox',
      ...(checked ? { checked: true } : {}),
      disabled: true,
      'aria-labelledby': labelId,
    }),
    createElement('span', { id: labelId, className: ['task-list-item__content'] }, labelNodes),
    ...tailChildren,
  ];
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

    if (
      !imageNode &&
      (isElement(child, 'img') ||
        (isElement(child, 'figure') && child.properties?.['data-image'] !== undefined))
    ) {
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

const getPropertyString = (
  properties: Record<string, unknown> | undefined,
  name: string,
): string | undefined => pickOptionalString(properties?.[name]);

const getElementClassList = (node: HastNode): string[] => {
  const properties = node.properties ?? {};
  return [...getClassList(properties['className']), ...getClassList(properties['class'])];
};

const setElementClassList = (
  properties: Record<string, unknown>,
  nextClassList: string[],
): void => {
  const unique = [...new Set(nextClassList.filter((className) => className.length > 0))];
  if (unique.length > 0) {
    properties['className'] = unique;
  } else {
    delete properties['className'];
  }
  delete properties['class'];
};

const normalizeMarkerText = (value: unknown): string | null => {
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  if (typeof value === 'number') {
    return String(value);
  }
  if (typeof value === 'string') {
    return value.trim().toLowerCase();
  }
  return null;
};

const isFalseFootnoteMarkerValue = (value: unknown): boolean => {
  const normalized = normalizeMarkerText(value);
  return (
    normalized === 'false' || normalized === '0' || normalized === 'off' || normalized === 'no'
  );
};

const isTruthyFootnoteMarkerValue = (value: unknown): boolean => {
  const normalized = normalizeMarkerText(value);
  if (normalized === null) {
    return false;
  }
  return !isFalseFootnoteMarkerValue(value);
};

const hasTruthyFootnoteRefDataMarker = (properties: Record<string, unknown>): boolean =>
  isTruthyFootnoteMarkerValue(properties['dataFootnoteRef']) ||
  isTruthyFootnoteMarkerValue(properties['data-footnote-ref']);

const hasFalseFootnoteRefDataMarker = (properties: Record<string, unknown>): boolean =>
  isFalseFootnoteMarkerValue(properties['dataFootnoteRef']) ||
  isFalseFootnoteMarkerValue(properties['data-footnote-ref']);

const hasTruthyFootnoteBackrefDataMarker = (properties: Record<string, unknown>): boolean =>
  isTruthyFootnoteMarkerValue(properties['dataFootnoteBackref']) ||
  isTruthyFootnoteMarkerValue(properties['data-footnote-backref']);

const hasFalseFootnoteBackrefDataMarker = (properties: Record<string, unknown>): boolean =>
  isFalseFootnoteMarkerValue(properties['dataFootnoteBackref']) ||
  isFalseFootnoteMarkerValue(properties['data-footnote-backref']);

const deleteFootnoteRefMarkerProperties = (properties: Record<string, unknown>): void => {
  delete properties['dataFootnoteRef'];
  delete properties['data-footnote-ref'];
};

const deleteFootnoteBackrefMarkerProperties = (properties: Record<string, unknown>): void => {
  delete properties['dataFootnoteBackref'];
  delete properties['data-footnote-backref'];
};

const hasFootnoteReferenceClassMarker = (node: HastNode): boolean =>
  getElementClassList(node).includes('data-footnote-ref');

const hasFootnoteBackrefClassMarker = (node: HastNode): boolean =>
  getElementClassList(node).includes('data-footnote-backref');

const removeFootnoteClassMarkers = (properties: Record<string, unknown>): void => {
  setElementClassList(
    properties,
    [...getClassList(properties['className']), ...getClassList(properties['class'])].filter(
      (className) => className !== 'data-footnote-ref' && className !== 'data-footnote-backref',
    ),
  );
};

const parseFootnoteIndexFromText = (value: string): number | null => {
  const matched = /(\d+)/u.exec(value);
  if (!matched) {
    return null;
  }

  const parsed = Number.parseInt(matched[1] ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};


const isFootnotesSection = (node: HastNode): boolean => {
  if (!isElement(node, 'section')) {
    return false;
  }

  if (node.properties?.['role'] === 'doc-endnotes') {
    return true;
  }

  const classList = getElementClassList(node);
  if (classList.includes('footnotes')) {
    return true;
  }
  return (
    toBooleanAttribute(node.properties?.['dataFootnotes']) ||
    toBooleanAttribute(node.properties?.['data-footnotes'])
  );
};

const isHeadingElement = (node: HastNode): boolean =>
  isElement(node) && typeof node.tagName === 'string' && /^h[1-6]$/u.test(node.tagName);

const getMeaningfulChildEntries = (node: HastNode): { node: HastNode; index: number }[] => {
  const children = Array.isArray(node.children) ? node.children : [];
  return children
    .map((child, index) => ({ node: child, index }))
    .filter(({ node: child }) => !isWhitespaceText(child));
};

const normalizeFootnotesHeadingNode = (headingNode: HastNode): void => {
  const properties = headingNode.properties ?? {};
  setElementClassList(
    properties,
    [...getClassList(properties['className']), ...getClassList(properties['class'])].filter(
      (className) => className !== 'sr-only' && className !== 'visually-hidden',
    ),
  );
  delete properties['hidden'];
  delete properties['aria-hidden'];
  delete properties['data-hidden'];
  headingNode.tagName = 'h2';
  properties['id'] = FOOTNOTES_SECTION_HEADING_ID;
  headingNode.properties = properties;
  headingNode.children = [createTextNode(FOOTNOTES_SECTION_LABEL)];
};

const normalizeFootnotesSectionStructure = (node: HastNode): HastNode => {
  node.properties ??= {};
  node.properties['role'] = 'doc-endnotes';

  const meaningful = getMeaningfulChildEntries(node);
  const headingEntries = meaningful.filter(({ node: child }) => isHeadingElement(child));
  const olEntries = meaningful.filter(({ node: child }) => isElement(child, 'ol'));

  if (olEntries.length !== 1) {
    throw new Error('[markdown] footnotes section must contain exactly one direct ol');
  }
  if (headingEntries.length > 1) {
    throw new Error('[markdown] footnotes section must contain at most one direct heading');
  }
  if (headingEntries.length === 1 && meaningful.length !== 2) {
    throw new Error('[markdown] footnotes section must not contain extra meaningful children');
  }
  if (headingEntries.length === 0 && meaningful.length !== 1) {
    throw new Error('[markdown] footnotes section without heading must contain only one direct ol');
  }

  const olEntry = olEntries[0];
  if (!olEntry) {
    throw new Error('[markdown] footnotes section requires a direct ol');
  }
  const olNode = olEntry.node;

  let headingNode = headingEntries[0]?.node;
  if (headingNode) {
    const headingMeaningfulIndex = meaningful.findIndex((entry) => entry.node === headingNode);
    const olMeaningfulIndex = meaningful.findIndex((entry) => entry.node === olNode);
    if (headingMeaningfulIndex + 1 !== olMeaningfulIndex) {
      throw new Error('[markdown] footnotes heading must be immediately followed by ol');
    }
    normalizeFootnotesHeadingNode(headingNode);
  } else {
    headingNode = createElement('h2', { id: FOOTNOTES_SECTION_HEADING_ID }, [
      createTextNode(FOOTNOTES_SECTION_LABEL),
    ]);
  }

  const olProperties = olNode.properties ?? {};
  delete olProperties['start'];
  delete olProperties['reversed'];
  delete olProperties['data-marker-digits'];
  delete olProperties['data-ol-depth'];
  delete olProperties['data-ol-index'];
  delete olProperties['style'];
  olNode.properties = olProperties;

  if (Array.isArray(olNode.children)) {
    for (const item of olNode.children) {
      if (!isElement(item, 'li')) {
        continue;
      }
      item.properties ??= {};
      delete item.properties['value'];
      delete item.properties['data-ol-depth'];
      delete item.properties['data-ol-index'];
      delete item.properties['data-marker-digits'];
      delete item.properties['style'];
    }
  }

  node.children = [headingNode, olNode];
  return olNode;
};

const collectDocumentIds = (
  node: HastNode,
  ids = new Map<string, HastNode>(),
): Map<string, HastNode> => {
  if (isElement(node)) {
    const id = getPropertyString(node.properties, 'id');
    if (id) {
      if (ids.has(id)) {
        throw new Error(`[markdown] duplicate id "${id}" is not allowed`);
      }
      ids.set(id, node);
    }
  }

  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      collectDocumentIds(child, ids);
    }
  }

  return ids;
};

const collectFootnoteDefinitions = (
  node: HastNode,
  definitions: Map<string, FootnoteDefinition>,
  sectionCount: { value: number },
): void => {
  if (isFootnotesSection(node)) {
    sectionCount.value += 1;
    if (sectionCount.value > 1) {
      throw new Error('[markdown] section[role="doc-endnotes"] must be unique');
    }

    const listNode = normalizeFootnotesSectionStructure(node);
    if (Array.isArray(listNode.children)) {
      let listIndex = 0;
      for (const item of listNode.children) {
        if (!isElement(item, 'li')) {
          continue;
        }

        listIndex += 1;
        item.properties ??= {};
        const rawId = getPropertyString(item.properties, 'id');
        if (rawId === undefined) {
          throw new Error('[markdown] footnote definition li requires id');
        }
        const refId = canonicalizeFootnoteId(rawId);
        if (refId === null) {
          throw new Error(`[markdown] invalid footnote definition id "${rawId}"`);
        }
        if (definitions.has(refId)) {
          throw new Error(`[markdown] duplicate footnote definition id "${refId}"`);
        }
        item.properties['id'] = refId;
        definitions.set(refId, {
          refId,
          index: listIndex,
          itemNode: item,
        });
      }
    }
  }

  if (!Array.isArray(node.children)) {
    return;
  }
  for (const child of node.children) {
    collectFootnoteDefinitions(child, definitions, sectionCount);
  }
};

const resolveAnchorFootnoteTarget = (
  anchor: HastNode,
  definitions: Map<string, FootnoteDefinition>,
  explicit: boolean,
): string | null => {
  const properties = anchor.properties ?? {};
  const href = getPropertyString(properties, 'href');
  const dataFootnoteId =
    getPropertyString(properties, 'data-footnote-id') ??
    getPropertyString(properties, 'dataFootnoteId');
  let hrefTarget: string | null = null;

  if (href) {
    const parsed = parseFootnoteRefHref(href);
    if (parsed.kind === 'invalid') {
      if (explicit) {
        throw new Error(`[markdown] invalid footnote reference href "${href}"`);
      }
      return null;
    }
    if (parsed.kind === 'canonical') {
      hrefTarget = parsed.footnoteId;
    } else if (explicit) {
      throw new Error('[markdown] explicit footnote reference requires a footnote href');
    }
  }

  const dataTarget = dataFootnoteId ? canonicalizeFootnoteId(dataFootnoteId) : null;
  if (dataFootnoteId && dataTarget === null) {
    throw new Error(`[markdown] invalid data-footnote-id "${dataFootnoteId}"`);
  }
  if (hrefTarget && dataTarget && hrefTarget !== dataTarget) {
    throw new Error('[markdown] footnote reference href and data-footnote-id disagree');
  }

  const target = hrefTarget ?? dataTarget;
  if (target === null) {
    if (explicit) {
      throw new Error('[markdown] explicit footnote reference requires href or data-footnote-id');
    }
    return null;
  }
  if (!definitions.has(target)) {
    if (explicit) {
      throw new Error(`[markdown] footnote definition "${target}" was not found`);
    }
    return null;
  }
  return target;
};

const isLegacyFootnoteReferenceId = (value: string): boolean =>
  parseFootnoteBackrefHref(`#${value}`).kind === 'legacy-user-content-fnref';

const assertExistingFootnoteReferenceProperty = (
  properties: Record<string, unknown>,
  names: readonly string[],
  expected: string,
  options: { readonly allowLegacyId?: boolean } = {},
): void => {
  for (const name of names) {
    const current = getPropertyString(properties, name);
    if (current === undefined || current === expected) {
      continue;
    }
    if (options.allowLegacyId === true && isLegacyFootnoteReferenceId(current)) {
      continue;
    }
    throw new Error(`[markdown] footnote reference ${name} conflicts with canonical value`);
  }
};

const normalizeExistingFootnoteReferenceAttributes = (
  anchor: HastNode,
  definition: FootnoteDefinition,
  nextInstance: number,
): void => {
  const properties = anchor.properties ?? {};
  const expectedId = createFootnoteRefId(definition.refId, nextInstance);
  const expectedIndex = String(definition.index);
  const expectedInstance = String(nextInstance);
  const expectedRole = nextInstance === 1 ? 'primary' : 'secondary';
  const expectedAriaLabel = `脚注 ${expectedIndex} を開く`;

  assertExistingFootnoteReferenceProperty(properties, ['id'], expectedId, {
    allowLegacyId: true,
  });
  assertExistingFootnoteReferenceProperty(
    properties,
    ['data-footnote-index', 'dataFootnoteIndex'],
    expectedIndex,
  );
  assertExistingFootnoteReferenceProperty(
    properties,
    ['data-footnote-ref-instance', 'dataFootnoteRefInstance'],
    expectedInstance,
  );
  assertExistingFootnoteReferenceProperty(
    properties,
    ['data-footnote-role', 'dataFootnoteRole'],
    expectedRole,
  );
  assertExistingFootnoteReferenceProperty(properties, ['role'], 'doc-noteref');
  assertExistingFootnoteReferenceProperty(properties, ['aria-label'], expectedAriaLabel);
  assertExistingFootnoteReferenceProperty(
    properties,
    ['data-hydration-key', 'dataHydrationKey'],
    'footnote-popover-enhancer',
  );
  assertExistingFootnoteReferenceProperty(
    properties,
    ['data-hydration-capability', 'dataHydrationCapability'],
    'progressive',
  );
  assertExistingFootnoteReferenceProperty(
    properties,
    ['data-hydration-trigger', 'dataHydrationTrigger'],
    'post-commit',
  );

  const visibleIndex = parseFootnoteIndexFromText(getTextContent(anchor));
  if (visibleIndex !== null && visibleIndex !== definition.index) {
    throw new Error('[markdown] footnote reference visible label conflicts with definition index');
  }
};

interface StaticFootnoteReference {
  readonly tagName: string;
  readonly properties: Record<string, unknown>;
  readonly children: HastNode[];
}

const createStaticFootnoteReference = (
  definition: FootnoteDefinition,
  nextInstance: number,
): StaticFootnoteReference => {
  const resolvedIndex = String(definition.index);
  return {
    tagName: 'a',
    properties: {
      id: createFootnoteRefId(definition.refId, nextInstance),
      href: `#${definition.refId}`,
      role: 'doc-noteref',
      'aria-label': `脚注 ${resolvedIndex} を開く`,
      'data-footnote-ref': 'true',
      'data-footnote-id': definition.refId,
      'data-footnote-index': resolvedIndex,
      'data-footnote-ref-instance': String(nextInstance),
      'data-footnote-role': nextInstance === 1 ? 'primary' : 'secondary',
      'data-hydration-key': 'footnote-popover-enhancer',
      'data-hydration-capability': 'progressive',
      'data-hydration-trigger': 'post-commit',
    },
    children: [createElement('sup', {}, [createTextNode(resolvedIndex)])],
  };
};

const applyStaticFootnoteReference = (
  node: HastNode,
  definition: FootnoteDefinition,
  nextInstance: number,
): void => {
  const staticReference = createStaticFootnoteReference(definition, nextInstance);
  const staticProperties = { ...staticReference.properties };

  node.tagName = staticReference.tagName;
  node.properties = staticProperties;
  node.children = staticReference.children;
  removeFootnoteClassMarkers(staticProperties);
  delete staticProperties['aria-describedby'];
  delete staticProperties['ariaDescribedBy'];
  delete staticProperties['ariadescribedby'];
};

const isCanonicalStaticFootnoteReference = (node: HastNode): boolean =>
  isElement(node, 'a') &&
  node.properties?.['data-footnote-ref'] === 'true' &&
  node.properties?.['role'] === 'doc-noteref';

const collectDocumentIdsExcludingCanonicalFootnoteReferences = (
  node: HastNode,
  ids = new Map<string, HastNode>(),
): Map<string, HastNode> => {
  if (isElement(node)) {
    const id = getPropertyString(node.properties, 'id');
    if (id && !isCanonicalStaticFootnoteReference(node)) {
      if (ids.has(id)) {
        throw new Error(`[markdown] duplicate id "${id}" is not allowed`);
      }
      ids.set(id, node);
    }
  }

  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      collectDocumentIdsExcludingCanonicalFootnoteReferences(child, ids);
    }
  }

  return ids;
};

const renumberCanonicalFootnoteReferences = (
  node: HastNode,
  definitions: Map<string, FootnoteDefinition>,
  refCounters: Map<string, number>,
  reservedIds: Map<string, HastNode>,
): void => {
  if (isCanonicalStaticFootnoteReference(node)) {
    const target = resolveAnchorFootnoteTarget(node, definitions, true);
    if (target === null) {
      return;
    }

    const definition = definitions.get(target);
    if (!definition) {
      return;
    }

    const nextInstance = (refCounters.get(definition.refId) ?? 0) + 1;
    const nextId = createFootnoteRefId(definition.refId, nextInstance);
    const conflictingNode = reservedIds.get(nextId);
    if (conflictingNode !== undefined && conflictingNode !== node) {
      throw new Error(`[markdown] footnote ref id "${nextId}" already exists`);
    }

    applyStaticFootnoteReference(node, definition, nextInstance);
    reservedIds.set(nextId, node);
    refCounters.set(definition.refId, nextInstance);
    return;
  }

  if (!Array.isArray(node.children)) {
    return;
  }

  for (const child of node.children) {
    renumberCanonicalFootnoteReferences(child, definitions, refCounters, reservedIds);
  }
};

const isExplicitFootnoteReferenceAnchor = (node: HastNode): boolean => {
  if (!isElement(node, 'a')) {
    return false;
  }
  const properties = node.properties ?? {};
  if (hasFalseFootnoteRefDataMarker(properties)) {
    if (properties['role'] === 'doc-noteref' || hasFootnoteReferenceClassMarker(node)) {
      throw new Error(
        '[markdown] false-valued footnote ref marker conflicts with structural marker',
      );
    }
    deleteFootnoteRefMarkerProperties(properties);
    return false;
  }
  return hasTruthyFootnoteRefDataMarker(properties) || hasFootnoteReferenceClassMarker(node);
};

const getSingleFootnoteCandidateAnchorFromSup = (node: HastNode): HastNode | null => {
  if (!isElement(node, 'sup') || !Array.isArray(node.children)) {
    return null;
  }

  const meaningful = node.children.filter((child) => !isWhitespaceText(child));
  const anchors = meaningful.filter((child) => isElement(child, 'a'));
  const candidateAnchors = anchors.filter((anchor) => {
    const properties = anchor.properties ?? {};
    if (hasFalseFootnoteRefDataMarker(properties)) {
      if (properties['role'] === 'doc-noteref' || hasFootnoteReferenceClassMarker(anchor)) {
        throw new Error(
          '[markdown] false-valued footnote ref marker conflicts with structural marker',
        );
      }
      deleteFootnoteRefMarkerProperties(properties);
      return false;
    }
    if (isExplicitFootnoteReferenceAnchor(anchor)) {
      return true;
    }
    if (properties['role'] === 'doc-noteref') {
      throw new Error('[markdown] role-only footnote ref marker is not allowed');
    }
    const href = getPropertyString(properties, 'href');
    if (!href) {
      return false;
    }
    const parsed = parseFootnoteRefHref(href);
    return parsed.kind === 'canonical';
  });

  if (candidateAnchors.length === 0) {
    return null;
  }
  if (meaningful.length !== 1 || candidateAnchors.length !== 1) {
    throw new Error('[markdown] footnote sup wrapper must contain exactly one footnote anchor');
  }

  return candidateAnchors[0] ?? null;
};

const toStaticFootnoteReference = (
  node: HastNode,
  definitions: Map<string, FootnoteDefinition>,
  refCounters: Map<string, number>,
): boolean => {
  const anchor =
    getSingleFootnoteCandidateAnchorFromSup(node) ?? (isElement(node, 'a') ? node : null);
  if (!anchor || !isElement(anchor, 'a')) {
    return false;
  }

  const explicit = isExplicitFootnoteReferenceAnchor(anchor);
  const isSupFallback = isElement(node, 'sup');
  if (!explicit && !isSupFallback) {
    return false;
  }

  const target = resolveAnchorFootnoteTarget(anchor, definitions, explicit);
  if (target === null) {
    return false;
  }

  const definition = definitions.get(target);
  if (!definition) {
    return false;
  }
  const nextInstance = (refCounters.get(definition.refId) ?? 0) + 1;

  normalizeExistingFootnoteReferenceAttributes(anchor, definition, nextInstance);
  applyStaticFootnoteReference(node, definition, nextInstance);
  refCounters.set(definition.refId, nextInstance);
  return true;
};

const isFootnoteBackrefAnchor = (node: HastNode): boolean => {
  if (!isElement(node, 'a')) {
    return false;
  }
  const properties = node.properties ?? {};
  const hasExplicitBackrefMarker =
    hasTruthyFootnoteBackrefDataMarker(properties) ||
    properties['role'] === 'doc-backlink' ||
    hasFootnoteBackrefClassMarker(node);
  const href = getPropertyString(properties, 'href');

  if (hasExplicitBackrefMarker) {
    if (!href) {
      throw new Error('[markdown] explicit footnote backref marker requires href');
    }
    const parsed = parseFootnoteBackrefHref(href);
    if (parsed.kind === 'canonical' || parsed.kind === 'legacy-user-content-fnref') {
      return true;
    }
    throw new Error(`[markdown] invalid footnote backref href "${href}"`);
  }

  if (!href) {
    return false;
  }
  const parsed = parseFootnoteBackrefHref(href);
  if (parsed.kind === 'invalid') {
    throw new Error(`[markdown] invalid footnote backref href "${href}"`);
  }
  return parsed.kind === 'canonical' || parsed.kind === 'legacy-user-content-fnref';
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
    if (isElement(clonedNode, 'a')) {
      if (hasFalseFootnoteRefDataMarker(clonedNode.properties)) {
        deleteFootnoteRefMarkerProperties(clonedNode.properties);
      }
      if (hasFalseFootnoteBackrefDataMarker(clonedNode.properties)) {
        deleteFootnoteBackrefMarkerProperties(clonedNode.properties);
      }
    }
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
    href: `#${createFootnoteRefId(refId, refInstance)}`,
    role: 'doc-backlink',
    'data-footnote-backref': 'true',
    'aria-label': `脚注参照 ${String(refInstance)} に戻る`,
  },
  children: [
    {
      type: 'text',
      value: refInstance === 1 ? '↩︎' : `↩︎${String(refInstance)}`,
    },
  ],
});

const appendFootnoteBackrefs = (targetNode: HastNode, refId: string, refCount: number): void => {
  targetNode.children ??= [];
  for (let refInstance = 1; refInstance <= refCount; refInstance += 1) {
    const lastChild = targetNode.children[targetNode.children.length - 1];
    if (lastChild !== undefined && !isWhitespaceText(lastChild)) {
      targetNode.children.push(createTextNode(' '));
    } else if (refInstance > 1) {
      targetNode.children.push(createTextNode(' '));
    }
    targetNode.children.push(createFootnoteBackrefAnchor(refId, refInstance));
  }
};

const findBackrefInsertionTarget = (itemNode: HastNode): HastNode => {
  const directParagraphs = Array.isArray(itemNode.children)
    ? itemNode.children.filter(
        (child) => isElement(child, 'p') && hasMeaningfulChildren(child.children ?? []),
      )
    : [];
  return directParagraphs[directParagraphs.length - 1] ?? itemNode;
};

const synchronizeFootnoteBackrefs = (
  definitions: Map<string, FootnoteDefinition>,
  refCounters: Map<string, number>,
): void => {
  for (const definition of definitions.values()) {
    const refCount = refCounters.get(definition.refId) ?? 0;
    const contentNodes = (definition.itemNode.children ?? [])
      .map((contentNode) => cloneWithoutFootnoteBackrefs(contentNode))
      .filter((contentNode): contentNode is HastNode => contentNode !== null);

    definition.itemNode.children = contentNodes;

    if (refCount <= 0) {
      continue;
    }

    appendFootnoteBackrefs(
      findBackrefInsertionTarget(definition.itemNode),
      definition.refId,
      refCount,
    );
  }
};

/**
 * CommonMark由来の標準要素を Rouault の Web Components へ正規化する。
 */
export function rehypeRouaultComponents() {
  return (tree: unknown, file?: VFileLike) => {
    const footnoteDefinitions = new Map<string, FootnoteDefinition>();
    if (tree && typeof tree === 'object') {
      collectFootnoteDefinitions(tree as HastNode, footnoteDefinitions, { value: 0 });
    }
    const footnoteRefCounters = new Map<string, number>();
    const imageContext: ImageNormalizationContext = { eagerImageCount: 0 };
    const surfaceContext: SurfaceNormalizationContext = {
      calloutHeadingCount: 0,
      infoBoxHeadingCount: 0,
      syntaxSectionHeadingCount: 0,
      scoreDescriptionCount: 0,
    };

    const visit = (node: unknown): void => {
      if (!node || typeof node !== 'object') {
        return;
      }

      const current = node as HastNode;
      if (!isElement(current)) {
        if (Array.isArray(current.children)) {
          for (const child of current.children) {
            visit(child);
          }
        }
        return;
      }

      if (isElement(current, 'a')) {
        const properties = current.properties ?? {};
        if (hasFalseFootnoteBackrefDataMarker(properties)) {
          if (properties['role'] === 'doc-backlink' || hasFootnoteBackrefClassMarker(current)) {
            throw new Error(
              '[markdown] false-valued footnote backref marker conflicts with structural marker',
            );
          }
          deleteFootnoteBackrefMarkerProperties(properties);
          current.properties = properties;
        }
      }

      if (current.tagName === 'table' || current.tagName === 'ui-table') {
        toStaticTable(current);

        const tableRoot = Array.isArray(current.children) ? current.children[0] : undefined;
        if (
          tableRoot !== undefined &&
          !isElement(tableRoot, 'table') &&
          Array.isArray(tableRoot.children)
        ) {
          for (const child of tableRoot.children) {
            visit(child);
          }
        }

        const hydrationDirective = resolveHydrationDirective(current);
        if (hydrationDirective) {
          setHydrationDirective(current, hydrationDirective);
        }
        return;
      }

      if (isElement(current, 'sup')) {
        const footnoteTransformed = toStaticFootnoteReference(
          current,
          footnoteDefinitions,
          footnoteRefCounters,
        );
        if (footnoteTransformed) {
          const hydrationDirective = resolveHydrationDirective(current);
          if (hydrationDirective) {
            setHydrationDirective(current, hydrationDirective);
          }
          return;
        }
      }

      if (Array.isArray(current.children)) {
        for (const child of current.children) {
          visit(child);
        }
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
            if (isScoreFigure(current)) {
              toStaticScore(current, surfaceContext);
            } else {
              toStaticFigureImage(current, imageContext, file);
            }
          } else if (current.tagName === 'img') {
            toStaticImage(current, imageContext, file);
          } else if (current.tagName === 'mark') {
            normalizeHighlightMark(current);
          } else if (current.tagName === 'table' || current.tagName === 'ui-table') {
            toStaticTable(current);
          } else if (current.tagName === 'ui-blockquote') {
            toStaticBlockquote(current);
          } else if (isLinkCardSource(current)) {
            toStaticLinkCard(current);
          } else if (isDetailsSource(current)) {
            toStaticDetails(current);
          } else if (isSyntaxFieldSource(current)) {
            toStaticSyntaxField(current);
          } else if (isSyntaxSectionSource(current)) {
            toStaticSyntaxSection(current, surfaceContext);
          } else if (isSyntaxCardSource(current)) {
            toStaticSyntaxCard(current);
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
    footnoteRefCounters.clear();
    if (tree && typeof tree === 'object') {
      const reservedFootnoteReferenceIds = collectDocumentIdsExcludingCanonicalFootnoteReferences(
        tree as HastNode,
      );
      renumberCanonicalFootnoteReferences(
        tree as HastNode,
        footnoteDefinitions,
        footnoteRefCounters,
        reservedFootnoteReferenceIds,
      );
    }
    synchronizeFootnoteBackrefs(footnoteDefinitions, footnoteRefCounters);
    if (tree && typeof tree === 'object') {
      collectDocumentIds(tree as HastNode);
    }
  };
}

const normalizeRouaultStaticSurfacesTree = (tree: HastNode): void => {
  const surfaceContext: SurfaceNormalizationContext = {
    calloutHeadingCount: 0,
    infoBoxHeadingCount: 0,
    syntaxSectionHeadingCount: 0,
    scoreDescriptionCount: 0,
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

    if (
      current.tagName === 'ui-callout' ||
      (current.tagName === 'aside' && current.properties?.['data-callout'] !== undefined)
    ) {
      toStaticCallout(current, surfaceContext);
      return;
    }

    if (
      current.tagName === 'ui-info-box' ||
      (current.tagName === 'section' && current.properties?.['data-info-box'] !== undefined)
    ) {
      toStaticInfoBox(current, surfaceContext);
    }
  };

  visit(tree);
};

export const normalizeRouaultStaticSurfaceHtml = (html: string | undefined): string | undefined => {
  if (typeof html !== 'string' || html.trim().length === 0) {
    return html;
  }

  const fragment = parse5.parseFragment(html, {
    sourceCodeLocationInfo: false,
  });

  const root: HastNode = {
    type: 'root',
    children: fragment.childNodes
      .map((child) => parse5NodeToHast(child))
      .filter((child): child is HastNode => child !== null),
  };

  normalizeRouaultStaticSurfacesTree(root);

  return toHtml(root as Parameters<typeof toHtml>[0]);
};
