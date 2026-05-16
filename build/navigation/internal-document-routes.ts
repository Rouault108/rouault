import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

import {
  createInternalDocumentRouteSet,
  type InternalDocumentRoutePathname,
  type InternalDocumentRouteSet,
} from '../../shared/navigation/internal-document-route-set.js';
import { STATIC_DOCUMENT_ROUTES } from './static-document-routes.js';
import { resolveNotePermalink } from '../../shared/note/resolve-note-permalink.js';
import type { NoteSourceRoot } from '../../shared/note/note-source-root.js';
import { resolveEffectiveNotePublicationPolicy } from '../../shared/note/note-publication-policy.js';

export type InternalDocumentRouteSource = 'static' | 'note' | 'corpus' | 'tag';
export type ContentRouteSetKind = 'production' | 'fixture';

export interface NoteRouteSeed {
  readonly sourceRoot: NoteSourceRoot;
  readonly sourceFilePath: string;
  readonly requestedSlug: string;
  readonly rawSlug: string;
  readonly slug: string;
  readonly permalink: InternalDocumentRoutePathname;
  readonly noteKind: 'leaf' | 'directory-index';
  readonly genres: readonly string[];
  readonly status?: string;
  readonly contentKind?: string;
  readonly excludeFromPublicationSurfaces?: boolean;
}

export interface ContentDerivedInternalDocumentRoutes {
  readonly routeSetKind: ContentRouteSetKind;
  readonly routeSet: InternalDocumentRouteSet;
  readonly staticRoutes: readonly InternalDocumentRoutePathname[];
  readonly noteRoutes: readonly NoteRouteSeed[];
  readonly corpusRoutes: readonly InternalDocumentRoutePathname[];
  readonly tagRoutes: readonly InternalDocumentRoutePathname[];
}

export interface BuildInternalDocumentRouteSetOptions {
  readonly contentRoot?: string;
  readonly fixtureRoot?: string;
}

interface FrontmatterMetadata {
  readonly genres: readonly string[];
  readonly status?: string;
  readonly kind?: string;
  readonly excludeFromPublicationSurfaces?: boolean;
}

const DEFAULT_CONTENT_ROOT = path.resolve(process.cwd(), 'content');
const DEFAULT_FIXTURE_ROOT = path.resolve(process.cwd(), 'test/fixtures/content');

const toPosixPath = (value: string): string => value.replace(/\\/gu, '/');

const trimQuotes = (value: string): string => {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
};

const parseBoolean = (value: string): boolean | undefined => {
  const normalized = trimQuotes(value).toLowerCase();
  if (normalized === 'true') {
    return true;
  }
  if (normalized === 'false') {
    return false;
  }
  return undefined;
};

const parseFrontmatter = (sourceFilePath: string): FrontmatterMetadata => {
  const source = readFileSync(sourceFilePath, 'utf-8');
  if (!source.startsWith('---')) {
    return { genres: [] };
  }

  const endMarkerIndex = source.indexOf('\n---', 3);
  if (endMarkerIndex < 0) {
    return { genres: [] };
  }

  const frontmatter = source.slice(3, endMarkerIndex).split(/\r?\n/u);
  const genres: string[] = [];
  let status: string | undefined;
  let kind: string | undefined;
  let excludeFromPublicationSurfaces: boolean | undefined;
  let readingGenreList = false;

  for (const line of frontmatter) {
    const trimmed = line.trim();
    if (trimmed.length === 0) {
      continue;
    }

    if (readingGenreList && trimmed.startsWith('- ')) {
      const genre = trimQuotes(trimmed.slice(2));
      if (genre.length > 0) {
        genres.push(genre);
      }
      continue;
    }

    readingGenreList = false;

    if (trimmed === 'genre:') {
      readingGenreList = true;
      continue;
    }

    if (trimmed.startsWith('genre:')) {
      const inlineGenre = trimQuotes(trimmed.slice('genre:'.length));
      if (inlineGenre.length > 0) {
        genres.push(inlineGenre);
      }
      continue;
    }

    if (trimmed.startsWith('status:')) {
      const value = trimQuotes(trimmed.slice('status:'.length));
      status = value.length > 0 ? value : undefined;
      continue;
    }

    if (trimmed.startsWith('kind:')) {
      const value = trimQuotes(trimmed.slice('kind:'.length));
      kind = value.length > 0 ? value : undefined;
      continue;
    }

    if (trimmed.startsWith('excludeFromPublicationSurfaces:')) {
      excludeFromPublicationSurfaces = parseBoolean(
        trimmed.slice('excludeFromPublicationSurfaces:'.length),
      );
    }
  }

  return {
    genres,
    ...(status !== undefined ? { status } : {}),
    ...(kind !== undefined ? { kind } : {}),
    ...(excludeFromPublicationSurfaces !== undefined ? { excludeFromPublicationSurfaces } : {}),
  };
};

const walkMarkdownFiles = (root: string): readonly string[] => {
  if (!existsSync(root) || !statSync(root).isDirectory()) {
    return [];
  }

  const files: string[] = [];
  const visit = (directory: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        if (!entry.name.startsWith('_')) {
          visit(entryPath);
        }
        continue;
      }

      if (entry.isFile() && entry.name.endsWith('.md')) {
        files.push(entryPath);
      }
    }
  };

  visit(root);
  return files.sort((left, right) => left.localeCompare(right, 'en'));
};

