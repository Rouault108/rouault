import type { TocPresence } from '../note/toc-presence.js';
import type {
  CorpusNavigationItem,
  CorpusNavigationProjectionPayload,
} from './corpus-navigation-projection.js';
import type {
  DEFAULT_SIDEBAR_FIXED_BREAKPOINT,
  DEFAULT_SIDEBAR_ID,
  DEFAULT_SIDEBAR_PRESENTATION,
  DEFAULT_SIDEBAR_STATE_SCOPE_ID,
} from './sidebar-shell-defaults.js';

export type SidebarPresentation = 'auto' | 'fixed' | 'overlay';

export interface HeaderShellProjection {
  corpora: CorpusNavigationProjectionPayload | readonly CorpusNavigationItem[];
  currentCorpusKey: string;
  noteLayout: boolean;
  sidebarEnabled: boolean;
  sidebarId: string;
  tocPresence: TocPresence;
  tocRuntimeId: string | null;
  tocOwnerId: string | null;
  tocTriggerReserved: boolean;
}

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

/** @deprecated Use PayloadSidebarShellProjection or RuntimeSidebarShellSnapshot explicitly. */
export type SidebarShellProjection = RuntimeSidebarShellSnapshot;

export interface ShellProjectionSnapshot {
  header: HeaderShellProjection;
  sidebar: PayloadSidebarShellProjection | null;
}
