import { existsSync, statSync } from 'node:fs';
import path from 'node:path';

import {
  buildFixtureInternalDocumentRouteSet,
  buildProductionInternalDocumentRouteSet,
  type ContentRouteSetKind,
} from '../navigation/internal-document-routes.js';
import {
  createManifestLoadedRouteClassificationMode,
  type RouteClassificationMode,
} from '../../shared/link/link-annotation.js';
import { resolveNotePermalink } from '../../shared/note/resolve-note-permalink.js';
import { resolveNoteSourceLocation } from '../../shared/note/note-source-root.js';
import type { SiteUrlContext } from '../../shared/site/site-url-context.js';

export interface ResolveNoteCurrentUrlOptions {
  readonly sourceFilePath: string | undefined;
  readonly siteUrlContext: SiteUrlContext;
}

export interface ResolvedNoteLinkClassificationContext {
  readonly routeSetKind: ContentRouteSetKind;
  readonly currentUrl: string;
  readonly routeClassificationMode: RouteClassificationMode;
}

class NoteCurrentUrlContractError extends Error {
  override readonly name = 'NoteCurrentUrlContractError';
}

const assertSourceFilePath = (sourceFilePath: string | undefined): string => {
  if (typeof sourceFilePath !== 'string' || sourceFilePath.trim().length === 0) {
    throw new NoteCurrentUrlContractError(
      'build-time link classification requires a concrete note source file path.',
    );
  }
  return sourceFilePath;
};

export const resolveRouteSetKindForNoteSourcePath = (
  sourceFilePath: string | undefined,
): ContentRouteSetKind => {
  const sourcePath = assertSourceFilePath(sourceFilePath);
  const { sourceRoot } = resolveNoteSourceLocation(sourcePath);
  return sourceRoot === 'test/fixtures/content' ? 'fixture' : 'production';
};

const getRouteSetForKind = (kind: ContentRouteSetKind) =>
  kind === 'fixture'
    ? buildFixtureInternalDocumentRouteSet().routeSet
    : buildProductionInternalDocumentRouteSet().routeSet;

export const resolveNoteCurrentUrlFromSourcePath = ({
  sourceFilePath,
  siteUrlContext,
}: ResolveNoteCurrentUrlOptions): string => {
  const sourcePath = assertSourceFilePath(sourceFilePath);
  const { sourceRoot, slug } = resolveNoteSourceLocation(sourcePath);
  const requestedSlug = slug.replace(/\.md$/u, '').replace(/\/index$/u, '');
  if (requestedSlug.length === 0) {
    throw new NoteCurrentUrlContractError(`Unable to resolve note permalink for ${sourcePath}.`);
  }

  const rootPath = path.resolve(process.cwd(), sourceRoot);
  const leafPath = path.join(rootPath, `${requestedSlug}.md`);
  const directoryIndexPath = path.join(rootPath, requestedSlug, 'index.md');
  const permalink = resolveNotePermalink({
    requestedSlug,
    hasLeaf: existsSync(leafPath) && statSync(leafPath).isFile(),
    hasDirectoryIndex: existsSync(directoryIndexPath) && statSync(directoryIndexPath).isFile(),
  });

  return `${siteUrlContext.siteOrigin}${siteUrlContext.basePath}${permalink.canonicalPathname}`;
};

export const createNoteRouteClassificationModeForSourcePath = (
  sourceFilePath: string | undefined,
): RouteClassificationMode => {
  const routeSetKind = resolveRouteSetKindForNoteSourcePath(sourceFilePath);
  const routeSet = getRouteSetForKind(routeSetKind);
  return createManifestLoadedRouteClassificationMode({
    isInternalDocumentPathname: (pathname) => routeSet.has(pathname),
  });
};

export const resolveNoteLinkClassificationContext = (
  options: ResolveNoteCurrentUrlOptions,
): ResolvedNoteLinkClassificationContext => {
  const routeSetKind = resolveRouteSetKindForNoteSourcePath(options.sourceFilePath);
  const routeSet = getRouteSetForKind(routeSetKind);
  return {
    routeSetKind,
    currentUrl: resolveNoteCurrentUrlFromSourcePath(options),
    routeClassificationMode: createManifestLoadedRouteClassificationMode({
      isInternalDocumentPathname: (pathname) => routeSet.has(pathname),
    }),
  };
};
