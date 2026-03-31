import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { NoteLayout } from '../../src/layouts/NoteLayout.11ty.js';
import type { NotePageProjection } from '../../src/data/projections/note-page-projection.js';

interface VeliteNoteFixture {
  slug: string;
  title: string;
  kind?: 'reader' | 'testing';
  date?: string;
  updated?: string;
  description?: string;
  genre?: string[];
  content?: string;
}

interface HydrationTriggerCounts {
  initial: number;
  postCommit: number;
  visible: number;
  interaction: number;
  total: number;
}

interface CountedNotePage {
  readonly slug: string;
  readonly counts: HydrationTriggerCounts;
}

const notes = JSON.parse(readFileSync('.velite/notes.json', 'utf8')) as VeliteNoteFixture[];
const layout = new NoteLayout();

const slugToId = (slug: string): string => slug.replace(/[^a-zA-Z0-9_-]/g, '-');

const countHydrationTriggers = (html: string): HydrationTriggerCounts => {
  const counts = {
    initial: 0,
    postCommit: 0,
    visible: 0,
    interaction: 0,
  };

  for (const match of html.matchAll(/data-hydration-trigger="([^"]+)"/g)) {
    if (match[1] === 'initial') {
      counts.initial += 1;
    } else if (match[1] === 'post-commit') {
      counts.postCommit += 1;
    } else if (match[1] === 'visible') {
      counts.visible += 1;
    } else if (match[1] === 'interaction') {
      counts.interaction += 1;
    }
  }

  const total = counts.initial + counts.postCommit + counts.visible + counts.interaction;
  return { ...counts, total };
};

const buildProjection = (note: VeliteNoteFixture): NotePageProjection => {
  const contentHtml = note.content ?? '';
  const hasHeadings = /<h[2-6]\b/i.test(contentHtml);
  const genres = Array.isArray(note.genre)
    ? note.genre.filter((genre): genre is string => typeof genre === 'string' && genre.trim().length > 0)
    : [];
  const showSidebar = note.kind === 'reader';
  const dataId = slugToId(note.slug);

  return {
    noteKind: note.kind ?? 'reader',
    noteShellSidebarPresence: showSidebar ? 'present' : 'absent',
    showSidebar,
    contentHtml,
    ...(showSidebar
      ? {
          sidebar: {
            sourceId: `sidebar-source-${dataId}`,
            selectedId: note.slug,
            items: [{ kind: 'leaf', id: note.slug, label: note.title, href: `/notes/${note.slug}` }],
            heading: 'ナビゲーション',
            fixedBreakpoint: '768',
          },
        }
      : {}),
    toc: {
      sourceId: `toc-source-${dataId}`,
      headings: [],
      capabilities: {
        activeTracking: hasHeadings,
        dynamicScopes: false,
        mobileSummary: note.kind === 'reader' && hasHeadings,
      },
      contentRootId: `note-content-${dataId}`,
      homeHref: '/',
      shouldHydrate: hasHeadings,
    },
    articleHeader: {
      heading: note.title,
      ...(typeof note.date === 'string' ? { published: note.date } : {}),
      ...(typeof note.updated === 'string' ? { updated: note.updated } : {}),
      genres,
      shouldHydrateTags: genres.length > 0,
    },
    pagefind: note.kind === 'reader'
      ? {
          sortDate: typeof note.date === 'string' ? note.date.slice(0, 10) : '0000-00-00',
          title: note.title,
          tokenizedTitle: '',
          description: typeof note.description === 'string' ? note.description : '',
          tokenizedDescription: '',
          date: typeof note.date === 'string' ? note.date.slice(0, 10) : '',
          tags: genres,
        }
      : null,
  };
};

const renderNotePage = (slug: string): CountedNotePage => {
  const note = notes.find((entry) => entry.slug === slug);
  if (!note) {
    throw new Error(`note "${slug}" が見つかりません`);
  }

  const rendered = layout.render({ notePage: buildProjection(note) });
  return {
    slug,
    counts: countHydrationTriggers(rendered),
  };
};

describe('note hydration budget', () => {
  it('reader shell canary を budget 内に収めること', () => {
    const result = renderNotePage('testing/reader-basic');

    expect(result.counts).to.deep.equal({
      initial: 2,
      postCommit: 0,
      visible: 0,
      interaction: 0,
      total: 2,
    });
  });

  it('interactive testing canary を budget 内に収めること', () => {
    const result = renderNotePage('testing/interactive');

    expect(result.counts).to.deep.equal({
      initial: 6,
      postCommit: 0,
      visible: 1,
      interaction: 0,
      total: 7,
    });
  });

  it('interaction canary を budget 内に収めること', () => {
    const result = renderNotePage('testing/sandbox');

    expect(result.counts).to.deep.equal({
      initial: 0,
      postCommit: 0,
      visible: 2,
      interaction: 1,
      total: 3,
    });
  });

  it('sandbox canary を budget 内に収めること', () => {
    const result = renderNotePage('testing/sandbox');

    expect(result.counts).to.deep.equal({
      initial: 0,
      postCommit: 1,
      visible: 2,
      interaction: 1,
      total: 4,
    });
  });
});
