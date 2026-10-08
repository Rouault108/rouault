import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildMemosCollection, loadMemosData } from '../../build/data/memos.js';
import { collectAdoptedContentSources } from '../../build/content/publication-snapshot.js';
import MemoIndex from '../../src/memos-index.11ty.js';
import MemoPages from '../../src/memos.11ty.js';
import {
  buildMemoPageProjection,
  MEMO_RIGHTS_NOTICE,
} from '../../build/projections/memo-page-projection.js';
import { buildMemoIndexProjection } from '../../build/projections/memo-index-projection.js';
import { NoteLayout } from '../../src/layouts/NoteLayout.11ty.js';
import {
  ContentRouteRegistry,
  resolveContentRoute,
} from '../../build/content/content-route-registry.js';
import { buildProductionInternalDocumentRouteSet } from '../../build/navigation/internal-document-routes.js';
import { loadNotesData, filterNotesBySurface } from '../../build/data/notes.js';
import { normalizeRouaultPathname } from '../../shared/url/rouault-url-policy.js';
import { contentIdentityDomKey } from '../../build/content/content-record.js';
afterEach(() => vi.unstubAllEnvs());
const fixtureMemos = () =>
  buildMemosCollection([
    {
      sourcePath: 'test/fixtures/content/memos/example.md',
      title: '合成メモ',
      license: 'CC BY 4.0',
      content: '<h2 id="synthetic-heading">合成見出し</h2><p>検証専用の合成本文です。</p>',
    },
    {
      sourcePath: 'test/fixtures/content/memos/no-headings.md',
      title: '見出しのない合成メモ',
      license: 'CC BY 4.0',
      content: '<p>見出しのない合成本文です。</p>',
    },
  ]);
