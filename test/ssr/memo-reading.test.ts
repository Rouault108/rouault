import { describe, expect, it } from 'vitest';
import { loadMemosData } from '../../build/data/memos.js';
import { buildMemoPageProjection } from '../../build/projections/memo-page-projection.js';
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
describe('memo collection and shared reading surface', () => {
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
    const memos = loadMemosData();
    const memo = memos.find((item) => item.slug === 'example');
    expect(memo).toBeDefined();
    if (!memo) return;
    const projection = buildMemoPageProjection(memo, memos);
    expect(projection.showSidebar).toBe(false);
    expect(projection.tocPresence).toBe('present');
    expect(projection.toc.capabilities.mobilePanel).toBe(true);
    expect(projection.articleHeader.genres).toEqual([]);
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
    const memos = loadMemosData();
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
});
