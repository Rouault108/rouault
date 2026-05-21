import { describe, expect, it } from 'vitest';

import { TagPagesTemplate } from '../../src/tags.11ty.js';

describe('TagPagesTemplate', () => {
  it('pagination 用の tagPages をテンプレートデータとして返すこと', () => {
    const template = new TagPagesTemplate();
    const data = template.data();

    expect(data.pagination.data).toBe('tagPages');
  });

  it('タグ専用の search-page 初期表示を描画すること', () => {
    const template = new TagPagesTemplate();
    const rendered = template.render({
      tagPage: {
        tag: 'music',
        searchHref: '/search/?tags=music',
        searchRenderHref: '/search/?tags=music',
        noteCount: 2,
        notes: [
          {
            title: '交響曲メモ',
            permalink: '/notes/music/symphony/',
            renderHref: '/notes/music/symphony/',
            description: '主題展開の整理',
            date: '2026-03-10',
            slug: 'music/symphony',
            genres: ['music', 'analysis'],
          },
          {
            title: '協奏曲メモ',
            permalink: '/notes/music/concerto/',
            renderHref: '/notes/music/concerto/',
            description: '',
            date: '',
            slug: 'music/concerto',
            genres: ['music'],
          },
        ],
      },
    });

    expect(rendered).toContain('data-hydration-scope="search-page"');
    expect(rendered).toContain('data-search-page-root');
    expect(rendered).toContain('data-hydration-key="search-page-enhancer"');
    expect(rendered).not.toContain('<search-page');
    expect(rendered).toContain('<input');
    expect(rendered).toContain('type="search"');
    expect(rendered).toContain('<select');
    expect(rendered).toContain('initial-search-response-json="');
    expect(rendered).toContain('&quot;tagMode&quot;:&quot;or&quot;');
    expect(rendered).toContain('&quot;tags&quot;:[&quot;music&quot;]');
    expect(rendered).toContain('&quot;canonicalPathname&quot;:&quot;/notes/music/symphony/&quot;');
    expect(rendered).toContain('&quot;pathLabel&quot;:&quot;notes / music / symphony&quot;');
  });
});
