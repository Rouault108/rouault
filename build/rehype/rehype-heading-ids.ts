import { type HastNode, getOrCreateProperties } from './hast-utils.js';
import { createStaticIconHast } from './static-icon-hast.js';

const HEADING_TAG_PATTERN = /^h([1-6])$/;
const PERMALINK_HEADING_TAG_PATTERN = /^h([2-6])$/;
const NON_WORD_PATTERN = /[^\p{Letter}\p{Number}\-_\s]+/gu;
const SPACE_PATTERN = /\s+/g;
const DASH_PATTERN = /-+/g;
const FALLBACK_SLUG = 'section';

const HEADING_TEXT_WRAPPER_CLASS = 'heading-text';
const HEADING_PERMALINK_CLASS = 'heading-anchor';

const isHeadingElement = (node: HastNode): boolean =>
  node.type === 'element' &&
  typeof node.tagName === 'string' &&
  HEADING_TAG_PATTERN.test(node.tagName);

const isPermalinkHeadingElement = (node: HastNode): boolean =>
  node.type === 'element' &&
  typeof node.tagName === 'string' &&
  PERMALINK_HEADING_TAG_PATTERN.test(node.tagName);

const getTextContent = (node: HastNode): string => {
  if (node.type === 'text') {
    return typeof node.value === 'string' ? node.value : '';
  }
  if (!Array.isArray(node.children)) {
    return '';
  }
  return node.children.map((child) => getTextContent(child)).join('');
};

const normalizeSlug = (value: string): string => {
  const normalized = value
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(NON_WORD_PATTERN, '')
    .replace(SPACE_PATTERN, '-')
    .replace(DASH_PATTERN, '-')
    .replace(/^-+|-+$/g, '');
  return normalized.length > 0 ? normalized : FALLBACK_SLUG;
};

const createUniqueSlug = (baseSlug: string, counters: Map<string, number>): string => {
  const count = counters.get(baseSlug) ?? 0;
  const nextCount = count + 1;
  counters.set(baseSlug, nextCount);
  if (nextCount <= 1) {
    return baseSlug;
  }
  return `${baseSlug}-${String(nextCount)}`;
};

const getClassNames = (node: HastNode): string[] => {
  const raw = node.properties?.['className'];
  if (Array.isArray(raw)) {
    return raw.filter((value): value is string => typeof value === 'string');
  }
  if (typeof raw === 'string') {
    return raw.split(/\s+/).filter((value) => value.length > 0);
  }
  return [];
};

const hasClassName = (node: HastNode, className: string): boolean =>
  getClassNames(node).includes(className);

const createElement = (
  tagName: string,
  properties: Record<string, unknown>,
  children: HastNode[] = [],
): HastNode => ({
  type: 'element',
  tagName,
  properties,
  children,
});

const hasExistingPermalink = (node: HastNode, id: string): boolean => {
  if (!Array.isArray(node.children)) {
    return false;
  }

  return node.children.some((child) => {
    if (child.type !== 'element' || child.tagName !== 'a') {
      return false;
    }

    if (hasClassName(child, HEADING_PERMALINK_CLASS)) {
      return true;
    }

    return child.properties?.['href'] === `#${id}`;
  });
};

const ensureHeadingPermalink = (node: HastNode, id: string, text: string): void => {
  if (!isPermalinkHeadingElement(node)) {
    return;
  }

  node.children ??= [];

  if (hasExistingPermalink(node, id)) {
    return;
  }

  const originalChildren = [...node.children];
  const alreadyWrapped =
    originalChildren.length === 1 &&
    hasClassName(originalChildren[0] as HastNode, HEADING_TEXT_WRAPPER_CLASS);

  if (!alreadyWrapped) {
    node.children = [
      createElement(
        'span',
        {
          className: [HEADING_TEXT_WRAPPER_CLASS],
        },
        originalChildren,
      ),
    ];
  }

  node.children.push(
    createElement(
      'a',
      {
        className: [HEADING_PERMALINK_CLASS],
        href: `#${id}`,
        'aria-label': `「${text}」への固定リンク`,
        'data-heading-permalink': 'true',
        'data-link-kind': 'internal-fragment',
        'data-link-surface': 'structural',
      },
      [createStaticIconHast('link', { className: ['heading-anchor-icon'] })],
    ),
  );
};

const isDocEndnotesSection = (node: HastNode): boolean =>
  node.type === 'element' &&
  node.tagName === 'section' &&
  node.properties?.['role'] === 'doc-endnotes';

const isEndnotesLabelHeading = (node: HastNode, insideDocEndnotes: boolean): boolean =>
  insideDocEndnotes &&
  node.type === 'element' &&
  node.tagName === 'h2' &&
  node.properties?.['id'] === 'footnote-label';

const assignHeadingIds = (
  node: HastNode,
  counters: Map<string, number>,
  insideDocEndnotes = false,
): void => {
  const nextInsideDocEndnotes = insideDocEndnotes || isDocEndnotesSection(node);

  if (isHeadingElement(node)) {
    const properties = getOrCreateProperties(node);
    const existingId = properties['id'];

    if (typeof existingId !== 'string' || existingId.trim().length === 0) {
      const text = getTextContent(node);
      const baseSlug = normalizeSlug(text);
      properties['id'] = createUniqueSlug(baseSlug, counters);
    }

    const id = typeof properties['id'] === 'string' ? properties['id'] : '';
    const text = getTextContent(node).trim();

    if (id.length > 0 && text.length > 0 && !isEndnotesLabelHeading(node, nextInsideDocEndnotes)) {
      ensureHeadingPermalink(node, id, text);
    }
  }

  if (!Array.isArray(node.children)) {
    return;
  }

  for (const child of node.children) {
    assignHeadingIds(child, counters, nextInsideDocEndnotes);
  }
};

export function rehypeHeadingIds() {
  return (tree: HastNode) => {
    const counters = new Map<string, number>();
    assignHeadingIds(tree, counters);
  };
}
