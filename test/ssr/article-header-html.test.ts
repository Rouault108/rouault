import { describe, expect, it } from 'vitest';

import { renderArticleHeaderHtml } from '../../src/layouts/article-header-html.js';

type ArticleHeaderProjection = Parameters<typeof renderArticleHeaderHtml>[0];

const render = (overrides: Partial<ArticleHeaderProjection>): string => {
  const projection: ArticleHeaderProjection = {
    heading: '見出し',
    breadcrumbs: [],
    genres: [],
    ...overrides,
  };

  return renderArticleHeaderHtml(projection);
};

describe('static article-header html contract', () => {
  it('production note page 用の静的 header を描画し custom element を使わないこと', () => {
    const rendered = render({
      heading: '見出し',
      breadcrumbs: [{ label: 'Notes', href: '/notes/' }, { label: '見出し' }],
      published: '2026-01-01',
      status: 'wip',
      source: 'https://example.com/source',
      license: 'CC BY 4.0',
      genres: ['  C#  ', ' ', 'Very Very Very Long Tag Label'],
    });

    expect(rendered).toContain('<header class="article-header" data-article-header>');
    expect(rendered).not.toContain('<ui-article-header');
    expect(rendered).not.toContain('<ui-tag');
    expect(rendered).not.toContain('<ui-icon');
    expect(rendered).toContain('class="article-header__tag-link"');
    expect(rendered).toContain('rel="tag"');
    expect(rendered).toContain('aria-label="タグ: C#"');
    expect(rendered).toContain('href="/tags/C%23/"');
    expect(rendered).toContain('<span class="article-header__tag-label">C#</span>');
    expect(rendered).toContain(
      '<span class="article-header__tag-label">Very Very Very Long Tag Label</span>',
    );
    expect(rendered).not.toContain('aria-label="タグ:  "');
  });

  it('date/status/source/license icon と chevron separator を static SVG で描画すること', () => {
    const rendered = render({
      heading: '見出し',
      breadcrumbs: [{ label: 'Notes', href: '/notes/' }, { label: '見出し' }],
      published: '2026-01-01',
      status: 'wip',
      source: 'https://example.com/source',
      license: 'CC BY 4.0',
    });

    expect(rendered).toContain('article-header__metadata-icon');
    expect(rendered).toContain('article-header__breadcrumb-separator-icon');
    expect(rendered).toContain('aria-hidden="true"');
    expect(rendered).toContain('focusable="false"');
    expect(rendered).not.toContain('>/</');
  });

  it('breadcrumb label/href/current semantics を normalize すること', () => {
    const rendered = render({
      heading: 'Current',
      breadcrumbs: [
        { label: '  Notes  ', href: '/notes/' },
        { label: 'Unsafe', href: '/notes/%00' },
        { label: 'Dot', href: '/notes/../secret' },
        { label: 'Encoded Slash', href: '/notes/foo%2Fbar' },
        { label: '  ' },
        { label: 'Current', href: '/notes/current/' },
      ],
    });

    expect(rendered).toContain('class="article-header__breadcrumb-node article-header__breadcrumb-link"');
    expect(rendered).toContain('href="/notes/"');
    expect(rendered).toContain('data-link-kind="internal-document"');
    expect(rendered).toContain('data-link-surface="navigation"');
    expect(rendered).toContain('>Notes</a>');
    expect(rendered).toContain(
      '<span class="article-header__breadcrumb-node article-header__breadcrumb-static">Unsafe</span>',
    );
    expect(rendered).toContain(
      '<span class="article-header__breadcrumb-node article-header__breadcrumb-static">Dot</span>',
    );
    expect(rendered).toContain(
      '<span class="article-header__breadcrumb-node article-header__breadcrumb-static">Encoded Slash</span>',
    );
    expect(rendered).not.toContain('href="/notes/%00"');
    expect(rendered).not.toContain('href="/notes/../secret"');
    expect(rendered).not.toContain('href="/notes/foo%2Fbar"');
    expect(rendered.match(/aria-current="page"/gu)?.length ?? 0).toBe(1);
  });

  it('unsafe source は link 化しないこと', () => {
    for (const source of [
      'javascript:alert(1)',
      'https://user@example.com/source',
      'https://example.com/%00',
      'https://example.com/?x=%00',
      'https://example.com/#%5C',
    ]) {
      const rendered = render({ heading: '見出し', source });
      expect(rendered).not.toContain('article-header__source-link');
      expect(rendered).not.toContain('href="javascript:alert(1)"');
      expect(rendered).not.toContain('https://user@example.com/source');
    }
  });
});
