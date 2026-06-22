import type { SiteUrlContext } from '../../shared/site/site-url-context.js';
import {
  createManifestLoadedRouteClassificationMode,
  type RouteClassificationMode,
} from '../../shared/link/link-annotation.js';
import {
  buildGeneratedDocumentRouteSet,
  resolveGeneratedDocumentCurrentUrl,
} from './generated-document-route-set.js';

export interface GeneratedPageLinkContextSource {
  readonly page?: { readonly url?: unknown };
  readonly note?: { readonly permalink?: unknown };
  readonly notes?: readonly { readonly permalink?: unknown; readonly genre?: unknown }[];
  readonly corpusPages?: readonly { readonly href?: unknown }[];
  readonly tagPages?: readonly { readonly tag?: unknown }[];
}

export interface GeneratedPageLinkClassificationContext {
  readonly routeSet: ReadonlySet<string>;
  readonly currentUrl: string;
  readonly routeClassificationMode: RouteClassificationMode;
}

export const buildGeneratedPageLinkClassificationContext = (
  data: GeneratedPageLinkContextSource,
  siteUrlContext: SiteUrlContext,
): GeneratedPageLinkClassificationContext => {
  const routeSet = buildGeneratedDocumentRouteSet({
    ...(data.page?.url !== undefined ? { pageUrl: data.page.url } : {}),
    ...(data.note?.permalink !== undefined ? { notePermalink: data.note.permalink } : {}),
    ...(data.notes !== undefined ? { notes: data.notes } : {}),
    ...(data.corpusPages !== undefined ? { corpusPages: data.corpusPages } : {}),
    ...(data.tagPages !== undefined ? { tagPages: data.tagPages } : {}),
  });

  return {
    routeSet,
    currentUrl: resolveGeneratedDocumentCurrentUrl({
      pathname: data.note?.permalink,
      fallbackPathname: data.page?.url,
      siteUrlContext,
    }),
    routeClassificationMode: createManifestLoadedRouteClassificationMode({
      isInternalDocumentPathname: (pathname) => routeSet.has(pathname),
    }),
  };
};
