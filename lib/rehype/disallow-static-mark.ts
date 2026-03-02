import { type HastNode, type VFileLike } from './hast-utils.js';

/**
 * 著者コンテンツ中の静的 <mark> を禁止する。
 * 検索由来/ユーザー操作由来のハイライトは実行時に挿入されるため、
 * Markdown ソースに <mark> が存在した時点でエラーとする。
 */
export function rehypeDisallowStaticMark() {
  return (tree: unknown, file?: VFileLike) => {
    const visit = (node: unknown): void => {
      if (!node || typeof node !== 'object') {
        return;
      }

      const current = node as HastNode;
      if (current.type === 'element' && current.tagName === 'mark') {
        const sourcePath = file?.path ?? 'unknown file';
        throw new Error(
          `[highlight] 著者コンテンツで静的 <mark> は使用できません: ${sourcePath}`,
        );
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
