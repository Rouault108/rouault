import { readFileSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import path from 'node:path';
import type { Connect } from 'vite';

import { createNavigationEnvelopeFromHtml } from '../navigation/emit-navigation-artifacts.js';

const ROUTER_ARTIFACT_ROOT_PATHNAME = '/__router';
const ROUTER_ARTIFACT_FILE_NAME = 'index.router.json';
const ROOT_ROUTER_ARTIFACT_PATHNAME = `${ROUTER_ARTIFACT_ROOT_PATHNAME}/${ROUTER_ARTIFACT_FILE_NAME}`;

function isSafeResolvedPath(rootDirectory: string, candidatePath: string): boolean {
  const resolvedRoot = path.resolve(rootDirectory);
  const resolvedCandidate = path.resolve(candidatePath);

  return (
    resolvedCandidate === resolvedRoot || resolvedCandidate.startsWith(`${resolvedRoot}${path.sep}`)
  );
}

function isIgnorableFileError(error: unknown): boolean {
  if (!(error instanceof Error) || !('code' in error)) {
    return false;
  }

  const code = (error as NodeJS.ErrnoException).code;
  return code === 'ENOENT' || code === 'ENOTDIR' || code === 'EISDIR';
}

export function resolveHtmlFilePathFromRouterArtifactRequest(
  requestUrl: string,
  outputDirectory: string,
): string | null {
  let url: URL;
  try {
    url = new URL(requestUrl, 'http://localhost');
  } catch {
    return null;
  }

  let decodedPathname: string;
  try {
    decodedPathname = decodeURIComponent(url.pathname);
  } catch {
    return null;
  }

  if (decodedPathname === ROOT_ROUTER_ARTIFACT_PATHNAME) {
    return path.resolve(outputDirectory, 'index.html');
  }

  const artifactPrefix = `${ROUTER_ARTIFACT_ROOT_PATHNAME}/`;
  const artifactSuffix = `/${ROUTER_ARTIFACT_FILE_NAME}`;

  if (
    !decodedPathname.startsWith(artifactPrefix) ||
    !decodedPathname.endsWith(artifactSuffix)
  ) {
    return null;
  }

  const relativeContentPath = decodedPathname.slice(
    artifactPrefix.length,
    -artifactSuffix.length,
  );

  const normalizedRelativeContentPath = path.posix
    .normalize(relativeContentPath)
    .replace(/^\/+/u, '')
    .replace(/\/+$/u, '');

  if (
    normalizedRelativeContentPath.length === 0 ||
    normalizedRelativeContentPath === '.' ||
    normalizedRelativeContentPath === '..' ||
    normalizedRelativeContentPath.startsWith('../')
  ) {
    return null;
  }

  const candidatePath = path.resolve(
    outputDirectory,
    ...normalizedRelativeContentPath.split('/'),
    'index.html',
  );

  return isSafeResolvedPath(outputDirectory, candidatePath) ? candidatePath : null;
}

export function createDevelopmentRouterArtifactMiddleware(options: {
  outputDirectory: string;
  buildId?: string | null | undefined;
}): Connect.NextHandleFunction {
  const outputDirectory = path.resolve(options.outputDirectory);
  const buildId = options.buildId ?? undefined;

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

    const htmlFilePath = resolveHtmlFilePathFromRouterArtifactRequest(
      request.url,
      outputDirectory,
    );

    if (htmlFilePath === null) {
      next();
      return;
    }

    try {
      const html = readFileSync(htmlFilePath, 'utf8');
      const envelope = createNavigationEnvelopeFromHtml(html, htmlFilePath, {
        buildId,
        generatedAt: new Date().toISOString(),
      });
      const body = `${JSON.stringify(envelope, null, 2)}\n`;

      response.statusCode = 200;
      response.setHeader('Content-Type', 'application/json; charset=utf-8');
      response.setHeader('Cache-Control', 'no-store');

      if (request.method === 'HEAD') {
        response.end();
        return;
      }

      response.end(body);
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