import { describe, expect, it } from 'vitest';

import { CorporaOverviewTemplate } from '../../src/corpora-index.11ty.js';

describe('CorporaOverviewTemplate', () => {
  it('すべてのノート用の overview コンポーネントを描画すること', () => {
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
            noteCount: 2,
            latestUpdatedDate: '2026-03-10',
          },
        ],
        recentNotes: [
          {
            title: '和声のメモ',
            permalink: '/notes/music/harmony/',
            summary: '機能和声の整理',
            date: '2026-03-10',
            pathLabel: 'music / harmony',
            genres: ['music'],
          },
        ],
      },
    });

    expect(rendered).toContain(
      '<corpora-overview-page data-hydration-scope="corpora-overview-page"',
    );
    expect(rendered).toContain('data-hydration-capability="interactive"');
    expect(rendered).toContain('data-hydration-trigger="initial"');
    expect(rendered).toContain('corpora-overview-json="');
    expect(rendered).toContain('&quot;corpusCount&quot;:2');
    expect(rendered).toContain('&quot;noteCount&quot;:3');
    expect(rendered).toContain('&quot;href&quot;:&quot;/corpora/music/&quot;');
  });
});
