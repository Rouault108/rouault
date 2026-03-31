interface MdastNode {
  type?: string;
  value?: string;
  children?: MdastNode[];
  position?: {
    start?: {
      line?: number;
      column?: number;
    };
  };
}

interface VFileLike {
  path?: string;
}

/**
 * 著者入力の生HTMLを禁止し、CommonMarkベースの記述へ統一する。
 */
export function remarkDisallowRawHtml() {
  return (tree: unknown, file?: VFileLike) => {
    const visit = (node: unknown): void => {
      if (!node || typeof node !== 'object') {
        return;
      }

      const current = node as MdastNode;
      if (current.type === 'html') {
        const sourcePath = file?.path ?? 'unknown file';
        const line = current.position?.start?.line;
        const column = current.position?.start?.column;
        const location =
          typeof line === 'number' && typeof column === 'number'
            ? `:${String(line)}:${String(column)}`
            : '';

        throw new Error(`[markdown] 生HTMLは使用できません: ${sourcePath}${location}`);
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
