import { type HastNode, getOrCreateProperties } from './hast-utils.js';

const HEADING_TAG_PATTERN = /^h([1-6])$/;
const NON_WORD_PATTERN = /[^\p{Letter}\p{Number}\-_\s]+/gu;
const SPACE_PATTERN = /\s+/g;
const DASH_PATTERN = /-+/g;
const FALLBACK_SLUG = 'section';

const isHeadingElement = (node: HastNode): boolean =>
  node.type === 'element'
  && typeof node.tagName === 'string'
  && HEADING_TAG_PATTERN.test(node.tagName);

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

const assignHeadingIds = (node: HastNode, counters: Map<string, number>): void => {
  if (isHeadingElement(node)) {
    const properties = getOrCreateProperties(node);
    const existingId = properties['id'];
    if (typeof existingId !== 'string' || existingId.trim().length === 0) {
      const text = getTextContent(node);
      const baseSlug = normalizeSlug(text);
      properties['id'] = createUniqueSlug(baseSlug, counters);
    }
  }

  if (!Array.isArray(node.children)) {
    return;
  }
  for (const child of node.children) {
    assignHeadingIds(child, counters);
  }
};

export function rehypeHeadingIds() {
  return (tree: HastNode) => {
    const counters = new Map<string, number>();
    assignHeadingIds(tree, counters);
  };
}
