import { createServer } from 'node:http';
import { describe, it, expect } from 'vitest';
import {
  createMemoDeploymentVerifier,
  type VerifiedDeploymentProof,
} from '../../scripts/memos-import/verify-memo-deployment.js';
import type { ImportPlan } from '../../scripts/memos-import/model.js';
import { hashBytes } from '../../scripts/memos-import/source-snapshot.js';
const sha = 'a'.repeat(40);
const plan: ImportPlan = {
  writes: new Map(),
  deletes: [],
  manifest: { schemaVersion: 1, files: {} },
  entries: {
    '02_notes/A.md': {
      sourcePath: '02_notes/A.md',
      publicPath: 'content/memos/A.md',
      status: 'published',
      approvedRequestRef: 'synthetic',
      approvedSourceSha: 'b'.repeat(40),
      approvedContentHash: 'c'.repeat(64),
      dependencyHashes: {},
      publicOutputHashes: {},
      headingMap: { heading: 'Heading' },
    },
  },
  inputHash: 'd'.repeat(64),
  candidateHash: 'e'.repeat(64),
  confirmations: [],
};
describe('actual HTTP memo deployment verification', () => {
  it('checks served bytes/build/anchors/images and withdrawal rather than inferring success from Git or jobs', async () => {
    const served = new Map<string, { bytes: Buffer; type: string }>();
    let requests = 0;
    const server = createServer((request, response) => {
      requests += 1;
      const item = served.get(request.url ?? '');
      response.statusCode = item ? 200 : 404;
      if (item) response.setHeader('Content-Type', item.type);
      response.end(item?.bytes ?? 'Missing');
    });
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', resolve);
    });
    try {
      const address = server.address();
      if (!address || typeof address === 'string')
        throw new Error('Synthetic server address missing');
      const origin = `http://127.0.0.1:${address.port.toString()}`;
      const files = new Map<string, Uint8Array>();
      const put = (name: string, url: string, body: string, type: string): void => {
        const bytes = Buffer.from(body);
        files.set(name, bytes);
        served.set(url, { bytes, type });
      };
      const manifest = {
        version: 1,
        buildId: 'synthetic-build',
        buildLabel: sha.slice(0, 7),
        generatedAt: '2026-10-07T00:00:00.000Z',
        siteOrigin: origin,
        basePath: '',
        routes: ['/', '/memos/', '/memos/A', '/search/'],
      };
      put(
        'assets/internal-document-routes.json',
        '/assets/internal-document-routes.json',
        JSON.stringify(manifest),
        'application/json',
      );
      put(
        'memos/index.html',
        '/memos/',
        '<h1>Memo titles</h1><a href="/memos/A">Synthetic</a>',
        'text/html',
      );
      put('index.html', '/', '<h1>Existing home</h1>', 'text/html');
      put('search-catalog.json', '/search-catalog.json', '[]', 'application/json');
      put(
        'memos/A/index.html',
        '/memos/A',
        '<article data-hydration-scope="note-content"><h2 id="heading">Heading</h2><img src="/assets/synthetic.png"></article>',
        'text/html',
      );
      put(
        '__router/memos/A/index.router.json',
        '/__router/memos/A/index.router.json',
        JSON.stringify({ buildId: manifest.buildId }),
        'application/json',
      );
      put('assets/synthetic.png', '/assets/synthetic.png', 'synthetic-image-bytes', 'image/png');
      let proof: VerifiedDeploymentProof | null = {
        repository: 'Rouault108/rouault',
        commitSha: sha,
        event: 'push',
        branch: 'main',
        deploymentId: 'synthetic-deployment',
        jobs: { deploy: 'success', verification: 'success' },
        expectedFiles: files,
        media: [
          {
            url: origin + '/assets/synthetic.png',
            hash: hashBytes('synthetic-image-bytes'),
            contentType: 'image/png',
          },
        ],
      };
      const verify = createMemoDeploymentVerifier({
        readVerifiedProof: async () => proof,
        siteOrigin: origin,
        basePath: '',
        allowedMediaOrigins: [],
        timeoutMs: 2000,
        maxResponseBytes: 100_000,
      });
      expect((await verify(sha, plan)).status).toBe('verified');
      served.set('/memos/A', { bytes: Buffer.from('Unexpected public body'), type: 'text/html' });
      expect((await verify(sha, plan)).status).toBe('failed');
      served.set('/memos/A', {
        bytes: Buffer.from(files.get('memos/A/index.html') ?? []),
        type: 'text/html',
      });
      served.set('/assets/synthetic.png', {
        bytes: Buffer.from('Changed image'),
        type: 'image/png',
      });
      expect((await verify(sha, plan)).status).toBe('failed');
      served.set('/assets/synthetic.png', {
        bytes: Buffer.from('synthetic-image-bytes'),
        type: 'image/png',
      });
      proof = { ...proof, jobs: { deploy: 'success', verification: 'skipped' } };
      const before = requests;
      expect((await verify(sha, plan)).status).toBe('unknown');
      expect(requests).toBe(before);
      proof = { ...proof, jobs: { deploy: 'success', verification: 'success' } };
      manifest.routes = ['/', '/memos/', '/search/'];
      put(
        'assets/internal-document-routes.json',
        '/assets/internal-document-routes.json',
        JSON.stringify(manifest),
        'application/json',
      );
      const withdrawn = structuredClone(plan);
      const entry = withdrawn.entries['02_notes/A.md'];
      if (!entry) throw new Error('Synthetic target missing');
      entry.status = 'withdrawn';
      expect((await verify(sha, withdrawn)).status).toBe('failed');
      served.delete('/memos/A');
      served.delete('/__router/memos/A/index.router.json');
      expect((await verify(sha, withdrawn)).status).toBe('verified');
      proof = null;
      expect((await verify(sha, withdrawn)).status).toBe('unknown');
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) reject(error);
          else resolve();
        });
      });
    }
  });
  it('reports unavailable network observations as unknown', async () => {
    const verify = createMemoDeploymentVerifier({
      readVerifiedProof: async () => ({
        repository: 'Rouault108/rouault',
        commitSha: sha,
        event: 'push',
        branch: 'main',
        deploymentId: 'synthetic',
        jobs: { deploy: 'success', verification: 'success' },
        expectedFiles: new Map([['assets/internal-document-routes.json', Buffer.from('{}')]]),
        media: [],
      }),
      siteOrigin: 'https://synthetic.example.invalid',
      basePath: '',
      allowedMediaOrigins: [],
      timeoutMs: 1000,
      maxResponseBytes: 1000,
      fetch: async () => {
        throw new Error('Synthetic unavailable network');
      },
    });
    expect((await verify(sha, plan)).status).toBe('unknown');
  });
});
