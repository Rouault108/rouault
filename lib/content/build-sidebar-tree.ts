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

interface SidebarBranchNode {
  kind: 'branch';
  id: string;
  label: string;
  icon?: string;
  children: TreeNode[];
}

const normalizeSegmentLabel = (segment: string): string =>
  segment
    .replace(/[-_]+/g, ' ')
    .trim()
    .replace(/\b\p{Letter}/gu, (value) => value.toUpperCase());

const getDirectoryIndexNodeId = (directoryPath: string): string => `${directoryPath}/__index__`;

const findBranchNodeById = (
  nodes: TreeNode[],
  id: string,
): SidebarBranchNode | null => {
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

const ensureDirectoryNode = (
  nodes: TreeNode[],
  id: string,
  label: string,
  icon?: string,
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
  icon?: string,
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

export const buildSidebarTree = (
  notes: SidebarSourceNote[],
  _selectedSlug = '',
  rootSlug = '',
): TreeNode[] => {
  const roots: TreeNode[] = [];

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
        const currentPath = parentPath.length > 0 ? `${parentPath}/${segment}` : segment;
        const directoryIcon = note.sidebarDirectoryIcons?.[currentPath];
        const node = ensureDirectoryNode(
          currentChildren,
          currentPath,
          normalizeSegmentLabel(segment),
          directoryIcon,
        );

        currentChildren = node.children;
        parentPath = currentPath;
      }

      const lastSegment = segments[segments.length - 1];
      if (!lastSegment) {
        continue;
      }

      upsertLeafNode(
        currentChildren,
        getDirectoryIndexNodeId(directoryPath),
        normalizeSegmentLabel(lastSegment),
        note.permalink.trim(),
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
          normalizeSegmentLabel(segment),
          directoryIcon,
        );
        currentChildren = node.children;
        parentPath = currentPath;
        continue;
      }

      upsertLeafNode(
        currentChildren,
        slug,
        candidateTitle,
        note.permalink.trim(),
        note.sidebarResolvedIcon,
      );
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
