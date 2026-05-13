import { describe, expect, it } from 'vitest';

import { buildNoteNavigationModel } from '../../build/navigation/index.js';

interface SidebarTreeNode {
  id: string;
  label: string;
  href?: string;
  icon?: string;
  children?: SidebarTreeNode[];
}

interface SidebarRowNode {
  id: string;
  children: readonly SidebarRowNode[];
  showsCurrentPathIndicator?: boolean;
  hasCurrentDescendant?: boolean;
  isCurrent?: boolean;
}

const findRow = (nodes: readonly SidebarRowNode[], id: string): SidebarRowNode | null => {
  for (const node of nodes) {
    if (node.id === id) {
      return node;
    }
    const found = findRow(node.children, id);
    if (found !== null) {
      return found;
    }
  }
  return null;
};

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
        title: '音楽とは何か',
        noteKind: 'directory-index',
        directoryPath: 'music',
        permalink: '/notes/music',
        navigationDirectoryPresentation: {
          music: {
            label: '音楽',
          },
        },
      },
      notes: [
        {
          slug: 'music/classical/mozart',
          title: 'モーツァルト',
          permalink: '/notes/music/classical/mozart',
          navigationDirectoryPresentation: {
            music: {
              label: '音楽',
            },
          },
        },
      ],
    });

    const root = findNode(model.sidebarTree as SidebarTreeNode[], 'music');
    const indexNode = findNode(model.sidebarTree as SidebarTreeNode[], 'music/__index__');

    expect(root).to.not.equal(null);
    expect(root?.label).to.equal('音楽');
    expect(root?.href).to.equal(undefined);
    expect(indexNode?.label).to.equal('音楽とは何か');
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
          title: '計算機科学とは',
          permalink: '/notes/computer-science',
          noteKind: 'directory-index',
          directoryPath: 'computer-science',
          navigationDirectoryPresentation: {
            'computer-science': {
              label: '計算機科学',
            },
          },
        },
        {
          slug: 'computer-science/algorithms',
          title: 'アルゴリズム入門',
          permalink: '/notes/computer-science/algorithms',
          noteKind: 'directory-index',
          directoryPath: 'computer-science/algorithms',
          navigationDirectoryPresentation: {
            'computer-science': {
              label: '計算機科学',
            },
            'computer-science/algorithms': {
              label: 'アルゴリズム',
            },
          },
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

  it('directory-index current page の breadcrumb は directory label で終わること', () => {
    const model = buildNoteNavigationModel({
      currentNote: {
        slug: 'program/csharp',
        title: 'C#とは何か',
        permalink: '/notes/program/csharp',
        noteKind: 'directory-index',
        directoryPath: 'program/csharp',
        navigationDirectoryPresentation: {
          program: {
            label: 'Program',
          },
          'program/csharp': {
            label: 'C#',
          },
        },
      },
      notes: [
        {
          slug: 'program',
          title: 'Program とは',
          permalink: '/notes/program',
          noteKind: 'directory-index',
          directoryPath: 'program',
          navigationDirectoryPresentation: {
            program: {
              label: 'Program',
            },
          },
        },
      ],
    });

    expect(model.breadcrumbs).to.deep.equal([
      { label: 'Notes', href: '/' },
      { label: 'Program', href: '/notes/program' },
      { label: 'C#' },
    ]);
  });

  it('directory-index 配下の子ページでは中間 directory crumb を link として維持すること', () => {
    const model = buildNoteNavigationModel({
      currentNote: {
        slug: 'program/csharp/source-code-to-execution',
        title: 'ソースコードから実行まで',
        permalink: '/notes/program/csharp/source-code-to-execution',
        noteKind: 'leaf',
        navigationDirectoryPresentation: {
          program: {
            label: 'Program',
          },
          'program/csharp': {
            label: 'C#',
          },
        },
      },
      notes: [
        {
          slug: 'program',
          title: 'Program とは',
          permalink: '/notes/program',
          noteKind: 'directory-index',
          directoryPath: 'program',
          navigationDirectoryPresentation: {
            program: {
              label: 'Program',
            },
          },
        },
        {
          slug: 'program/csharp',
          title: 'C#とは何か',
          permalink: '/notes/program/csharp',
          noteKind: 'directory-index',
          directoryPath: 'program/csharp',
          navigationDirectoryPresentation: {
            program: {
              label: 'Program',
            },
            'program/csharp': {
              label: 'C#',
            },
          },
        },
      ],
    });

    expect(model.breadcrumbs).to.deep.equal([
      { label: 'Notes', href: '/' },
      { label: 'Program', href: '/notes/program' },
      { label: 'C#', href: '/notes/program/csharp' },
      { label: 'ソースコードから実行まで' },
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
          navigationDirectoryPresentation: {
            music: {
              icon: 'folder',
            },
            'music/classical': {
              icon: 'folder-open',
            },
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

  it('sidebar 候補は current note と同じ kind に限定すること', () => {
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
          kind: 'testing',
          chromeProfile: 'reader',
        },
        {
          slug: 'testing',
          title: 'テスト',
          permalink: '/notes/testing',
          noteKind: 'directory-index',
          directoryPath: 'testing',
          kind: 'testing',
          chromeProfile: 'reader',
        },
      ],
    });

    expect(findNode(model.sidebarTree as SidebarTreeNode[], 'testing')).to.equal(null);
    expect(findNode(model.sidebarTree as SidebarTreeNode[], 'testing/reader-basic')).to.equal(null);
  });

  it('一本道 ancestor では current branch semantic state と path indicator を分離すること', () => {
    const model = buildNoteNavigationModel({
      currentNote: {
        slug: 'program/csharp/value-types',
        title: '値型',
        permalink: '/notes/program/csharp/value-types',
        noteKind: 'leaf',
      },
      notes: [
        {
          slug: 'program/csharp/value-types',
          title: '値型',
          permalink: '/notes/program/csharp/value-types',
          noteKind: 'leaf',
        },
      ],
    });

    const program = findRow(model.sidebarRows as readonly SidebarRowNode[], 'program');
    const csharp = findRow(model.sidebarRows as readonly SidebarRowNode[], 'program/csharp');
    const leaf = findRow(
      model.sidebarRows as readonly SidebarRowNode[],
      'program/csharp/value-types',
    );

    expect(program?.hasCurrentDescendant).to.equal(true);
    expect(program?.showsCurrentPathIndicator).to.equal(false);
    expect(csharp?.hasCurrentDescendant).to.equal(true);
    expect(csharp?.showsCurrentPathIndicator).to.equal(false);
    expect(leaf?.isCurrent).to.equal(true);
    expect(leaf?.showsCurrentPathIndicator).to.equal(false);
  });

  it('sibling group がある current ancestor だけ path indicator を表示対象にすること', () => {
    const model = buildNoteNavigationModel({
      currentNote: {
        slug: 'program/csharp/value-types',
        title: '値型',
        permalink: '/notes/program/csharp/value-types',
        noteKind: 'leaf',
      },
      notes: [
        {
          slug: 'program/csharp/value-types',
          title: '値型',
          permalink: '/notes/program/csharp/value-types',
          noteKind: 'leaf',
        },
        {
          slug: 'program/javascript/index',
          title: 'JavaScript',
          permalink: '/notes/program/javascript/index',
          noteKind: 'leaf',
        },
        {
          slug: 'library/index',
          title: 'Library',
          permalink: '/notes/library/index',
          noteKind: 'leaf',
        },
      ],
    });

    expect(
      findRow(model.sidebarRows as readonly SidebarRowNode[], 'program')?.showsCurrentPathIndicator,
    ).to.equal(true);
    expect(
      findRow(model.sidebarRows as readonly SidebarRowNode[], 'program/csharp')
        ?.showsCurrentPathIndicator,
    ).to.equal(false);
    expect(
      findRow(model.sidebarRows as readonly SidebarRowNode[], 'program/javascript')
        ?.showsCurrentPathIndicator,
    ).to.equal(false);
  });

  it('selectedId と current state だけが異なっても topologyRevision は変化しないこと', () => {
    const notes = [
      {
        slug: 'program/csharp/value-types',
        title: '値型',
        permalink: '/notes/program/csharp/value-types',
        noteKind: 'leaf' as const,
      },
      {
        slug: 'program/csharp/source-code-to-execution',
        title: '実行過程',
        permalink: '/notes/program/csharp/source-code-to-execution',
        noteKind: 'leaf' as const,
      },
    ];

    const first = buildNoteNavigationModel({ currentNote: notes[0], notes });
    const second = buildNoteNavigationModel({ currentNote: notes[1], notes });

    expect(first.topologyRevision).to.equal(second.topologyRevision);
  });
});
