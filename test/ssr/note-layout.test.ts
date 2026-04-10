import { describe, expect, it } from 'vitest';

import { NoteLayout } from '../../src/layouts/NoteLayout.11ty.js';
import type { NotePageProjection } from '../../build/projections/note-page-projection.js';

const createProjection = (
  overrides: Partial<NotePageProjection> & { sidebar?: NotePageProjection['sidebar'] | null } = {},
): NotePageProjection => {
  const { sidebar, ...rest } = overrides;
  const defaultSidebar: NonNullable<NotePageProjection['sidebar']> = {
    sourceId: 'sidebar-source-note',
    selectedId: 'note',
    items: [{ kind: 'leaf', id: 'note', label: 'Note', href: '/notes/note' }],
    heading: 'ナビゲーション',
    fixedBreakpoint: '1024',
  };

  return {
    noteKind: 'reader',
    noteShellSidebarPresence: 'present',
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
    expect(rendered).toContain('data-hydration-scope="note-sidebar"');
    expect(rendered).toContain('<aside\n                  class="layout-sidebar-col"');
    expect(rendered.match(/<layout-sidebar\b/g)?.length ?? 0).to.equal(1);
    expect(rendered).not.toContain('data-sidebar-surface=');
    expect(rendered).not.toContain('layout-sidebar-overlay');
    expect(rendered).toContain('data-hydration-scope="note-content"');
    expect(rendered).toContain('data-hydration-scope="note-toc"');
    expect(rendered).toContain('source-id="sidebar-source-note"');
    expect(rendered).toContain('data-pagefind-sort="date:2026-02-01"');
    expect(rendered).toContain('<span data-pagefind-weight="10">見出し</span>');
    expect(rendered).not.toContain('<span data-pagefind-weight="8">見出し</span>');
    expect(rendered).toContain('content-root-id="note-content-note"');
  });

  it('projection 値を安全に escape すること', () => {
    const layout = new NoteLayout();
    const rendered = layout.render({
      notePage: createProjection({
        contentHtml: '<p>本文</p><script>console.log("unsafe")</script>',
        sidebar: {
          sourceId: 'sidebar-source-note',
          selectedId: 'note',
          items: [{ kind: 'leaf', id: 'note', label: '<Unsafe>', href: '/notes/note' }],
          heading: 'ナビゲーション',
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
    expect(rendered).toContain('\\u003cUnsafe>');
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
