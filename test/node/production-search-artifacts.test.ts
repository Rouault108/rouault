import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { assertProductionSearchArtifacts } from '../../scripts/assert-production-search-artifacts.js';
import type { SearchCatalogItem } from '../../shared/search/search-catalog.js';

const siteOrigin = 'https://example.com';
const canonicalPathname = '/notes/search-artifact/';
const expectedItems: readonly SearchCatalogItem[] = [
  {
    title: 'Search Artifact',
    canonicalPathname: canonicalPathname as SearchCatalogItem['canonicalPathname'],
    description: 'artifact contract',
    date: '2026-01-01',
    tags: ['search', 'production'],
    keywords: ['search-artifact', 'Search Artifact', 'artifact contract', 'search', 'production'],
  },
];

async function withProductionSiteEnv<T>(
  env: { readonly siteOrigin: string; readonly basePath?: string },
  run: () => Promise<T>,
): Promise<T> {
  const originalSiteOrigin = process.env['ROUAULT_SITE_ORIGIN'];
  const originalBasePath = process.env['ROUAULT_BASE_PATH'];

  try {
    process.env['ROUAULT_SITE_ORIGIN'] = env.siteOrigin;
    if (env.basePath === undefined || env.basePath.length === 0) {
      delete process.env['ROUAULT_BASE_PATH'];
    } else {
      process.env['ROUAULT_BASE_PATH'] = env.basePath;
    }
    return await run();
  } finally {
    if (originalSiteOrigin === undefined) {
      delete process.env['ROUAULT_SITE_ORIGIN'];
    } else {
      process.env['ROUAULT_SITE_ORIGIN'] = originalSiteOrigin;
    }

    if (originalBasePath === undefined) {
      delete process.env['ROUAULT_BASE_PATH'];
    } else {
      process.env['ROUAULT_BASE_PATH'] = originalBasePath;
    }
  }
}

const createRouteManifest = (basePath = '') => ({
  version: 1,
  buildId: 'test-build-id',
  buildLabel: 'test build',
  generatedAt: '2026-01-01T00:00:00.000Z',
  siteOrigin,
  basePath,
  routes: [canonicalPathname],
});

const writeJson = (filePath: string, value: unknown): Promise<void> =>
  writeFile(filePath, JSON.stringify(value), 'utf8');

const createFixtureRepo = async (options: {
  readonly basePath?: string;
  readonly catalog?: unknown;
  readonly manifest?: unknown;
  readonly pagefindJs?: string;
  readonly pagefindEntry?: string;
} = {}): Promise<string> => {
  const repoRoot = await mkdtemp(path.join(tmpdir(), 'rouault-search-artifacts-'));
  const distRoot = path.join(repoRoot, 'dist');
  await mkdir(path.join(distRoot, 'assets'), { recursive: true });
  await mkdir(path.join(distRoot, 'pagefind'), { recursive: true });

  await writeJson(
    path.join(distRoot, 'search-catalog.json'),
    options.catalog ?? expectedItems,
  );
  await writeJson(
    path.join(distRoot, 'assets', 'internal-document-routes.json'),
    options.manifest ?? createRouteManifest(options.basePath ?? ''),
  );
  await writeFile(
    path.join(distRoot, 'pagefind', 'pagefind.js'),
    options.pagefindJs ?? 'export const filters = async () => ({});',
    'utf8',
  );
  await writeFile(
    path.join(distRoot, 'pagefind', 'pagefind-entry.json'),
    options.pagefindEntry ?? '{"version":1}',
    'utf8',
  );

  return repoRoot;
};

