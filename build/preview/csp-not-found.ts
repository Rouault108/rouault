import type { IncomingMessage, ServerResponse } from 'node:http';

// Pagesのcustom 404を隔離serverでも再現し、元request pathのglobal CSPを維持する。
export const createCspNotFoundMiddleware = (
  basePath: string,
  html: Buffer,
  documentFiles: readonly string[] = [],
) => {
  const knownDocuments = new Set(documentFiles);
  return (request: IncomingMessage, response: ServerResponse, next: () => void): void => {
    const original =
      'originalUrl' in request && typeof request.originalUrl === 'string'
        ? request.originalUrl
        : (request.url ?? '/');
    const pathname = new URL(original, 'http://preview.local').pathname;
    if (
      (request.method !== 'GET' && request.method !== 'HEAD') ||
      !pathname.startsWith(`${basePath}/`)
    ) {
      next();
      return;
    }
    const rewritten = new URL(request.url ?? '/', 'http://preview.local').pathname;
    let relative = rewritten.startsWith(`${basePath}/`)
      ? rewritten.slice(basePath.length + 1)
      : rewritten.slice(1);
    try {
      relative = decodeURIComponent(relative);
    } catch {
      /* 不正encodingは既知HTMLに一致させず404へ閉じる。 */
    }
    // Viteはこのhookより後でHTML本文を配信するため、既知HTMLを先取りしない。
    if (knownDocuments.has(relative)) {
      next();
      return;
    }
    response.statusCode = 404;
    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Cache-Control', 'no-store');
    response.end(request.method === 'HEAD' ? undefined : html);
  };
};
