import type { TreeNode } from '../../shared/navigation/tree-node.js';
import { normalizeNoteContentKind } from '../../shared/note/note-kind.js';
import { resolveEffectiveNoteChromeProfile } from '../../shared/note/note-chrome-profile.js';
import { resolveNoteChromePolicy } from '../../shared/note/note-chrome-policy.js';
import { normalizeNoteNavigationUrl } from '../../shared/navigation/normalize-note-navigation-url.js';
import {
  buildDirectoryLabelMap,
  normalizeSegmentLabel,
  resolveDirectoryLabel,
  resolveNoteLabel,
} from './resolve-navigation-label.js';
import {
  createDirectoryIndexNodeId,
  resolveSelectedSidebarNodeId,
} from '../../shared/navigation/sidebar-node-id.js';
import type {
  BreadcrumbItem,
  BuildNoteNavigationModelInput,
  NoteNavigationEntry,
  NoteNavigationModel,
  SidebarNavRow,
} from '../../shared/navigation/navigation-types.js';

interface SidebarBranchNode {
  kind: 'branch';
  id: string;
  label: string;
  icon?: NonNullable<NoteNavigationEntry['sidebarResolvedIcon']>;
  children: TreeNode[];
}

const toTrimmedString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const resolvePermalink = (note: Pick<NoteNavigationEntry, 'slug' | 'permalink'>): string => {
  const permalink = toTrimmedString(note.permalink);
  if (permalink.length > 0) {
    return normalizeNoteNavigationUrl(permalink);
  }

  const slug = toTrimmedString(note.slug);
  return slug.length > 0 ? normalizeNoteNavigationUrl(`/notes/${slug}`) : '';
};

const findBranchNodeById = (nodes: TreeNode[], id: string): SidebarBranchNode | null => {
  for (const node of nodes) {
    if (node.id === id && node.kind === 'branch') {
      return node as SidebarBranchNode;
    }

    if (node.kind === 'branch') {
      const found = findBranchNodeById(node.children as TreeNode[], id);
      if (found !== null) {
        return found;
      }
    }
  }

  return null;
};

const findNodeById = (nodes: TreeNode[], id: string): TreeNode | null => {
  for (const node of nodes) {
    if (node.id === id) {
      return node;
    }

    if (node.kind === 'branch') {
      const found = findNodeById(node.children as TreeNode[], id);
      if (found !== null) {
        return found;
      }
    }
  }

  return null;
};

const collectSelectedAncestors = (
  nodes: readonly TreeNode[],
  selectedId: string | null,
  path: readonly string[] = [],
): string[] | null => {
  if (selectedId === null) {
    return null;
  }

  for (const node of nodes) {
    if (node.id === selectedId) {
      return [...path];
    }

    if (node.kind !== 'branch') {
      continue;
    }

    const nextPath = [...path, node.id];
    const result = collectSelectedAncestors(node.children, selectedId, nextPath);
    if (result !== null) {
      return result;
    }
  }

  return null;
};

const buildSidebarRows = (
  nodes: readonly TreeNode[],
  options: {
    selectedId: string | null;
    currentAncestorIds: ReadonlySet<string>;
    initialExpandedIds: ReadonlySet<string>;
    depth?: number;
  },
): SidebarNavRow[] => {
  const depth = options.depth ?? 0;

  return nodes.map((node) => ({
    id: node.id,
    label: node.label,
    kind: node.kind,
    ...(node.kind === 'leaf' ? { href: node.href } : {}),
    ...(typeof node.icon === 'string' ? { icon: node.icon } : {}),
    depth,
    isCurrent: node.id === options.selectedId,
    hasCurrentDescendant: node.kind === 'branch' ? options.currentAncestorIds.has(node.id) : false,
    isInitiallyExpanded: node.kind === 'branch' ? options.initialExpandedIds.has(node.id) : false,
    children:
      node.kind === 'branch'
        ? buildSidebarRows(node.children, {
            selectedId: options.selectedId,
            currentAncestorIds: options.currentAncestorIds,
            initialExpandedIds: options.initialExpandedIds,
            depth: depth + 1,
          })
        : [],
  }));
};

