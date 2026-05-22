import { describe, expect, it } from 'vitest';

import { loadNotesData, type IntrinsicNote } from '../../build/data/notes.js';
import { buildNoteNavigationModel } from '../../build/navigation/index.js';
import { NOTE_HYDRATION_BUDGET_PROFILES } from '../../build/projections/note-hydration-profile.js';
import {
  buildNotePageProjection,
  type NotePageProjection,
} from '../../build/projections/note-page-projection.js';
import { buildPagefindDocumentData } from '../../build/search/build-pagefind-document-data.js';
import { NoteLayout } from '../../src/layouts/NoteLayout.11ty.js';
import type { NoteHydrationBudgetProfileName } from '../../src/types/note-hydration-budget-profile.js';

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

const notes = loadNotesData();
const layout = new NoteLayout();

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

const findCanaryNote = (slug: string): IntrinsicNote => {
  const note = notes.find((entry) => entry.slug === slug);
  if (!note) {
    throw new Error(
      `hydration canary note "${slug}" が見つかりません。pnpm run codegen:content の生成結果と content/testing/*.md を確認してください。`,
    );
  }
  return note;
};

const assertCanaryProfile = (
  note: IntrinsicNote,
  expectedProfile: NoteHydrationBudgetProfileName,
): void => {
  expect(note.hydrationBudgetProfile).toBe(expectedProfile);
};

const buildHydrationBudgetNotePageProjection = (note: IntrinsicNote): NotePageProjection => {
  const navigation = buildNoteNavigationModel({
    currentNote: note,
    notes,
  });

  const pagefindDocument = buildPagefindDocumentData({
    title: typeof note.title === 'string' ? note.title : undefined,
    description: typeof note.description === 'string' ? note.description : undefined,
    date: typeof note.date === 'string' ? note.date : undefined,
    updated: typeof note.updated === 'string' ? note.updated : undefined,
    tags: Array.isArray(note.genre) ? note.genre : undefined,
  });

  return buildNotePageProjection({
    note,
    navigation,
    pagefindDocument,
  });
};

const renderNotePage = (
  slug: string,
  expectedProfile: NoteHydrationBudgetProfileName,
): CountedNotePage => {
  const note = findCanaryNote(slug);
  assertCanaryProfile(note, expectedProfile);

  const notePage = buildHydrationBudgetNotePageProjection(note);
  const sidebar =
    notePage.showSidebar && notePage.sidebar
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
      const result = renderNotePage(testCase.slug, testCase.profile);
      expect(result.counts).to.deep.equal(NOTE_HYDRATION_BUDGET_PROFILES[testCase.profile].budget);
    });
  }
});
