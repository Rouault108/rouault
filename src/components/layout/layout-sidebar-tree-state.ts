import type { TreeNode } from '../ui/file-tree/file-tree.js';

export const LAYOUT_SIDEBAR_TREE_STATE_STORAGE_KEY = 'rouault.sidebar.tree-state.v1';

export interface LayoutSidebarTreeState {
  expandedIds: string[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const toExpandedIds = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item, index, items) => item.length > 0 && items.indexOf(item) === index);
};

/**
 * localStorage へ保存する展開状態を正規化する。
 */
export const normalizeLayoutSidebarTreeState = (value: unknown): LayoutSidebarTreeState => {
  if (!isRecord(value)) {
    return { expandedIds: [] };
  }

  return {
    expandedIds: toExpandedIds(value['expandedIds']),
  };
};

/**
 * Storage から展開状態を読み出す。
 */
export const readLayoutSidebarTreeState = (storage: Storage | null): LayoutSidebarTreeState => {
  if (storage === null) {
    return { expandedIds: [] };
  }

  try {
    const raw = storage.getItem(LAYOUT_SIDEBAR_TREE_STATE_STORAGE_KEY);
    if (typeof raw !== 'string' || raw.length === 0) {
      return { expandedIds: [] };
    }

    const parsed: unknown = JSON.parse(raw);
    return normalizeLayoutSidebarTreeState(parsed);
  } catch {
    return { expandedIds: [] };
  }
};

/**
 * Storage へ展開状態を書き込む。
 */
export const writeLayoutSidebarTreeState = (
  storage: Storage | null,
  state: LayoutSidebarTreeState,
): void => {
  if (storage === null) {
    return;
  }

  const normalized = normalizeLayoutSidebarTreeState(state);

  try {
    storage.setItem(LAYOUT_SIDEBAR_TREE_STATE_STORAGE_KEY, JSON.stringify(normalized));
  } catch {
    /* localStorage へ書き込めない環境では黙って無視する */
  }
};

/**
 * 現在地の展開状態を壊さずに、保存済み expandedIds をマージする。
 */
export const mergeLayoutSidebarTreeState = (
  nodes: TreeNode[],
  expandedIds: readonly string[],
): TreeNode[] => {
  const expandedSet = new Set(expandedIds);

  const mergeNode = (node: TreeNode): TreeNode => {
    const { children } = node;
    const hasChildren = Array.isArray(children) && children.length > 0;

    if (!hasChildren) {
      return { ...node };
    }

    return {
      ...node,
      expanded: Boolean(node.expanded) || expandedSet.has(node.id),
      children: children.map((child) => mergeNode(child)),
    };
  };

  return nodes.map((node) => mergeNode(node));
};
