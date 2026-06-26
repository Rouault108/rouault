import { describe, expect, it } from 'vitest';
import { parseFragment, type DefaultTreeAdapterMap } from 'parse5';

import { NoteLayout } from '../../src/layouts/NoteLayout.11ty.js';
import type { NotePageProjection } from '../../build/projections/note-page-projection.js';
import type { NoteNavigationEntry } from '../../build/navigation/index.js';

const TEST_SITE_URL_CONTEXT = { siteOrigin: 'https://example.com', basePath: '' };

type ChildNode = DefaultTreeAdapterMap['childNode'];
type ElementNode = DefaultTreeAdapterMap['element'];
interface ParentLike {
  childNodes: ChildNode[];
}

const isElementNode = (node: ChildNode): node is ElementNode => 'tagName' in node;

const getAttribute = (node: ElementNode, name: string): string | null =>
  node.attrs.find((attribute) => attribute.name === name)?.value ?? null;

const findElement = (
  node: ParentLike,
  predicate: (element: ElementNode) => boolean,
): ElementNode | null => {
  for (const child of node.childNodes) {
    if (!isElementNode(child)) {
      continue;
    }

    if (predicate(child)) {
      return child;
    }

    const match = findElement(child, predicate);
    if (match) {
      return match;
    }
  }

  return null;
};

const createProjection = (
  overrides: Partial<NotePageProjection> & { sidebar?: NotePageProjection['sidebar'] | null } = {},
): NotePageProjection => {
  const { sidebar, ...rest } = overrides;
  const defaultSidebar: NonNullable<NotePageProjection['sidebar']> = {
    sidebarId: 'note-primary',
    stateScopeId: 'note-navigation',
    selectedId: 'note',
    initialExpandedIds: [],
    topologyRevision: '[{"id":"note","kind":"leaf","label":"Note","href":"/notes/note"}]',
    navHtml:
      '<nav data-sidebar-nav aria-label="ノートナビゲーション" data-sidebar-id="note-primary" data-topology-revision="[{&quot;id&quot;:&quot;note&quot;,&quot;kind&quot;:&quot;leaf&quot;,&quot;label&quot;:&quot;Note&quot;,&quot;href&quot;:&quot;/notes/note&quot;}]"><ul><li data-node-id="note" data-node-kind="leaf" data-node-depth="0"><a data-sidebar-nav-control data-sidebar-nav-link href="/notes/note" data-link-kind="internal-document" data-link-surface="navigation" aria-current="page"><span data-sidebar-nav-label>Note</span></a></li></ul></nav>',
    heading: null,
    fixedBreakpoint: '1024',
    presentation: 'auto',
  };

  return {
    noteKind: 'reader',
    noteShellSidebarPresence: 'present',
    tocPresence: 'present',
    showSidebar: true,
    contentHtml: '<p>本文</p>',
    ...(sidebar === undefined ? { sidebar: defaultSidebar } : { sidebar }),
    toc: {
      sourceId: 'toc-source-note',
      runtimeId: 'toc-source-note',
      ownerId: 'toc-owner-note',
      scopeId: 'note-toc',
      headings: [{ id: 'intro', text: 'Intro', level: 2 }],
      capabilities: {
        activeTracking: true,
        dynamicScopes: false,
        mobilePanel: true,
      },
      contentRootId: 'note-content-note',
      homeHref: '/',
      shouldHydrate: true,
    },
    articleHeader: {
      heading: '見出し',
      breadcrumbs: [
        { label: 'Program', href: '/program/' },
        { label: '見出し', href: '/program/example/' },
      ],
      published: '2026-01-01',
      updated: '2026-02-01',
      genres: ['music'],
    },
    pagefind: {
      sortDate: '2026-02-01',
      title: '見出し',
      tokenizedTitle: '',
      description: '要約',
      tokenizedDescription: '',
      date: '2026-02-01',
      tags: ['music'],
    },
    ...rest,
  };
};

const createClassificationData = () => ({
  siteUrlContext: TEST_SITE_URL_CONTEXT,
  page: { url: '/notes/current/' },
  note: { permalink: '/notes/current/' },
  notes: [
    {
      slug: 'current',
      title: 'Current',
      permalink: '/notes/current/',
      noteKind: 'leaf',
    },
    {
      slug: 'source-document',
      title: 'Source Document',
      permalink: '/source-document/',
      noteKind: 'leaf',
    },
  ] satisfies readonly NoteNavigationEntry[],
  corpusPages: [],
  tagPages: [{ tag: 'music' }],
});

