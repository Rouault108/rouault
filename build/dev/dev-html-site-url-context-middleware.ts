import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Connect } from 'vite';

import type { ResolvedBuildMetadata } from '../metadata/build-metadata.js';
import {
  INTERNAL_DOCUMENT_ROUTE_MANIFEST_VERSION,
  resolveInternalDocumentRouteManifestUrl,
} from '../../shared/navigation/internal-document-route-manifest-path.js';
import { createSiteUrlContext, type SiteUrlContext } from '../../shared/site/site-url-context.js';

export interface DevelopmentHtmlSiteUrlContextMiddlewareOptions {
  readonly siteUrlContext: SiteUrlContext;
  readonly buildMetadata: ResolvedBuildMetadata;
}

const HTML_CONTENT_TYPE_PATTERN = /(?:^|;)\s*text\/html\b/iu;

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

  return createSiteUrlContext({
    siteOrigin: resolveRequestOrigin(request) ?? siteUrlContext.siteOrigin,
    basePath: siteUrlContext.basePath,
  });
};

const replaceMetaContent = (html: string, name: string, content: string): string => {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
  const pattern = new RegExp(
    `<meta\\s+name=["']${escapedName}["']\\s+content=["'][^"']*["']\\s*>`,
    'iu',
  );
  const replacement = `<meta name="${name}" content="${content}">`;
  return pattern.test(html) ? html.replace(pattern, replacement) : html;
};

const rewriteHtmlSiteUrlContext = (
  html: string,
  siteUrlContext: SiteUrlContext,
  buildMetadata: ResolvedBuildMetadata,
): string => {
  const manifestUrl = resolveInternalDocumentRouteManifestUrl({
    siteUrlContext,
    buildId: buildMetadata.buildId,
  });

  return (
    [
      ['rouault-site-origin', siteUrlContext.siteOrigin],
      ['rouault-base-path', siteUrlContext.basePath],
      ['rouault-route-manifest', manifestUrl],
      ['rouault-route-manifest-build-id', buildMetadata.buildId],
      ['rouault-route-manifest-version', String(INTERNAL_DOCUMENT_ROUTE_MANIFEST_VERSION)],
    ] as const
  ).reduce((result, [name, content]) => replaceMetaContent(result, name, content), html);
};

export const createDevelopmentHtmlSiteUrlContextMiddleware = (
  options: DevelopmentHtmlSiteUrlContextMiddlewareOptions,
): Connect.NextHandleFunction => {
  return (request: IncomingMessage, response: ServerResponse, next: Connect.NextFunction): void => {
    const chunks: Buffer[] = [];
    const originalWrite = response.write.bind(response) as (
      ...args: Parameters<ServerResponse['write']>
    ) => boolean;
    const originalEnd = response.end.bind(response) as (chunk?: string | Buffer) => ServerResponse;

    response.write = ((...args: Parameters<ServerResponse['write']>): boolean => {
      const chunk = args[0];
      if (typeof chunk === 'string' || Buffer.isBuffer(chunk)) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        return true;
      }

      return originalWrite(...args);
    }) as typeof response.write;

    response.end = ((...args: Parameters<ServerResponse['end']>): ServerResponse => {
      const chunk = args[0];
      if (typeof chunk === 'string' || Buffer.isBuffer(chunk)) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }

      const contentType = response.getHeader('Content-Type');
      const contentTypeValue = Array.isArray(contentType)
        ? contentType.join(';')
        : String(contentType ?? '');
      if (chunks.length > 0 && HTML_CONTENT_TYPE_PATTERN.test(contentTypeValue)) {
        const siteUrlContext = resolveRequestSiteUrlContext(request, options.siteUrlContext);
        const rewritten = rewriteHtmlSiteUrlContext(
          Buffer.concat(chunks).toString('utf-8'),
          siteUrlContext,
          options.buildMetadata,
        );
        response.setHeader('Content-Length', Buffer.byteLength(rewritten));
        return originalEnd(rewritten);
      }

      if (chunks.length > 0) {
        return originalEnd(Buffer.concat(chunks));
      }

      return originalEnd(
        typeof args[0] === 'string' || Buffer.isBuffer(args[0]) ? args[0] : undefined,
      );
    }) as typeof response.end;

    next();
  };
};
