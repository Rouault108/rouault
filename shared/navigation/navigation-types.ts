import type { TreeNode } from './tree-node.js';
import type { IconName } from '../icons/icons-catalog.js';
import type { NoteContentKind } from '../note/note-kind.js';

export type NoteNavigationKind = 'leaf' | 'directory-index';
export type SidebarScope = 'global' | 'self';

export interface NormalizedNotePath {
  rawSlug: string;
  slug: string;
  permalink: string;
  kind: NoteNavigationKind;
  directoryPath?: string;
}

export interface NormalizeNotePathInput {
  requestedSlug: string;
  hasLeaf: boolean;
  hasDirectoryIndex: boolean;
}

export interface SidebarScopeRule {
  directoryPath: string;
  scope: SidebarScope;
}

export interface NoteNavigationEntry {
  slug?: string;
  title?: string;
  permalink?: string;
  noteKind?: NoteNavigationKind;
  directoryPath?: string;
  sidebarRoot?: string;
  sidebarResolvedIcon?: IconName;
  sidebarDirectoryIcons?: Record<string, IconName>;
  kind?: NoteContentKind;
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface SidebarNavRow {
  id: string;
  label: string;
  kind: TreeNode['kind'];
  href?: string;
  icon?: IconName;
  depth: number;
  isCurrent: boolean;
  hasCurrentDescendant: boolean;
  isInitiallyExpanded: boolean;
  children: readonly SidebarNavRow[];
}

export interface NoteNavigationModel {
  sidebarTree: TreeNode[];
  sidebarRows: readonly SidebarNavRow[];
  selectedId: string | null;
  initialExpandedIds: readonly string[];
  topologyRevision: string;
  breadcrumbs: BreadcrumbItem[];
}

export interface BuildNoteNavigationModelInput {
  currentNote?: NoteNavigationEntry | null | undefined;
  notes?: readonly NoteNavigationEntry[] | undefined;
}
