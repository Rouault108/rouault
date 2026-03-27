import { describe, expect, it } from 'vitest';

import { CorpusPagesTemplate } from '../../src/corpora.11ty.js';

describe('CorpusPagesTemplate', () => {
  it('pagination 用の corpusPages をテンプレートデータとして返すこと', () => {
    const template = new CorpusPagesTemplate();
    const data = template.data();

    expect(data.pagination.data).toBe('corpusPages');
  });

  it('コーパス専用の corpus-page を描画すること', () => {
    const template = new CorpusPagesTemplate();
    const rendered = template.render({
      corpusPage: {
        key: 'music',
        label: '音楽',
        href: '/corpora/music/',
        noteCount: 2,
        latestUpdatedDate: '2026-03-10',
        notes: [
          {
            title: '交響曲メモ',
            permalink: '/notes/music/symphony/',
            description: '主題展開の整理',
            date: '2026-03-10',
            slug: 'music/symphony',
            genres: ['music', 'analysis'],
          },
        ],
      },
    });

    expect(rendered).toContain('<corpus-page corpus-page-json="');
    expect(rendered).toContain('&quot;key&quot;:&quot;music&quot;');
    expect(rendered).toContain('&quot;label&quot;:&quot;音楽&quot;');
    expect(rendered).toContain('&quot;href&quot;:&quot;/corpora/music/&quot;');
  });
});
