import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Connect } from 'vite';
import { createStaticDirectoryMiddleware } from './dev-static-directory.js';

import { renderSearchCatalogArtifact } from '../search/emit-search-artifacts.js';
import type { SourceNote } from '../../src/data/notes.js';
import type { SiteUrlContext } from '../../shared/site/site-url-context.js';
import { resolveSearchCatalogUrl } from '../../shared/search/search-artifact-url.js';

export interface DevelopmentSearchArtifactMiddlewareOptions {
  readonly siteUrlContext: SiteUrlContext;
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
    path.resolve('dist/search'),
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

    if (requestUrl.pathname === searchCatalogPathname) {
      response.statusCode = 200;
      response.setHeader('Content-Type', 'application/json; charset=utf-8');
      sendNoStore(response);
      if (request.method === 'HEAD') {
        response.end();
        return;
      }
      response.end(renderSearchCatalogArtifact(options.loadNotes()));
      return;
    }

    if (requestUrl.pathname.startsWith(`${options.siteUrlContext.basePath}/search/`)) {
      sendNoStore(response);
      lexicalAssets(request, response, next);
      return;
    }
    next();
  };
};
