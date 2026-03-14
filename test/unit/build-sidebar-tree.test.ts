import { expect } from '@open-wc/testing';
import { buildSidebarTree } from '../../lib/content/build-sidebar-tree.js';

interface SidebarTreeNode {
  id: string;
  label: string;
  icon?: string;
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

  it('rootSlug 指定時は起点ディレクトリ自身を含むこと', () => {
    const tree = buildSidebarTree(
      [
        {
          slug: 'music/classical/beethoven/fidelio',
          title: 'フィデリオ',
          permalink: '/notes/music/classical/beethoven/fidelio',
        },
        {
          slug: 'music/classical/beethoven/symphony-9',
          title: '交響曲第9番',
          permalink: '/notes/music/classical/beethoven/symphony-9',
        },
        {
          slug: 'music/classical/tchaikovsky/the-nutcracker',
          title: '楽曲分析: くるみ割り人形',
          permalink: '/notes/music/classical/tchaikovsky/the-nutcracker',
        },
      ],
      '',
      'music/classical/beethoven',
    );

    expect(findNode(tree as SidebarTreeNode[], 'music')).to.equal(null);
    expect(findNode(tree as SidebarTreeNode[], 'music/classical/tchaikovsky')).to.equal(null);
    expect(tree).to.have.length(1);
    expect(tree[0]?.id).to.equal('music/classical/beethoven');
    expect(findNode(tree as SidebarTreeNode[], 'music/classical/beethoven/fidelio')).to.not.equal(null);
    expect(findNode(tree as SidebarTreeNode[], 'music/classical/beethoven/symphony-9')).to.not.equal(null);
  });

  it('rootSlug 指定後も選択中ノートまでの展開状態を維持すること', () => {
    const selectedSlug = 'music/classical/beethoven/symphonies/symphony-9';
    const tree = buildSidebarTree(
      [
        {
          slug: selectedSlug,
          title: '交響曲第9番',
          permalink: '/notes/music/classical/beethoven/symphonies/symphony-9',
        },
        {
          slug: 'music/classical/beethoven/overtures/egmont',
          title: 'エグモント序曲',
          permalink: '/notes/music/classical/beethoven/overtures/egmont',
        },
      ],
      selectedSlug,
      'music/classical/beethoven',
    );

    const selectedNode = findNode(tree as SidebarTreeNode[], selectedSlug);
    const rootNode = findNode(tree as SidebarTreeNode[], 'music/classical/beethoven');
    const parentNode = findNode(tree as SidebarTreeNode[], 'music/classical/beethoven/symphonies');

    expect(rootNode?.expanded).to.equal(true);
    expect(selectedNode?.selected).to.equal(true);
    expect(parentNode?.expanded).to.equal(true);
  });

  it('記事 icon は frontmatter > ディレクトリ設定 > none の優先順位で解決すること', () => {
    const tree = buildSidebarTree([
      {
        slug: 'music/classical/mozart',
        title: 'モーツァルト',
        permalink: '/notes/music/classical/mozart',
        sidebarResolvedIcon: 'lucide:music-4',
        sidebarDirectoryIcons: {
          music: 'lucide:folder-root',
          'music/classical': 'lucide:folder-kanban',
        },
      },
      {
        slug: 'music/classical/beethoven',
        title: 'ベートーヴェン',
        permalink: '/notes/music/classical/beethoven',
        sidebarResolvedIcon: 'lucide:folder-kanban',
        sidebarDirectoryIcons: {
          music: 'lucide:folder-root',
          'music/classical': 'lucide:folder-kanban',
        },
      },
      {
        slug: 'music/jazz/kind-of-blue',
        title: 'Kind of Blue',
        permalink: '/notes/music/jazz/kind-of-blue',
      },
    ]);

    expect(findNode(tree as SidebarTreeNode[], 'music')?.icon).to.equal('lucide:folder-root');
    expect(findNode(tree as SidebarTreeNode[], 'music/classical')?.icon).to.equal('lucide:folder-kanban');
    expect(findNode(tree as SidebarTreeNode[], 'music/classical/mozart')?.icon).to.equal('lucide:music-4');
    expect(findNode(tree as SidebarTreeNode[], 'music/classical/beethoven')?.icon).to.equal(
      'lucide:folder-kanban',
    );
    expect(findNode(tree as SidebarTreeNode[], 'music/jazz')?.icon).to.equal(undefined);
    expect(findNode(tree as SidebarTreeNode[], 'music/jazz/kind-of-blue')?.icon).to.equal(undefined);
  });
});
