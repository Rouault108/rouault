import { describe, expect, it } from 'vitest';

import { CorpusPagesTemplate } from '../../src/corpora.11ty.js';

describe('CorpusPagesTemplate', () => {
  it('pagination 用の corpusPages をテンプレートデータとして返すこと', () => {
    const template = new CorpusPagesTemplate();
    const data = template.data();

    expect(data.pagination.data).toBe('corpusPages');
  });

  it('コーパス専用ページを静的 HTML として描画すること', () => {
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
            renderHref: '/notes/music/symphony/',
            description: '主題展開の整理',
            date: '2026-03-10',
            slug: 'music/symphony',
            genres: ['music', 'analysis'],
          },
        ],
      },
    });

    expect(rendered).toContain('<section class="corpus-page page-shell"');
    expect(rendered).toContain('<p class="eyebrow">Corpus</p>');
    expect(rendered).toContain('<h1 id="corpus-page-title" class="heading">音楽</h1>');
    expect(rendered).toContain('href="/notes/music/symphony/"');
    expect(rendered).toContain('data-link-kind="internal-document"');
    expect(rendered).not.toContain('<corpus-page');
    expect(rendered).not.toContain('data-hydration-');
  });

  it('公開ノートがない場合は corpus 用 static empty state を描画すること', () => {
    const template = new CorpusPagesTemplate();
    const rendered = template.render({
      corpusPage: {
        key: 'music',
        label: '音楽',
        href: '/corpora/music/',
        noteCount: 0,
        latestUpdatedDate: null,
        notes: [],
      },
    });

    expect(rendered).toContain(
      '<section class="empty-hint" data-empty-state data-empty-variant="default">',
    );
    expect(rendered).toContain('<div class="empty-hint__message" data-announce="off">');
    expect(rendered).toContain('<div class="empty-hint__icon" aria-hidden="true"></div>');
    expect(rendered).toContain(
      '<h2 class="empty-hint__heading">このコーパスの公開ノートはまだありません</h2>',
    );
    expect(rendered).toContain(
      '<p class="empty-hint__description">別のコーパスへ切り替えるか、時間をおいて再度確認してください。</p>',
    );
    expect(rendered).toContain('<div class="empty-hint__actions" hidden></div>');
    expect(rendered).not.toContain('<ui-empty-state');
    expect(rendered).not.toContain('data-empty-variant="search"');
    expect(rendered).not.toContain('role="status"');
    expect(rendered).not.toContain('data-hydration-');
  });
});
