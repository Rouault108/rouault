import { describe, expect, it } from 'vitest';
import { parseFragment, type DefaultTreeAdapterMap } from 'parse5';

import { renderArticleHeaderHtml } from '../../src/layouts/article-header-html.js';

type ArticleHeaderProjection = Parameters<typeof renderArticleHeaderHtml>[0];
type ChildNode = DefaultTreeAdapterMap['childNode'];
type ElementNode = DefaultTreeAdapterMap['element'];

interface ParentLike {
  readonly childNodes: readonly ChildNode[];
}

const isElementNode = (node: ChildNode): node is ElementNode => 'tagName' in node;

const getClassTokens = (node: ElementNode): string[] =>
  (node.attrs.find((attribute) => attribute.name === 'class')?.value ?? '')
    .split(/\s+/u)
    .filter((token) => token.length > 0);

const collectElementsByClass = (
  node: ParentLike,
  className: string,
  matches: ElementNode[] = [],
): ElementNode[] => {
  for (const child of node.childNodes) {
    if (!isElementNode(child)) continue;
    if (getClassTokens(child).includes(className)) {
      matches.push(child);
    }
    collectElementsByClass(child, className, matches);
  }
  return matches;
};

const getDirectChildElements = (node: ElementNode): ElementNode[] =>
  node.childNodes.filter(isElementNode);

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
  const baseProjection: ArticleHeaderProjection = {
    heading: '見出し',
    breadcrumbs: [{ label: 'Notes', href: '/notes/' }, { label: '見出し' }],
    genres: [],
  };

  it('statusなしではbreadcrumbsとheadingをarticle headerのdirect siblingにすること', () => {
    const fragment = parseFragment(renderArticleHeaderHtml(baseProjection));
    const articleHeaders = collectElementsByClass(fragment, 'article-header').filter(
      (element) => element.tagName === 'header',
    );
    expect(articleHeaders).toHaveLength(1);

    const directChildren = articleHeaders[0] ? getDirectChildElements(articleHeaders[0]) : [];
    const breadcrumbs = directChildren.filter((element) =>
      getClassTokens(element).includes('article-header__breadcrumbs'),
    );
    const statuses = directChildren.filter((element) =>
      getClassTokens(element).includes('article-header__status'),
    );
    const headings = directChildren.filter((element) =>
      getClassTokens(element).includes('article-header__heading'),
    );

    expect(breadcrumbs).toHaveLength(1);
    expect(statuses).toHaveLength(0);
    expect(headings).toHaveLength(1);
    expect(directChildren.indexOf(headings[0] as ElementNode)).toBe(
      directChildren.indexOf(breadcrumbs[0] as ElementNode) + 1,
    );
  });

  it('statusありではbreadcrumbs、status、headingをarticle headerのdirect siblingにすること', () => {
    const fragment = parseFragment(
      renderArticleHeaderHtml({
        ...baseProjection,
        status: 'wip',
      }),
    );
    const articleHeaders = collectElementsByClass(fragment, 'article-header').filter(
      (element) => element.tagName === 'header',
    );
    expect(articleHeaders).toHaveLength(1);

    const directChildren = articleHeaders[0] ? getDirectChildElements(articleHeaders[0]) : [];
    const breadcrumbs = directChildren.filter((element) =>
      getClassTokens(element).includes('article-header__breadcrumbs'),
    );
    const statuses = directChildren.filter((element) =>
      getClassTokens(element).includes('article-header__status'),
    );
    const headings = directChildren.filter((element) =>
      getClassTokens(element).includes('article-header__heading'),
    );

    expect(breadcrumbs).toHaveLength(1);
    expect(statuses).toHaveLength(1);
    expect(headings).toHaveLength(1);
    expect(directChildren.indexOf(statuses[0] as ElementNode)).toBe(
      directChildren.indexOf(breadcrumbs[0] as ElementNode) + 1,
    );
    expect(directChildren.indexOf(headings[0] as ElementNode)).toBe(
      directChildren.indexOf(statuses[0] as ElementNode) + 1,
    );
  });

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

    expect(rendered).toContain(
      'class="article-header__breadcrumb-node article-header__breadcrumb-link"',
    );
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

  it('raw fallback のときだけ source link を external-web fallback として描画すること', () => {
    const rendered = render({
      heading: '見出し',
      source: 'https://example.com/source',
    });

    expect(rendered).toContain('class="article-header__source-link"');
    expect(rendered).toContain('href="https://example.com/source"');
    expect(rendered).toContain('target="_blank"');
    expect(rendered).toContain('rel="noopener noreferrer"');
    expect(rendered).toContain('data-link-kind="external-web"');
    expect(rendered).toContain('data-link-surface="metadata"');
    expect(rendered).toContain('data-external="true"');
    expect(rendered).toContain('aria-label="出典（外部サイト、新しいタブで開く）"');
  });

  it('classified mode の annotation を source link 属性に反映すること', () => {
    const rendered = renderArticleHeaderHtml(
      {
        heading: '見出し',
        breadcrumbs: [],
        genres: [],
        source: 'https://example.com/source',
      },
      {
        sourceLinkMode: {
          kind: 'classified',
          annotation: {
            href: '/source',
            kind: 'internal-resource',
            surface: 'metadata',
            isExternalWeb: false,
            ariaLabel: '出典（新しいタブで開く）',
          },
        },
      },
    );

    expect(rendered).toContain('class="article-header__source-link"');
    expect(rendered).toContain('href="/source"');
    expect(rendered).toContain('data-link-kind="internal-resource"');
    expect(rendered).toContain('data-link-surface="metadata"');
    expect(rendered).toContain('aria-label="出典（新しいタブで開く）"');
    expect(rendered).not.toContain('data-external="true"');
  });

  it('classified mode の annotation が null なら source link を描画しないこと', () => {
    const rendered = renderArticleHeaderHtml(
      {
        heading: '見出し',
        breadcrumbs: [],
        genres: [],
        source: 'https://example.com/source',
      },
      { sourceLinkMode: { kind: 'classified', annotation: null } },
    );

    expect(rendered).not.toContain('article-header__source-link');
  });
});
