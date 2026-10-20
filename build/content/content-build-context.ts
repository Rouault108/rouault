import { ContentRouteRegistry, resolveContentRoute } from './content-route-registry.js';
import type { ContentInput } from './content-input.js';
import type { NoteMetadata } from './content-schema.js';
import {
  buildContentDerivedRoutes,
  type NoteRouteSeed,
} from '../navigation/internal-document-routes.js';
import { createManifestLoadedRouteClassificationMode } from '../../shared/link/link-annotation.js';
import type { NoteDirectiveUrlPolicyContext } from '../remark/directives/policy/directive-url-policy-context.js';
import type { SiteUrlContext } from '../../shared/site/site-url-context.js';
import type { NoteSourceRoot } from '../../shared/note/note-source-root.js';
import { normalizeRouaultPathname } from '../../shared/url/rouault-url-policy.js';

export interface ContentDocumentContext extends NoteDirectiveUrlPolicyContext {
  readonly publicationRegistry: ContentRouteRegistry;
}

export const getInjectedContentContext = (file?: {
  readonly data?: unknown;
}): ContentDocumentContext | undefined => {
  if (!file?.data || typeof file.data !== 'object') return undefined;
  return (file.data as { rouaultContentContext?: ContentDocumentContext }).rouaultContentContext;
};

export const createContentBuildContext = (
  inputs: readonly ContentInput[],
  siteUrlContext: SiteUrlContext,
) => {
  const published = inputs.filter(
    (input) =>
      input.identity.collectionId !== 'notes' ||
      (input.metadata as NoteMetadata).status !== 'draft',
  );
  const buildRegistry = (fixtureOnly: boolean) =>
    new ContentRouteRegistry(
      published
        .filter((input) => !fixtureOnly || input.sourceRoot.startsWith('test/fixtures/'))
        .map((input) => input.identity),
      ['/memos/', '/search/', '/about/', '/corpora/'],
    );
  const productionRegistry = buildRegistry(false);
  const fixtureRegistry = buildRegistry(true);
  const seeds: NoteRouteSeed[] = published
    .filter((input) => input.identity.collectionId === 'notes')
    .map((input) => {
      const metadata = input.metadata as NoteMetadata;
      const route = resolveContentRoute(input.identity);
      return {
        sourceRoot: input.sourceRoot as NoteSourceRoot,
        sourceFilePath: input.sourceFilePath,
        requestedSlug: route.slug,
        rawSlug: route.rawSlug,
        slug: route.slug,
        permalink: normalizeRouaultPathname(route.canonicalPathname),
        noteKind: route.rawSlug.endsWith('/index') ? 'directory-index' : 'leaf',
        genres: metadata.genre ?? [],
        ...(metadata.status !== undefined ? { status: metadata.status } : {}),
        ...(metadata.kind !== undefined ? { contentKind: metadata.kind } : {}),
        ...(metadata.excludeFromPublicationSurfaces !== undefined
          ? { excludeFromPublicationSurfaces: metadata.excludeFromPublicationSurfaces }
          : {}),
      };
    });
  const memoRoutes = (registry: ContentRouteRegistry) =>
    [...registry.byPathname.values()]
      .filter((route) => route.identity.collectionId === 'memos')
      .map((route) => route.canonicalPathname);
  const productionRoutes = buildContentDerivedRoutes(
    'production',
    seeds,
    memoRoutes(productionRegistry),
  ).routeSet;
  const fixtureRoutes = buildContentDerivedRoutes(
    'fixture',
    seeds.filter((seed) => seed.sourceRoot.startsWith('test/fixtures/')),
    memoRoutes(fixtureRegistry),
  ).routeSet;
  return (input: ContentInput): ContentDocumentContext => {
    const fixture = input.sourceRoot.startsWith('test/fixtures/');
    const routeSet = fixture ? fixtureRoutes : productionRoutes;
    const pathname = normalizeRouaultPathname(
      resolveContentRoute(input.identity).canonicalPathname,
    );
    return {
      siteUrlContext,
      currentUrl: `${siteUrlContext.siteOrigin}${siteUrlContext.basePath}${pathname}`,
      routeClassificationMode: createManifestLoadedRouteClassificationMode({
        isInternalDocumentPathname: (candidate) =>
          candidate === pathname || routeSet.has(candidate),
      }),
      publicationRegistry: fixture ? fixtureRegistry : productionRegistry,
    };
  };
};
