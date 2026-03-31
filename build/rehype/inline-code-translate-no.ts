import { type HastNode } from './hast-utils.js';

/**
 * インラインコードに translate="no" を付与する。
 * pre > code（コードブロック）は対象外。
 */
export function rehypeInlineCodeTranslateNo() {
  return (tree: unknown) => {
    const visit = (node: unknown, parentTagName?: string): void => {
      if (!node || typeof node !== 'object') {
        return;
      }

      const current = node as HastNode;

      if (current.type === 'element' && current.tagName === 'code' && parentTagName !== 'pre') {
        current.properties ??= {};
        if (current.properties['translate'] !== 'no') {
          current.properties['translate'] = 'no';
        }
      }

      if (!Array.isArray(current.children)) {
        return;
      }

      for (const child of current.children) {
        visit(child, current.tagName);
      }
    };

    visit(tree);
  };
}
