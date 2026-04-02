import { getOrCreateProperties, type HastNode } from './hast-utils.js';
import { classifyLinkHref, isExternalLinkKind } from '../../shared/link/link-kind.js';

const getClassNames = (node: HastNode): string[] => {
  const raw = node.properties?.['className'];

  if (Array.isArray(raw)) {
    return raw.filter((value): value is string => typeof value === 'string');
  }

  if (typeof raw === 'string') {
    return raw.split(/\s+/u).filter((value) => value.length > 0);
  }

  return [];
};

const hasClassName = (node: HastNode, className: string): boolean =>
  getClassNames(node).includes(className);

export function rehypeAnnotateLinkKinds() {
  return (tree: unknown) => {
    const visit = (node: unknown): void => {
      if (!node || typeof node !== 'object') {
        return;
      }

      const current = node as HastNode;

      if (
        current.type === 'element' &&
        current.tagName === 'a' &&
        !hasClassName(current, 'heading-anchor')
      ) {
        const href = current.properties?.['href'];

        if (typeof href === 'string' && href.trim().length > 0) {
          const linkKind = classifyLinkHref(href);
          const properties = getOrCreateProperties(current);

          properties['data-link-kind'] = linkKind;
          properties['data-link-surface'] = 'prose';

          if (isExternalLinkKind(linkKind)) {
            properties['data-external'] = 'true';
          } else {
            delete properties['data-external'];
          }
        }
      }

      if (!Array.isArray(current.children)) {
        return;
      }

      for (const child of current.children) {
        visit(child);
      }
    };

    visit(tree);
  };
}
