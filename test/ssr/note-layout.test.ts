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
});
