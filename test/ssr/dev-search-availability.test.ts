import { createServer, type Server } from 'node:http';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import { createDevelopmentSearchArtifactMiddleware } from '../../build/dev/dev-search-artifact-middleware.js';
import { createSearchAvailability } from '../../build/dev/search-availability.js';

const servers: Server[] = [];
const directories: string[] = [];
afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise<void>((resolve, reject) => {
          server.close((error) => (error ? reject(error) : resolve()));
          server.closeAllConnections();
        }),
    ),
  );
  await Promise.all(
    directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })),
  );
});
const start = async (initiallyAvailable = false) => {
  const directory = await mkdtemp(path.join(tmpdir(), 'search-availability-'));
  directories.push(directory);
  await mkdir(path.join(directory, 'search'));
  await writeFile(path.join(directory, 'search', 'manifest.json'), '{"synthetic":true}');
  const availability = createSearchAvailability();
  if (initiallyAvailable) {
    const token = availability.begin();
    availability.contentSaved(token);
    availability.complete(token);
  }
  const middleware = createDevelopmentSearchArtifactMiddleware({
    outputDirectory: directory,
    siteUrlContext: { siteOrigin: 'http://127.0.0.1', basePath: '/nested' },
    availability,
    loadNotes: () => [],
  });
  const server = createServer((request, response) => {
    void middleware(request, response, () => {
      response.setHeader('X-Fallback', 'true');
      response.end('fallback');
    });
  });
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('missing address');
  return { url: `http://127.0.0.1:${address.port}/nested`, availability };
};

describe('development search serving gate', () => {
  it.each(['GET', 'HEAD'])(
    '%sは初回成功までcatalogと検索データを503/no-storeにする',
    async (method) => {
      const { url } = await start();
      for (const target of [
        '/search-catalog.json',
        '/search/manifest.json',
        '/search/missing.json',
        '/%73earch/manifest.json',
        '/search%2fmanifest.json',
        '/search-catalog%2ejson',
      ]) {
        const response = await fetch(url + target, { method });
        expect(response.status).toBe(503);
        expect(response.headers.get('cache-control')).toBe('no-store');
        expect(response.headers.get('x-fallback')).toBeNull();
        expect(await response.text()).toBe('');
      }
    },
  );
  it('初回成功後のmiddleware設定は共有状態を閉じ直さない', async () => {
    const { url, availability } = await start(true);
    for (const target of ['/search-catalog.json', '/search/manifest.json'])
      expect((await fetch(url + target)).status).toBe(200);
    const next = availability.begin();
    expect((await fetch(url + '/search-catalog.json')).status).toBe(503);
    availability.contentSaved(next);
    availability.complete(next);
    expect((await fetch(url + '/search/manifest.json')).status).toBe(200);
  });
  it.each(['GET', 'HEAD'])('成功後も欠損データの%sを静的fallbackへ流さない', async (method) => {
    const { url } = await start(true);
    const missing = await fetch(url + '/search/missing.json', { method });
    expect(missing.status).toBe(503);
    expect(missing.headers.get('x-fallback')).toBeNull();
    const present = await fetch(url + '/search/manifest.json', { method });
    expect(present.status).toBe(200);
    expect(await present.text()).toBe(method === 'HEAD' ? '' : '{"synthetic":true}');
  });
  it('検索ページ本体とGET/HEAD以外を制限しない', async () => {
    const { url } = await start();
    for (const target of ['/search/', '/search/index.html', '/about/'])
      expect((await fetch(url + target)).headers.get('x-fallback')).toBe('true');
    expect(
      (await fetch(url + '/search/manifest.json', { method: 'POST' })).headers.get('x-fallback'),
    ).toBe('true');
  });
});
