import { describe, expect, it } from 'vitest';

import { TagPagesTemplate } from '../../src/tags.11ty.js';

describe('TagPagesTemplate', () => {
  it('pagination 用の tagPages をテンプレートデータとして返すこと', () => {
    const template = new TagPagesTemplate();
    const data = template.data();

    expect(data.pagination.data).toBe('paginationTagPages');
    expect(Array.isArray(data.paginationTagPages)).toBe(true);
  });

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

    expect(rendered).toContain('<tag-page tag-page-json="');
    expect(rendered).toContain('&quot;tag&quot;:&quot;music&quot;');
    expect(rendered).toContain('&quot;noteCount&quot;:2');
    expect(rendered).toContain('&quot;title&quot;:&quot;交響曲メモ&quot;');
    expect(rendered).not.toContain('<search-page');
  });
});
