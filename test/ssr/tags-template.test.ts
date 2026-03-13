import { describe, expect, it } from 'vitest';

import { TagPagesTemplate } from '../../src/tags.11ty.js';

describe('TagPagesTemplate', () => {
  it('タグ専用の静的一覧を描画すること', () => {
    const template = new TagPagesTemplate();
    const rendered = template.render({
      tagPage: {
        tag: 'music',
        noteCount: 2,
        notes: [
          {
            title: '交響曲メモ',
            permalink: '/notes/music/symphony/',
            description: '主題展開の整理',
            date: '2026-03-10',
            slug: 'music/symphony',
            genres: ['music', 'analysis'],
          },
          {
            title: '協奏曲メモ',
            permalink: '/notes/music/concerto/',
            description: '',
            date: '',
            slug: 'music/concerto',
            genres: ['music'],
          },
        ],
      },
    });

    expect(rendered).toContain('<section class="tag-page" aria-labelledby="tag-page-title">');
    expect(rendered).toContain('<h1 id="tag-page-title" class="tag-page__title">#music</h1>');
    expect(rendered).toContain('2件のノート');
    expect(rendered).toContain('href="/search?tag=music"');
    expect(rendered).toContain('交響曲メモ');
    expect(rendered).not.toContain('<search-page');
  });
});
