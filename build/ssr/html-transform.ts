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

const isParentNode = (node: Parse5Node): node is Parse5ParentNode => {
  const candidate = node as { childNodes?: unknown };
  return Array.isArray(candidate.childNodes);
};

const hasAttribute = (node: Parse5Element, attributeName: string): boolean =>
  node.attrs.some((attribute) => attribute.name === attributeName);

const isDeclarativeShadowTemplate = (node: Parse5Node): node is Parse5Element =>
  isElementNode(node) &&
  node.tagName === 'template' &&
  (hasAttribute(node, 'shadowrootmode') || hasAttribute(node, 'shadowroot'));

const hasDeclarativeShadowRoot = (node: Parse5Element): boolean =>
  node.childNodes.some((childNode) => isDeclarativeShadowTemplate(childNode));

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
): Parse5ChildNode[] => {
  const nextFragment = parse5.parseFragment(html);
  const currentIndex = parentNode.childNodes.indexOf(currentNode);
  if (currentIndex < 0) {
    return [];
  }

  for (const child of nextFragment.childNodes) {
    child.parentNode = parentNode;
  }

  parentNode.childNodes.splice(currentIndex, 1, ...nextFragment.childNodes);
  return [...nextFragment.childNodes];
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
      /*
       * Declarative shadow root の template 自体には潜らない。
       * ここへ再帰で入ると、既存 SSR マークアップを再変換しうる。
       */
      if (isDeclarativeShadowTemplate(childNode)) {
        continue;
      }

      if (isElementNode(childNode)) {
        const childElement: Parse5Element = childNode;

        if (!targetTagNameSet.has(childElement.tagName)) {
          await visit(childElement);
          continue;
        }

        /*
         * 既存の declarative shadow root を直下に持つ host は、
         * すでに SSR 済みとみなして再変換しない。
         */
        if (hasDeclarativeShadowRoot(childElement)) {
          renderedTagNames.add(childElement.tagName);
          continue;
        }

        const renderedHtml = await renderCustomElement(
          childElement.tagName,
          cloneAttributes(childElement.attrs),
          serializeInnerHtml(childElement),
        );

        const insertedNodes = replaceNodeWithHtml(node, childElement, renderedHtml);
        renderedTagNames.add(childElement.tagName);

        for (const insertedNode of insertedNodes) {
          if (isParentNode(insertedNode)) {
            await visit(insertedNode);
          }
        }

        continue;
      }

      if (isParentNode(childNode)) {
        await visit(childNode);
      }
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
