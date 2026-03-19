import * as parse5 from 'parse5';
import type { DefaultTreeAdapterMap } from 'parse5';

type Parse5Node = DefaultTreeAdapterMap['node'];
type Parse5ChildNode = DefaultTreeAdapterMap['childNode'];
type Parse5ParentNode = DefaultTreeAdapterMap['parentNode'];
type Parse5Document = DefaultTreeAdapterMap['document'];
type Parse5DocumentFragment = DefaultTreeAdapterMap['documentFragment'];
type Parse5Element = DefaultTreeAdapterMap['element'];
type Parse5Attribute = Parse5Element['attrs'][number];

export interface SsrAttribute {
  name: string;
  value: string;
}

export interface DocumentStyleDefinition {
  id: string;
  cssText: string;
}

export interface TransformHtmlWithLitSsrOptions {
  targetTagNames: readonly string[];
  renderCustomElement: (
    tagName: string,
    attributes: readonly SsrAttribute[],
    innerHtml: string,
  ) => Promise<string>;
  collectDocumentStylesForTags?: (
    renderedTagNames: ReadonlySet<string>,
  ) => readonly DocumentStyleDefinition[];
}

const isElementNode = (node: Parse5Node): node is Parse5Element =>
  'tagName' in node && typeof node.tagName === 'string' && Array.isArray(node.attrs);

const createFragmentNode = (childNodes: Parse5ChildNode[]): Parse5DocumentFragment => ({
  nodeName: '#document-fragment',
  childNodes,
});

const findFirstElement = (
  node: Parse5ParentNode,
  predicate: (candidate: Parse5Element) => boolean,
): Parse5Element | null => {
  for (const child of node.childNodes) {
    if (isElementNode(child) && predicate(child)) {
      return child;
    }

    if ('childNodes' in child && Array.isArray(child.childNodes)) {
      const found = findFirstElement(child, predicate);
      if (found) {
        return found;
      }
    }
  }

  return null;
};

const hasElementById = (node: Parse5ParentNode, id: string): boolean =>
  findFirstElement(node, (candidate) =>
    candidate.attrs.some((attribute) => attribute.name === 'id' && attribute.value === id),
  ) !== null;

const serializeInnerHtml = (node: Parse5Element): string =>
  parse5.serialize(createFragmentNode([...node.childNodes]));

const replaceNodeWithHtml = (
  parentNode: Parse5ParentNode,
  currentNode: Parse5ChildNode,
  html: string,
): void => {
  const nextFragment = parse5.parseFragment(html);
  const currentIndex = parentNode.childNodes.indexOf(currentNode);
  if (currentIndex < 0) {
    return;
  }

  for (const child of nextFragment.childNodes) {
    child.parentNode = parentNode;
  }

  parentNode.childNodes.splice(currentIndex, 1, ...nextFragment.childNodes);
};

const extractTextContent = (node: Parse5Node): string => {
  if ('value' in node && typeof node.value === 'string') {
    return node.value;
  }

  if ('childNodes' in node && Array.isArray(node.childNodes)) {
    return node.childNodes.map((child) => extractTextContent(child)).join('');
  }

  return '';
};

const enrichAttributesForNode = (
  tagName: string,
  attributes: readonly SsrAttribute[],
  node: Parse5Element,
): readonly SsrAttribute[] => {
  if (tagName !== 'ui-code-block') {
    return attributes;
  }

  if (attributes.some((attribute) => attribute.name === 'initial-code')) {
    return attributes;
  }

  const initialCode = extractTextContent(node).replace(/\r\n?/g, '\n').trimEnd();
  if (initialCode.length === 0) {
    return attributes;
  }

  return [...attributes, { name: 'initial-code', value: initialCode }];
};

const cloneAttributes = (attributes: readonly Parse5Attribute[]): SsrAttribute[] =>
  attributes.map((attribute) => ({
    name: attribute.name,
    value: attribute.value,
  }));

export const transformHtmlWithLitSsr = async (
  html: string,
  {
    targetTagNames,
    renderCustomElement,
    collectDocumentStylesForTags,
  }: TransformHtmlWithLitSsrOptions,
): Promise<string> => {
  const document: Parse5Document = parse5.parse(html);
  const targetTagNameSet = new Set(targetTagNames);
  const renderedTagNames = new Set<string>();

  const visit = async (node: Parse5ParentNode): Promise<void> => {
    for (const childNode of [...node.childNodes]) {
      if ('childNodes' in childNode && Array.isArray(childNode.childNodes)) {
        await visit(childNode);
      }

      if (!isElementNode(childNode) || !targetTagNameSet.has(childNode.tagName)) {
        continue;
      }

      const attributes = enrichAttributesForNode(
        childNode.tagName,
        cloneAttributes(childNode.attrs),
        childNode,
      );
      const renderedHtml = await renderCustomElement(
        childNode.tagName,
        attributes,
        serializeInnerHtml(childNode),
      );

      replaceNodeWithHtml(node, childNode, renderedHtml);
      renderedTagNames.add(childNode.tagName);
    }
  };

  await visit(document);

  const headNode = findFirstElement(document, (node) => node.tagName === 'head');
  if (headNode && typeof collectDocumentStylesForTags === 'function') {
    const styleDefinitions = collectDocumentStylesForTags(renderedTagNames);

    for (const definition of styleDefinitions) {
      if (hasElementById(document, definition.id)) {
        continue;
      }

      const styleFragment = parse5.parseFragment(
        `<style id="${definition.id}">${definition.cssText}</style>`,
      );

      for (const childNode of styleFragment.childNodes) {
        childNode.parentNode = headNode;
        headNode.childNodes.push(childNode);
      }
    }
  }

  return parse5.serialize(document);
};
