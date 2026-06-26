import { describe, expect, it } from 'vitest';
import { parseFragment, type DefaultTreeAdapterMap } from 'parse5';

import { HomePageTemplate } from '../../src/index.11ty.js';

type ChildNode = DefaultTreeAdapterMap['childNode'];
type ElementNode = DefaultTreeAdapterMap['element'];
type TextNode = DefaultTreeAdapterMap['textNode'];

interface ParentLike {
  readonly childNodes: readonly ChildNode[];
}

const isElementNode = (node: ChildNode): node is ElementNode => 'tagName' in node;
const isTextNode = (node: ChildNode): node is TextNode => node.nodeName === '#text';

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

const textContent = (node: ParentLike): string =>
  node.childNodes
    .map((child) => {
      if (isTextNode(child)) return child.value;
      if (isElementNode(child)) return textContent(child);
      return '';
    })
    .join('');

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
            renderHref: '/notes/music/romantic/',
            summary: '和声進行の整理',
            date: '2026-03-10',
            pathLabel: 'music / romantic',
            genres: ['music', 'romantic'],
          },
        ],
      },
    });

    expect(rendered).toContain('<section class="home-shell">');
    expect(rendered).toContain(
      '<h1 class="home-title">調べたこと、考えたこと、読み返したいこと。</h1>',
    );
    expect(rendered).toContain('最終更新 <time datetime="2026-03-10">2026-03-10</time>');
    expect(rendered).toContain('music / romantic');
    expect(rendered).toContain('和声進行の整理');

    const fragment = parseFragment(rendered);
    const homeLeads = collectElements(fragment, (element) => hasClass(element, 'home-lead'));
    expect(homeLeads).toHaveLength(1);
    const [homeLead] = homeLeads;
    expect(homeLead ? textContent(homeLead) : '').toBe(
      'ソフトウェア、計算機科学、設計、読書で得た理解を、後から辿れる形で残します。',
    );

    const leadKeepPhrases = collectElements(homeLead ?? fragment, (element) =>
      hasClass(element, 'home-lead__keep'),
    );
    expect(leadKeepPhrases).toHaveLength(1);
    const [leadKeepPhrase] = leadKeepPhrases;
    expect(leadKeepPhrase ? textContent(leadKeepPhrase) : '').toBe('形で残します。');

    const [feedHeading] = collectElements(
      fragment,
      (element) => getAttribute(element, 'id') === 'home-feed-heading',
    );
    expect(feedHeading).toBeDefined();
    expect(feedHeading ? textContent(feedHeading) : '').toBe('最近の更新');
    expect(feedHeading ? textContent(feedHeading) : '').not.toBe('新着一覧');

    const [feedMeta] = collectElements(fragment, (element) => hasClass(element, 'home-feed-meta'));
    expect(feedMeta ? textContent(feedMeta) : '').toBe('最新1件・公開ノート3件');

    const [homeMeta] = collectElements(fragment, (element) => hasClass(element, 'home-meta'));
    expect(homeMeta ? getAttribute(homeMeta, 'aria-label') : null).toBe(
      'トップページの補足情報と導線',
    );
    expect(homeMeta ? textContent(homeMeta).replace(/\s+/gu, ' ').trim() : '').toBe(
      '最終更新 2026-03-10 ・ コーパスから辿る ・ 検索する ・ このサイトについて',
    );

    const metadataLinks = collectElements(
      homeMeta ?? fragment,
      (element) =>
        element.tagName === 'a' && getAttribute(element, 'data-link-surface') === 'metadata',
    );
    expect(metadataLinks.map((link) => getAttribute(link, 'href'))).toEqual([
      '/corpora/',
      '/search/',
      '/about/',
    ]);
    expect(metadataLinks.filter((link) => getAttribute(link, 'href') === '/about/')).toHaveLength(
      1,
    );
    for (const link of metadataLinks) {
      expect(getAttribute(link, 'class')).toBe('home-meta-link link-text link-text--muted');
      expect(getAttribute(link, 'data-link-kind')).toBe('internal-document');
      expect(getAttribute(link, 'data-link-surface')).toBe('metadata');
    }
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
            renderHref: '/notes/music/romantic/',
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
    expect(data.description).toBe('Rouaultの公開ノートを静かに読むためのトップページ。');
    expect(data.permalink).toBe('/index.html');
  });
});
