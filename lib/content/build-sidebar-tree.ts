import type { TreeNode } from '../../src/components/ui/file-tree/file-tree.js';

export interface SidebarSourceNote {
  rawSlug?: string;
  slug?: string;
  title?: string;
  permalink?: string;
  noteKind?: 'leaf' | 'directory-index';
  directoryPath?: string;
  sidebarResolvedIcon?: string;
  sidebarDirectoryIcons?: Record<string, string>;
}

interface SidebarMutableNode extends TreeNode {
  children?: SidebarMutableNode[];
}

const normalizeSegmentLabel = (segment: string): string =>
  segment
    .replace(/[-_]+/g, ' ')
    .trim()
    .replace(/\b\p{Letter}/gu, (value) => value.toUpperCase());

const getDirectoryIndexNodeId = (directoryPath: string): string =>
  `${directoryPath}/__index__`;

const resolveSelectedNodeId = (
  notes: SidebarSourceNote[],
  selectedSlug: string,
): string => {
  const normalized = selectedSlug.trim();
  if (normalized.length === 0) {
    return '';
  }

  const selectedNote = notes.find(
    (note) => typeof note.slug === 'string' && note.slug.trim() === normalized,
  );

  if (selectedNote?.noteKind === 'directory-index') {
    const directoryPath =
      typeof selectedNote.directoryPath === 'string' &&
      selectedNote.directoryPath.trim().length > 0
        ? selectedNote.directoryPath.trim()
        : normalized;

    return getDirectoryIndexNodeId(directoryPath);
  }

  return normalized;
};

const findNodeById = (nodes: SidebarMutableNode[], id: string): SidebarMutableNode | null => {
  for (const node of nodes) {
    if (node.id === id) {
      return node;
    }
    if (Array.isArray(node.children)) {
      const found = findNodeById(node.children, id);
      if (found) {
        return found;
      }
    }
  }
  return null;
};

const markExpandedPath = (nodes: SidebarMutableNode[], selectedId: string): boolean => {
  for (const node of nodes) {
    if (node.id === selectedId) {
      return true;
    }
    if (Array.isArray(node.children) && node.children.length > 0) {
      const containsSelected = markExpandedPath(node.children, selectedId);
      if (containsSelected) {
        node.expanded = true;
        return true;
      }
    }
  }
  return false;
};

const ensureDirectoryNode = (
  nodes: SidebarMutableNode[],
  id: string,
  label: string,
  icon?: string,
): SidebarMutableNode => {
  const existing = findNodeById(nodes, id);
  if (existing !== null) {
    existing.label = label;
    if (typeof icon === 'string' && typeof existing.icon !== 'string') {
      existing.icon = icon;
    }
    existing.children = existing.children ?? [];

    delete existing.href;
    existing.selected = false;

    return existing;
  }

  const created: SidebarMutableNode = {
    id,
    label,
    ...(typeof icon === 'string' ? { icon } : {}),
    selected: false,
    expanded: false,
    children: [],
  };
  nodes.push(created);
  return created;
};

