import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import path from 'node:path';
import type { CspStageOneManifest } from '../security/csp-inventory.js';

// 通常previewや配信artifactへ回避策を移さず、検証済みobject identityを隔離serverだけで解決する。
export const createCspMediaAliasMiddleware =
  (repoRoot: string, manifest: Pick<CspStageOneManifest, 'basePath' | 'mediaAliases'>) =>
  (request: IncomingMessage, response: ServerResponse, next: (error?: unknown) => void): void => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      next();
      return;
    }
    const pathname = new URL(request.url ?? '/', 'http://preview.local').pathname;
    const alias = manifest.mediaAliases.find(
      ({ file }) => pathname === `${manifest.basePath}/${file}`,
    );
    if (!alias) {
      next();
      return;
    }
    void readFile(path.resolve(repoRoot, alias.sourceAsset))
      .then((bytes) => {
        if (createHash('sha256').update(bytes).digest('hex') !== alias.sha256)
          throw new Error('[csp] media alias changed after startup');
        response.setHeader('Content-Type', alias.contentType);
        response.setHeader('X-Content-Type-Options', 'nosniff');
        response.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        response.setHeader('ETag', `"${alias.sha256}"`);
        const saved = request.headers['if-none-match'];
        const tags = (Array.isArray(saved) ? saved.join(',') : (saved ?? ''))
          .split(',')
          .map((tag) => tag.trim().replace(/^W\//u, ''));
        if (tags.includes('*') || tags.includes(`"${alias.sha256}"`)) response.statusCode = 304;
        response.end(request.method === 'HEAD' || response.statusCode === 304 ? undefined : bytes);
      })
      .catch(next);
  };
