import type { SearchReturnToReadingEventDetail } from './search-navigation-events.js';
import type { SiteUrlContext } from '../../shared/site/site-url-context.js';
import type { LoadedInternalDocumentRouteManifestState } from '../router/internal-document-route-manifest-loader.js';
import { navigateInternalDocument, type NavigateInternalDocumentOptions } from '../router/navigate-internal-document.js';
import { createSearchCanonicalPathname } from '../../shared/search/document-url.js';
import { createSearchRouteAllowlistPredicate } from '../../shared/search/search-route-allowlist.js';
import { buildSearchResultRenderHref } from './normalize-search-result-url.js';
import {
  createSearchEventDiagnosticCandidateRef,
  type SearchEventDiagnosticSink,
} from '../../shared/search/search-diagnostics.js';
import {
  createSearchReturnToReadingEvent,
  readSearchReturnToReadingEventDetail,
  searchReturnToReadingEventName,
} from './search-navigation-events.js';

export interface NavigationOptions extends NavigateInternalDocumentOptions {
  readonly siteUrlContext?: SiteUrlContext;
  readonly routeManifestState?: LoadedInternalDocumentRouteManifestState;
  readonly diagnostics?: SearchEventDiagnosticSink;
}

export interface SearchReturnToReadingNavigationOptions extends NavigationOptions {
  readonly siteUrlContext: SiteUrlContext;
  readonly routeManifestState: LoadedInternalDocumentRouteManifestState;
  readonly diagnostics: SearchEventDiagnosticSink;
}

export interface ReturnToReadingDispatchOptions {
  target?: EventTarget | null;
}

export function dispatchSearchReturnToReading(
  detail: SearchReturnToReadingEventDetail,
  options: ReturnToReadingDispatchOptions = {},
): boolean {
  const target = options.target ?? document;
  return target.dispatchEvent(createSearchReturnToReadingEvent(detail));
}

export async function handleSearchReturnToReadingEvent(
  event: Event,
  options: SearchReturnToReadingNavigationOptions,
): Promise<void> {
  if (event.type !== searchReturnToReadingEventName) {
    return;
  }

  const customEvent = event as CustomEvent<unknown>;
  if (customEvent.defaultPrevented) {
    return;
  }

  const detail = readSearchReturnToReadingEventDetail(customEvent.detail);
  if (detail === null) {
    const candidateRef = createSearchEventDiagnosticCandidateRef('return-to-reading:invalid-schema');
    options.diagnostics.addIssue({
      code: 'search-event-invalid-schema',
      stage: 'event',
      ...(candidateRef !== null ? { candidateRef } : {}),
    });
    return;
  }

  const canonical = createSearchCanonicalPathname({
    pathname: detail.canonicalPathname,
    isInternalDocumentPathname: createSearchRouteAllowlistPredicate(options.routeManifestState.routeSet),
  });
  if (!canonical.ok) {
    const candidateRef = createSearchEventDiagnosticCandidateRef('return-to-reading:invalid-canonical');
    options.diagnostics.addIssue({
      code: 'search-event-invalid-canonical-pathname',
      stage: 'event',
      ...(candidateRef !== null ? { candidateRef } : {}),
    });
    return;
  }

  const renderHref = buildSearchResultRenderHref({
    canonicalPathname: canonical.canonicalPathname,
    siteUrlContext: options.siteUrlContext,
  });
  if (detail.renderHref !== renderHref) {
    const candidateRef = createSearchEventDiagnosticCandidateRef('return-to-reading:render-href-mismatch');
    options.diagnostics.addIssue({
      code: 'search-event-render-href-mismatch',
      stage: 'event',
      ...(candidateRef !== null ? { candidateRef } : {}),
    });
    return;
  }

  await navigateInternalDocument(renderHref, options);
}
