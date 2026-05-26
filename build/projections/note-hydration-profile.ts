import type { IntrinsicNote } from '../../build/data/notes.js';
import {
  normalizeNoteHydrationBudgetProfileName,
  type NoteHydrationBudgetProfileName,
} from '../../src/types/note-hydration-budget-profile.js';

export interface NoteHydrationCounts {
  initial: number;
  postCommit: number;
  visible: number;
  interaction: number;
}

export interface NoteHydrationBudget extends NoteHydrationCounts {
  total: number;
}

export interface NoteHydrationBudgetProfile {
  name: NoteHydrationBudgetProfileName;
  budget: NoteHydrationBudget;
}

export const NOTE_HYDRATION_BUDGET_PROFILES = {
  'reader-shell-canary': {
    name: 'reader-shell-canary',
    budget: {
      initial: 2,
      postCommit: 1,
      visible: 0,
      interaction: 0,
      total: 3,
    },
  },
  'testing-interactive-canary': {
    name: 'testing-interactive-canary',
    budget: {
      initial: 3,
      postCommit: 1,
      visible: 1,
      interaction: 0,
      total: 5,
    },
  },
  /**
   * sandbox canary は ui-code-preview / ui-preview-sandbox 契約を監視します。
   *
   * preview-html / preview-css / preview-js の source area を含むため、
   * 最初の standalone code surface に code-block-enhancer の post-commit hydration が 1 件入る前提です。
   */
  'testing-sandbox-canary': {
    name: 'testing-sandbox-canary',
    budget: {
      initial: 0,
      postCommit: 1,
      visible: 2,
      interaction: 1,
      total: 4,
    },
  },
  'testing-code-canary': {
    name: 'testing-code-canary',
    budget: {
      initial: 1,
      postCommit: 2,
      visible: 2,
      interaction: 0,
      total: 5,
    },
  },
} as const satisfies Record<NoteHydrationBudgetProfileName, NoteHydrationBudgetProfile>;

export const resolveNoteHydrationBudgetProfile = (
  note: Pick<IntrinsicNote, 'slug'> & { hydrationBudgetProfile?: unknown },
): NoteHydrationBudgetProfile | null => {
  const rawExplicitProfile =
    typeof note.hydrationBudgetProfile === 'string' ? note.hydrationBudgetProfile.trim() : '';

  if (rawExplicitProfile.length === 0) {
    return null;
  }

  const explicitProfile = normalizeNoteHydrationBudgetProfileName(rawExplicitProfile);
  if (explicitProfile === undefined) {
    throw new Error(
      `[note-hydration:${note.slug}] unknown hydrationBudgetProfile "${rawExplicitProfile}"`,
    );
  }

  return NOTE_HYDRATION_BUDGET_PROFILES[explicitProfile];
};
