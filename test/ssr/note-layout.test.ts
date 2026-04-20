import { describe, expect, it } from 'vitest';

import { NoteLayout } from '../../src/layouts/NoteLayout.11ty.js';
import type { NotePageProjection } from '../../build/projections/note-page-projection.js';

const createProjection = (
  overrides: Partial<NotePageProjection> & { sidebar?: NotePageProjection['sidebar'] | null } = {},
): NotePageProjection => {
  const { sidebar, ...rest } = overrides;
  const defaultSidebar: NonNullable<NotePageProjection['sidebar']> = {
    stateScopeId: 'note-navigation',
    selectedId: 'note',
    initialExpandedIds: [],
    topologyRevision: '[{"id":"note","kind":"leaf","label":"Note","href":"/notes/note"}]',
    navHtml:
      '<nav data-sidebar-nav aria-label="ノートナビゲーション" data-topology-revision="[{&quot;id&quot;:&quot;note&quot;,&quot;kind&quot;:&quot;leaf&quot;,&quot;label&quot;:&quot;Note&quot;,&quot;href&quot;:&quot;/notes/note&quot;}]"><ul><li data-node-id="note" data-node-kind="leaf" data-node-depth="0"><a data-sidebar-nav-control data-sidebar-nav-link href="/notes/note" aria-current="page"><span data-sidebar-nav-label>Note</span></a></li></ul></nav>',
    heading: null,
    fixedBreakpoint: '1024',
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
      headings: [{ id: 'intro', text: 'Intro', level: 2 }],
      capabilities: {
        activeTracking: true,
        dynamicScopes: false,
        mobileSummary: true,
      },
      contentRootId: 'note-content-note',
      homeHref: '/',
      shouldHydrate: true,
    },
    articleHeader: {
      heading: '見出し',
      published: '2026-01-01',
      updated: '2026-02-01',
      genres: ['music'],
      shouldHydrateTags: true,
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
    expect(rendered).toContain('content-root-id="note-content-note"');
    expect(rendered).toContain('toc-runtime-id="toc-source-note"');
  });

  it('tocPresence=absent では TOC host / script / hydration scope を出力しないこと', () => {
    const layout = new NoteLayout();
    const rendered = layout.render({
      notePage: createProjection({
        tocPresence: 'absent',
        toc: {
          sourceId: 'toc-source-note',
          headings: [],
          capabilities: {
            activeTracking: true,
            dynamicScopes: true,
            mobileSummary: true,
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
    expect(rendered).not.toContain('data-hydration-scope="note-toc"');
    expect(rendered).not.toContain('<script id="toc-source-note" type="application/json">');
  });

  it('projection 値を安全に escape すること', () => {
    const layout = new NoteLayout();
    const rendered = layout.render({
      notePage: createProjection({
        contentHtml: '<p>本文</p><script>console.log("unsafe")</script>',
        sidebar: {
          stateScopeId: 'note-navigation',
          selectedId: 'note',
          initialExpandedIds: [],
          topologyRevision: '[{"id":"note","kind":"leaf","label":"<Unsafe>","href":"/notes/note"}]',
          navHtml:
            '<nav data-sidebar-nav aria-label="ノートナビゲーション" data-topology-revision="unsafe"><ul><li data-node-id="note" data-node-kind="leaf" data-node-depth="0"><a data-sidebar-nav-control data-sidebar-nav-link href="/notes/note" aria-current="page"><span data-sidebar-nav-label>&lt;Unsafe&gt;</span></a></li></ul></nav>',
          heading: null,
          fixedBreakpoint: '1024',
        },
        articleHeader: {
          heading: '"Danger"<tag>',
          published: '2026-01-01',
          genres: ['a"&b'],
          shouldHydrateTags: true,
        },
      }),
    });

    expect(rendered).toContain('heading="&quot;Danger&quot;&lt;tag&gt;"');
    expect(rendered).toContain('data-tags="[&quot;a\\&quot;&amp;b&quot;]"');
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
