import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { isAbsolute, join, relative } from 'node:path';

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
  'note.article-header-link-decoration',
  'note.article-header-static-layout',
  'note.code',
  'note.footnote-endnotes-layout',
  'note.footnote-long-url',
  'note.interactive',
  'note.layout-rich',
  'note.markdown-basic',
  'note.sidebar-scroll-source',
  'note.sidebar-scroll-target',
  'note.toc-absent',
  'note.toc-readable-long-heading',
  'note.toc-static-present',
] as const;

export type RequiredE2ENoteFixtureId = (typeof REQUIRED_E2E_NOTE_FIXTURE_IDS)[number];

type FixtureSourceNote = Pick<IntrinsicNote, 'title' | 'slug' | 'permalink' | 'e2eFixtureId'>;

interface BuildE2ENoteFixtureManifestOptions {
  requiredFixtureIds?: readonly string[];
  fallbackSourceRoots?: readonly string[];
}

const toSafeDataId = (slug: string): string => slug.replace(/[^a-zA-Z0-9_-]/g, '-');

const DEFAULT_FALLBACK_SOURCE_ROOTS = ['content', 'test/fixtures/content'] as const;

const collectMarkdownFiles = (rootPath: string): string[] => {
  if (!existsSync(rootPath)) {
    return [];
  }

  const entries = readdirSync(rootPath, { withFileTypes: true });
  const markdownFiles: string[] = [];

  for (const entry of entries) {
    const entryPath = join(rootPath, entry.name);
    if (entry.isDirectory()) {
      markdownFiles.push(...collectMarkdownFiles(entryPath));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.md')) {
      markdownFiles.push(entryPath);
    }
  }

  return markdownFiles;
};

const parseFrontmatterValue = (
  frontmatter: string,
  fieldName: 'title' | 'e2eFixtureId',
): string => {
  const pattern = new RegExp(`^${fieldName}:\\s*(.+)$`, 'mu');
  const matched = frontmatter.match(pattern);
  if (matched === null) {
    return '';
  }

  const rawValue = matched[1]?.trim() ?? '';
  return rawValue.replace(/^['"]|['"]$/gu, '').trim();
};

const toSlugFromFilePath = (rootPath: string, filePath: string): string => {
  const relativePath = relative(rootPath, filePath).replace(/\\/gu, '/');
  const withoutExtension = relativePath.replace(/\.md$/u, '');
  return withoutExtension.replace(/\/index$/u, '');
};

const readFallbackFixtureEntry = (
  rootPath: string,
  filePath: string,
): E2ENoteFixtureManifestEntry | undefined => {
  const source = readFileSync(filePath, 'utf8');
  const frontmatterMatch = source.match(/^---\n([\s\S]*?)\n---(?:\n|$)/u);
  if (frontmatterMatch === null) {
    return undefined;
  }

  const frontmatter = frontmatterMatch[1];
  if (frontmatter === undefined) {
    return undefined;
  }
  const fixtureId = parseFrontmatterValue(frontmatter, 'e2eFixtureId');
  const title = parseFrontmatterValue(frontmatter, 'title');
  const slug = toSlugFromFilePath(rootPath, filePath).trim();
  if (fixtureId.length === 0 || title.length === 0 || slug.length === 0) {
    return undefined;
  }

  return {
    fixtureId,
    title,
    slug,
    permalink: `/notes/${slug}`,
    contentRootId: `note-content-${toSafeDataId(slug)}`,
  };
};

const collectFallbackFixtureEntries = (
  fallbackSourceRoots: readonly string[],
): Record<string, E2ENoteFixtureManifestEntry> => {
  const manifest: Record<string, E2ENoteFixtureManifestEntry> = {};

  for (const sourceRoot of fallbackSourceRoots) {
    const rootPath = isAbsolute(sourceRoot) ? sourceRoot : join(process.cwd(), sourceRoot);
    for (const filePath of collectMarkdownFiles(rootPath)) {
      const entry = readFallbackFixtureEntry(rootPath, filePath);
      if (entry === undefined) {
        continue;
      }

      if (manifest[entry.fixtureId] === undefined) {
        manifest[entry.fixtureId] = entry;
      }
    }
  }

  return manifest;
};

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

  const missingFixtureIds = requiredFixtureIds.filter(
    (fixtureId) => manifest[fixtureId] === undefined,
  );
  if (missingFixtureIds.length > 0) {
    // e2e 実行時は .velite が stale なことがあるため、source markdown から不足 fixture だけ補完する。
    const fallbackManifest = collectFallbackFixtureEntries(
      options.fallbackSourceRoots ?? DEFAULT_FALLBACK_SOURCE_ROOTS,
    );

    for (const fixtureId of missingFixtureIds) {
      const fallbackEntry = fallbackManifest[fixtureId];
      if (fallbackEntry !== undefined && manifest[fixtureId] === undefined) {
        manifest[fixtureId] = fallbackEntry;
      }
    }
  }

  const unresolvedFixtureIds = requiredFixtureIds.filter(
    (fixtureId) => manifest[fixtureId] === undefined,
  );
  if (unresolvedFixtureIds.length > 0) {
    throw new Error(`Missing required e2e fixture ids: ${unresolvedFixtureIds.sort().join(', ')}.`);
  }

  return manifest;
};
