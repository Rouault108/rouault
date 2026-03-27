import { describe, expect, it } from 'vitest';

import { HomePageTemplate } from '../../src/index.11ty.js';

describe('HomePageTemplate', () => {
  it('静かなトップページの静的マークアップを描画すること', () => {
    const template = new HomePageTemplate();
    const rendered = template.render({
      home: {
        publicNoteCount: 3,
        latestUpdatedDate: '2026-03-10',
        notes: [
          {
            title: '後期ロマン派',
            permalink: '/notes/music/romantic/',
            summary: '和声進行の整理',
            date: '2026-03-10',
            pathLabel: 'music / romantic',
            genres: ['music', 'romantic'],
          },
        ],
      },
    });

    expect(rendered).toContain('<section class="home-shell">');
    expect(rendered).toContain('<h1 class="home-title">静かに入り、静かに読み進める。</h1>');
    expect(rendered).toContain('公開ノート件数');
    expect(rendered).toContain('/search/?sort=date-desc');
    expect(rendered).toContain('<h2 id="home-feed-heading" class="home-feed-title">新着一覧</h2>');
    expect(rendered).toContain('music / romantic');
    expect(rendered).toContain('和声進行の整理');
  });

  it('ホーム用の静的設定を返すこと', () => {
    const template = new HomePageTemplate();
    const data = template.data();

    expect(data.layout).toBe('base');
    expect(data.description).toBe('Rouault の公開ノートを静かに読むためのトップページ。');
    expect(data.permalink).toBe('/index.html');
  });
});
