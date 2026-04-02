export const ROUAULT_STORY_ROLES = ['docs', 'smoke', 'manual-only'] as const;

export type RouaultStoryRole = (typeof ROUAULT_STORY_ROLES)[number];

export const ROUAULT_STORYBOOK_SMOKE_TAG = 'smoke';
export const ROUAULT_STORYBOOK_MANUAL_ONLY_TAG = 'manual-only';

const ROUAULT_STORY_ROLE_TAGS = [
  ROUAULT_STORYBOOK_SMOKE_TAG,
  ROUAULT_STORYBOOK_MANUAL_ONLY_TAG,
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function normalizePath(value: string): string {
  return value.replaceAll('\\', '/');
}

export function isRouaultStoryRole(value: unknown): value is RouaultStoryRole {
  return typeof value === 'string' && (ROUAULT_STORY_ROLES as readonly string[]).includes(value);
}

export function isRouaultStoryRoleTag(
  value: unknown,
): value is (typeof ROUAULT_STORY_ROLE_TAGS)[number] {
  return typeof value === 'string' && (ROUAULT_STORY_ROLE_TAGS as readonly string[]).includes(value);
}

export function getStoryTags(value: unknown): readonly string[] {
  if (!isRecord(value)) {
    return [];
  }

  const { tags } = value;
  if (!Array.isArray(tags)) {
    return [];
  }

  const normalized = new Set<string>();
  for (const entry of tags) {
    if (typeof entry !== 'string') {
      continue;
    }

    const tag = entry.trim();
    if (tag.length === 0) {
      continue;
    }

    normalized.add(tag);
  }

  return [...normalized];
}

export function resolveStoryTags(story: unknown, meta?: unknown): readonly string[] {
  const resolved = new Set<string>();

  for (const tag of getStoryTags(meta)) {
    resolved.add(tag);
  }

  for (const tag of getStoryTags(story)) {
    resolved.add(tag);
  }

  return [...resolved];
}

export function resolveRouaultStoryRole(story: unknown, meta?: unknown): RouaultStoryRole {
  const resolvedTags = resolveStoryTags(story, meta);

  if (resolvedTags.includes(ROUAULT_STORYBOOK_MANUAL_ONLY_TAG)) {
    return 'manual-only';
  }

  if (resolvedTags.includes(ROUAULT_STORYBOOK_SMOKE_TAG)) {
    return 'smoke';
  }

  return 'docs';
}

export function isStorybookExecutionHelperPath(filePath: string): boolean {
  const normalized = normalizePath(filePath);
  return (
    normalized.startsWith('src/stories/shared/') ||
    normalized.startsWith('src/testing/storybook/') ||
    normalized.includes('/src/stories/shared/') ||
    normalized.includes('/src/testing/storybook/')
  );
}