const toRequestedSlug = (root: string, sourceFilePath: string): string => {
  const relativePath = toPosixPath(path.relative(root, sourceFilePath));
  const withoutExtension = relativePath.replace(/\.md$/u, '');
  return withoutExtension.endsWith('/index')
    ? withoutExtension.slice(0, -'/index'.length)
    : withoutExtension;
};

const resolveNoteRouteSeeds = (
  sourceRoot: NoteSourceRoot,
  rootPath: string,
): readonly NoteRouteSeed[] => {
  return walkMarkdownFiles(rootPath).flatMap((sourceFilePath): readonly NoteRouteSeed[] => {
    const requestedSlug = toRequestedSlug(rootPath, sourceFilePath);
    if (requestedSlug.length === 0) {
      return [];
    }

    const leafPath = path.join(rootPath, `${requestedSlug}.md`);
    const directoryIndexPath = path.join(rootPath, requestedSlug, 'index.md');
    const permalink = resolveNotePermalink({
      requestedSlug,
      hasLeaf: existsSync(leafPath) && statSync(leafPath).isFile(),
      hasDirectoryIndex: existsSync(directoryIndexPath) && statSync(directoryIndexPath).isFile(),
    });
    const metadata = parseFrontmatter(sourceFilePath);
    if (metadata.status === 'draft') {
      return [];
    }

    return [
      {
        sourceRoot,
        sourceFilePath,
        requestedSlug,
        rawSlug: permalink.rawSlug,
        slug: permalink.slug,
        permalink: permalink.canonicalPathname,
        noteKind: permalink.kind,
        genres: metadata.genres,
        ...(metadata.status !== undefined ? { status: metadata.status } : {}),
        ...(metadata.kind !== undefined ? { contentKind: metadata.kind } : {}),
        ...(metadata.excludeFromPublicationSurfaces !== undefined
          ? { excludeFromPublicationSurfaces: metadata.excludeFromPublicationSurfaces }
          : {}),
      },
    ];
  });
};

const normalizeSegment = (value: string): string => value.trim();

const getCorpusKeyFromSlug = (slug: string): string => normalizeSegment(slug.split('/')[0] ?? '');

const encodePathSegment = (value: string): string => encodeURIComponent(value);

const toCorpusRoute = (key: string): InternalDocumentRoutePathname =>
  `/corpora/${encodePathSegment(key)}/`;

const toTagRoute = (tag: string): InternalDocumentRoutePathname =>
  `/tags/${encodePathSegment(tag)}/`;

const getSurfaceVisibleNoteRoutes = (
  noteRoutes: readonly NoteRouteSeed[],
  surface: 'corpora' | 'tags',
): readonly NoteRouteSeed[] =>
  noteRoutes.filter((note) =>
    resolveEffectiveNotePublicationPolicy({
      kind: note.contentKind,
      excludeFromPublicationSurfaces: note.excludeFromPublicationSurfaces,
    })[surface],
  );

const buildContentDerivedRoutes = (
  routeSetKind: ContentRouteSetKind,
  noteRoutes: readonly NoteRouteSeed[],
): ContentDerivedInternalDocumentRoutes => {
  const corpusRoutes = [
    ...new Set(
      getSurfaceVisibleNoteRoutes(noteRoutes, 'corpora')
        .map((note) => getCorpusKeyFromSlug(note.slug))
        .filter((key) => key.length > 0)
        .map(toCorpusRoute),
    ),
  ].sort((left, right) => left.localeCompare(right, 'en'));

  const tagRoutes = [
    ...new Set(
      getSurfaceVisibleNoteRoutes(noteRoutes, 'tags').flatMap((note) =>
        note.genres.map(normalizeSegment).filter((tag) => tag.length > 0).map(toTagRoute),
      ),
    ),
  ].sort((left, right) => left.localeCompare(right, 'en'));

  const staticRoutes = [...STATIC_DOCUMENT_ROUTES];
  const routeSet = createInternalDocumentRouteSet([
    ...staticRoutes,
    ...noteRoutes.map((note) => note.permalink),
    ...corpusRoutes,
    ...tagRoutes,
  ]);

  return {
    routeSetKind,
    routeSet,
    staticRoutes,
    noteRoutes,
    corpusRoutes,
    tagRoutes,
  };
};

export const buildProductionInternalDocumentRouteSet = (
  options: BuildInternalDocumentRouteSetOptions = {},
): ContentDerivedInternalDocumentRoutes => {
  const contentRoot = options.contentRoot ?? DEFAULT_CONTENT_ROOT;
  const noteRoutes = resolveNoteRouteSeeds('content', contentRoot);
  return buildContentDerivedRoutes('production', noteRoutes);
};

export const buildFixtureInternalDocumentRouteSet = (
  options: BuildInternalDocumentRouteSetOptions = {},
): ContentDerivedInternalDocumentRoutes => {
  const fixtureRoot = options.fixtureRoot ?? DEFAULT_FIXTURE_ROOT;
  const noteRoutes = resolveNoteRouteSeeds('test/fixtures/content', fixtureRoot);
  return buildContentDerivedRoutes('fixture', noteRoutes);
};

export const buildInternalDocumentRouteSetForSourceRoot = (options: {
  readonly sourceRoot: NoteSourceRoot;
  readonly rootPath: string;
}): ContentDerivedInternalDocumentRoutes =>
  buildContentDerivedRoutes(
    options.sourceRoot === 'content' ? 'production' : 'fixture',
    resolveNoteRouteSeeds(options.sourceRoot, options.rootPath),
  );
