import type { SourceNote } from '../data/notes.js';
import type { SourceMemo } from '../data/memos.js';
import { ARTICLE_STATUSES } from '../../src/types/article-status.js';
import { NOTE_CONTENT_KINDS } from '../../shared/note/note-kind.js';
import { NOTE_CHROME_PROFILES } from '../../shared/note/note-chrome-profile.js';
import { TESTING_AREAS } from '../../shared/note/testing-area.js';
import { NOTE_HYDRATION_BUDGET_PROFILE_NAMES } from '../../src/types/note-hydration-budget-profile.js';
import { validateNoteMetadataContracts } from './note-metadata-contracts.js';
import type { CollectionId } from './content-collections.js';

export interface NoteMetadata extends SourceNote {
  title: string;
}
export type MemoMetadata = Omit<SourceMemo, 'sourcePath' | 'content'>;
export type CompiledNote = SourceNote & { title: string; slug: string; content: string };

function fail(source: string, field: string): never {
  throw new Error(`[metadata] invalid ${field}: ${source}`);
}
const record = (value: unknown, source: string): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(source, 'frontmatter');
  return value as Record<string, unknown>;
};
const optionalString = (value: unknown, source: string, field: string): string | undefined => {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') fail(source, field);
  return value;
};
const optionalEnum = <T extends string>(
  value: unknown,
  values: readonly T[],
  source: string,
  field: string,
): T | undefined => {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || !values.includes(value as T)) fail(source, field);
  return value as T;
};
const optionalDate = (value: unknown, source: string, field: string): string | undefined => {
  const text = optionalString(value, source, field);
  if (text === undefined) return undefined;
  if (Number.isNaN(Date.parse(text))) fail(source, field);
  return new Date(text).toISOString();
};

export const validateContentMetadata = (
  value: unknown,
  collection: CollectionId,
  source: string,
): NoteMetadata | MemoMetadata => {
  const input = record(value, source);
  const title = optionalString(input['title'], source, 'title');
  if (title === undefined || (collection === 'memos' && title.length === 0)) fail(source, 'title');
  const date = optionalDate(input['date'], source, 'date');
  const updated = optionalDate(input['updated'], source, 'updated');
  const common = {
    title,
    ...(date !== undefined ? { date } : {}),
    ...(updated !== undefined ? { updated } : {}),
  };
  if (collection === 'memos') {
    if (Object.keys(input).some((key) => !['title', 'date', 'updated', 'license'].includes(key)))
      fail(source, 'memo field');
    if (input['license'] !== 'CC BY 4.0') fail(source, 'license');
    return { ...common, license: 'CC BY 4.0' };
  }
  const result: NoteMetadata = { ...common };
  for (const field of [
    'description',
    'sidebarIcon',
    'cover',
    'source',
    'license',
    'licenseNote',
    'e2eFixtureId',
    'excerpt',
  ] as const) {
    const text = optionalString(input[field], source, field);
    if (text !== undefined)
      Object.assign(result, { [field]: field === 'excerpt' ? text.slice(0, 260) : text });
  }
  const genre = input['genre'];
  if (genre !== undefined) {
    if (!Array.isArray(genre) || genre.some((item: unknown) => typeof item !== 'string'))
      fail(source, 'genre');
    result.genre = genre as string[];
  }
  const status = optionalEnum(input['status'], ARTICLE_STATUSES, source, 'status');
  const kind = optionalEnum(input['kind'], NOTE_CONTENT_KINDS, source, 'kind');
  const chromeProfile = optionalEnum(
    input['chromeProfile'],
    NOTE_CHROME_PROFILES,
    source,
    'chromeProfile',
  );
  const testingArea = optionalEnum(input['testingArea'], TESTING_AREAS, source, 'testingArea');
  const hydrationBudgetProfile = optionalEnum(
    input['hydrationBudgetProfile'],
    NOTE_HYDRATION_BUDGET_PROFILE_NAMES,
    source,
    'hydrationBudgetProfile',
  );
  Object.assign(result, {
    ...(status !== undefined ? { status } : {}),
    ...(kind !== undefined ? { kind } : {}),
    ...(chromeProfile !== undefined ? { chromeProfile } : {}),
    ...(testingArea !== undefined ? { testingArea } : {}),
    ...(hydrationBudgetProfile !== undefined ? { hydrationBudgetProfile } : {}),
  });
  const exclude = input['excludeFromPublicationSurfaces'];
  if (exclude !== undefined) {
    if (typeof exclude !== 'boolean') fail(source, 'excludeFromPublicationSurfaces');
    result.excludeFromPublicationSurfaces = exclude;
  }
  if (input['tocCapabilitiesOverride'] !== undefined) {
    const override = record(input['tocCapabilitiesOverride'], source);
    const keys = ['activeTracking', 'dynamicScopes', 'mobilePanel'];
    if (
      Object.keys(override).some((key) => !keys.includes(key)) ||
      keys.some((key) => override[key] !== false)
    )
      fail(source, 'tocCapabilitiesOverride');
    if (
      !source.startsWith('test/fixtures/content/notes/') ||
      testingArea !== 'layout' ||
      result.e2eFixtureId?.trim() !== 'note.toc-static-present'
    )
      fail(source, 'tocCapabilitiesOverride fixture');
    result.tocCapabilitiesOverride = override;
  }
  validateNoteMetadataContracts({
    kind: kind ?? 'reader',
    chromeProfile,
    testingArea,
    date,
    updated,
    sourceLabel: source,
  });
  return result;
};
