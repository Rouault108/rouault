import { describe, expect, it } from 'vitest';

import { NoteLayout } from '../../src/layouts/NoteLayout.11ty.js';

describe('NoteLayout', () => {
  it('Pagefind 用の sort と索引用テキストを埋め込むこと', () => {
    const layout = new NoteLayout();
    const rendered = layout.render({
      content: '<p>本文</p>',
      note: {
        slug: 'music/jazz',
        title: 'ジャズ理論の基礎',
        description: '即興と和声のメモ',
        date: '2026-01-01',
        updated: '2026-02-10',
        genre: ['music', 'jazz'],
      },
      notes: [],
    });

    expect(rendered).toContain('data-pagefind-sort="date:2026-02-10"');
    expect(rendered).toContain('<span data-pagefind-weight="10">ジャズ理論の基礎</span>');
    expect(rendered).toContain('<span data-pagefind-weight="8">ジャズ 理論 の 基礎</span>');
    expect(rendered).toContain('<span data-pagefind-weight="5">即興と和声のメモ</span>');
    expect(rendered).toContain('<span data-pagefind-weight="3">即興 と 和声 の メモ</span>');
    expect(rendered).toContain('data-pagefind-meta="date">2026-02-10</span>');
  });

  it('日付未設定時は sort に 0000-00-00 を使うこと', () => {
    const layout = new NoteLayout();
    const rendered = layout.render({
      content: '<p>本文</p>',
      note: {
        slug: 'untitled',
        title: '日付なし',
      },
      notes: [],
    });

    expect(rendered).toContain('data-pagefind-sort="date:0000-00-00"');
  });

  it('token 化結果が raw と同一なら補助索引用テキストを増やさないこと', () => {
    const layout = new NoteLayout();
    const rendered = layout.render({
      content: '<p>本文</p>',
      note: {
        slug: 'public',
        title: 'public',
        description: 'memo',
      },
      notes: [],
    });

    expect(rendered).not.toContain('<span data-pagefind-weight="8">public</span>');
    expect(rendered).not.toContain('<span data-pagefind-weight="3">memo</span>');
  });

  it('sidebar icon 未指定のノートではサイドバー JSON に icon を出力しないこと', () => {
    const layout = new NoteLayout();
    const rendered = layout.render({
      content: '<p>本文</p>',
      note: {
        slug: 'music/jazz/jazz-theory',
        title: 'ジャズ理論の基礎',
      },
      notes: [
        {
          slug: 'music/jazz/jazz-theory',
          title: 'ジャズ理論の基礎',
          permalink: '/notes/music/jazz/jazz-theory',
        },
        {
          slug: 'music/classical/tchaikovsky/the-nutcracker',
          title: '楽曲分析: くるみ割り人形',
          permalink: '/notes/music/classical/tchaikovsky/the-nutcracker',
        },
      ],
    });

    expect(rendered).not.toContain('"icon":');
  });

  it('sidebar icon 指定時だけ対象ノードへ icon を出力すること', () => {
    const layout = new NoteLayout();
    const rendered = layout.render({
      content: '<p>本文</p>',
      note: {
        slug: 'music/classical/mozart',
        title: 'モーツァルト',
      },
      notes: [
        {
          slug: 'music/classical/mozart',
          title: 'モーツァルト',
          permalink: '/notes/music/classical/mozart',
          sidebarResolvedIcon: 'lucide:music-4',
          sidebarDirectoryIcons: {
            music: 'lucide:library',
            'music/classical': 'lucide:folder-kanban',
          },
        },
        {
          slug: 'music/jazz/kind-of-blue',
          title: 'Kind of Blue',
          permalink: '/notes/music/jazz/kind-of-blue',
        },
      ],
    });

    expect(rendered).toContain('"id":"music","label":"Music","icon":"lucide:library"');
    expect(rendered).toContain(
      '"id":"music/classical","label":"Classical","icon":"lucide:folder-kanban"',
    );
    expect(rendered).toContain(
      '"id":"music/classical/mozart","label":"モーツァルト","icon":"lucide:music-4"',
    );
    expect(rendered).not.toContain('"id":"music/jazz","label":"Jazz","icon":');
    expect(rendered).not.toContain('"id":"music/jazz/kind-of-blue","label":"Kind of Blue","icon":');
  });

  it('directory-index のページでは sidebar active-id に __index__ を使うこと', () => {
    const layout = new NoteLayout();
    const rendered = layout.render({
      content: '<p>本文</p>',
      note: {
        slug: 'music',
        title: '音楽',
        noteKind: 'directory-index',
        directoryPath: 'music',
      },
      notes: [
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
    });

    expect(rendered).toContain('active-id="music/__index__"');
    expect(rendered).toContain('"id":"music/__index__"');
    });

  it('current directory-index note を data.notes に補完して sidebar に出すこと', () => {
    const layout = new NoteLayout();

    const rendered = layout.render({
      content: '<p>本文</p>',
      note: {
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
          noteKind: 'leaf',
        },
      ],
    });

    expect(rendered).toContain('"id":"music/__index__"');
    expect(rendered).toContain('"href":"/notes/music"');
    expect(rendered).toContain('active-id="music/__index__"');
  });

  it('本文ルートIDを付与し layout-toc に content-root-id を渡すこと', () => {
    const layout = new NoteLayout();
    const rendered = layout.render({
      content: '<p>本文</p>',
      note: {
        slug: 'testing/tabs-test',
        title: 'タブテスト',
      },
      notes: [],
    });
  
    expect(rendered).toContain('id="note-content-testing-tabs-test" class="prose"');
    expect(rendered).toContain('content-root-id="note-content-testing-tabs-test"');
  });
});
