export interface HeaderShellProjection {
  breadcrumbs: {
    label: string;
    href?: string;
  }[];
  corpora: {
    key: string;
    label: string;
    href: string;
  }[];
  currentCorpusKey: string;
  noteLayout: boolean;
  sidebarEnabled: boolean;
}

export interface SidebarShellProjection {
  present: boolean;
  sidebarId: string;
  stateScopeId: string;
  selectedId: string | null;
  structuralExpandedIds: string[];
  topologyRevision: string | null;
  navHtml: string | null;
  heading: string;
  fixedBreakpoint: number;
  itemsJson: string;
  presentation: 'auto' | 'fixed' | 'overlay';
}

export interface ShellProjectionSnapshot {
  header: HeaderShellProjection;
  sidebar: SidebarShellProjection | null;
}
