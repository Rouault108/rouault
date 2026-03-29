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
          sidebarResolvedIcon: 'music',
          sidebarDirectoryIcons: {
            music: 'book-open',
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

    expect(rendered).toContain('"id":"music","label":"Music","icon":"book-open"');
    expect(rendered).toContain('"id":"music/classical","label":"Classical","icon":"folder-open"');
    expect(rendered).toContain('"id":"music/classical/mozart","label":"モーツァルト"');
    expect(rendered).toContain('"icon":"music"');
    expect(rendered).toContain('"id":"music/jazz","label":"Jazz"');
    expect(rendered).not.toContain('"id":"music/jazz","label":"Jazz","icon":');
    expect(rendered).not.toContain('"id":"music/jazz/kind-of-blue","label":"Kind of Blue","icon":');
  });

  it('directory-index のページでは sidebar selected-id に __index__ を使うこと', () => {
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

    expect(rendered).toContain('selected-id="music/__index__"');
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
    expect(rendered).toContain('selected-id="music/__index__"');
  });

  it('本文ルートIDを付与し layout-toc に content-root-id を渡すこと', () => {
    const layout = new NoteLayout();
    const rendered = layout.render({
      content: '<p>本文</p>',
      note: {
        slug: 'testing/interactive',
        title: 'Interactive',
      },
      notes: [],
    });

    expect(rendered).toContain('id="note-content-testing-interactive" class="prose"');
    expect(rendered).toContain('content-root-id="note-content-testing-interactive"');
  });

  it('layout-toc に capabilities-json を渡し、runtime capability がある場合だけ hydrate すること', () => {
    const layout = new NoteLayout();
    const rendered = layout.render({
      content: '<h2 id="intro">Intro</h2>',
      note: {
        slug: 'music/with-toc',
        title: 'With TOC',
        kind: 'reader',
        tocHeadings: [{ id: 'intro', text: 'Intro', level: 2 }],
        tocCapabilities: {
          activeTracking: true,
          dynamicScopes: false,
          mobileSummary: true,
        },
      },
      notes: [],
    });

    const layoutTocMarkup = /<layout-toc[\s\S]*?<\/layout-toc>/.exec(rendered)?.[0] ?? '';
    expect(layoutTocMarkup).toContain(
      'capabilities-json="{&quot;activeTracking&quot;:true,&quot;dynamicScopes&quot;:false,&quot;mobileSummary&quot;:true}"',
    );
    expect(layoutTocMarkup).toContain('data-hydration-capability="interactive"');
    expect(layoutTocMarkup).toContain('data-hydration-trigger="initial"');
  });

  it('static-only TOC では layout-toc に hydration directive を付与しないこと', () => {
    const layout = new NoteLayout();
    const rendered = layout.render({
      content: '<p>本文のみ</p>',
      note: {
        slug: 'testing/static-only',
        title: 'Static Only',
        kind: 'testing',
        tocHeadings: [],
        tocCapabilities: {
          activeTracking: false,
          dynamicScopes: false,
          mobileSummary: false,
        },
      },
      notes: [],
    });

    const layoutTocMarkup = /<layout-toc[\s\S]*?<\/layout-toc>/.exec(rendered)?.[0] ?? '';
    expect(layoutTocMarkup).toContain(
      'capabilities-json="{&quot;activeTracking&quot;:false,&quot;dynamicScopes&quot;:false,&quot;mobileSummary&quot;:false}"',
    );
    expect(layoutTocMarkup).not.toContain('data-hydration-capability=');
    expect(layoutTocMarkup).not.toContain('data-hydration-trigger=');
  });

  it('note ページの hydration scope を出力すること', () => {
    const layout = new NoteLayout();
    const rendered = layout.render({
      content: '<p>本文</p>',
      note: {
        slug: 'testing/hydration',
        title: 'Hydration',
      },
      notes: [],
    });

    expect(rendered).toContain('data-hydration-scope="note-shell"');
    expect(rendered).toContain('data-hydration-scope="note-sidebar"');
    expect(rendered).toContain('data-hydration-scope="note-content"');
    expect(rendered).toContain('data-hydration-scope="note-toc"');
  });

  it('genre を持つ記事ヘッダーに post-commit directive を出力すること', () => {
    const layout = new NoteLayout();
    const rendered = layout.render({
      content: '<p>本文</p>',
      note: {
        slug: 'testing/hydration',
        title: 'Hydration',
        genre: ['testing'],
      },
      notes: [],
    });

    expect(rendered).toContain('<ui-article-header');
    expect(rendered).toContain('data-hydration-capability="progressive"');
    expect(rendered).toContain('data-hydration-trigger="post-commit"');
  });

  it('reader note の code-preview に reader profile を注入すること', () => {
    const layout = new NoteLayout();
    const rendered = layout.render({
      content: '<ui-code-preview heading="例"></ui-code-preview>',
      note: {
        slug: 'music/example',
        title: 'Example',
        kind: 'reader',
      },
      notes: [],
    });

    expect(rendered).toContain('data-note-kind="reader"');
    expect(rendered).toContain('preview-profile="reader"');
    expect(rendered).toContain('data-pagefind-body');
  });

  it('testing note では 読者向け Pagefind 属性を出力しないこと', () => {
    const layout = new NoteLayout();
    const rendered = layout.render({
      content: '<ui-code-preview heading="例"></ui-code-preview>',
      note: {
        slug: 'testing/example',
        title: 'Example',
        kind: 'testing',
      },
      notes: [
        {
          slug: 'testing/example',
          title: 'Example',
          permalink: '/notes/testing/example',
          kind: 'testing',
        },
      ],
    });

    expect(rendered).toContain('data-note-kind="testing"');
    expect(rendered).toContain('preview-profile="demo"');
    expect(rendered).not.toContain('data-pagefind-body');
    expect(rendered).not.toContain('data-pagefind-sort=');
  });

  it('testing note では reader sidebar を描画しないこと', () => {
    const layout = new NoteLayout();
    const rendered = layout.render({
      content: '<p>本文</p>',
      note: {
        slug: 'testing/markdown-basic',
        title: 'Markdown Basic',
        kind: 'testing',
      },
      notes: [],
    });

    expect(rendered).not.toContain('<layout-sidebar');
  });
});