const toTopologySnapshot = (nodes: readonly TreeNode[]): unknown[] =>
  nodes.map((node) => ({
    id: node.id,
    label: node.label,
    kind: node.kind,
    ...(typeof node.icon === 'string' ? { icon: node.icon } : {}),
    ...(node.kind === 'leaf'
      ? { href: node.href }
      : { children: toTopologySnapshot(node.children) }),
  }));

const createTopologyRevision = (nodes: readonly TreeNode[]): string =>
  JSON.stringify(toTopologySnapshot(nodes));

const ensureDirectoryNode = (
  nodes: TreeNode[],
  id: string,
  label: string,
  icon?: NoteNavigationEntry['sidebarResolvedIcon'],
): SidebarBranchNode => {
  const existing = findBranchNodeById(nodes, id);
  if (existing !== null) {
    existing.label = label;
    if (typeof icon === 'string' && typeof existing.icon !== 'string') {
      existing.icon = icon;
    }
    return existing;
  }

  const created: SidebarBranchNode = {
    kind: 'branch',
    id,
    label,
    ...(typeof icon === 'string' ? { icon } : {}),
    children: [],
  };
  nodes.push(created);
  return created;
};

const upsertLeafNode = (
  nodes: TreeNode[],
  id: string,
  label: string,
  href: string,
  icon?: NoteNavigationEntry['sidebarResolvedIcon'],
): void => {
  const existing = findNodeById(nodes, id);
  if (existing !== null && existing.kind === 'leaf') {
    existing.label = label;
    existing.href = href;
    if (typeof icon === 'string') {
      existing.icon = icon;
    }
    return;
  }

  nodes.push({
    kind: 'leaf',
    id,
    label,
    href,
    ...(typeof icon === 'string' ? { icon } : {}),
  });
};

const isSidebarVisible = (note: NoteNavigationEntry): boolean =>
  resolveNoteChromePolicy(resolveEffectiveNoteChromeProfile(note.kind, note.chromeProfile)).sidebar;

const isBreadcrumbVisible = (note: NoteNavigationEntry): boolean =>
  resolveNoteChromePolicy(resolveEffectiveNoteChromeProfile(note.kind, note.chromeProfile))
    .breadcrumb;

const mergeCurrentNoteIntoSidebarNotes = (
  currentNote: NoteNavigationEntry | null | undefined,
  notes: readonly NoteNavigationEntry[],
): NoteNavigationEntry[] => {
  const currentKind = normalizeNoteContentKind(currentNote?.kind);
  const base = notes.filter(
    (note) => isSidebarVisible(note) && normalizeNoteContentKind(note.kind) === currentKind,
  );

  if (!currentNote || !isSidebarVisible(currentNote)) {
    return [...base];
  }

  const slug = toTrimmedString(currentNote.slug);
  if (slug.length === 0) {
    return [...base];
  }

  const currentEntry: NoteNavigationEntry = {
    slug,
    permalink: resolvePermalink(currentNote),
    ...(typeof currentNote.title === 'string' && currentNote.title.trim().length > 0
      ? { title: currentNote.title.trim() }
      : {}),
    ...(currentNote.noteKind === 'leaf' || currentNote.noteKind === 'directory-index'
      ? { noteKind: currentNote.noteKind }
      : {}),
    ...(typeof currentNote.directoryPath === 'string' && currentNote.directoryPath.trim().length > 0
      ? { directoryPath: currentNote.directoryPath.trim() }
      : currentNote.noteKind === 'directory-index'
        ? { directoryPath: slug }
        : {}),
    ...(typeof currentNote.sidebarResolvedIcon === 'string'
      ? { sidebarResolvedIcon: currentNote.sidebarResolvedIcon }
      : {}),
    ...(currentNote.sidebarDirectoryIcons !== undefined
      ? { sidebarDirectoryIcons: currentNote.sidebarDirectoryIcons }
      : {}),
    ...(currentNote.kind !== undefined ? { kind: currentNote.kind } : {}),
    ...(currentNote.chromeProfile !== undefined ? { chromeProfile: currentNote.chromeProfile } : {}),
  };

  const alreadyIncluded = base.some((note) => {
    const noteSlug = toTrimmedString(note.slug);
    const noteDirectoryPath = toTrimmedString(note.directoryPath);

    if (currentEntry.noteKind === 'directory-index') {
      return (
        note.noteKind === 'directory-index' &&
        noteSlug === slug &&
        noteDirectoryPath === toTrimmedString(currentEntry.directoryPath) &&
        resolvePermalink(note) === currentEntry.permalink
      );
    }

    return noteSlug === slug && note.noteKind !== 'directory-index';
  });

  return alreadyIncluded ? [...base] : [...base, currentEntry];
};