describe('production search artifact assertion', () => {
  it('search catalog、route manifest、Pagefind artifact の正常系を検査すること', async () => {
    const repoRoot = await createFixtureRepo();
    try {
      await withProductionSiteEnv({ siteOrigin }, async () => {
        await expect(
          assertProductionSearchArtifacts({ repoRoot, expectedItemsForTestOnly: expectedItems }),
        ).resolves.toBeUndefined();
      });
    } finally {
      await rm(repoRoot, { recursive: true, force: true });
    }
  });

  it('raw tags / genres 契約を parse 前に失敗させること', async () => {
    const repoRoot = await createFixtureRepo({
      catalog: [{ ...expectedItems[0], genres: ['legacy'] }],
    });
    try {
      await withProductionSiteEnv({ siteOrigin }, async () => {
        await expect(
          assertProductionSearchArtifacts({ repoRoot, expectedItemsForTestOnly: expectedItems }),
        ).rejects.toThrow(/raw item 0 must not include genres/);
      });
    } finally {
      await rm(repoRoot, { recursive: true, force: true });
    }
  });

  it('route manifest allowlist 外の catalog item を drop として失敗させること', async () => {
    const repoRoot = await createFixtureRepo({
      manifest: { ...createRouteManifest(), routes: ['/notes/other/'] },
    });
    try {
      await withProductionSiteEnv({ siteOrigin }, async () => {
        await expect(
          assertProductionSearchArtifacts({ repoRoot, expectedItemsForTestOnly: expectedItems }),
        ).rejects.toThrow(/actual search catalog dropped 1 item/);
      });
    } finally {
      await rm(repoRoot, { recursive: true, force: true });
    }
  });

  it('empty catalog は test-only option でのみ許可すること', async () => {
    const repoRoot = await createFixtureRepo({ catalog: [] });
    try {
      await withProductionSiteEnv({ siteOrigin }, async () => {
        await expect(
          assertProductionSearchArtifacts({ repoRoot, expectedItemsForTestOnly: [] }),
        ).rejects.toThrow(/must not be empty/);
        await expect(
          assertProductionSearchArtifacts({
            repoRoot,
            allowEmptyCatalogForTestOnly: true,
            expectedItemsForTestOnly: [],
          }),
        ).resolves.toBeUndefined();
      });
    } finally {
      await rm(repoRoot, { recursive: true, force: true });
    }
  });

  it('expected catalog との payload mismatch を失敗させること', async () => {
    const repoRoot = await createFixtureRepo({
      catalog: [{ ...expectedItems[0], title: 'Different' }],
    });
    try {
      await withProductionSiteEnv({ siteOrigin }, async () => {
        await expect(
          assertProductionSearchArtifacts({ repoRoot, expectedItemsForTestOnly: expectedItems }),
        ).rejects.toThrow(/title mismatch/);
      });
    } finally {
      await rm(repoRoot, { recursive: true, force: true });
    }
  });

  it('Pagefind entry の invalid JSON を失敗させること', async () => {
    const repoRoot = await createFixtureRepo({ pagefindEntry: '{' });
    try {
      await withProductionSiteEnv({ siteOrigin }, async () => {
        await expect(
          assertProductionSearchArtifacts({ repoRoot, expectedItemsForTestOnly: expectedItems }),
        ).rejects.toThrow(/Pagefind entry JSON is invalid/);
      });
    } finally {
      await rm(repoRoot, { recursive: true, force: true });
    }
  });

  it('basePath 環境でも dist 配下の artifact を検査すること', async () => {
    const repoRoot = await createFixtureRepo({ basePath: '/docs' });
    try {
      await withProductionSiteEnv({ siteOrigin, basePath: '/docs' }, async () => {
        await expect(
          assertProductionSearchArtifacts({ repoRoot, expectedItemsForTestOnly: expectedItems }),
        ).resolves.toBeUndefined();
      });
    } finally {
      await rm(repoRoot, { recursive: true, force: true });
    }
  });

  it('fixture repoRoot では expected 注入なしに loadNotesData へ進まないこと', async () => {
    const repoRoot = await createFixtureRepo();
    try {
      await withProductionSiteEnv({ siteOrigin }, async () => {
        await expect(assertProductionSearchArtifacts({ repoRoot })).rejects.toThrow(
          /expectedItemsForTestOnly or loadNotesForTestOnly is required/,
        );
      });
    } finally {
      await rm(repoRoot, { recursive: true, force: true });
    }
  });

  it('env を復元する helper を使うこと', async () => {
    const originalSiteOrigin = process.env['ROUAULT_SITE_ORIGIN'];
    await withProductionSiteEnv({ siteOrigin, basePath: '/inside' }, async () => {
      expect(process.env['ROUAULT_SITE_ORIGIN']).to.equal(siteOrigin);
      expect(process.env['ROUAULT_BASE_PATH']).to.equal('/inside');
    });
    expect(process.env['ROUAULT_SITE_ORIGIN']).to.equal(originalSiteOrigin);
  });
});
