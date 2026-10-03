import { describe, expect, it } from 'vitest';
import { parseFragment, type DefaultTreeAdapterMap } from 'parse5';
import SearchPageTemplate from '../../src/search.11ty.js';
import TagPagesTemplate from '../../src/tags.11ty.js';
import { createSiteUrlContext } from '../../shared/site/site-url-context.js';
import type { TagPageEntry } from '../../build/projections/tag-page-projection.js';

type Element = DefaultTreeAdapterMap['element'];
const elements = (node: DefaultTreeAdapterMap['parentNode']): Element[] =>
  node.childNodes.flatMap((child) => ('tagName' in child ? [child, ...elements(child)] : []));
const attr = (node: Element, name: string): string | undefined =>
  node.attrs.find((entry) => entry.name === name)?.value;

const tagPage: TagPageEntry = {
  tag: '日本語 / A',
  noteCount: 1,
  searchHref: '/unused',
  searchRenderHref: '/unused',
  notes: [
    {
      title: '元のノート',
      permalink: '/notes/a/',
      renderHref: '/base/notes/a/',
      description: '説明',
      date: '2026-01-01',
      slug: 'a',
      genres: ['日本語 / A'],
    },
  ],
};
const siteUrlContext = createSiteUrlContext({
  siteOrigin: 'https://example.com',
  basePath: '/base',
});

describe('Search / Tag SSR baseline', () => {
  it('Search文書はtagとcorpusへの静的navigationだけをbaselineとして出力する', () => {
    const html = new SearchPageTemplate().render({ siteUrlContext, tagPages: [tagPage] });
    const dom = elements(parseFragment(html));
    const baseline = dom.find((node) => attr(node, 'data-search-page-baseline') !== undefined);
    expect(baseline).toBeDefined();
    if (!baseline) throw new Error('Missing baseline');
    const links = elements(baseline).filter((node) => node.tagName === 'a');
    expect(links.map((node) => attr(node, 'href'))).toEqual([
      `/base/tags/${encodeURIComponent(tagPage.tag)}/`,
      '/base/corpora/',
    ]);
    expect(
      links.every(
        (node) =>
          attr(node, 'data-link-kind') === 'internal-document' &&
          attr(node, 'data-link-surface') === 'navigation',
      ),
    ).toBe(true);
    expect(html).toContain('全文検索や複合フィルタにはJavaScriptが必要です');
    expect(html).toContain('data-search-page-surface="search"');
    expect(html).not.toContain('data-search-result-card');
    expect(html).not.toContain('最近の更新');
    expect(html).not.toContain('元のノート');
    expect(html).not.toContain('一致するメモが見つかりません');
  });

  it('Tag文書は元tag / 静的count / metadata / note linksを保持する', () => {
    const html = new TagPagesTemplate().render({ siteUrlContext, tagPage });
    expect(html).toContain('data-search-page-surface="tag"');
    expect(html).toContain('data-search-page-baseline-tag="日本語 / A"');
    expect(html).toContain('href="/base/notes/a/"');
    expect(html).toContain('1件のノート（元のタグの静的一覧）');
    expect(html).toContain('現在のURLの検索条件は適用していません');
    expect(html).toContain('更新日: 2026-01-01');
    expect(html).not.toContain('<noscript>');
  });

  it.each(['search', 'tag'] as const)(
    '%sのdynamic controlはhidden form内に置きchoice primitiveとenabled値を保持する',
    (kind) => {
      const html =
        kind === 'search'
          ? new SearchPageTemplate().render({ siteUrlContext, tagPages: [tagPage] })
          : new TagPagesTemplate().render({ siteUrlContext, tagPage });
      const form = elements(parseFragment(html)).find(
        (node) => attr(node, 'data-search-page-form') !== undefined,
      );
      expect(form).toBeDefined();
      if (!form) throw new Error('Missing form');
      expect(attr(form, 'hidden')).toBe('');
      const controls = elements(form);
      for (const name of ['tagMode', 'sort']) {
        const input = controls.find((node) => attr(node, 'name') === name);
        expect(input && attr(input, 'type')).toBe('hidden');
        expect(input && attr(input, 'disabled')).toBeUndefined();
        expect(input && attr(input, 'value')).toBe(name === 'tagMode' ? 'or' : 'relevance');
      }
      const menus = controls.filter((node) => attr(node, 'data-search-choice-menu') !== undefined);
      expect(menus).toHaveLength(2);
      for (const menu of menus) {
        expect(menu.tagName).toBe('details');
        expect(elements(menu).some((node) => node.tagName === 'summary')).toBe(true);
        const items = elements(menu).filter(
          (node) => attr(node, 'data-static-choice-item') !== undefined,
        );
        expect(items).toHaveLength(2);
        expect(
          items.every((node) => node.tagName === 'button' && attr(node, 'type') === 'button'),
        ).toBe(true);
      }
    },
  );
});