describe('memo collection and shared reading surface', () => {
  it('ordinary generated memos, routes and title list adopt only the actual published source root', () => {
    vi.stubEnv('ROUAULT_MEMO_FIXTURES', '');
    const memos = loadMemosData();
    const sources = collectAdoptedContentSources().filter(
      (source) => source.identity.collectionId === 'memos',
    );
    const expected = sources
      .map((source) => resolveContentRoute(source.identity).canonicalPathname)
      .sort();
    expect(memos.map((memo) => memo.canonicalPathname).sort()).toEqual(expected);
    expect(memos.every((memo) => memo.sourceRoot === 'content/memos')).toBe(true);
    const routes = buildProductionInternalDocumentRouteSet()
      .routeSet.routes.filter((route) => route.startsWith('/memos/'))
      .sort();
    expect(routes).toEqual(['/memos/', ...expected].sort());
    if (!sources.length) {
      const html = new MemoIndex().render({ memos });
      expect(html).toContain('公開中のメモはありません');
      expect(html).not.toContain('合成メモ');
      expect(html).not.toContain('/memos/example');
      expect(html).not.toContain('/memos/no-headings');
    }
  });
  it('keeps index and body URL policies separate', () => {
    expect(
      contentIdentityDomKey({ collectionId: 'memos', sourceRelativePath: '日本.md' }),
    ).not.toBe(contentIdentityDomKey({ collectionId: 'memos', sourceRelativePath: '語学.md' }));
    expect(normalizeRouaultPathname('/memos')).toBe('/memos/');
    expect(normalizeRouaultPathname('/memos/topic/')).toBe('/memos/topic');
    expect(
      resolveContentRoute({ collectionId: 'memos', sourceRelativePath: '日本 語/index.md' })
        .canonicalPathname,
    ).toBe('/memos/%E6%97%A5%E6%9C%AC%20%E8%AA%9E');
    expect(
      resolveContentRoute({ collectionId: 'memos', sourceRelativePath: 'C#? & 100%.md' }),
    ).toMatchObject({
      canonicalPathname: '/memos/C%23%3F%20%26%20100%25',
      outputPath: 'memos/C#? & 100%/index.html',
    });
  });
  it('rejects root index, leaf/index collisions, case/NFC ambiguity, traversal and static collisions', () => {
    const identity = (sourceRelativePath: string) => ({
      collectionId: 'memos' as const,
      sourceRelativePath,
    });
    for (const files of [
      ['index.md'],
      ['a.md', 'a/index.md'],
      ['A.md', 'a.md'],
      ['é.md', 'e\u0301.md'],
      ['../a.md'],
    ])
      expect(() => new ContentRouteRegistry(files.map(identity))).toThrow();
    expect(() => new ContentRouteRegistry([identity('a.md')], ['/memos/a'])).toThrow();
    expect(() => new ContentRouteRegistry([identity('a.md'), identity('a/b.md')])).not.toThrow();
    expect(
      () =>
        new ContentRouteRegistry([
          { collectionId: 'notes', sourceRelativePath: 'a.md' },
          identity('a.md'),
        ]),
    ).not.toThrow();
  });
  it('composes common TOC/header without note sidebar or exploration surfaces', () => {
    vi.stubEnv('ROUAULT_MEMO_FIXTURES', '1');
    const memos = fixtureMemos();
    const memo = memos.find((item) => item.slug === 'example');
    expect(memo).toBeDefined();
    if (!memo) return;
    const projection = buildMemoPageProjection(memo, memos);
    expect(projection.showSidebar).toBe(false);
    expect(projection.tocPresence).toBe('present');
    expect(projection.toc.capabilities.mobilePanel).toBe(true);
    expect(projection.articleHeader.genres).toEqual([]);
    expect(projection.articleHeader.license).toBe('CC BY 4.0');
    expect(projection.rightsNotice).toBe(MEMO_RIGHTS_NOTICE);
    const html = new NoteLayout().render({ notePage: projection });
    expect(html).toContain('data-sidebar-presence="absent"');
    expect(html).toContain('data-layout-toc-nav');
    expect(html).toContain('CC BY 4.0');
    expect(html).not.toMatch(/\/archives\//u);
    const absent = memos.find((item) => item.slug === 'no-headings');
    expect(absent).toBeDefined();
    if (absent) expect(buildMemoPageProjection(absent, memos).tocPresence).toBe('absent');
    const routes = buildProductionInternalDocumentRouteSet().routeSet;
    for (const item of memos) {
      expect(routes.has(item.permalink)).toBe(true);
      expect(Object.values(item.surfaces)).toEqual([false, false, false, false]);
    }
    const notes = loadNotesData();
    for (const surface of ['home', 'tags', 'corpora', 'search'] as const)
      expect(
        filterNotesBySurface(notes, surface).every((item) => !item.permalink.startsWith('/memos/')),
      ).toBe(true);
  });
  it('keeps duplicate titles and sorts the dedicated title list deterministically', () => {
    const memos = fixtureMemos();
    const first = memos[0];
    if (!first) throw new Error('synthetic memo required');
    const items = buildMemoIndexProjection([
      { ...first, title: '同名', canonicalPathname: '/memos/b' },
      { ...first, title: '同名', canonicalPathname: '/memos/a' },
    ]);
    expect(items).toEqual([
      { title: '同名', href: '/memos/a' },
      { title: '同名', href: '/memos/b' },
    ]);
  });
  it('uses shared default footer metadata for memo index and body templates', () => {
    const template = new MemoIndex();
    expect(template.data()).not.toHaveProperty('footerCopyrightText');
    expect(new MemoPages().data()).not.toHaveProperty('footerCopyrightText');

    const empty = template.render({ memos: [] });
    expect(empty).toContain(
      '<section class="memo-index page-shell" aria-labelledby="memo-index-title">',
    );
    expect(empty).toContain('<div class="hero">');
    expect(empty).toContain('<h1 id="memo-index-title" class="heading">メモ</h1>');
    expect(empty).toContain('<div class="meta-row"><span>0件のメモ</span></div>');
    expect(empty).toContain('data-empty-state');
    expect(empty).toContain('公開中のメモはありません');
    expect(empty).not.toContain('empty-hint__icon');
    expect(empty).not.toContain('container-reading');
    expect(empty).not.toContain(MEMO_RIGHTS_NOTICE);

    const populated = template.render({
      memos: fixtureMemos(),
      siteUrlContext: { basePath: '/preview' },
    });
    expect(populated).toContain('<div class="meta-row"><span>2件のメモ</span></div>');
    expect(populated).toContain('<ol class="results-list memo-index__list">');
    expect(populated).toContain('<article class="result-card" data-result-card>');
    expect(populated).toContain('class="result-link"');
    expect(populated).toContain('data-link-surface="card"');
    expect(populated).toContain('href="/preview/memos/example"');
    expect(populated).toContain('<h2 class="result-title">合成メモ</h2>');
    expect(populated).not.toContain('data-empty-state');
    expect(populated).not.toContain(MEMO_RIGHTS_NOTICE);
  });
});
