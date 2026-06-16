import { existsSync, statSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Connect } from 'vite';

import { renderSearchCatalogArtifact } from '../search/emit-search-artifacts.js';
import type { SourceNote } from '../../src/data/notes.js';
import type { SiteUrlContext } from '../../shared/site/site-url-context.js';
import {
  resolvePagefindBaseUrl,
  resolveSearchCatalogUrl,
} from '../../shared/search/search-artifact-url.js';

export interface DevelopmentSearchArtifactMiddlewareOptions {
  readonly siteUrlContext: SiteUrlContext;
  readonly loadNotes: () => readonly SourceNote[];
  readonly pagefindDirectory?: string;
}

const contentTypeForPagefindAsset = (pathname: string): string => {
  if (pathname.endsWith('.js')) return 'text/javascript; charset=utf-8';
  if (pathname.endsWith('.json')) return 'application/json; charset=utf-8';
  if (pathname.endsWith('.css')) return 'text/css; charset=utf-8';
  if (pathname.endsWith('.wasm')) return 'application/wasm';
  return 'application/octet-stream';
};

const safePagefindAssetPath = (pagefindBaseUrl: string, requestPathname: string): string | null => {
  if (!requestPathname.startsWith(pagefindBaseUrl)) {
    return null;
  }
  const relative = requestPathname.slice(pagefindBaseUrl.length);
  if (relative.length === 0 || relative.includes('..') || relative.includes('\\')) {
    return null;
  }
  return relative;
};

const sendNoStore = (response: ServerResponse): void => {
  response.setHeader('Cache-Control', 'no-store');
};

export const createDevelopmentSearchArtifactMiddleware = (
  options: DevelopmentSearchArtifactMiddlewareOptions,
): Connect.NextHandleFunction => {
  const searchCatalogPathname = resolveSearchCatalogUrl(options.siteUrlContext);
  const pagefindBaseUrl = resolvePagefindBaseUrl(options.siteUrlContext);
  const pagefindDirectory =
    options.pagefindDirectory ?? path.resolve(process.cwd(), 'dist', 'pagefind');

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

    const relativePagefindAssetPath = safePagefindAssetPath(pagefindBaseUrl, requestUrl.pathname);
    if (relativePagefindAssetPath === null) {
      next();
      return;
    }

    const filePath = path.resolve(pagefindDirectory, relativePagefindAssetPath);
    if (!filePath.startsWith(path.resolve(pagefindDirectory) + path.sep)) {
      response.statusCode = 404;
      sendNoStore(response);
      response.end();
      return;
    }

    if (!existsSync(filePath) || !statSync(filePath).isFile()) {
      response.statusCode = 404;
      sendNoStore(response);
      response.end();
      return;
    }

    response.statusCode = 200;
    response.setHeader('Content-Type', contentTypeForPagefindAsset(filePath));
    sendNoStore(response);
    if (request.method === 'HEAD') {
      response.end();
      return;
    }
    response.end(await readFile(filePath));
  };
};
