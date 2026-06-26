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

const textContent = (node: ChildNode): string => {
  if ('value' in node) {
    return node.value;
  }
  if (!('childNodes' in node)) {
    return '';
  }
  return node.childNodes.map((child) => textContent(child)).join('');
};

describe('CorporaOverviewTemplate', () => {
  it('コーパス索引用の overview を静的 HTML として描画すること', () => {
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
          {
            key: 'computer-science',
            label: 'Computer Science',
            href: '/corpora/computer-science/',
            renderHref: '/corpora/computer-science/',
            noteCount: 1,
            latestUpdatedDate: '2026-03-08',
          },
        ],
      },
    });

    expect(rendered).toContain('<section class="corpora-overview page-shell"');
    expect(rendered).toContain('<div class="meta-row corpora-overview__meta">');
    expect(rendered).toContain('2件のコーパス');
    expect(rendered).toContain('3件のノート');
    expect(rendered).toContain('<span>最新更新 <time datetime="2026-03-10">2026-03-10</time></span>');
    expect(rendered).toContain('<h2 id="corpora-list-title" class="corpora-overview__section-title">公開コーパス</h2>');
    expect(rendered).toContain('閲覧単位を選び、そのまとまりに属するノートへ進みます。');
    expect(rendered).toContain('href="/corpora/music/"');
    expect(rendered).not.toContain('href="/notes/music/harmony/"');
    expect(rendered).not.toContain('id="recent-notes-title"');
    expect(rendered).not.toContain('最近更新したノート');
    const fragment = parseFragment(rendered);
    const corpusIndexes = collectElements(
      fragment,
      (element) => element.tagName === 'ol' && hasClass(element, 'corpora-overview__corpus-index'),
    );
    const cards = collectElements(
      fragment,
      (element) => element.tagName === 'article' && hasClass(element, 'result-card'),
    );
    const resultLinks = collectElements(
      fragment,
      (element) => element.tagName === 'a' && hasClass(element, 'result-link'),
    );
    const cardSurfaceLinks = collectElements(
      fragment,
      (element) => getAttribute(element, 'data-link-surface') === 'card',
    );
    expect(corpusIndexes).toHaveLength(1);
    expect(cards).toHaveLength(0);
    expect(resultLinks).toHaveLength(0);
    expect(cardSurfaceLinks).toHaveLength(0);
    expect(rendered).not.toContain('result-card');
    expect(rendered).not.toContain('result-link');
    expect(rendered).not.toContain('result-title');
    expect(rendered).not.toContain('result-meta');
    expect(rendered).not.toContain('result-path');

    const [corpusIndex] = corpusIndexes;
    const items = corpusIndex ? elementChildren(corpusIndex) : [];
    expect(items).toHaveLength(2);

    const seenIds = new Set<string>();
    const expectedRows = [
      {
        titleId: 'corpus-index-row-0-music-title',
        pathId: 'corpus-index-row-0-music-path',
        metaId: 'corpus-index-row-0-music-meta',
        href: '/corpora/music/',
        label: '音楽',
        path: '/corpora/music/',
      },
      {
        titleId: 'corpus-index-row-1-computer-science-title',
        pathId: 'corpus-index-row-1-computer-science-path',
        metaId: 'corpus-index-row-1-computer-science-meta',
        href: '/corpora/computer-science/',
        label: 'Computer Science',
        path: '/corpora/computer-science/',
      },
    ] as const;

    for (const [index, item] of items.entries()) {
      expect(item.tagName).toBe('li');
      expect(hasClass(item, 'corpora-overview__corpus-item')).toBe(true);
      const links = elementChildren(item).filter(
        (element) =>
          element.tagName === 'a' &&
          hasClass(element, 'corpus-index-row') &&
          getAttribute(element, 'data-corpus-index-row') !== null,
      );
      expect(links).toHaveLength(1);
      const [link] = links;
      const expected = expectedRows[index];
      expect(link).toBeDefined();
      if (!link || !expected) continue;

      expect(getAttribute(link, 'href')).toBe(expected.href);
      expect(getAttribute(link, 'data-link-kind')).toBe('internal-document');
      expect(getAttribute(link, 'data-link-surface')).toBe('navigation');
      expect(getAttribute(link, 'aria-labelledby')).toBe(expected.titleId);
      expect(getAttribute(link, 'aria-describedby')).toBe(`${expected.pathId} ${expected.metaId}`);

      const descendants = collectElements(link, () => true);
      const byId = new Map<string, ElementNode>();
      for (const descendant of descendants) {
        const id = getAttribute(descendant, 'id');
        if (!id) continue;
        expect(seenIds.has(id), `${id} must be unique across rows`).toBe(false);
        seenIds.add(id);
        byId.set(id, descendant);
      }

      const title = byId.get(expected.titleId);
      const path = byId.get(expected.pathId);
      const meta = byId.get(expected.metaId);
      expect(title).toBeDefined();
      expect(path).toBeDefined();
      expect(meta).toBeDefined();
      expect(title ? hasClass(title, 'corpus-index-row__title') : false).toBe(true);
      expect(path ? hasClass(path, 'corpus-index-row__path') : false).toBe(true);
      expect(meta ? hasClass(meta, 'corpus-index-row__meta') : false).toBe(true);
      expect(title ? textContent(title).trim() : '').toBe(expected.label);
      expect(path ? textContent(path).trim() : '').toBe(expected.path);
      expect(getAttribute(link, 'aria-labelledby')).not.toContain(expected.pathId);
      expect(getAttribute(link, 'aria-labelledby')).not.toContain(expected.metaId);
    }
    expect(seenIds.size).toBe(6);
    expect(rendered).not.toContain('<corpora-overview-page');
    expect(rendered).not.toContain('data-hydration-');
  });

  it('corpora が空の場合は corpus 系 static empty state を描画すること', () => {
    const template = new CorporaOverviewTemplate();
    const rendered = template.render({
      corporaOverview: {
        corpusCount: 0,
        noteCount: 0,
        latestUpdatedDate: null,
        corpora: [],
      },
    });

    expect(rendered).toContain('<span>最新更新なし</span>');
    expect(rendered).not.toContain('<time datetime="なし">なし</time>');
    expect(rendered).toContain(
      '<section class="empty-hint" data-empty-state data-empty-variant="default">',
    );
    expect(rendered).toContain('<div class="empty-hint__message" data-announce="off">');
    expect(rendered).toContain('<div class="empty-hint__icon" aria-hidden="true"></div>');
    expect(rendered).toContain('<h2 class="empty-hint__heading">公開コーパスはまだありません</h2>');
    expect(rendered).toContain(
      '<p class="empty-hint__description">コーパス対象のノートが公開されると、ここにコーパス一覧が表示されます。</p>',
    );
    expect(rendered.match(/<div class="empty-hint__actions" hidden><\/div>/gu)).toHaveLength(1);
    expect(rendered).not.toContain('<ui-empty-state');
    expect(rendered).not.toContain('data-empty-variant="search"');
    expect(rendered).not.toContain('role="status"');
    expect(rendered).not.toContain('data-hydration-');
  });
});
