export const NOTE_HYDRATION_BUDGET_PROFILE_NAMES = [
  'reader-shell-canary',
  'testing-interactive-canary',
  'testing-sandbox-canary',
  'testing-code-canary',
] as const;

export type NoteHydrationBudgetProfileName =
  (typeof NOTE_HYDRATION_BUDGET_PROFILE_NAMES)[number];

export const normalizeNoteHydrationBudgetProfileName = (
  value: unknown,
): NoteHydrationBudgetProfileName | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim();
  const matched = NOTE_HYDRATION_BUDGET_PROFILE_NAMES.find(
    (candidate) => candidate === normalized,
  );

  return matched;
};