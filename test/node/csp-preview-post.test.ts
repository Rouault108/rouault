import { describe, it, expect } from 'vitest';
import { createServer, request as httpRequest } from 'node:http';
import { readFile } from 'node:fs/promises';
import { previewSinglePost } from '../../scripts/deploy/csp-preview-post.js';
import { PreviewPagesAdapter } from '../../scripts/deploy/csp-preview-pages.js';
import {
  uploadTrustedPreviewAssets,
  nativePreviewProcess,
} from '../../scripts/deploy/csp-preview-wrangler.js';
import { fixture, approval, withPacket } from './helpers/csp-preview-delivery-fixture.js';
import { inspectPreviewPacket } from '../../scripts/deploy/csp-preview-packet.js';
import { assetJwt, makeAttempt, jsonResponse } from './helpers/csp-preview-adapter-fixture.js';

const serverFixture = async (
  run: (
    origin: string,
    requests: { method: string; path: string; contentType: string; bytes: Buffer }[],
  ) => Promise<void>,
  mode = 'error',
) => {
  const requests: { method: string; path: string; contentType: string; bytes: Buffer }[] = [];
  const server = createServer(async (req, res) => {
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      const value: unknown = chunk;
      if (!(value instanceof Buffer)) throw new Error('fixture');
      chunks.push(value);
    }
    const bytes = Buffer.concat(chunks);
    requests.push({
      method: req.method ?? '',
      path: req.url ?? '',
      contentType: req.headers['content-type'] ?? '',
      bytes,
    });
    if (req.url?.endsWith('/deployments')) {
      if (mode === 'upgrade') {
        res.writeHead(101, { connection: 'upgrade', upgrade: 'mock' });
        res.end();
        return;
      }
      if (mode === 'disconnect') {
        req.socket.destroy();
        return;
      }
      res.writeHead(
        ['204', '205', '304'].includes(mode)
          ? Number(mode)
          : mode === '5xx'
            ? 500
            : mode === 'redirect'
              ? 302
              : 200,
        {
          'content-type': 'application/json',
          ...(mode === 'redirect' ? { location: 'https://example.invalid/' } : {}),
        },
      );
      res.end(
        JSON.stringify({
          success: false,
          errors: [{ code: 8000000, message: 'mock unknown outcome' }],
        }),
      );
      return;
    }
    if (req.url?.startsWith('/client/v4/pages/assets/')) {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ success: true, errors: [], result: null }));
      return;
    }
    res.writeHead(500);
    res.end();
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('fixture');
  try {
    await run(`http://127.0.0.1:${String(address.port)}`, requests);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
};

describe('one external deployment POST', () => {
  it.each(['error', '5xx', 'redirect', 'disconnect', '204', '205', '304', 'upgrade'])(
    'never resends on %s even if the service accepted the request',
    async (mode) =>
      serverFixture(async (origin, requests) => {
        const post = previewSinglePost((url, options, callback) =>
          httpRequest(origin + url.pathname, options, callback),
        );
        const pages = new PreviewPagesAdapter(
          'c'.repeat(32),
          'mock',
          async () => jsonResponse({}),
          post,
        );
        await expect(
          pages.createDeployment(
            {
              ...makeAttempt(),
              status: 'upload-started',
              operationStatus: 'unknown',
              uploadStartedAt: '2026-11-02T00:00:01.500Z',
            },
            { manifest: { '/index.html': 'a'.repeat(32) }, headers: '', redirects: '' },
          ),
        ).rejects.toThrow();
        expect(requests).toHaveLength(1);
        expect(requests[0]?.method).toBe('POST');
        const form = await new Request(origin, {
          method: 'POST',
          headers: { 'content-type': requests[0]?.contentType ?? '' },
          body: Uint8Array.from(requests[0]?.bytes ?? Buffer.alloc(0)),
        }).formData();
        expect(form.get('branch')).toBe('csp-verify');
        expect(form.get('commit_hash')).toBe(approval.sourceSha);
        expect([...form.keys()].sort()).toEqual(
          [
            '_headers',
            '_redirects',
            'branch',
            'commit_dirty',
            'commit_hash',
            'commit_message',
            'manifest',
          ].sort(),
        );
      }, mode),
  );
  it.each(['account', 'state', 'source'])('rejects wrong %s before any POST', async (mode) => {
    let calls = 0;
    const pages = new PreviewPagesAdapter(
      'c'.repeat(32),
      'mock',
      async () => jsonResponse({}),
      async () => {
        calls++;
        return jsonResponse({});
      },
    );
    const attempt = {
      ...makeAttempt(),
      status: 'upload-started' as const,
      operationStatus: 'unknown' as const,
      uploadStartedAt: '2026-11-02T00:00:01.500Z',
    };
    if (mode === 'account') attempt.accountId = 'd'.repeat(32);
    if (mode === 'state') Object.assign(attempt, { status: 'uncertain' });
    if (mode === 'source') attempt.sourceSha = 'short';
    await expect(
      pages.createDeployment(attempt, {
        manifest: { '/index.html': 'a'.repeat(32) },
        headers: '',
        redirects: '',
      }),
    ).rejects.toThrow();
    expect(calls).toBe(0);
  });
  it(
    'runs actual pinned Wrangler only for assets with a limited JWT and no deployment call',
    async () =>
      fixture(async (_root, packet) =>
        serverFixture(async (origin, requests) => {
          const approved = withPacket(await inspectPreviewPacket(packet, approval.sourceSha));
          const assets = await uploadTrustedPreviewAssets(
            { trustedRoot: process.cwd(), packetRoot: packet, approval: approved, jwt: assetJwt },
            async (input) => {
              expect(input.env['CLOUDFLARE_API_TOKEN']).toBe(assetJwt);
              expect(input.args.slice(1, 4)).toEqual(['pages', 'project', 'upload']);
              const result = await nativePreviewProcess({
                ...input,
                env: { ...input.env, CLOUDFLARE_API_BASE_URL: origin + '/client/v4' },
              });
              expect({ result, paths: requests.map((r) => r.path) }).toMatchObject({
                result: { exitCode: 0 },
              });
              return result;
            },
          );
          expect(Object.keys(assets.manifest)).toHaveLength(4);
          expect(requests.length).toBeGreaterThan(0);
          expect(requests.every((r) => r.path.startsWith('/client/v4/pages/assets/'))).toBe(true);
          const posts = requests.filter((r) => r.path === '/client/v4/pages/assets/upload');
          expect(posts.length).toBeGreaterThan(0);
          const content = await readFile(packet + '/report-only/client-assets/app.js');
          expect(posts.some((r) => r.bytes.includes(Buffer.from(content.toString('base64'))))).toBe(
            true,
          );
          const pages = new PreviewPagesAdapter(
            'c'.repeat(32),
            'mock',
            async () => jsonResponse({}),
            previewSinglePost((url, options, callback) =>
              httpRequest(origin + url.pathname, options, callback),
            ),
          );
          await expect(
            pages.createDeployment(
              {
                ...makeAttempt(),
                status: 'upload-started',
                operationStatus: 'unknown',
                uploadStartedAt: '2026-11-02T00:00:01.500Z',
              },
              assets,
            ),
          ).rejects.toThrow();
          expect(requests.filter((r) => r.path.endsWith('/deployments'))).toHaveLength(1);
        }),
      ),
    30000,
  );
});
