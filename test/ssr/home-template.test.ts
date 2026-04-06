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
    expect(rendered).toContain('<h1 class="home-title">調べたことと考えたことを、ここに置いています。</h1>');
    expect(rendered).toContain('技術とその周辺についての個人ノートです。公開しているものを、新しい順に並べています。');
    expect(rendered).toContain('3件');
    expect(rendered).toContain('最新更新 <time datetime="2026-03-10">2026-03-10</time>');
    expect(rendered).toContain('<a class="home-meta-link" href="/about/">このサイトについて</a>');
    expect(rendered).toContain('<h2 id="home-feed-heading" class="home-feed-title">新着一覧</h2>');
    expect(rendered).toContain('music / romantic');
    expect(rendered).toContain('和声進行の整理');
  });

  it('要約が空ならプレースホルダーを描画しないこと', () => {
    const template = new HomePageTemplate();
    const rendered = template.render({
      home: {
        publicNoteCount: 1,
        latestUpdatedDate: '2026-03-10',
        notes: [
          {
            title: '後期ロマン派',
            permalink: '/notes/music/romantic/',
            summary: '',
            date: '2026-03-10',
            pathLabel: 'music / romantic',
            genres: ['music', 'romantic'],
          },
        ],
      },
    });

    expect(rendered).not.toContain('<p class="home-entry__summary">');
  });

  it('ホーム用の静的設定を返すこと', () => {
    const template = new HomePageTemplate();
    const data = template.data();

    expect(data.layout).toBe('base');
    expect(data.description).toBe('Rouault の公開ノートを静かに読むためのトップページ。');
    expect(data.permalink).toBe('/index.html');
  });
});
