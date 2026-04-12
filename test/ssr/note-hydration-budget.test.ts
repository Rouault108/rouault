import { existsSync, readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { NoteLayout } from '../../src/layouts/NoteLayout.11ty.js';
import { NOTE_HYDRATION_BUDGET_PROFILES } from '../../build/projections/note-hydration-profile.js';
import type { NotePageProjection } from '../../build/projections/note-page-projection.js';
import type { NoteHydrationBudgetProfileName } from '../../src/types/note-hydration-budget-profile.js';

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

const projectRoot = process.cwd();
const veliteNotesPath = `${projectRoot}/.velite/notes.json`;
const canaryFixturePath = new URL('../fixtures/note-hydration-canary-notes.json', import.meta.url);

const loadHydrationCanaryNotes = (): VeliteNoteFixture[] => {
  if (existsSync(veliteNotesPath)) {
    return JSON.parse(readFileSync(veliteNotesPath, 'utf8')) as VeliteNoteFixture[];
  }

  return JSON.parse(readFileSync(canaryFixturePath, 'utf8')) as VeliteNoteFixture[];
};

const notes = loadHydrationCanaryNotes();
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
    ? note.genre.filter(
        (genre): genre is string => typeof genre === 'string' && genre.trim().length > 0,
      )
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
              stateScopeId: 'note-navigation',
              selectedId: note.slug,
              items: [
                { kind: 'leaf', id: note.slug, label: note.title, href: `/notes/${note.slug}` },
              ],
              rows: [
                {
                  id: note.slug,
                  label: note.title,
                  kind: 'leaf',
                  href: `/notes/${note.slug}`,
                  depth: 0,
                  isCurrent: true,
                  isStructuralExpanded: false,
                  children: [],
                },
              ],
              structuralExpandedIds: [],
              topologyRevision: JSON.stringify([
                {
                  id: note.slug,
                  label: note.title,
                  kind: 'leaf',
                  href: `/notes/${note.slug}`,
                },
              ]),
              navHtml: `<nav data-sidebar-nav aria-label="ノートナビゲーション" data-topology-revision="${note.slug}"><ul><li data-node-id="${note.slug}" data-node-kind="leaf" data-node-depth="0"><a href="/notes/${note.slug}" aria-current="page">${note.title}</a></li></ul></nav>`,
              heading: 'ナビゲーション',
              fixedBreakpoint: '1024',
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
    pagefind:
      note.kind === 'reader'
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

  const notePage = buildProjection(note);
  const sidebar = notePage.showSidebar && notePage.sidebar
    ? '<layout-sidebar data-hydration-capability="interactive" data-hydration-trigger="initial"></layout-sidebar>'
    : '';
  const rendered = `${sidebar}${layout.render({ notePage })}`;
  return {
    slug,
    counts: countHydrationTriggers(rendered),
  };
};

const CANARY_CASES: readonly {
  slug: string;
  profile: NoteHydrationBudgetProfileName;
}[] = [
  { slug: 'testing/reader-basic', profile: 'reader-shell-canary' },
  { slug: 'testing/interactive', profile: 'testing-interactive-canary' },
  { slug: 'testing/sandbox', profile: 'testing-sandbox-canary' },
  { slug: 'testing/code', profile: 'testing-code-canary' },
] as const;

describe('note hydration budget', () => {
  for (const testCase of CANARY_CASES) {
    it(`${testCase.profile} を budget どおりに描画すること`, () => {
      const result = renderNotePage(testCase.slug);
      expect(result.counts).to.deep.equal(NOTE_HYDRATION_BUDGET_PROFILES[testCase.profile].budget);
    });
  }
});
