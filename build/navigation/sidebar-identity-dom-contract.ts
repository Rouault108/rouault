import type { DefaultTreeAdapterMap } from 'parse5';
import { validateSidebarIdentityInstances } from '../../shared/navigation/sidebar-identity-document-contract.js';

type Parse5Node = DefaultTreeAdapterMap['node'];
type Parse5ParentNode = DefaultTreeAdapterMap['parentNode'];
type Parse5Document = DefaultTreeAdapterMap['document'];
type Parse5Element = DefaultTreeAdapterMap['element'];

const isElementNode = (node: Parse5Node): node is Parse5Element =>
  'tagName' in node && typeof node.tagName === 'string' && Array.isArray(node.attrs);

const isParentNode = (node: Parse5Node): node is Parse5ParentNode => {
  const candidate = node as { childNodes?: unknown };
  return Array.isArray(candidate.childNodes);
};

const getAttribute = (element: Parse5Element, name: string): string | null =>
  element.attrs.find((attribute) => attribute.name === name)?.value ?? null;

const hasAttribute = (element: Parse5Element, name: string): boolean =>
  element.attrs.some((attribute) => attribute.name === name);

const findLayoutSidebars = (
  node: Parse5ParentNode,
  matches: Parse5Element[] = [],
): Parse5Element[] => {
  for (const childNode of node.childNodes) {
    if (isElementNode(childNode) && childNode.tagName === 'layout-sidebar') {
      matches.push(childNode);
    }

    if (isParentNode(childNode)) {
      findLayoutSidebars(childNode, matches);
    }
  }

  return matches;
};

export const validateDocumentSidebarIdentityContract = (
  document: Parse5Document,
  options: { readonly sourceLabel?: string } = {},
): void => {
  const sourceLabel = options.sourceLabel ?? 'navigation-artifact';
  validateSidebarIdentityInstances(
    findLayoutSidebars(document).map((sidebar, index) => ({
      sidebarId: getAttribute(sidebar, 'sidebar-id'),
      present: !hasAttribute(sidebar, 'hidden'),
      sourceLabel: `${sourceLabel}:layout-sidebar[${String(index)}]`,
    })),
    { sourceLabel },
  );
};