describe('NoteLayout', () => {
  it('projection 済みデータを描画し hydration scope を出力すること', () => {
    const layout = new NoteLayout();
    const rendered = layout.render({
      notePage: createProjection(),
    });

    expect(rendered).toContain('data-hydration-scope="note-shell"');
    expect(rendered).toContain('data-toc-presence="present"');
    expect(rendered).not.toContain('data-hydration-scope="note-sidebar"');
    expect(rendered.match(/<layout-sidebar\b/g)?.length ?? 0).to.equal(0);
    expect(rendered).not.toContain('data-sidebar-surface=');
    expect(rendered).not.toContain('data-app-shell-sidebar-overlay-layer');
    expect(rendered).toContain('data-hydration-scope="note-content"');
    expect(rendered).toContain('data-hydration-scope="note-toc"');
    expect(rendered).toContain('data-pagefind-sort="date:2026-02-01"');
    expect(rendered).toContain('<span data-pagefind-weight="10">見出し</span>');
    expect(rendered).not.toContain('<span data-pagefind-weight="8">見出し</span>');
    expect(rendered).toContain('<header class="article-header" data-article-header>');
    expect(rendered).toContain('<h1 class="article-header__heading">見出し</h1>');
    expect(rendered.match(/aria-current="page"/gu)?.length ?? 0).toBeGreaterThanOrEqual(1);
    expect(rendered).toContain('<nav class="layout-toc" aria-label="目次" data-layout-toc-nav>');
    expect(rendered).toContain('data-heading-level="2"');
    expect(rendered).toContain('data-heading-depth="0"');
    expect(rendered).toContain('content-root-id="note-content-note"');
    expect(rendered).toContain('toc-runtime-id="toc-source-note"');
    expect(rendered).toContain('<layout-toc-controller');
    expect(rendered).not.toContain('<ui-article-header');
    expect(rendered).not.toContain('<layout-toc ');

    const fragment = parseFragment(rendered);
    const tocRoot = findElement(
      fragment,
      (element) => getAttribute(element, 'class') === 'layout-toc-col',
    );
    const tocNav = tocRoot
      ? findElement(
          tocRoot,
          (element) =>
            element.tagName === 'nav' && getAttribute(element, 'class') === 'layout-toc',
        )
      : null;

    expect(tocRoot?.tagName).to.equal('div');
    expect(tocRoot ? getAttribute(tocRoot, 'aria-label') : null).to.equal(null);
    expect(tocRoot ? getAttribute(tocRoot, 'role') : null).to.equal(null);
    expect(tocNav ? getAttribute(tocNav, 'aria-label') : null).to.equal('目次');
  });

  it('static TOC 経路では mobile static nav も共通の navigation label を持つこと', () => {
    const layout = new NoteLayout();
    const rendered = layout.render({
      notePage: createProjection({
        toc: {
          sourceId: 'toc-source-note',
          runtimeId: 'toc-source-note',
          ownerId: 'toc-owner-note',
          scopeId: 'note-toc',
          headings: [{ id: 'intro', text: 'Intro', level: 2 }],
          capabilities: {
            activeTracking: false,
            dynamicScopes: false,
            mobilePanel: false,
          },
          contentRootId: 'note-content-note',
          homeHref: '/',
          shouldHydrate: false,
        },
      }),
    });
    const fragment = parseFragment(rendered);
    const mobileStaticNav = findElement(
      fragment,
      (element) => getAttribute(element, 'data-layout-toc-mobile-static-nav') === '',
    );

    expect(mobileStaticNav).not.to.equal(null);
    expect(mobileStaticNav?.tagName).to.equal('nav');
    expect(mobileStaticNav ? getAttribute(mobileStaticNav, 'aria-label') : null).to.equal('目次');
  });

  it('article-header の source を http/https のみリンク化し、created を aria-label へ含めること', () => {
    const layout = new NoteLayout();
    const rendered = layout.render({
      ...createClassificationData(),
      notePage: createProjection({
        articleHeader: {
          heading: '見出し',
          breadcrumbs: [
            { label: 'Program', href: '/program/' },
            { label: '見出し', href: '/program/example/' },
          ],
          published: '2026-01-01',
          created: '2025-12-31',
          source: 'https://external.example/source',
          genres: ['music'],
        },
      }),
    });

    expect(rendered).toContain('href="https://external.example/source"');
    expect(rendered).toContain('data-link-kind="external-web"');
    expect(rendered).toContain('data-external="true"');
    expect(rendered).toContain('aria-label="公開日: 2026-01-01、作成日: 2025-12-31"');
    expect(rendered).toContain(
      '<span class="article-header__breadcrumb-node article-header__breadcrumb-current" aria-current="page">見出し</span>',
    );
  });

  it('NoteLayout final HTML では source link を raw fallback ではなく分類済み internal-resource として描画すること', () => {
    const layout = new NoteLayout();
    const rendered = layout.render({
      ...createClassificationData(),
      notePage: createProjection({
        articleHeader: {
          heading: '見出し',
          breadcrumbs: [
            { label: 'Program', href: '/program/' },
            { label: '見出し', href: '/program/example/' },
          ],
          published: '2026-01-01',
          source: 'https://example.com/article-header-link-decoration',
          genres: ['music'],
        },
      }),
    });

    expect(rendered).toContain('class="article-header__source-link"');
    expect(rendered).toContain('href="/article-header-link-decoration"');
    expect(rendered).toContain('target="_blank"');
    expect(rendered).toContain('rel="noopener noreferrer"');
    expect(rendered).toContain('data-link-kind="internal-resource"');
    expect(rendered).toContain('data-link-surface="metadata"');
    expect(rendered).toContain('aria-label="出典（新しいタブで開く）"');
    expect(rendered).not.toContain('data-external="true"');
    expect(rendered).not.toContain('aria-label="出典（外部サイト、新しいタブで開く）"');
  });

  it('NoteLayout final HTML では same-origin internal document source link を passthrough のまま分類すること', () => {
    const layout = new NoteLayout();
    const rendered = layout.render({
      ...createClassificationData(),
      notePage: createProjection({
        articleHeader: {
          heading: '見出し',
          source: 'https://example.com/source-document/',
          genres: ['music'],
        },
      }),
    });

    expect(rendered).toContain('href="/source-document"');
    expect(rendered).toContain('target="_blank"');
    expect(rendered).toContain('rel="noopener noreferrer"');
    expect(rendered).toContain('data-link-kind="internal-document"');
    expect(rendered).not.toContain('data-external="true"');
  });

  it('source link を持つ NoteLayout final HTML は classification data 欠落時に error にすること', () => {
    const layout = new NoteLayout();

    expect(() =>
      layout.render({
        notePage: createProjection({
          articleHeader: {
            heading: '見出し',
            source: 'https://example.com/source',
            genres: ['music'],
          },
        }),
      }),
    ).toThrow('siteUrlContext');
  });

  it('tocPresence=absent では TOC host / script / hydration scope を出力しないこと', () => {
    const layout = new NoteLayout();
    const rendered = layout.render({
      notePage: createProjection({
        tocPresence: 'absent',
        toc: {
          sourceId: 'toc-source-note',
          runtimeId: 'toc-source-note',
          ownerId: 'toc-owner-note',
          scopeId: 'note-toc',
          headings: [],
          capabilities: {
            activeTracking: true,
            dynamicScopes: true,
            mobilePanel: true,
          },
          contentRootId: 'note-content-note',
          homeHref: '/',
          shouldHydrate: true,
        },
      }),
    });

    expect(rendered).toContain('data-toc-presence="absent"');
    expect(rendered).not.toContain('class="layout-toc-col"');
    expect(rendered).not.toContain('<layout-toc');
    expect(rendered).not.toContain('<layout-toc-controller');
    expect(rendered).not.toContain('data-hydration-scope="note-toc"');
    expect(rendered).not.toContain('<script id="toc-source-note" type="application/json">');
  });

  it('projection 値を安全に escape すること', () => {
    const layout = new NoteLayout();
    const rendered = layout.render({
      notePage: createProjection({
        contentHtml: '<p>本文</p><script>console.log("unsafe")</script>',
        sidebar: {
          sidebarId: 'note-primary',
          stateScopeId: 'note-navigation',
          selectedId: 'note',
          initialExpandedIds: [],
          topologyRevision: '[{"id":"note","kind":"leaf","label":"<Unsafe>","href":"/notes/note"}]',
          navHtml:
            '<nav data-sidebar-nav aria-label="ノートナビゲーション" data-sidebar-id="note-primary" data-topology-revision="unsafe"><ul><li data-node-id="note" data-node-kind="leaf" data-node-depth="0"><a data-sidebar-nav-control data-sidebar-nav-link href="/notes/note" data-link-kind="internal-document" data-link-surface="navigation" aria-current="page"><span data-sidebar-nav-label>&lt;Unsafe&gt;</span></a></li></ul></nav>',
          heading: null,
          fixedBreakpoint: '1024',
          presentation: 'auto',
        },
        articleHeader: {
          heading: '"Danger"<tag>',
          published: '2026-01-01',
          genres: ['a"&b'],
          source: 'javascript:alert(1)',
        },
      }),
    });

    expect(rendered).toContain('"Danger"&lt;tag&gt;');
    expect(rendered).toContain('href="/tags/a%22%26b/"');
    expect(rendered).not.toContain('javascript:alert(1)');
  });

  it('sidebar と Pagefind が無効な projection では対応マークアップを出さないこと', () => {
    const layout = new NoteLayout();
    const rendered = layout.render({
      notePage: createProjection({
        noteKind: 'testing',
        noteShellSidebarPresence: 'absent',
        showSidebar: false,
        sidebar: null,
        pagefind: null,
      }),
    });

    expect(rendered).not.toContain('<layout-sidebar');
    expect(rendered).not.toContain('data-pagefind-body');
    expect(rendered).not.toContain('data-pagefind-sort=');
    expect(rendered).not.toContain('id="sidebar-source-note"');
  });
});
