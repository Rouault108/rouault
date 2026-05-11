import * as parse5 from 'parse5';
import type { DefaultTreeAdapterMap } from 'parse5';
import type { TocHeading, TocScopeSelection } from '../../src/toc/toc-headings.js';
import {
  parseFootnoteBackrefHref,
  parseFootnoteRefHref,
} from '../../shared/footnotes/footnote-id.js';

export type { TocHeading, TocScopeSelection };

export interface PreparedTocHtml {
  html: string;
  headings: TocHeading[];
}

type Parse5DocumentFragment = DefaultTreeAdapterMap['documentFragment'];
type Parse5Element = DefaultTreeAdapterMap['element'];
type Parse5Node = DefaultTreeAdapterMap['node'];
type Parse5TextNode = DefaultTreeAdapterMap['textNode'];
type Parse5Attribute = Parse5Element['attrs'][number];

const WHITESPACE_PATTERN = /\s+/g;
const HEADING_TAG_PATTERN = /^h([2-6])$/;

const isElementNode = (node: Parse5Node): node is Parse5Element =>
  'tagName' in node && typeof node.tagName === 'string' && Array.isArray(node.attrs);

const getAttributeValue = (node: Parse5Element, name: string): string | undefined => {
  const matched = node.attrs.find((attribute) => attribute.name === name);
  return matched?.value;
};

const setAttributeValue = (node: Parse5Element, name: string, value: string): void => {
  const matched = node.attrs.find((attribute) => attribute.name === name);
  if (matched) {
    matched.value = value;
    return;
  }

  node.attrs.push({ name, value } as Parse5Attribute);
};

const removeAttribute = (node: Parse5Element, name: string): void => {
  node.attrs = node.attrs.filter((attribute) => attribute.name !== name);
};

const removeAttributesWhere = (node: Parse5Element, predicate: (name: string) => boolean): void => {
  node.attrs = node.attrs.filter((attribute) => !predicate(attribute.name));
};

const normalizeCounterStyle = (node: Parse5Element): void => {
  const style = getAttributeValue(node, 'style');
  if (style === undefined || !/--ui-ol-counter-(?:reset|step|set)/u.test(style)) {
    return;
  }

  const remaining = style
    .split(';')
    .map((declaration) => declaration.trim())
    .filter(
      (declaration) =>
        declaration.length > 0 && !/^--ui-ol-counter-(?:reset|step|set)\s*:/u.test(declaration),
    )
    .join('; ');

  if (remaining.length === 0) {
    removeAttribute(node, 'style');
    return;
  }

  setAttributeValue(node, 'style', remaining);
};

const getClassNames = (node: Parse5Element): string[] =>
  (getAttributeValue(node, 'class') ?? '')
    .split(/\s+/u)
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

const hasClassName = (node: Parse5Element, className: string): boolean =>
  getClassNames(node).includes(className);

const normalizeFootnoteStructuralBooleanAttributes = (node: Parse5Element): void => {
  if (node.tagName !== 'a') {
    return;
  }

  if (
    getAttributeValue(node, 'data-footnote-ref') === '' &&
    getAttributeValue(node, 'role') === 'doc-noteref'
  ) {
    const href = getAttributeValue(node, 'href') ?? '';
    const parsed = parseFootnoteRefHref(href);
    if (parsed.kind === 'canonical') {
      setAttributeValue(node, 'data-footnote-ref', 'true');
    }
  }

  if (
    getAttributeValue(node, 'data-footnote-backref') === '' &&
    getAttributeValue(node, 'role') === 'doc-backlink'
  ) {
    const href = getAttributeValue(node, 'href') ?? '';
    const parsed = parseFootnoteBackrefHref(href);
    if (parsed.kind === 'canonical') {
      setAttributeValue(node, 'data-footnote-backref', 'true');
    }
  }
};

