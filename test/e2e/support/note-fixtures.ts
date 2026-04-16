import { loadNotesData } from '../../../build/data/notes.js';
import {
  buildE2ENoteFixtureManifest,
  type E2ENoteFixtureManifestEntry,
} from '../../../build/testing/e2e-note-fixture-manifest.js';

export type E2ENoteFixtureId =
  | 'note.code'
  | 'note.interactive'
  | 'note.markdown-basic'
  | 'note.sample-javascript'
  | 'note.sidebar-scroll-source'
  | 'note.sidebar-scroll-target'
  | 'note.toc-absent';

export interface E2ENoteFixture extends E2ENoteFixtureManifestEntry {
  directPath: string;
  normalizedPath: string;
}

let cachedManifest: ReturnType<typeof buildE2ENoteFixtureManifest> | null = null;

const withTrailingSlash = (value: string): string => `${value.replace(/\/+$/u, '')}/`;

const getManifest = (): ReturnType<typeof buildE2ENoteFixtureManifest> => {
  if (cachedManifest !== null) {
    return cachedManifest;
  }

  cachedManifest = buildE2ENoteFixtureManifest(loadNotesData());
  return cachedManifest;
};

export const getE2ENoteFixture = (fixtureId: E2ENoteFixtureId): E2ENoteFixture => {
  const manifest = getManifest();
  const entry = manifest[fixtureId];
  if (entry === undefined) {
    throw new Error(
      `Unknown e2e fixture id: "${fixtureId}". ` +
        `Available fixtures: ${Object.keys(manifest).sort().join(', ')}`,
    );
  }

  return {
    ...entry,
    directPath: withTrailingSlash(entry.permalink),
    normalizedPath: entry.permalink,
  };
};

export const e2eNoteFixtures = {
  get code(): E2ENoteFixture {
    return getE2ENoteFixture('note.code');
  },
  get interactive(): E2ENoteFixture {
    return getE2ENoteFixture('note.interactive');
  },
  get markdownBasic(): E2ENoteFixture {
    return getE2ENoteFixture('note.markdown-basic');
  },
  get sampleJavascript(): E2ENoteFixture {
    return getE2ENoteFixture('note.sample-javascript');
  },
  get sidebarScrollSource(): E2ENoteFixture {
    return getE2ENoteFixture('note.sidebar-scroll-source');
  },
  get sidebarScrollTarget(): E2ENoteFixture {
    return getE2ENoteFixture('note.sidebar-scroll-target');
  },
  get tocAbsent(): E2ENoteFixture {
    return getE2ENoteFixture('note.toc-absent');
  },
} as const;
