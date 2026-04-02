import type { IconName } from '../icons/icons-catalog.js';

export type TreeIcon = IconName;

interface TreeNodeBase {
  id: string;
  label: string;
  icon?: TreeIcon;
}

export interface BranchNode extends TreeNodeBase {
  kind: 'branch';
  children: readonly TreeNode[];
  href?: never;
}

export interface LeafNode extends TreeNodeBase {
  kind: 'leaf';
  href: string;
  children?: never;
}

export type TreeNode = BranchNode | LeafNode;