const isEndnotesLabelHeading = (node: Parse5Element, insideDocEndnotes: boolean): boolean =>
  insideDocEndnotes && node.tagName === 'h2' && getAttributeValue(node, 'id') === 'footnote-label';

const isHeadingPermalinkNode = (node: Parse5Element): boolean =>
  hasClassName(node, 'heading-anchor') ||
  getAttributeValue(node, 'data-heading-permalink') === 'true';

const removeHeadingPermalinkDescendants = (node: Parse5Element): void => {
  if (!('childNodes' in node) || !Array.isArray(node.childNodes)) {
    return;
  }

  node.childNodes = node.childNodes.filter(
    (child) => !(isElementNode(child) && isHeadingPermalinkNode(child)),
  );

  for (const child of node.childNodes) {
    if (isElementNode(child)) {
      removeHeadingPermalinkDescendants(child);
    }
  }
};

const getElementChildren = (node: Parse5Node): Parse5Element[] => {
  if (!('childNodes' in node) || !Array.isArray(node.childNodes)) {
    return [];
  }

  return node.childNodes.filter((child): child is Parse5Element => isElementNode(child));
};

const getChildNodes = (node: Parse5Node): Parse5Node[] =>
  'childNodes' in node && Array.isArray(node.childNodes) ? node.childNodes : [];

const createTextNode = (value: string): Parse5TextNode =>
  ({
    nodeName: '#text',
    value,
  }) as Parse5TextNode;

const normalizeCanonicalEndnotesOrderedListAttributes = (section: Parse5Element): void => {
  const children = getElementChildren(section);
  const heading = children[0];
  const list = children[1];

  if (
    heading === undefined ||
    list === undefined ||
    heading.tagName !== 'h2' ||
    getAttributeValue(heading, 'id') !== 'footnote-label' ||
    list.tagName !== 'ol'
  ) {
    return;
  }

  removeAttribute(list, 'start');
  removeAttribute(list, 'reversed');
  removeAttribute(list, 'data-marker-digits');
  removeAttributesWhere(list, (name) => name.startsWith('data-ol-'));
  if (getAttributeValue(list, 'role') === 'list') {
    removeAttribute(list, 'role');
  }
  normalizeCounterStyle(list);

  for (const child of getElementChildren(list)) {
    if (child.tagName !== 'li') {
      continue;
    }

    removeAttribute(child, 'value');
    removeAttribute(child, 'data-marker-digits');
    removeAttributesWhere(child, (name) => name.startsWith('data-ol-'));
    if (getAttributeValue(child, 'role') === 'listitem') {
      removeAttribute(child, 'role');
    }
    normalizeCounterStyle(child);
  }
};

const isCanonicalFootnoteBackref = (node: Parse5Element): boolean => {
  if (node.tagName !== 'a') {
    return false;
  }

  normalizeFootnoteStructuralBooleanAttributes(node);

  if (
    getAttributeValue(node, 'data-footnote-backref') !== 'true' ||
    getAttributeValue(node, 'role') !== 'doc-backlink'
  ) {
    return false;
  }

  return parseFootnoteBackrefHref(getAttributeValue(node, 'href') ?? '').kind === 'canonical';
};

const collectCanonicalFootnoteBackrefs = (node: Parse5Node): Parse5Element[] => {
  const backrefs: Parse5Element[] = [];
  const visit = (current: Parse5Node): void => {
    if (isElementNode(current) && isCanonicalFootnoteBackref(current)) {
      backrefs.push(current);
    }

    for (const child of getChildNodes(current)) {
      visit(child);
    }
  };

  visit(node);
  return backrefs;
};

const removeDescendantNodes = (node: Parse5Node, targets: ReadonlySet<Parse5Node>): void => {
  if (!('childNodes' in node) || !Array.isArray(node.childNodes)) {
    return;
  }

  node.childNodes = node.childNodes.filter((child) => !targets.has(child));

  for (const child of node.childNodes) {
    removeDescendantNodes(child, targets);
  }
};

