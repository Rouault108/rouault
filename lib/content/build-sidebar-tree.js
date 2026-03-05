/**
 * @typedef {object} SidebarSourceNote
 * @property {string=} slug
 * @property {string=} title
 * @property {string=} permalink
 */

/**
 * @typedef {object} SidebarNode
 * @property {string} id
 * @property {string} label
 * @property {string=} icon
 * @property {string=} href
 * @property {boolean=} selected
 * @property {boolean=} expanded
 * @property {SidebarNode[]=} children
 */

/**
 * @param {string} segment
 * @returns {string}
 */
function normalizeSegmentLabel(segment) {
  return segment
    .replace(/[-_]+/g, ' ')
    .trim()
    .replace(/\b\p{Letter}/gu, (value) => value.toUpperCase());
}

/**
 * @param {SidebarNode[]} nodes
 * @param {string} id
 * @returns {SidebarNode | null}
 */
function findNodeById(nodes, id) {
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
}

/**
 * @param {SidebarNode[]} nodes
 * @param {string} selectedId
 * @returns {boolean}
 */
function markExpandedPath(nodes, selectedId) {
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
}

/**
 * @param {SidebarNode[]} nodes
 */
function sortNodes(nodes) {
  nodes.sort((first, second) => {
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
}

/**
 * slug配列からサイドバーツリーを構築する。
 * @param {SidebarSourceNote[]} notes
 * @param {string=} selectedSlug
 * @returns {SidebarNode[]}
 */
export function buildSidebarTree(notes, selectedSlug = '') {
  /** @type {SidebarNode[]} */
  const roots = [];

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

    /** @type {SidebarNode[]} */
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
      if (!node) {
        node = isLeaf
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
        currentChildren.push(node);
      } else if (isLeaf) {
        node.label = candidateTitle;
        node.href = note.permalink.trim();
        node.selected = slug === selectedSlug;
      }

      if (!isLeaf) {
        if (!Array.isArray(node.children)) {
          node.children = [];
        }
        currentChildren = node.children;
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

  sortNodes(roots);
  return roots;
}
