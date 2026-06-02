import type {
  DEFAULT_SIDEBAR_FIXED_BREAKPOINT,
  DEFAULT_SIDEBAR_ID,
  DEFAULT_SIDEBAR_PRESENTATION,
  DEFAULT_SIDEBAR_STATE_SCOPE_ID,
} from './sidebar-shell-defaults.js';

export type SidebarPresentation = 'auto' | 'fixed' | 'overlay';

export interface PresentSidebarShellProjection {
  present: true;
  sidebarId: string;
  stateScopeId: string;
  selectedId: string | null;
  initialExpandedIds: string[];
  topologyRevision: string;
  navHtml: string;
  heading: string | null;
  fixedBreakpoint: number;
  presentation: SidebarPresentation;
}

export interface AbsentRuntimeSidebarShellProjection {
  present: false;
  sidebarId: typeof DEFAULT_SIDEBAR_ID;
  stateScopeId: typeof DEFAULT_SIDEBAR_STATE_SCOPE_ID;
  selectedId: null;
  initialExpandedIds: [];
  topologyRevision: null;
  navHtml: null;
  heading: null;
  fixedBreakpoint: typeof DEFAULT_SIDEBAR_FIXED_BREAKPOINT;
  presentation: typeof DEFAULT_SIDEBAR_PRESENTATION;
}

export type PayloadSidebarShellProjection = PresentSidebarShellProjection;

export type RuntimeSidebarShellSnapshot =
  | PresentSidebarShellProjection
  | AbsentRuntimeSidebarShellProjection;

export interface NavigationShellSnapshot {
  headerHtml: string;
  sidebarProjection: PayloadSidebarShellProjection | null;
}
