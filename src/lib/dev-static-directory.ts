import { readFileSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import path from 'node:path';
import type { Connect } from 'vite';

const CONTENT_TYPES = new Map<string, string>([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.png', 'image/png'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.avif', 'image/avif'],
  ['.wasm', 'application/wasm'],
  ['.webp', 'image/webp'],
]);

function normalizeRoutePrefix(routePrefix: string): string {
  if (routePrefix === '/') {
    return routePrefix;
  }

  return routePrefix.endsWith('/') ? routePrefix : `${routePrefix}/`;
}

function isSafeResolvedPath(rootDirectory: string, candidatePath: string): boolean {
  const resolvedRoot = path.resolve(rootDirectory);
  const resolvedCandidate = path.resolve(candidatePath);

  return (
    resolvedCandidate === resolvedRoot || resolvedCandidate.startsWith(`${resolvedRoot}${path.sep}`)
  );
}

function getContentType(filePath: string): string {
  return CONTENT_TYPES.get(path.extname(filePath).toLowerCase()) ?? 'application/octet-stream';
}

function isIgnorableFileError(error: unknown): boolean {
  if (!(error instanceof Error) || !('code' in error)) {
    return false;
  }

  const code = (error as NodeJS.ErrnoException).code;
  return code === 'ENOENT' || code === 'ENOTDIR' || code === 'EISDIR';
}

export function resolveStaticFilePath(
  requestUrl: string,
  routePrefix: string,
  rootDirectory: string,
): string | null {
  const normalizedPrefix = normalizeRoutePrefix(routePrefix);
  const url = new URL(requestUrl, 'http://localhost');

  if (!url.pathname.startsWith(normalizedPrefix)) {
    return null;
  }

  const relativePath = decodeURIComponent(url.pathname.slice(normalizedPrefix.length));
  if (relativePath.length === 0) {
    return null;
  }

  const normalizedRelativePath = path.posix.normalize(relativePath).replace(/^\/+/, '');
  if (
    normalizedRelativePath.length === 0 ||
    normalizedRelativePath === '..' ||
    normalizedRelativePath.startsWith('../')
  ) {
    return null;
  }

  const candidatePath = path.resolve(rootDirectory, normalizedRelativePath);
  return isSafeResolvedPath(rootDirectory, candidatePath) ? candidatePath : null;
}

export function createStaticDirectoryMiddleware(
  routePrefix: string,
  rootDirectory: string,
): Connect.NextHandleFunction {
  const handleRequest = (
    request: IncomingMessage,
    response: ServerResponse,
    next: Connect.NextFunction,
  ): void => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      next();
      return;
    }

    if (typeof request.url !== 'string') {
      next();
      return;
    }

    const filePath = resolveStaticFilePath(request.url, routePrefix, rootDirectory);
    if (filePath === null) {
      next();
      return;
    }

    try {
      const fileBuffer = readFileSync(filePath);
      response.statusCode = 200;
      response.setHeader('Content-Type', getContentType(filePath));
      response.setHeader('Cache-Control', 'no-store');
      if (request.method === 'HEAD') {
        response.end();
        return;
      }

      response.end(fileBuffer);
    } catch (error: unknown) {
      if (isIgnorableFileError(error)) {
        next();
        return;
      }

      next(error as Error);
    }
  };

  return (request, response, next) => {
    handleRequest(request, response, next);
  };
}
