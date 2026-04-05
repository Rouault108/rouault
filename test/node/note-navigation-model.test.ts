import { describe, expect, it } from 'vitest';

import { buildNoteNavigationModel } from '../../build/navigation/index.js';

interface SidebarTreeNode {
  id: string;
  label: string;
  href?: string;
  icon?: string;
  children?: SidebarTreeNode[];
}

const findNode = (nodes: SidebarTreeNode[], id: string): SidebarTreeNode | null => {
  for (const node of nodes) {
    if (node.id === id) {
      return node;
    }
    if (Array.isArray(node.children)) {
      const found = findNode(node.children, id);
      if (found !== null) {
        return found;
      }
    }
  }
  return null;
};

describe('buildNoteNavigationModel', () => {
  it('slug から階層 sidebar tree を生成できること', () => {
    const model = buildNoteNavigationModel({
      notes: [
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
      ],
    });

    expect(findNode(model.sidebarTree as SidebarTreeNode[], 'music')).to.not.equal(null);
    expect(findNode(model.sidebarTree as SidebarTreeNode[], 'music/classical')).to.not.equal(null);
    expect(findNode(model.sidebarTree as SidebarTreeNode[], 'computer-science')).to.not.equal(null);

    const leaf = findNode(
      model.sidebarTree as SidebarTreeNode[],
      'music/classical/tchaikovsky/the-nutcracker',
    );
    expect(leaf?.label).to.equal('楽曲分析: くるみ割り人形');
  });

  it('current note の sidebarRoot で branch 起点を切り出すこと', () => {
    const model = buildNoteNavigationModel({
      currentNote: {
        slug: 'music/classical/beethoven/symphony-9',
        sidebarRoot: 'music/classical/beethoven',
      },
      notes: [
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
    });

    expect(findNode(model.sidebarTree as SidebarTreeNode[], 'music')).to.equal(null);
    expect(
      findNode(model.sidebarTree as SidebarTreeNode[], 'music/classical/tchaikovsky'),
    ).to.equal(null);
    expect(model.sidebarTree).to.have.length(1);
    expect(model.sidebarTree[0]?.id).to.equal('music/classical/beethoven');
  });

  it('directory-index は branch と __index__ leaf に分離されること', () => {
    const model = buildNoteNavigationModel({
      currentNote: {
        slug: 'music',
        title: '音楽',
        noteKind: 'directory-index',
        directoryPath: 'music',
        permalink: '/notes/music',
      },
      notes: [
        {
          slug: 'music/classical/mozart',
          title: 'モーツァルト',
          permalink: '/notes/music/classical/mozart',
        },
      ],
    });

    const root = findNode(model.sidebarTree as SidebarTreeNode[], 'music');
    const indexNode = findNode(model.sidebarTree as SidebarTreeNode[], 'music/__index__');

    expect(root).to.not.equal(null);
    expect(root?.label).to.equal('音楽');
    expect(root?.href).to.equal(undefined);
    expect(indexNode?.href).to.equal('/notes/music');
    expect(model.selectedId).to.equal('music/__index__');
  });

  it('directory label と breadcrumb を単一の規則で解決すること', () => {
    const model = buildNoteNavigationModel({
      currentNote: {
        slug: 'computer-science/algorithms/sorting',
        title: 'ソートアルゴリズム比較',
        permalink: '/notes/computer-science/algorithms/sorting',
        noteKind: 'leaf',
      },
      notes: [
        {
          slug: 'computer-science',
          title: '計算機科学',
          permalink: '/notes/computer-science',
          noteKind: 'directory-index',
          directoryPath: 'computer-science',
        },
        {
          slug: 'computer-science/algorithms',
          title: 'アルゴリズム',
          permalink: '/notes/computer-science/algorithms',
          noteKind: 'directory-index',
          directoryPath: 'computer-science/algorithms',
        },
      ],
    });

    expect(model.breadcrumbs).to.deep.equal([
      { label: 'Notes', href: '/' },
      { label: '計算機科学', href: '/notes/computer-science' },
      { label: 'アルゴリズム', href: '/notes/computer-science/algorithms' },
      { label: 'ソートアルゴリズム比較' },
    ]);
  });

  it('sidebar icon の継承結果を tree へ反映すること', () => {
    const model = buildNoteNavigationModel({
      notes: [
        {
          slug: 'music/classical/mozart',
          title: 'モーツァルト',
          permalink: '/notes/music/classical/mozart',
          sidebarResolvedIcon: 'music',
          sidebarDirectoryIcons: {
            music: 'folder',
            'music/classical': 'folder-open',
          },
        },
        {
          slug: 'music/jazz/kind-of-blue',
          title: 'Kind of Blue',
          permalink: '/notes/music/jazz/kind-of-blue',
        },
      ],
    });

    expect(findNode(model.sidebarTree as SidebarTreeNode[], 'music')?.icon).to.equal('folder');
    expect(findNode(model.sidebarTree as SidebarTreeNode[], 'music/classical')?.icon).to.equal(
      'folder-open',
    );
    expect(
      findNode(model.sidebarTree as SidebarTreeNode[], 'music/classical/mozart')?.icon,
    ).to.equal('music');
  });

  it('通常 reader note の sidebar には testing corpus を混在させないこと', () => {
    const model = buildNoteNavigationModel({
      currentNote: {
        slug: 'music/classical/mozart',
        title: 'モーツァルト',
        permalink: '/notes/music/classical/mozart',
        noteKind: 'leaf',
        kind: 'reader',
      },
      notes: [
        {
          slug: 'music/classical/mozart',
          title: 'モーツァルト',
          permalink: '/notes/music/classical/mozart',
          noteKind: 'leaf',
          kind: 'reader',
        },
        {
          slug: 'testing/reader-basic',
          title: 'Reader Basic',
          permalink: '/notes/testing/reader-basic',
          noteKind: 'leaf',
          kind: 'reader',
        },
        {
          slug: 'testing',
          title: 'テスト',
          permalink: '/notes/testing',
          noteKind: 'directory-index',
          directoryPath: 'testing',
          kind: 'testing',
        },
      ],
    });

    expect(findNode(model.sidebarTree as SidebarTreeNode[], 'testing')).to.equal(null);
    expect(findNode(model.sidebarTree as SidebarTreeNode[], 'testing/reader-basic')).to.equal(null);
  });
});
