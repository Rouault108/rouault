import type { IntrinsicNote } from '../data/notes.js';

export interface E2ENoteFixtureManifestEntry {
  fixtureId: string;
  title: string;
  slug: string;
  permalink: string;
  contentRootId: string;
}

export type E2ENoteFixtureManifest = Readonly<Record<string, E2ENoteFixtureManifestEntry>>;

export const REQUIRED_E2E_NOTE_FIXTURE_IDS = [
  'note.code',
  'note.interactive',
  'note.markdown-basic',
  'note.sample-javascript',
  'note.sidebar-scroll-source',
  'note.sidebar-scroll-target',
  'note.toc-absent',
] as const;

export type RequiredE2ENoteFixtureId = (typeof REQUIRED_E2E_NOTE_FIXTURE_IDS)[number];

type FixtureSourceNote = Pick<
  IntrinsicNote,
  'title' | 'slug' | 'permalink' | 'e2eFixtureId'
>;

interface BuildE2ENoteFixtureManifestOptions {
  requiredFixtureIds?: readonly string[];
}

const toSafeDataId = (slug: string): string => slug.replace(/[^a-zA-Z0-9_-]/g, '-');

export const buildE2ENoteFixtureManifest = (
  notes: readonly FixtureSourceNote[],
  options: BuildE2ENoteFixtureManifestOptions = {},
): E2ENoteFixtureManifest => {
  const manifest: Record<string, E2ENoteFixtureManifestEntry> = {};
  const requiredFixtureIds = options.requiredFixtureIds ?? REQUIRED_E2E_NOTE_FIXTURE_IDS;

  for (const note of notes) {
    const fixtureId = typeof note.e2eFixtureId === 'string' ? note.e2eFixtureId.trim() : '';
    if (fixtureId.length === 0) {
      continue;
    }

    if (manifest[fixtureId] !== undefined) {
      throw new Error(`Duplicate e2e fixture id detected: "${fixtureId}".`);
    }

    const title = typeof note.title === 'string' ? note.title.trim() : '';
    const slug = typeof note.slug === 'string' ? note.slug.trim() : '';
    const permalink = typeof note.permalink === 'string' ? note.permalink.trim() : '';

    if (title.length === 0 || slug.length === 0 || permalink.length === 0) {
      throw new Error(`Invalid e2e fixture note detected: "${fixtureId}".`);
    }

    manifest[fixtureId] = {
      fixtureId,
      title,
      slug,
      permalink,
      contentRootId: `note-content-${toSafeDataId(slug)}`,
    };
  }

  const missingFixtureIds = requiredFixtureIds.filter((fixtureId) => manifest[fixtureId] === undefined);
  if (missingFixtureIds.length > 0) {
    throw new Error(
      `Missing required e2e fixture ids: ${missingFixtureIds.sort().join(', ')}.`,
    );
  }

  return manifest;
};