const buildSidebarTree = (notes: readonly NoteNavigationEntry[], rootSlug: string): TreeNode[] => {
  const roots: TreeNode[] = [];
  const directoryLabelMap = buildDirectoryLabelMap(notes);

  for (const note of notes) {
    const slug = toTrimmedString(note.slug);
    const href = resolvePermalink(note);
    if (slug.length === 0 || href.length === 0) {
      continue;
    }

    const candidateTitle = resolveNoteLabel(note, directoryLabelMap);

    if (note.noteKind === 'directory-index') {
      const directoryPath = toTrimmedString(note.directoryPath) || slug;
      const segments = directoryPath.split('/').filter((segment) => segment.length > 0);
      if (segments.length === 0) {
        continue;
      }

      let currentChildren = roots;
      let parentPath = '';

      for (const segment of segments) {
        const currentPath = parentPath.length > 0 ? `${parentPath}/${segment}` : segment;
        const directoryIcon = note.sidebarDirectoryIcons?.[currentPath];
        const node = ensureDirectoryNode(
          currentChildren,
          currentPath,
          resolveDirectoryLabel(currentPath, directoryLabelMap),
          directoryIcon,
        );

        currentChildren = node.children;
        parentPath = currentPath;
      }

      upsertLeafNode(
        currentChildren,
        createDirectoryIndexNodeId(directoryPath),
        resolveDirectoryLabel(directoryPath, directoryLabelMap),
        href,
        note.sidebarResolvedIcon,
      );
      continue;
    }

    const segments = slug.split('/').filter((segment) => segment.length > 0);
    if (segments.length === 0) {
      continue;
    }

    let currentChildren = roots;
    let parentPath = '';

    for (let index = 0; index < segments.length; index += 1) {
      const segment = segments[index];
      if (!segment) {
        continue;
      }

      const currentPath = parentPath.length > 0 ? `${parentPath}/${segment}` : segment;
      const isLeaf = index === segments.length - 1;
      if (!isLeaf) {
        const directoryIcon = note.sidebarDirectoryIcons?.[currentPath];
        const node = ensureDirectoryNode(
          currentChildren,
          currentPath,
          resolveDirectoryLabel(currentPath, directoryLabelMap),
          directoryIcon,
        );
        currentChildren = node.children;
        parentPath = currentPath;
        continue;
      }

      upsertLeafNode(currentChildren, slug, candidateTitle, href, note.sidebarResolvedIcon);
    }
  }

  const isDirectoryIndexNode = (node: TreeNode): boolean =>
    node.kind === 'leaf' && node.id.endsWith('/__index__');

  const sortNodes = (nodes: TreeNode[]): void => {
    nodes.sort((first, second) => {
      const firstIsIndex = isDirectoryIndexNode(first);
      const secondIsIndex = isDirectoryIndexNode(second);
      if (firstIsIndex && !secondIsIndex) return -1;
      if (!firstIsIndex && secondIsIndex) return 1;

      const firstIsBranch = first.kind === 'branch';
      const secondIsBranch = second.kind === 'branch';
      if (firstIsBranch && !secondIsBranch) return -1;
      if (!firstIsBranch && secondIsBranch) return 1;
      return 0;
    });

    for (const node of nodes) {
      if (node.kind === 'branch') {
        sortNodes(node.children as TreeNode[]);
      }
    }
  };

  sortNodes(roots);

  if (rootSlug.length > 0) {
    const rootNode = findNodeById(roots, rootSlug);
    return rootNode && rootNode.kind === 'branch' ? [rootNode] : [];
  }

  return roots;
};

