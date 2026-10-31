import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildMediaObjectKey } from '../../shared/media/media-object-contract.js';
import { validateMediaAlias } from '../../build/security/csp-media-aliases.js';
import { createCspMediaAliasMiddleware } from '../../build/preview/csp-media-aliases.js';

describe('isolated CSP media object delivery', () => {
  it('serves only hash-verified media with MIME/cache identity and rejects traversal or changed bytes', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'csp-media-'));
    const dist = path.join(root, 'dist');
    const physical = path.join(root, '.generated/media/assets/examples/media/fixture.jpg');
    await mkdir(physical, { recursive: true });
    await mkdir(dist);
    const bytes = Buffer.from('controlled-image-fixture');
    const digest = createHash('sha256').update(bytes).digest('hex');
    const objectKey = buildMediaObjectKey(digest, 'reading', 'jpeg');
    const descriptor = {
      mediaItemId: 'examples/media/fixture.jpg',
      variant: 'reading',
      format: 'jpeg',
      objectKey,
      contentSha256: digest,
      byteSize: bytes.length,
      contentType: 'image/jpeg',
      publicUrl: `/media/${objectKey}`,
    };
    await writeFile(path.join(physical, 'reading.jpg'), bytes);
    try {
      const alias = await validateMediaAlias(dist, descriptor);
      expect(alias.sourceAsset).not.toContain(root);
      const middleware = createCspMediaAliasMiddleware(root, {
        basePath: '/nested',
        mediaAliases: [alias],
      });
      const server = createServer((req, res) =>
        middleware(req, res, () => {
          res.statusCode = 404;
          res.end();
        }),
      );
      await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
      try {
        const address = server.address();
        if (!address || typeof address === 'string') throw new Error('HTTP address');
        const url = `http://127.0.0.1:${String(address.port)}/nested/${alias.file}`;
        const response = await fetch(url);
        expect(response.status).toBe(200);
        expect(response.headers.get('content-type')).toBe('image/jpeg');
        expect(response.headers.get('x-content-type-options')).toBe('nosniff');
        expect(Buffer.from(await response.arrayBuffer()).equals(bytes)).toBe(true);
        const cached = await fetch(url, { headers: { 'If-None-Match': `"${digest}"` } });
        expect(cached.status).toBe(304);
        expect(await cached.text()).toBe('');
        expect((await fetch(url.replace('/nested/', '/unapproved/'))).status).toBe(404);
      } finally {
        await new Promise<void>((resolve, reject) =>
          server.close((error) => (error ? reject(error) : resolve())),
        );
      }
      await writeFile(path.join(physical, 'reading.jpg'), 'tampered');
      await expect(validateMediaAlias(dist, descriptor)).rejects.toThrow('hash mismatch');
      await expect(
        validateMediaAlias(dist, { ...descriptor, mediaItemId: 'examples/media/../../private' }),
      ).rejects.toThrow('unsafe media');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