const isWhitespaceTextNode = (node: Parse5Node): boolean =>
  'value' in node && typeof node.value === 'string' && node.value.trim().length === 0;

const hasMeaningfulTextContent = (node: Parse5Node): boolean =>
  getTextContent(node).trim().length > 0;

const getBackrefTargetContainer = (item: Parse5Element): Parse5Element => {
  const directParagraphs = getChildNodes(item).filter(
    (child): child is Parse5Element =>
      isElementNode(child) && child.tagName === 'p' && hasMeaningfulTextContent(child),
  );

  return directParagraphs[directParagraphs.length - 1] ?? item;
};

const appendCanonicalBackrefs = (container: Parse5Element, backrefs: Parse5Element[]): void => {
  container.childNodes ??= [];

  for (const backref of backrefs) {
    const lastChild = container.childNodes[container.childNodes.length - 1];
    if (lastChild !== undefined && !isWhitespaceTextNode(lastChild)) {
      container.childNodes.push(createTextNode(' '));
    }
    container.childNodes.push(backref);
  }
};

const normalizeCanonicalEndnotesBackrefPlacement = (section: Parse5Element): void => {
  const children = getElementChildren(section);
  const heading = children[0];
  const list = children[1];

  if (
    heading === undefined ||
    list === undefined ||
    heading.tagName !== 'h2' ||
    getAttributeValue(heading, 'id') !== 'footnote-label' ||
    list.tagName !== 'ol'
  ) {
    return;
  }

  for (const item of getElementChildren(list)) {
    if (item.tagName !== 'li') {
      continue;
    }

    const backrefs = collectCanonicalFootnoteBackrefs(item);
    if (backrefs.length === 0) {
      continue;
    }

    backrefs.sort((left, right) => {
      const leftParsed = parseFootnoteBackrefHref(getAttributeValue(left, 'href') ?? '');
      const rightParsed = parseFootnoteBackrefHref(getAttributeValue(right, 'href') ?? '');
      const leftInstance = leftParsed.kind === 'canonical' ? leftParsed.instance : 0;
      const rightInstance = rightParsed.kind === 'canonical' ? rightParsed.instance : 0;
      return leftInstance - rightInstance;
    });

    removeDescendantNodes(item, new Set(backrefs));
    appendCanonicalBackrefs(getBackrefTargetContainer(item), backrefs);
  }
};

const isHeadingElement = (node: Parse5Node): node is Parse5Element =>
  isElementNode(node) && HEADING_TAG_PATTERN.test(node.tagName);

const shouldIgnoreHeadingTextNode = (node: Parse5Element): boolean => {
  const className = getAttributeValue(node, 'class') ?? '';
  if (className.split(/\s+/).includes('heading-anchor')) {
    return true;
  }

  return getAttributeValue(node, 'data-heading-permalink') === 'true';
};

const getTextContent = (node: Parse5Node): string => {
  if ('value' in node && typeof node.value === 'string') {
    return node.value;
  }

  if (!isElementNode(node)) {
    if ('childNodes' in node && Array.isArray(node.childNodes)) {
      return node.childNodes.map((child) => getTextContent(child)).join('');
    }
    return '';
  }

  if (shouldIgnoreHeadingTextNode(node)) {
    return '';
  }

  if (!('childNodes' in node) || !Array.isArray(node.childNodes)) {
    return '';
  }

  return node.childNodes.map((child) => getTextContent(child)).join('');
};

const normalizeText = (value: string): string => value.replace(WHITESPACE_PATTERN, ' ').trim();

const getPanelSelectionMap = (tabsHost: Parse5Element): Map<Parse5Element, string> => {
  const children = getElementChildren(tabsHost);
  const tabs = children.filter((child) => getAttributeValue(child, 'slot') === 'tab');
  const panels = children.filter((child) => getAttributeValue(child, 'slot') === 'panel');

  const panelSelections = new Map<Parse5Element, string>();
  panels.forEach((panel, index) => {
    const value = getAttributeValue(tabs[index] as Parse5Element, 'value')?.trim() ?? '';
    if (value.length > 0) {
      panelSelections.set(panel, value);
    }
  });

  return panelSelections;
};