export const buildSidebarTree = (
  notes: SidebarSourceNote[],
  selectedSlug = '',
  rootSlug = '',
): TreeNode[] => {
  const roots: SidebarMutableNode[] = [];
  const selectedNodeId = resolveSelectedNodeId(notes, selectedSlug);

  for (const note of notes) {
    if (typeof note.slug !== 'string' || note.slug.trim().length === 0) {
      continue;
    }
    if (typeof note.permalink !== 'string' || note.permalink.trim().length === 0) {
      continue;
    }

    const slug = note.slug.trim();
    const candidateTitle =
      typeof note.title === 'string' && note.title.trim().length > 0
        ? note.title.trim()
        : normalizeSegmentLabel(slug.split('/').pop() ?? slug);

    if (note.noteKind === 'directory-index') {
      const directoryPath =
        typeof note.directoryPath === 'string' && note.directoryPath.trim().length > 0
          ? note.directoryPath.trim()
          : slug;

      const segments = directoryPath.split('/').filter((segment) => segment.length > 0);
      if (segments.length === 0) {
        continue;
      }

      let currentChildren = roots;
      let parentPath = '';

      for (const segment of segments) {
        if (!segment) {
          continue;
        }

        const currentPath = parentPath.length > 0 ? `${parentPath}/${segment}` : segment;
        const directoryIcon = note.sidebarDirectoryIcons?.[currentPath];
        const node = ensureDirectoryNode(
          currentChildren,
          currentPath,
          normalizeSegmentLabel(segment),
          directoryIcon,
        );

        currentChildren = node.children ?? [];
        node.children = currentChildren;
        parentPath = currentPath;
      }

      const lastSegment = segments[segments.length - 1];
      if (lastSegment === undefined) {
        throw new Error('segments must not be empty');
      }

      const indexNodeId = getDirectoryIndexNodeId(directoryPath);

      let indexNode = findNodeById(currentChildren, indexNodeId);
      if (indexNode === null) {
        indexNode = {
          id: indexNodeId,
          label: normalizeSegmentLabel(lastSegment),
          ...(typeof note.sidebarResolvedIcon === 'string'
            ? { icon: note.sidebarResolvedIcon }
            : {}),
          href: note.permalink.trim(),
          selected: indexNodeId === selectedNodeId,
          expanded: false,
        };
        currentChildren.push(indexNode);
      } else {
        indexNode.label = normalizeSegmentLabel(lastSegment);
        indexNode.href = note.permalink.trim();
        indexNode.selected = indexNodeId === selectedNodeId;
        if (typeof note.sidebarResolvedIcon === 'string') {
          indexNode.icon = note.sidebarResolvedIcon;
        }
      }

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
          normalizeSegmentLabel(segment),
          directoryIcon,
        );
        currentChildren = node.children ?? [];
        node.children = currentChildren;
        parentPath = currentPath;
        continue;
      }

      let node = findNodeById(currentChildren, slug);
      if (node === null) {
        node = {
          id: slug,
          label: candidateTitle,
          ...(typeof note.sidebarResolvedIcon === 'string'
            ? { icon: note.sidebarResolvedIcon }
            : {}),
          href: note.permalink.trim(),
          selected: slug === selectedNodeId,
          expanded: false,
        };
        currentChildren.push(node);
      } else {
        node.label = candidateTitle;
        node.href = note.permalink.trim();
        node.selected = slug === selectedNodeId;
        if (typeof note.sidebarResolvedIcon === 'string') {
          node.icon = note.sidebarResolvedIcon;
        }
      }

      parentPath = currentPath;
    }
  }

  if (selectedNodeId.length > 0) {
    const selectedNode = findNodeById(roots, selectedNodeId);
    if (selectedNode) {
      selectedNode.selected = true;
      if (Array.isArray(selectedNode.children) && selectedNode.children.length > 0) {
        selectedNode.expanded = true;
      }
      markExpandedPath(roots, selectedNodeId);
    }
  }

  const isDirectoryIndexNode = (node: SidebarMutableNode): boolean =>
    node.id.endsWith('/__index__');

  const sortNodes = (nodes: SidebarMutableNode[]): void => {
    nodes.sort((first, second) => {
      const firstIsIndex = isDirectoryIndexNode(first);
      const secondIsIndex = isDirectoryIndexNode(second);
      if (firstIsIndex && !secondIsIndex) return -1;
      if (!firstIsIndex && secondIsIndex) return 1;

      const firstHasChildren = Array.isArray(first.children) && first.children.length > 0;
      const secondHasChildren = Array.isArray(second.children) && second.children.length > 0;
      if (firstHasChildren && !secondHasChildren) return -1;
      if (!firstHasChildren && secondHasChildren) return 1;
      return 0;
    });

    for (const node of nodes) {
      if (Array.isArray(node.children) && node.children.length > 0) {
        sortNodes(node.children);
      }
    }
  };

  sortNodes(roots);

  if (rootSlug.length > 0) {
    const rootNode = findNodeById(roots, rootSlug);
    return rootNode ? [rootNode] : [];
  }

  return roots;
};