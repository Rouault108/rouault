import { expect } from '@open-wc/testing';
import { buildSidebarTree } from '../../lib/content/build-sidebar-tree.js';

interface SidebarTreeNode {
  id: string;
  label: string;
  href?: string;
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

    const leaf = findNode(tree as SidebarTreeNode[], 'music/classical/tchaikovsky/the-nutcracker');
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
    expect(findNode(tree as SidebarTreeNode[], 'music/classical/beethoven/fidelio')).to.not.equal(
      null,
    );
    expect(
      findNode(tree as SidebarTreeNode[], 'music/classical/beethoven/symphony-9'),
    ).to.not.equal(null);
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
        sidebarResolvedIcon: 'music-4',
        sidebarDirectoryIcons: {
          music: 'folder-root',
          'music/classical': 'folder-kanban',
        },
      },
      {
        slug: 'music/classical/beethoven',
        title: 'ベートーヴェン',
        permalink: '/notes/music/classical/beethoven',
        sidebarResolvedIcon: 'folder-kanban',
        sidebarDirectoryIcons: {
          music: 'folder-root',
          'music/classical': 'folder-kanban',
        },
      },
      {
        slug: 'music/jazz/kind-of-blue',
        title: 'Kind of Blue',
        permalink: '/notes/music/jazz/kind-of-blue',
      },
    ]);

    expect(findNode(tree as SidebarTreeNode[], 'music')?.icon).to.equal('folder-root');
    expect(findNode(tree as SidebarTreeNode[], 'music/classical')?.icon).to.equal(
      'folder-kanban',
    );
    expect(findNode(tree as SidebarTreeNode[], 'music/classical/mozart')?.icon).to.equal(
      'music-4',
    );
    expect(findNode(tree as SidebarTreeNode[], 'music/classical/beethoven')?.icon).to.equal(
      'folder-kanban',
    );
    expect(findNode(tree as SidebarTreeNode[], 'music/jazz')?.icon).to.equal(undefined);
    expect(findNode(tree as SidebarTreeNode[], 'music/jazz/kind-of-blue')?.icon).to.equal(
      undefined,
    );
  });

  it('directory-index は開閉専用の親ノードと、リンク付きの __index__ 子ノードに分かれること', () => {
    const tree = buildSidebarTree([
      {
        slug: 'music',
        title: '音楽',
        permalink: '/notes/music',
        noteKind: 'directory-index',
        directoryPath: 'music',
      },
      {
        slug: 'music/classical/mozart',
        title: 'モーツァルト',
        permalink: '/notes/music/classical/mozart',
      },
    ]);

    const root = findNode(tree as SidebarTreeNode[], 'music');
    const indexNode = findNode(tree as SidebarTreeNode[], 'music/__index__');

    expect(root).to.not.equal(null);
    expect(root?.label).to.equal('Music');
    expect(root?.href).to.equal(undefined);

    expect(indexNode).to.not.equal(null);
    expect(indexNode?.label).to.equal('Music');
    expect(indexNode?.href).to.equal('/notes/music');

    expect(findNode(tree as SidebarTreeNode[], 'music/classical/mozart')).to.not.equal(null);
  });

  it('directory-index の selected は親ではなく __index__ 子ノードに付くこと', () => {
    const tree = buildSidebarTree(
      [
        {
          slug: 'music',
          permalink: '/notes/music',
          noteKind: 'directory-index',
          directoryPath: 'music',
        },
        {
          slug: 'music/classical/mozart',
          title: 'モーツァルト',
          permalink: '/notes/music/classical/mozart',
        },
      ],
      'music',
    );

    const root = findNode(tree as SidebarTreeNode[], 'music');
    const indexNode = findNode(tree as SidebarTreeNode[], 'music/__index__');

    expect(root?.selected).to.not.equal(true);
    expect(root?.expanded).to.equal(true);
    expect(indexNode?.selected).to.equal(true);
  });

  it('rootSlug 指定時も directory-index の __index__ 子ノードを保持すること', () => {
    const tree = buildSidebarTree(
      [
        {
          slug: 'music',
          permalink: '/notes/music',
          noteKind: 'directory-index',
          directoryPath: 'music',
        },
        {
          slug: 'music/classical/mozart',
          title: 'モーツァルト',
          permalink: '/notes/music/classical/mozart',
        },
      ],
      'music',
      'music',
    );

    expect(tree).to.have.length(1);
    expect(tree[0]?.id).to.equal('music');
    expect(findNode(tree as SidebarTreeNode[], 'music/__index__')).to.not.equal(null);
  });
});
