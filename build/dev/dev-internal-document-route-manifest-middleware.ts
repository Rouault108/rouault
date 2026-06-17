import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Connect } from 'vite';

import { renderInternalDocumentRouteManifest } from '../navigation/internal-document-route-manifest.js';
import type { ResolvedBuildMetadata } from '../metadata/build-metadata.js';
import { buildProductionInternalDocumentRouteSet } from '../navigation/internal-document-routes.js';
import { resolveInternalDocumentRouteManifestPathname } from '../../shared/navigation/internal-document-route-manifest-path.js';
import { createSiteUrlContext, type SiteUrlContext } from '../../shared/site/site-url-context.js';

export interface DevelopmentInternalDocumentRouteManifestMiddlewareOptions {
  readonly siteUrlContext: SiteUrlContext;
  readonly buildMetadata: ResolvedBuildMetadata;
}

const resolveRequestOrigin = (request: IncomingMessage): string | null => {
  const host = request.headers.host;
  if (typeof host !== 'string' || host.trim().length === 0) {
    return null;
  }

  const protocolHeader = request.headers['x-forwarded-proto'];
  const protocol =
    typeof protocolHeader === 'string' && protocolHeader.trim().length > 0
      ? (protocolHeader.split(',')[0]?.trim() ?? 'http')
      : 'http';

  try {
    return new URL(`${protocol}://${host}`).origin;
  } catch {
    return null;
  }
};

const resolveRequestSiteUrlContext = (
  request: IncomingMessage,
  siteUrlContext: SiteUrlContext,
): SiteUrlContext => {
  const explicitDevOrigin = process.env['ROUAULT_DEV_SITE_ORIGIN'];
  if (explicitDevOrigin !== undefined && explicitDevOrigin.trim().length > 0) {
    return siteUrlContext;
  }

  const requestOrigin = resolveRequestOrigin(request);
  return createSiteUrlContext({
    siteOrigin: requestOrigin ?? siteUrlContext.siteOrigin,
    basePath: siteUrlContext.basePath,
  });
};

export const createDevelopmentInternalDocumentRouteManifestMiddleware = (
  options: DevelopmentInternalDocumentRouteManifestMiddlewareOptions,
): Connect.NextHandleFunction => {
  return (request: IncomingMessage, response: ServerResponse, next: Connect.NextFunction): void => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      next();
      return;
    }

    if (typeof request.url !== 'string') {
      next();
      return;
    }

    const requestSiteUrlContext = resolveRequestSiteUrlContext(request, options.siteUrlContext);
    const manifestPathname = resolveInternalDocumentRouteManifestPathname(requestSiteUrlContext);
    let requestUrl: URL;
    try {
      requestUrl = new URL(request.url, `${requestSiteUrlContext.siteOrigin}/`);
    } catch {
      next();
      return;
    }

    if (requestUrl.pathname !== manifestPathname) {
      next();
      return;
    }

    if (requestUrl.searchParams.get('buildId') !== options.buildMetadata.buildId) {
      response.statusCode = 404;
      response.setHeader('Cache-Control', 'no-store');
      response.end();
      return;
    }

    const body = renderInternalDocumentRouteManifest({
      buildId: options.buildMetadata.buildId,
      buildLabel: options.buildMetadata.buildLabel,
      generatedAt: options.buildMetadata.generatedAt,
      siteUrlContext: requestSiteUrlContext,
      routeSet: buildProductionInternalDocumentRouteSet().routeSet,
    });

    response.statusCode = 200;
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.setHeader('Cache-Control', 'no-store');

    if (request.method === 'HEAD') {
      response.end();
      return;
    }

    response.end(body);
  };
};
