import { describe, expect, it } from 'vitest';
import { parseFragment, type DefaultTreeAdapterMap } from 'parse5';

import { CorporaOverviewTemplate } from '../../src/corpora-index.11ty.js';

type ChildNode = DefaultTreeAdapterMap['childNode'];
type ElementNode = DefaultTreeAdapterMap['element'];

interface ParentLike {
  readonly childNodes: readonly ChildNode[];
}

const isElementNode = (node: ChildNode): node is ElementNode => 'tagName' in node;

const getAttribute = (node: ElementNode, name: string): string | null =>
  node.attrs.find((attribute) => attribute.name === name)?.value ?? null;

const hasClass = (node: ElementNode, className: string): boolean =>
  (getAttribute(node, 'class') ?? '').split(/\s+/u).includes(className);

const collectElements = (
  node: ParentLike,
  predicate: (element: ElementNode) => boolean,
  matches: ElementNode[] = [],
): ElementNode[] => {
  for (const child of node.childNodes) {
    if (!isElementNode(child)) {
      continue;
    }
    if (predicate(child)) {
      matches.push(child);
    }
    collectElements(child, predicate, matches);
  }
  return matches;
};

const elementChildren = (node: ElementNode): ElementNode[] => node.childNodes.filter(isElementNode);

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
    const fragment = parseFragment(rendered);
    const cards = collectElements(
      fragment,
      (element) => element.tagName === 'article' && hasClass(element, 'result-card'),
    );
    expect(cards).toHaveLength(2);
    for (const card of cards) {
      const children = elementChildren(card);
      expect(children).toHaveLength(1);
      const [link] = children;
      expect(link?.tagName).toBe('a');
      expect(link ? hasClass(link, 'result-link') : false).toBe(true);
      expect(link ? getAttribute(link, 'data-link-surface') : null).toBe('card');
    }
    expect(rendered).not.toContain('<corpora-overview-page');
    expect(rendered).not.toContain('data-hydration-');
  });

  it('corpora と recent notes が空の場合は corpus 系 static empty state を描画すること', () => {
    const template = new CorporaOverviewTemplate();
    const rendered = template.render({
      corporaOverview: {
        corpusCount: 0,
        noteCount: 0,
        latestUpdatedDate: null,
        corpora: [],
        recentNotes: [],
      },
    });

    expect(rendered).toContain(
      '<section class="empty-hint" data-empty-state data-empty-variant="default">',
    );
    expect(rendered).toContain('<div class="empty-hint__message" data-announce="off">');
    expect(rendered).toContain('<div class="empty-hint__icon" aria-hidden="true"></div>');
    expect(rendered).toContain('<h2 class="empty-hint__heading">公開コーパスはまだありません</h2>');
    expect(rendered).toContain(
      '<p class="empty-hint__description">ノートが公開されると、ここにコーパス一覧が表示されます。</p>',
    );
    expect(rendered).toContain('<h2 class="empty-hint__heading">公開ノートはまだありません</h2>');
    expect(rendered).toContain(
      '<p class="empty-hint__description">ノートが公開されると、ここに最近更新した項目が表示されます。</p>',
    );
    expect(rendered.match(/<div class="empty-hint__actions" hidden><\/div>/gu)).toHaveLength(2);
    expect(rendered).not.toContain('<ui-empty-state');
    expect(rendered).not.toContain('data-empty-variant="search"');
    expect(rendered).not.toContain('role="status"');
    expect(rendered).not.toContain('data-hydration-');
  });
});
