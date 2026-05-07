import type { TocPresence } from '../note/toc-presence.js';

export interface HeaderShellProjection {
  corpora: {
    key: string;
    label: string;
    href: string;
  }[];
  currentCorpusKey: string;
  noteLayout: boolean;
  sidebarEnabled: boolean;
  tocPresence: TocPresence;
  tocRuntimeId?: string | null;
  tocOwnerId?: string | null;
  tocTriggerReserved?: boolean;
}

export interface SidebarShellProjection {
  present: boolean;
  sidebarId: string;
  stateScopeId: string;
  selectedId: string | null;
  initialExpandedIds: string[];
  topologyRevision: string | null;
  navHtml: string | null;
  heading: string | null;
  fixedBreakpoint: number;
  presentation: 'auto' | 'fixed' | 'overlay';
}

export interface ShellProjectionSnapshot {
  header: HeaderShellProjection;
  sidebar: SidebarShellProjection | null;
}
