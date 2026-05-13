import {
  DEFAULT_SIDEBAR_ID,
  DEFAULT_SIDEBAR_STATE_SCOPE_ID,
} from '../../../shared/navigation/sidebar-shell-defaults.js';
import type { TreeNode } from '../ui/file-tree/file-tree.js';

export const LAYOUT_SIDEBAR_TREE_STATE_STORAGE_KEY = 'rouault.sidebar.tree-state.v1';
export const LAYOUT_SIDEBAR_TREE_STATE_STORAGE_KEY_V2 = 'rouault.sidebar.tree-state.v2';
export const LAYOUT_SIDEBAR_TREE_STATE_STORAGE_KEY_V3 = 'rouault.sidebar.tree-state.v3';

export interface LayoutSidebarTreeState {
  expandedIds: string[];
}

export interface LayoutSidebarTreeStateScope {
  sidebarId?: string | null;
  stateScopeId?: string | null;
}

const normalizeScopePart = (value: string | null | undefined, fallback: string): string => {
  if (typeof value !== 'string') {
    return fallback;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : fallback;
};

export const getLayoutSidebarTreeStateStorageKey = (
  scope: LayoutSidebarTreeStateScope = {},
): string => {
  const sidebarId = normalizeScopePart(scope.sidebarId, DEFAULT_SIDEBAR_ID);
  const stateScopeId = normalizeScopePart(scope.stateScopeId, DEFAULT_SIDEBAR_STATE_SCOPE_ID);
  return `${LAYOUT_SIDEBAR_TREE_STATE_STORAGE_KEY_V3}:${sidebarId}:${stateScopeId}`;
};

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
 * Storage から展開状態を読み出す。保存値が存在しない場合は null を返す。
 */
export const readLayoutSidebarTreeState = (
  storage: Storage | null,
  scope: LayoutSidebarTreeStateScope = {},
): LayoutSidebarTreeState | null => {
  if (storage === null) {
    return null;
  }

  try {
    const raw = storage.getItem(getLayoutSidebarTreeStateStorageKey(scope));
    if (typeof raw !== 'string' || raw.length === 0) {
      return null;
    }

    const parsed: unknown = JSON.parse(raw);
    return normalizeLayoutSidebarTreeState(parsed);
  } catch {
    return null;
  }
};

/**
 * Storage へ展開状態を書き込む。
 */
export const writeLayoutSidebarTreeState = (
  storage: Storage | null,
  state: LayoutSidebarTreeState,
  scope: LayoutSidebarTreeStateScope = {},
): void => {
  if (storage === null) {
    return;
  }

  const normalized = normalizeLayoutSidebarTreeState(state);

  try {
    storage.setItem(getLayoutSidebarTreeStateStorageKey(scope), JSON.stringify(normalized));
  } catch {
    /* localStorage へ書き込めない環境では黙って無視する */
  }
};

const collectSelectedAncestors = (
  nodes: readonly TreeNode[],
  selectedId: string | null,
  path: string[] = [],
): string[] | null => {
  if (selectedId === null) {
    return null;
  }

  for (const node of nodes) {
    if (node.id === selectedId) {
      return path;
    }

    if (node.kind === 'branch') {
      const nextPath = [...path, node.id];
      const result = collectSelectedAncestors(node.children, selectedId, nextPath);
      if (result !== null) {
        return result;
      }
    }
  }

  return null;
};

/**
 * 現在位置 selectedId を辿る祖先 branch 群を列挙する。
 */
export const collectLayoutSidebarSelectedAncestorIds = (
  nodes: readonly TreeNode[],
  selectedId: string | null,
): string[] => collectSelectedAncestors(nodes, selectedId) ?? [];
