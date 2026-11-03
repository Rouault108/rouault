import { readFile } from 'node:fs/promises';
import path from 'node:path';
import {
  PREVIEW_TARGET,
  previewDigest,
  scanPreviewFiles,
} from '../../build/security/csp-preview-artifact.js';
import {
  previewPublicationFiles,
  assertPreviewPublication,
} from '../../build/security/csp-preview-source.js';
import {
  readVerifiedCspStageOne,
  resolveCspReportOnly,
} from '../../build/security/csp-report-only.js';
import { createStaticCacheControlResolver } from '../../build/preview/static-cache-control.js';
import { parseInternalDocumentRouteManifest } from '../../shared/navigation/internal-document-route-manifest.js';
import {
  buildMediaObjectKey,
  isMediaVariant,
  MEDIA_FORMAT_CONTENT_TYPE,
} from '../../shared/media/media-object-contract.js';
import {
  validateNavigationEnvelope,
  validateLoadedEnvelope,
} from '../../src/router/navigation-envelope-validator.js';
import {
  nativePreviewFetch,
  readPreviewResponse,
  type PreviewFetch,
} from './csp-preview-transport.js';
import { fileURLToPath } from 'node:url';
import type { PreviewAttempt } from './csp-preview-transaction.js';

const mimes: Record<string, readonly string[]> = {
  '.html': ['text/html'],
  '.js': ['text/javascript', 'application/javascript'],
  '.css': ['text/css'],
  '.json': ['application/json'],
  '.wasm': ['application/wasm'],
  '.woff2': ['font/woff2', 'application/font-woff2'],
  '.woff': ['font/woff'],
  '.png': ['image/png'],
  '.jpg': ['image/jpeg'],
  '.jpeg': ['image/jpeg'],
  '.webp': ['image/webp'],
  '.avif': ['image/avif'],
  '.gif': ['image/gif'],
  '.svg': ['image/svg+xml'],
  '.ico': ['image/x-icon', 'image/vnd.microsoft.icon'],
  '.txt': ['text/plain'],
  '.vtt': ['text/vtt'],
  '.mp4': ['video/mp4'],
  '.webm': ['video/webm'],
  '.mp3': ['audio/mpeg'],
  '.wav': ['audio/wav', 'audio/x-wav'],
};
const cacheTokens = (value: string): string => {
  const parts = value
    .toLowerCase()
    .split(',')
    .map((part) => part.trim());
  if (
    parts.some((part) => !part) ||
    new Set(parts.map((part) => part.split('=')[0])).size !== parts.length
  )
    throw new Error('[preview-delivery] duplicate/empty cache directive');
  return parts.sort().join(',');
};
const encodedPath = (file: string): string =>
  '/' + file.split('/').map(encodeURIComponent).join('/');
export interface PreviewHttpEvidence {
  schema: 1;
  sourceSha: string;
  buildId: string;
  payloadDigest: string;
  hostsVerified: 2;
  filesVerified: number;
  routesVerified: number;
  mediaVerified: number;
  conditionalRequestsVerified: number;
  browserCache: 'not-run';
  browserEnforcement: 'not-run';
}

