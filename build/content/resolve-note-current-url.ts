import {
  buildFixtureInternalDocumentRouteSet,
  buildProductionInternalDocumentRouteSet,
  type ContentRouteSetKind,
} from '../navigation/internal-document-routes.js';
import {
  createManifestLoadedRouteClassificationMode,
  type RouteClassificationMode,
} from '../../shared/link/link-annotation.js';
import { resolveContentSourceLocation } from './content-collections.js';
import { resolveContentRoute } from './content-route-registry.js';
import type { SiteUrlContext } from '../../shared/site/site-url-context.js';
import { normalizeRouaultPathname } from '../../shared/url/rouault-url-policy.js';

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
  const { sourceRoot } = resolveContentSourceLocation(sourcePath);
  return sourceRoot.startsWith('test/fixtures/') ? 'fixture' : 'production';
};

const getRouteSetForKind = (kind: ContentRouteSetKind) =>
  kind === 'fixture'
    ? buildFixtureInternalDocumentRouteSet().routeSet
    : buildProductionInternalDocumentRouteSet().routeSet;

const normalizeCanonicalPathnameForUrlComparison = (pathname: string): string =>
  normalizeRouaultPathname(new URL(pathname, 'https://rouault.invalid').pathname);

export const resolveNoteCanonicalPathnameFromSourcePath = (
  sourceFilePath: string | undefined,
): string => {
  const sourcePath = assertSourceFilePath(sourceFilePath);
  const { collection, sourceRelativePath } = resolveContentSourceLocation(sourcePath);
  return resolveContentRoute({
    collectionId: collection.id,
    sourceRelativePath: sourceRelativePath.endsWith('.md')
      ? sourceRelativePath
      : `${sourceRelativePath}.md`,
  }).canonicalPathname;
};

export const resolveNoteCurrentUrlFromSourcePath = ({
  sourceFilePath,
  siteUrlContext,
}: ResolveNoteCurrentUrlOptions): string => {
  const canonicalPathname = normalizeCanonicalPathnameForUrlComparison(
    resolveNoteCanonicalPathnameFromSourcePath(sourceFilePath),
  );
  return `${siteUrlContext.siteOrigin}${siteUrlContext.basePath}${canonicalPathname}`;
};

export const createNoteRouteClassificationModeForSourcePath = (
  sourceFilePath: string | undefined,
): RouteClassificationMode => {
  const routeSetKind = resolveRouteSetKindForNoteSourcePath(sourceFilePath);
  const routeSet = getRouteSetForKind(routeSetKind);
  const currentDocumentPathname = normalizeCanonicalPathnameForUrlComparison(
    resolveNoteCanonicalPathnameFromSourcePath(sourceFilePath),
  );
  return createManifestLoadedRouteClassificationMode({
    isInternalDocumentPathname: (pathname) =>
      pathname === currentDocumentPathname || routeSet.has(pathname),
  });
};

export const resolveNoteLinkClassificationContext = (
  options: ResolveNoteCurrentUrlOptions,
): ResolvedNoteLinkClassificationContext => {
  const routeSetKind = resolveRouteSetKindForNoteSourcePath(options.sourceFilePath);
  const routeSet = getRouteSetForKind(routeSetKind);
  const currentDocumentPathname = normalizeCanonicalPathnameForUrlComparison(
    resolveNoteCanonicalPathnameFromSourcePath(options.sourceFilePath),
  );
  const currentUrl =
    `${options.siteUrlContext.siteOrigin}` +
    `${options.siteUrlContext.basePath}${currentDocumentPathname}`;
  return {
    routeSetKind,
    currentUrl,
    routeClassificationMode: createManifestLoadedRouteClassificationMode({
      isInternalDocumentPathname: (pathname) =>
        pathname === currentDocumentPathname || routeSet.has(pathname),
    }),
  };
};
