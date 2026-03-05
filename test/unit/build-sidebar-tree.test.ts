import { expect } from '@open-wc/testing';
import { buildSidebarTree } from '../../lib/content/build-sidebar-tree.js';

interface SidebarTreeNode {
  id: string;
  label: string;
  selected?: boolean;
  expanded?: boolean;
  children?: SidebarTreeNode[];
}

const findNode = (nodes: SidebarTreeNode[], id: string): SidebarTreeNode | null => {
  for (const node of nodes) {
    if (node.id === id) {
      return node;
    }
    if (Array.isArray(node.children)) {
      const found = findNode(node.children, id);
      if (found) {
        return found;
      }
    }
  }
  return null;
};

describe('buildSidebarTree', () => {
  it('slugから階層ツリーを生成できること', () => {
    const tree = buildSidebarTree([
      {
        slug: 'music/classical/tchaikovsky/the-nutcracker',
        title: '楽曲分析: くるみ割り人形',
        permalink: '/notes/music/classical/tchaikovsky/the-nutcracker',
      },
      {
        slug: 'computer-science/algorithms/sorting',
        title: 'ソートアルゴリズム比較',
        permalink: '/notes/computer-science/algorithms/sorting',
      },
    ]);

    expect(findNode(tree as SidebarTreeNode[], 'music')).to.not.equal(null);
    expect(findNode(tree as SidebarTreeNode[], 'music/classical')).to.not.equal(null);
    expect(findNode(tree as SidebarTreeNode[], 'computer-science')).to.not.equal(null);

    const leaf = findNode(
      tree as SidebarTreeNode[],
      'music/classical/tchaikovsky/the-nutcracker',
    );
    expect(leaf?.label).to.equal('楽曲分析: くるみ割り人形');
  });

  it('選択中ノートの祖先を展開しselectedを付与すること', () => {
    const selectedSlug = 'music/classical/tchaikovsky/the-nutcracker';
    const tree = buildSidebarTree(
      [
        {
          slug: selectedSlug,
          title: '楽曲分析: くるみ割り人形',
          permalink: '/notes/music/classical/tchaikovsky/the-nutcracker',
        },
      ],
      selectedSlug,
    );

    const selectedNode = findNode(tree as SidebarTreeNode[], selectedSlug);
    const parentNode = findNode(tree as SidebarTreeNode[], 'music/classical/tchaikovsky');

    expect(selectedNode?.selected).to.equal(true);
    expect(parentNode?.expanded).to.equal(true);
  });
});
