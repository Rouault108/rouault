import path from 'node:path';
import type { SearchAvailability } from './search-availability.js';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Connect } from 'vite';
import { createStaticDirectoryMiddleware } from './dev-static-directory.js';

import { renderSearchCatalogArtifact } from '../search/emit-search-artifacts.js';
import type { SourceNote } from '../../src/data/notes.js';
import type { SiteUrlContext } from '../../shared/site/site-url-context.js';
import { resolveSearchCatalogUrl } from '../../shared/search/search-artifact-url.js';

export interface DevelopmentSearchArtifactMiddlewareOptions {
  readonly outputDirectory?: string;
  readonly siteUrlContext: SiteUrlContext;
  readonly availability: Pick<SearchAvailability, 'isAvailable'>;
  readonly loadNotes: () => readonly SourceNote[];
}

const sendNoStore = (response: ServerResponse): void => {
  response.setHeader('Cache-Control', 'no-store');
};

export const createDevelopmentSearchArtifactMiddleware = (
  options: DevelopmentSearchArtifactMiddlewareOptions,
): Connect.NextHandleFunction => {
  const searchCatalogPathname = resolveSearchCatalogUrl(options.siteUrlContext);
  const lexicalAssets = createStaticDirectoryMiddleware(
    `${options.siteUrlContext.basePath}/search/`,
    path.join(options.outputDirectory ?? path.resolve('dist'), 'search'),
  );

  return async (
    request: IncomingMessage,
    response: ServerResponse,
    next: Connect.NextFunction,
  ): Promise<void> => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      next();
      return;
    }

    if (typeof request.url !== 'string') {
      next();
      return;
    }

    let requestUrl: URL;
    try {
      requestUrl = new URL(request.url, `${options.siteUrlContext.siteOrigin}/`);
    } catch {
      next();
      return;
    }

    let pathname: string;
    try {
      pathname = decodeURIComponent(requestUrl.pathname);
    } catch {
      next();
      return;
    }
    const isCatalog = pathname === searchCatalogPathname;
    const searchPrefix = `${options.siteUrlContext.basePath}/search/`;
    const isSearchData =
      pathname.startsWith(searchPrefix) &&
      pathname !== searchPrefix &&
      pathname !== `${searchPrefix}index.html`;
    if (!isCatalog && !isSearchData) {
      next();
      return;
    }
    const unavailable = (): void => {
      response.statusCode = 503;
      sendNoStore(response);
      response.end();
    };
    if (!options.availability.isAvailable()) {
      unavailable();
      return;
    }

    if (isCatalog) {
      response.statusCode = 200;
      response.setHeader('Content-Type', 'application/json; charset=utf-8');
      sendNoStore(response);
      if (request.method === 'HEAD') {
        response.end();
        return;
      }
      try {
        response.end(renderSearchCatalogArtifact(options.loadNotes()));
      } catch {
        unavailable();
      }
      return;
    }

    if (isSearchData) {
      sendNoStore(response);
      lexicalAssets(request, response, unavailable);
      return;
    }
    next();
  };
};
