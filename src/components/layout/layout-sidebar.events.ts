import type { UiSidebarStateChangeDetail } from '../ui/sidebar-shell/sidebar-shell.js';

export const LAYOUT_SIDEBAR_TOGGLE_REQUEST_EVENT = 'layout-sidebar-toggle-request';
export const LAYOUT_SIDEBAR_STATE_CHANGE_EVENT = 'layout-sidebar-state-change';
export const LAYOUT_SIDEBAR_TREE_STATE_CHANGE_EVENT = 'layout-sidebar-tree-state-change';

export interface LayoutSidebarToggleRequestDetail {
  trigger?: HTMLElement;
}

export interface LayoutSidebarTreeStateChangeDetail {
  selectedId: string | null;
  expandedIds: string[];
}

export type LayoutSidebarStateChangeDetail = UiSidebarStateChangeDetail;
