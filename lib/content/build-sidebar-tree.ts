import type { TreeNode } from '../../src/components/ui/file-tree/file-tree.js';

export interface SidebarSourceNote {
  slug?: string;
  title?: string;
  permalink?: string;
}

interface SidebarMutableNode extends TreeNode {
  children?: SidebarMutableNode[];
}

const normalizeSegmentLabel = (segment: string): string =>
  segment
    .replace(/[-_]+/g, ' ')
    .trim()
    .replace(/\b\p{Letter}/gu, (value) => value.toUpperCase());

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

export const buildSidebarTree = (
  notes: SidebarSourceNote[],
  selectedSlug = '',
  rootSlug = '',
): TreeNode[] => {
  const roots: SidebarMutableNode[] = [];

  for (const note of notes) {
    if (typeof note.slug !== 'string' || note.slug.trim().length === 0) {
      continue;
    }
    if (typeof note.permalink !== 'string' || note.permalink.trim().length === 0) {
      continue;
    }

    const slug = note.slug.trim();
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
      const candidateTitle =
        typeof note.title === 'string' && note.title.trim().length > 0
          ? note.title.trim()
          : normalizeSegmentLabel(segment);

      const nodeId = isLeaf ? slug : currentPath;
      let node = findNodeById(currentChildren, nodeId);

      if (node === null) {
        const createdNode: SidebarMutableNode = isLeaf
          ? {
            id: nodeId,
            label: candidateTitle,
            icon: 'lucide:file-text',
            href: note.permalink.trim(),
            selected: slug === selectedSlug,
            expanded: false,
          }
          : {
            id: nodeId,
            label: normalizeSegmentLabel(segment),
            icon: 'lucide:folder',
            selected: false,
            expanded: false,
            children: [],
          };
        node = createdNode;
        currentChildren.push(node);
      } else if (isLeaf) {
        node.label = candidateTitle;
        node.href = note.permalink.trim();
        node.selected = slug === selectedSlug;
      }

      if (!isLeaf) {
        currentChildren = node.children ?? [];
        node.children = currentChildren;
      }

      parentPath = currentPath;
    }
  }

  if (selectedSlug.length > 0) {
    const selectedNode = findNodeById(roots, selectedSlug);
    if (selectedNode) {
      selectedNode.selected = true;
      markExpandedPath(roots, selectedSlug);
    }
  }

  const sortNodes = (nodes: SidebarMutableNode[]): void => {
    nodes.sort((first, second) => {
      const firstHasChildren = Array.isArray(first.children) && first.children.length > 0;
      const secondHasChildren = Array.isArray(second.children) && second.children.length > 0;
      if (firstHasChildren && !secondHasChildren) {
        return -1;
      }
      if (!firstHasChildren && secondHasChildren) {
        return 1;
      }
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
    return findNodeById(roots, rootSlug)?.children ?? [];
  }

  return roots;
};