const isDocEndnotesSection = (node: Parse5Node): boolean =>
  isElementNode(node) &&
  node.tagName === 'section' &&
  getAttributeValue(node, 'role') === 'doc-endnotes';

const visitNode = (
  node: Parse5Node,
  scopeSelections: TocScopeSelection[],
  headings: TocHeading[],
  counters: { scope: number },
  insideDocEndnotes = false,
): void => {
  if (isElementNode(node)) {
    normalizeFootnoteStructuralBooleanAttributes(node);
  }

  const nextInsideDocEndnotes = insideDocEndnotes || isDocEndnotesSection(node);

  if (isElementNode(node) && isDocEndnotesSection(node)) {
    normalizeCanonicalEndnotesOrderedListAttributes(node);
    normalizeCanonicalEndnotesBackrefPlacement(node);
  }

  if (isElementNode(node) && isEndnotesLabelHeading(node, nextInsideDocEndnotes)) {
    removeHeadingPermalinkDescendants(node);
  }

  if (isHeadingElement(node)) {
    const id = getAttributeValue(node, 'id') ?? '';
    const text = normalizeText(getTextContent(node));
    const level = Number.parseInt(node.tagName.slice(1), 10);

    if (
      id.length > 0 &&
      text.length > 0 &&
      Number.isFinite(level) &&
      !(nextInsideDocEndnotes && id === 'footnote-label')
    ) {
      headings.push({
        id,
        text,
        level,
        ...(scopeSelections.length > 0
          ? {
              scopeSelections: scopeSelections.map((selection) => ({ ...selection })),
            }
          : {}),
      });
    }
  }

  if (!isElementNode(node)) {
    if ('childNodes' in node && Array.isArray(node.childNodes)) {
      for (const child of node.childNodes) {
        visitNode(child, scopeSelections, headings, counters, nextInsideDocEndnotes);
      }
    }
    return;
  }

  if (node.tagName === 'ui-tabs') {
    counters.scope += 1;
    const scopeId =
      getAttributeValue(node, 'data-toc-scope')?.trim() || `toc-scope-${String(counters.scope)}`;
    setAttributeValue(node, 'data-toc-scope', scopeId);

    const panelSelections = getPanelSelectionMap(node);
    if ('childNodes' in node && Array.isArray(node.childNodes)) {
      for (const child of node.childNodes) {
        if (isElementNode(child) && panelSelections.has(child)) {
          visitNode(
            child,
            [...scopeSelections, { scopeId, value: panelSelections.get(child) as string }],
            headings,
            counters,
            nextInsideDocEndnotes,
          );
          continue;
        }

        visitNode(child, scopeSelections, headings, counters, nextInsideDocEndnotes);
      }
    }
    return;
  }

  if ('childNodes' in node && Array.isArray(node.childNodes)) {
    for (const child of node.childNodes) {
      visitNode(child, scopeSelections, headings, counters, nextInsideDocEndnotes);
    }
  }
};

const serializeFragment = (fragment: Parse5DocumentFragment): string => parse5.serialize(fragment);

export const prepareTocHtml = (html: string): PreparedTocHtml => {
  const source = typeof html === 'string' ? html : '';
  if (source.length === 0) {
    return { html: '', headings: [] };
  }

  const fragment = parse5.parseFragment(source);
  const headings: TocHeading[] = [];
  const counters = { scope: 0 };

  for (const child of fragment.childNodes) {
    visitNode(child, [], headings, counters, false);
  }

  return {
    html: serializeFragment(fragment),
    headings,
  };
};

export const extractTocFromHtml = (html: string): TocHeading[] => prepareTocHtml(html).headings;