export const verifyPreviewHttp = async (
  packetRoot: string,
  attempt: PreviewAttempt,
  deploymentUrl: string,
  transport: PreviewFetch = nativePreviewFetch,
): Promise<PreviewHttpEvidence> => {
  if (!/^https:\/\/[a-f0-9]{8,32}\.rouault\.pages\.dev\/?$/u.test(deploymentUrl))
    throw new Error('[preview-delivery] invalid HTTP deployment target');
  const baseline = path.join(packetRoot, 'baseline'),
    payload = path.join(packetRoot, attempt.mode),
    manifest = await readVerifiedCspStageOne(
      baseline,
      path.join(packetRoot, 'proof/manifest.json'),
      {
        viteManifestFile: path.join(packetRoot, 'proof/vite-manifest.json'),
        sourceRoot: fileURLToPath(new URL('../../src', import.meta.url)),
      },
    );
  if (
    manifest.siteOrigin !== PREVIEW_TARGET.origin ||
    manifest.basePath !== '' ||
    !attempt.sourceSha.startsWith(manifest.buildId)
  )
    throw new Error('[preview-delivery] HTTP profile identity mismatch');
  const files = await scanPreviewFiles(payload);
  if (previewDigest(JSON.stringify(files)) !== attempt.payloadDigest)
    throw new Error('[preview-delivery] HTTP payload changed');
  const routes = parseInternalDocumentRouteManifest(
    JSON.parse(
      await readFile(path.join(payload, 'assets/internal-document-routes.json'), 'utf8'),
    ) as unknown,
  );
  if (
    routes.buildId !== manifest.buildId ||
    routes.siteOrigin !== PREVIEW_TARGET.origin ||
    routes.basePath !== ''
  )
    throw new Error('[preview-delivery] HTTP route identity mismatch');
  assertPreviewPublication(manifest, routes.routes);
  const publication = previewPublicationFiles(routes.routes),
    documentPaths = new Map<string, string>();
  routes.routes.forEach((route, index) => {
    const file = publication.html[index + 1];
    if (!file) throw new Error('[preview-delivery] missing route file');
    documentPaths.set(file, route);
  });
  for (const item of manifest.envelopes) {
    const envelope = validateNavigationEnvelope(
      JSON.parse(await readFile(path.join(payload, item.file), 'utf8')) as unknown,
    );
    validateLoadedEnvelope({
      envelope,
      source: 'fetch',
      currentBuildId: manifest.buildId,
      normalizedUrl: PREVIEW_TARGET.origin + '/',
    });
    if (envelope.generatedAt !== routes.generatedAt)
      throw new Error('[preview-delivery] HTTP envelope timestamp mismatch');
  }
  const resolveCache = createStaticCacheControlResolver(
    await readFile(path.join(baseline, '_headers'), 'utf8'),
  );
  const notFound = files.find((file) => file.file === '404.html');
  if (!notFound) throw new Error('[preview-delivery] missing HTTP 404 fixture');
  let requested = 0,
    totalBytes = 0,
    conditional = 0;
  const deadline = AbortSignal.timeout(180000);
  const fetchAt = async (url: string, headers: Record<string, string> = {}): Promise<Response> => {
    if (++requested > 5000) throw new Error('[preview-delivery] HTTP request limit');
    return transport(url, {
      method: 'GET',
      redirect: 'manual',
      credentials: 'omit',
      signal: deadline,
      headers: { 'Accept-Encoding': 'identity', ...headers },
    });
  };
  const policy = (response: Response, pathname: string, optional = false): void => {
    if (response.headers.has('content-security-policy'))
      throw new Error('[preview-delivery] unexpected enforce policy');
    const actual = response.headers.get('content-security-policy-report-only'),
      expected =
        attempt.mode === 'report-only' ? resolveCspReportOnly(manifest.rules, pathname) : null;
    if ((!optional || actual !== null) && actual !== expected)
      throw new Error('[preview-delivery] HTTP parent/Worker policy mismatch');
  };
  const body = async (response: Response): Promise<Buffer> => {
    const bytes = await readPreviewResponse(response, 32 * 1024 * 1024);
    totalBytes += bytes.length;
    if (totalBytes > 256 * 1024 * 1024) throw new Error('[preview-delivery] HTTP total byte limit');
    return bytes;
  };
  const checkResponse = async (
    response: Response,
    pathname: string,
    file: (typeof files)[number],
  ): Promise<Response> => {
    policy(response, pathname);
    const type = response.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase(),
      expectedTypes = mimes[path.extname(file.file)];
    if (!expectedTypes || !type || !expectedTypes.includes(type))
      throw new Error('[preview-delivery] HTTP MIME mismatch');
    if (
      ['.html', '.js', '.css', '.wasm'].includes(path.extname(file.file)) &&
      response.headers.get('x-content-type-options')?.toLowerCase() !== 'nosniff'
    )
      throw new Error('[preview-delivery] HTTP nosniff missing');
    const expectedCache = resolveCache(pathname) ?? resolveCache(encodedPath(file.file));
    if (
      expectedCache &&
      cacheTokens(response.headers.get('cache-control') ?? '') !== cacheTokens(expectedCache)
    )
      throw new Error('[preview-delivery] HTTP cache policy mismatch');
    const bytes = await body(response);
    if (bytes.length !== file.bytes || previewDigest(bytes) !== file.sha256)
      throw new Error('[preview-delivery] HTTP body identity mismatch');
    return response;
  };
  const check = async (
    origin: string,
    pathname: string,
    file: (typeof files)[number],
    status = 200,
  ): Promise<Response> => {
    const response = await fetchAt(origin + pathname);
    if (response.status !== status)
      throw new Error('[preview-delivery] HTTP status/redirect mismatch');
    return checkResponse(response, pathname, file);
  };
  const normalized = async (
    origin: string,
    from: string,
    target: string,
    file: (typeof files)[number],
  ): Promise<void> => {
    const response = await fetchAt(origin + from);
    if (response.status === 200 || (file.file === '404.html' && response.status === 404)) {
      await checkResponse(response, from, file);
      return;
    }
    if (![301, 302, 307, 308].includes(response.status))
      throw new Error('[preview-delivery] HTTP normalization unavailable');
    policy(response, from, true);
    const url = new URL(response.headers.get('location') ?? '', origin + from);
    const targets = new Set([target, target === '/' ? '/' : target.replace(/\/$/u, '') + '/']);
    if (
      url.origin !== origin ||
      url.search ||
      url.hash ||
      url.username ||
      url.password ||
      !targets.has(url.pathname)
    )
      throw new Error('[preview-delivery] unapproved HTTP redirect');
    await response.body?.cancel();
    const final = await fetchAt(origin + url.pathname);
    if (final.status !== 200 && !(file.file === '404.html' && final.status === 404))
      throw new Error('[preview-delivery] HTTP normalized target status');
    await checkResponse(final, url.pathname, file);
  };
  const worker = manifest.rules.find((rule) => rule.context === 'worker')?.pattern;
  const rootFile = files.find((file) => file.file === 'index.html'),
    workerFile = files.find((file) => encodedPath(file.file) === worker);
  if (!rootFile || !workerFile || !worker)
    throw new Error('[preview-delivery] HTTP root/Worker profile missing');
  for (const origin of [PREVIEW_TARGET.origin, new URL(deploymentUrl).origin]) {
    let cursor = 0;
    const publicFiles = files.filter(
      (file) => !['_headers', '_redirects', '404.html'].includes(file.file),
    );
    await Promise.all(
      Array.from({ length: 8 }, async () => {
        while (cursor < publicFiles.length) {
          const file = publicFiles[cursor++];
          if (file)
            await check(origin, documentPaths.get(file.file) ?? encodedPath(file.file), file);
        }
      }),
    );
    for (const file of files.filter(
      (file) => file.file.endsWith('.html') && file.file !== '404.html',
    )) {
      const target = documentPaths.get(file.file);
      if (!target) throw new Error('[preview-delivery] unknown HTTP document route');
      await normalized(origin, encodedPath(file.file), target, file);
      if (target !== '/')
        await normalized(
          origin,
          target.endsWith('/') ? target.slice(0, -1) : target + '/',
          target,
          file,
        );
    }
    for (const pathname of [`/__csp_missing_${attempt.sourceSha}`, '/_headers', '/_redirects'])
      await check(origin, pathname, notFound, 404);
    await normalized(origin, '/404.html', '/404', notFound);
    for (const [pathname, file] of [
      ['/', rootFile],
      [worker, workerFile],
    ] as const) {
      const first = await check(origin, pathname, file),
        tag = first.headers.get('etag');
      if (!tag || !/^(?:W\/)?"[\x21\x23-\x7e]{1,200}"$/u.test(tag))
        throw new Error('[preview-delivery] HTTP ETag missing/invalid');
      const warm = await check(origin, pathname, file);
      if (warm.headers.get('etag') !== tag)
        throw new Error('[preview-delivery] HTTP warm cache identity changed');
      const response = await fetchAt(origin + pathname, { 'If-None-Match': tag });
      if (response.status !== 304)
        throw new Error('[preview-delivery] HTTP conditional revalidation failed');
      policy(response, pathname, true);
      if (response.body) {
        const reader = response.body.getReader();
        const value = await reader.read();
        if (!value.done) {
          await reader.cancel();
          throw new Error('[preview-delivery] HTTP 304 had body');
        }
      }
      conditional++;
    }
  }
  const external = new Set(
    [
      ...manifest.documents.flatMap((item) => item.resources),
      ...manifest.envelopes.flatMap((item) => item.resources),
      ...manifest.stylesheetResources,
    ]
      .filter((resource) => resource.origin === PREVIEW_TARGET.mediaOrigin)
      .map((resource) => resource.pathname),
  );
  for (const pathname of external) {
    const parts = /^\/media-v2\/([a-f0-9]{64})\/(thumb|reading|full)\.(avif|webp|jpg)$/u.exec(
        pathname,
      ),
      hash = parts?.[1],
      variant = parts?.[2],
      extension = parts?.[3];
    const format = extension === 'jpg' ? 'jpeg' : extension;
    if (!hash || !isMediaVariant(variant) || !format || !['avif', 'webp', 'jpeg'].includes(format))
      throw new Error('[preview-delivery] unverified external media contract');
    const mediaFormat = format as 'avif' | 'webp' | 'jpeg';
    if ('/' + buildMediaObjectKey(hash, variant, mediaFormat) !== pathname)
      throw new Error('[preview-delivery] media key mismatch');
    const response = await fetchAt(PREVIEW_TARGET.mediaOrigin + pathname);
    if (
      response.status !== 200 ||
      response.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() !==
        MEDIA_FORMAT_CONTENT_TYPE[mediaFormat] ||
      cacheTokens(response.headers.get('cache-control') ?? '') !==
        cacheTokens('public, max-age=31536000, immutable') ||
      previewDigest(await body(response)) !== hash
    )
      throw new Error('[preview-delivery] external media HTTP identity mismatch');
  }
  return {
    schema: 1,
    sourceSha: attempt.sourceSha,
    buildId: manifest.buildId,
    payloadDigest: attempt.payloadDigest,
    hostsVerified: 2,
    filesVerified: files.length - 2,
    routesVerified: routes.routes.length,
    mediaVerified: external.size,
    conditionalRequestsVerified: conditional,
    browserCache: 'not-run',
    browserEnforcement: 'not-run',
  };
};
