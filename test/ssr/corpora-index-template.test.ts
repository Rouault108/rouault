import { describe, expect, it } from 'vitest';

import { CorporaOverviewTemplate } from '../../src/corpora-index.11ty.js';

describe('CorporaOverviewTemplate', () => {
  it('すべてのノート用の overview を静的 HTML として描画すること', () => {
    const template = new CorporaOverviewTemplate();
    const rendered = template.render({
      corporaOverview: {
        corpusCount: 2,
        noteCount: 3,
        latestUpdatedDate: '2026-03-10',
        corpora: [
          {
            key: 'music',
            label: '音楽',
            href: '/corpora/music/',
            renderHref: '/corpora/music/',
            noteCount: 2,
            latestUpdatedDate: '2026-03-10',
          },
        ],
        recentNotes: [
          {
            title: '和声のメモ',
            permalink: '/notes/music/harmony/',
            renderHref: '/notes/music/harmony/',
            summary: '機能和声の整理',
            date: '2026-03-10',
            pathLabel: 'music / harmony',
            genres: ['music'],
          },
        ],
      },
    });

    expect(rendered).toContain('<section class="corpora-overview page-shell"');
    expect(rendered).toContain('<div class="meta-row corpora-overview__meta">');
    expect(rendered).toContain('2件のコーパス');
    expect(rendered).toContain('3件のノート');
    expect(rendered).toContain('<article class="result-card" data-result-card>');
    expect(rendered).toContain('href="/corpora/music/"');
    expect(rendered).toContain('href="/notes/music/harmony/"');
    expect(rendered).not.toContain('<corpora-overview-page');
    expect(rendered).not.toContain('data-hydration-');
  });
});