const buildBreadcrumbs = (
  currentNote: NoteNavigationEntry | null | undefined,
  notes: readonly NoteNavigationEntry[],
): BreadcrumbItem[] => {
  const slug = toTrimmedString(currentNote?.slug);
  if (slug.length === 0 || !currentNote || !isBreadcrumbVisible(currentNote)) {
    return [];
  }

  const segments = slug.split('/').filter((segment) => segment.length > 0);
  if (segments.length === 0) {
    return [];
  }

  const directoryLabelMap = buildDirectoryLabelMap(
    currentNote.noteKind === 'directory-index' ? [...notes, currentNote] : notes,
  );
  const directoryIndexMap = new Map<string, { label: string; href?: string }>();

  for (const entry of notes) {
    if (entry.noteKind !== 'directory-index') {
      continue;
    }

    const directoryPath = toTrimmedString(entry.directoryPath) || toTrimmedString(entry.slug);
    if (directoryPath.length === 0) {
      continue;
    }

    const href = resolvePermalink(entry);
    directoryIndexMap.set(directoryPath, {
      label: resolveDirectoryLabel(directoryPath, directoryLabelMap),
      ...(href.length > 0 ? { href } : {}),
    });
  }

  const breadcrumbs: BreadcrumbItem[] = [{ label: 'Notes', href: '/' }];

  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    if (!segment) {
      continue;
    }

    const currentPath = segments.slice(0, index + 1).join('/');
    const isLast = index === segments.length - 1;

    if (isLast) {
      if (currentNote.noteKind === 'directory-index') {
        breadcrumbs.push({
          label: resolveDirectoryLabel(currentPath, directoryLabelMap),
        });
        continue;
      }

      const title = toTrimmedString(currentNote.title);
      breadcrumbs.push({
        label: title.length > 0 ? title : normalizeSegmentLabel(segment),
      });
      continue;
    }

    const linkedDirectory = directoryIndexMap.get(currentPath);
    if (linkedDirectory !== undefined) {
      breadcrumbs.push({
        label: linkedDirectory.label,
        ...(linkedDirectory.href !== undefined ? { href: linkedDirectory.href } : {}),
      });
      continue;
    }

    breadcrumbs.push({ label: normalizeSegmentLabel(segment) });
  }

  return breadcrumbs;
};

export const buildNoteNavigationModel = ({
  currentNote,
  notes = [],
}: BuildNoteNavigationModelInput): NoteNavigationModel => {
  const sidebarNotes = mergeCurrentNoteIntoSidebarNotes(currentNote, notes);
  const rootSlug = toTrimmedString(currentNote?.sidebarRoot);
  const sidebarTree = buildSidebarTree(sidebarNotes, rootSlug);
  const selectedId = resolveSelectedSidebarNodeId(currentNote);
  const initialExpandedIds = collectSelectedAncestors(sidebarTree, selectedId) ?? [];
  const currentAncestorSet = new Set(initialExpandedIds);
  const initialExpandedSet = new Set(initialExpandedIds);

  return {
    sidebarTree,
    sidebarRows: buildSidebarRows(sidebarTree, {
      selectedId,
      currentAncestorIds: currentAncestorSet,
      initialExpandedIds: initialExpandedSet,
    }),
    selectedId,
    initialExpandedIds,
    topologyRevision: createTopologyRevision(sidebarTree),
    breadcrumbs: buildBreadcrumbs(currentNote, notes),
  };
};
