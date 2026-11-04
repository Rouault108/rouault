import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { previewDigest, scanPreviewFiles } from '../../../build/security/csp-preview-artifact.js';
import { resolveCspReportOnly } from '../../../build/security/csp-report-only.js';
import { createStaticCacheControlResolver } from '../../../build/preview/static-cache-control.js';
import type { CspStageOneManifest } from '../../../build/security/csp-inventory.js';
import { previewPublicationFiles } from '../../../build/security/csp-preview-source.js';
import type { PreviewFetch } from '../../../scripts/deploy/csp-preview-transport.js';

// 外部origin名は合成入力としてのみ使い、通信は所有するloopback serverに限定する。
export const withPreviewHttpServer = async <T>(
  packet: string,
  mode: 'baseline' | 'report-only',
  run: (transport: PreviewFetch) => Promise<T>,
  mutation = '',
  mediaRoot?: string,
): Promise<T> => {
  const root = path.join(packet, mode),
    manifest = JSON.parse(
      await readFile(path.join(packet, 'proof/manifest.json'), 'utf8'),
    ) as CspStageOneManifest;
  const files = new Map(
    await Promise.all(
      (await scanPreviewFiles(root)).map(
        async ({ file }) => [file, await readFile(path.join(root, file))] as const,
      ),
    ),
  );
  const cache = createStaticCacheControlResolver(
    await readFile(path.join(packet, 'baseline/_headers'), 'utf8'),
  );
  const mimes: Record<string, string> = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
  };
  const routeManifest = JSON.parse(
    await readFile(path.join(root, 'assets/internal-document-routes.json'), 'utf8'),
  ) as { routes: string[] };
  const publicFiles = previewPublicationFiles(routeManifest.routes);
  const routeFiles = new Map<string, string>();
  routeManifest.routes.forEach((route, index) => {
    const file = publicFiles.html[index + 1];
    if (file) {
      routeFiles.set(decodeURIComponent(route), file);
      routeFiles.set(decodeURIComponent(route).replace(/\/$/u, ''), file);
      routeFiles.set(decodeURIComponent(route).replace(/\/$/u, '') + '/', file);
    }
  });
  const media = new Map<string, Buffer>();
  if (mediaRoot)
    for (const item of await scanPreviewFiles(mediaRoot))
      media.set(item.sha256, await readFile(path.join(mediaRoot, item.file)));
  Object.assign(mimes, {
    '.wasm': 'application/wasm',
    '.woff2': 'font/woff2',
    '.woff': 'font/woff',
    '.ttf': 'font/ttf',
    '.otf': 'font/otf',
    '.ico': 'image/x-icon',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.txt': 'text/plain',
    '.mp4': 'video/mp4',
    '.vtt': 'text/vtt',
  });
  const server = createServer((request, response) => {
    const pathname = new URL(request.url ?? '/', 'http://localhost').pathname;
    if (pathname.startsWith('/media-v2/')) {
      const bytes = media.get(pathname.split('/')[2] ?? '');
      if (!bytes) {
        response.writeHead(404);
        response.end();
        return;
      }
      response.writeHead(200, {
        'content-type': mimes[path.extname(pathname)] ?? 'application/octet-stream',
        'cache-control': 'public, max-age=31536000, immutable',
      });
      response.end(bytes);
      return;
    }

    let file =
        routeFiles.get(decodeURIComponent(pathname)) ?? decodeURIComponent(pathname).slice(1),
      status = 200;
    if (
      pathname === '/404.html' ||
      pathname === '/404' ||
      ['_headers', '_redirects'].includes(file) ||
      !files.has(file)
    ) {
      file = '404.html';
      status = 404;
    }
    const bytes = files.get(file);
    if (!bytes) {
      response.writeHead(500);
      response.end();
      return;
    }
    const headers: Record<string, string> = {
      'content-type': mimes[path.extname(file)] ?? 'application/octet-stream',
      'x-content-type-options': 'nosniff',
      etag: '"' + previewDigest(bytes) + '"',
    };
    const policy = mode === 'report-only' ? resolveCspReportOnly(manifest.rules, pathname) : null;
    if (policy)
      headers['content-security-policy-report-only'] =
        mutation === 'worker-leak' && pathname.includes('worker')
          ? (manifest.rules[0]?.policy ?? '')
          : policy;
    const cacheValue =
      cache(pathname) ?? cache('/' + file.split('/').map(encodeURIComponent).join('/'));
    if (cacheValue) headers['cache-control'] = cacheValue;
    if (mutation === 'enforce') headers['content-security-policy'] = "default-src 'none'";
    if (mutation === 'mime') headers['content-type'] = 'text/plain';
    if (mutation === 'cache') headers['cache-control'] = 'public,max-age=1';
    if (mutation === 'nosniff' || (mutation === 'css-nosniff' && file.endsWith('.css')))
      delete headers['x-content-type-options'];
    if (request.headers['if-none-match'] === headers['etag']) {
      response.writeHead(mutation === '304' ? 200 : 304, headers);
      response.end();
      return;
    }
    response.writeHead(status, headers);
    response.end(mutation === 'body' ? Buffer.from('changed') : bytes);
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('fixture');
  try {
    return await run((url, init) => {
      const target = new URL(url);
      if (
        (!/^https:\/\/(?:csp-verify|[a-f0-9]{8,32})\.rouault\.pages\.dev$/u.test(target.origin) &&
          target.origin !== 'https://media.rouault.page') ||
        target.search ||
        target.hash
      )
        throw new Error('non-fixture URL');
      return fetch(`http://127.0.0.1:${address.port}${target.pathname}`, init);
    });
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
};
