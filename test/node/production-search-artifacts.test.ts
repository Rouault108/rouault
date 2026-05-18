import { mkdir, mkdtemp, rm, unlink, writeFile } from 'node:fs/promises';
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
const expectedItem = expectedItems[0];
if (expectedItem === undefined) {
  throw new Error('expected search artifact fixture item is missing.');
}

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

  it('search catalog の欠落、空、不正 JSON、top-level object を失敗させること', async () => {
    const cases: readonly {
      readonly name: string;
      readonly prepare: (repoRoot: string) => Promise<void>;
      readonly message: RegExp;
    }[] = [
      {
        name: 'missing',
        prepare: async (repoRoot) => {
          await unlink(path.join(repoRoot, 'dist', 'search-catalog.json'));
        },
        message: /search catalog is missing/,
      },
      {
        name: 'empty',
        prepare: async (repoRoot) => {
          await writeFile(path.join(repoRoot, 'dist', 'search-catalog.json'), '', 'utf8');
        },
        message: /search catalog is empty/,
      },
      {
        name: 'invalid json',
        prepare: async (repoRoot) => {
          await writeFile(path.join(repoRoot, 'dist', 'search-catalog.json'), '{', 'utf8');
        },
        message: /search catalog JSON is invalid/,
      },
      {
        name: 'top-level object',
        prepare: async (repoRoot) => {
          await writeJson(path.join(repoRoot, 'dist', 'search-catalog.json'), { items: [] });
        },
        message: /must be a top-level array/,
      },
    ];

    for (const testCase of cases) {
      const repoRoot = await createFixtureRepo();
      try {
        await testCase.prepare(repoRoot);
        await withProductionSiteEnv({ siteOrigin }, async () => {
          await expect(
            assertProductionSearchArtifacts({ repoRoot, expectedItemsForTestOnly: expectedItems }),
            testCase.name,
          ).rejects.toThrow(testCase.message);
        });
      } finally {
        await rm(repoRoot, { recursive: true, force: true });
      }
    }
  });

  it('raw tags 欠落、raw tags 非 array、tags / genres 併存を失敗させること', async () => {
    const cases: readonly { readonly catalog: unknown; readonly message: RegExp }[] = [
      {
        catalog: [{ ...expectedItems[0], tags: undefined }],
        message: /raw item 0 is missing tags/,
      },
      {
        catalog: [{ ...expectedItems[0], tags: 'search' }],
        message: /raw item 0 tags must be an array/,
      },
      {
        catalog: [{ ...expectedItems[0], genres: ['legacy'] }],
        message: /raw item 0 must not include genres/,
      },
    ];

    for (const testCase of cases) {
      const repoRoot = await createFixtureRepo({ catalog: testCase.catalog });
      try {
        await withProductionSiteEnv({ siteOrigin }, async () => {
          await expect(
            assertProductionSearchArtifacts({ repoRoot, expectedItemsForTestOnly: expectedItems }),
          ).rejects.toThrow(testCase.message);
        });
      } finally {
        await rm(repoRoot, { recursive: true, force: true });
      }
    }

    const repoRoot = await createFixtureRepo({
      catalog: [
        {
          title: expectedItems[0]?.title,
          canonicalPathname: expectedItems[0]?.canonicalPathname,
        },
      ],
    });
    try {
      await withProductionSiteEnv({ siteOrigin }, async () => {
        await expect(
          assertProductionSearchArtifacts({ repoRoot, expectedItemsForTestOnly: expectedItems }),
        ).rejects.toThrow(/raw item 0 is missing tags/);
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

  it('actual / expected catalog の canonicalPathname set、件数、重複を失敗させること', async () => {
    const otherItem = {
      ...expectedItems[0],
      canonicalPathname: '/notes/other/' as SearchCatalogItem['canonicalPathname'],
      title: 'Other',
    };
    const cases: readonly {
      readonly catalog: readonly SearchCatalogItem[];
      readonly expected: readonly SearchCatalogItem[];
      readonly manifestRoutes: readonly string[];
      readonly message: RegExp;
    }[] = [
      {
        catalog: [otherItem],
        expected: expectedItems,
        manifestRoutes: [canonicalPathname, '/notes/other/'],
        message: /unexpected canonicalPathname/,
      },
      {
        catalog: expectedItems,
        expected: [expectedItem, otherItem],
        manifestRoutes: [canonicalPathname, '/notes/other/'],
        message: /item count mismatch/,
      },
      {
        catalog: [expectedItem, expectedItem],
        expected: [expectedItem, expectedItem],
        manifestRoutes: [canonicalPathname],
        message: /actual search catalog has duplicate canonicalPathname/,
      },
      {
        catalog: [expectedItem, otherItem],
        expected: [expectedItem, expectedItem],
        manifestRoutes: [canonicalPathname, '/notes/other/'],
        message: /expected search catalog has duplicate canonicalPathname/,
      },
    ];

    for (const testCase of cases) {
      const repoRoot = await createFixtureRepo({
        catalog: testCase.catalog,
        manifest: { ...createRouteManifest(), routes: testCase.manifestRoutes },
      });
      try {
        await withProductionSiteEnv({ siteOrigin }, async () => {
          await expect(
            assertProductionSearchArtifacts({
              repoRoot,
              expectedItemsForTestOnly: testCase.expected,
            }),
          ).rejects.toThrow(testCase.message);
        });
      } finally {
        await rm(repoRoot, { recursive: true, force: true });
      }
    }
  });

  it('tags / keywords の順序を含む payload mismatch を失敗させること', async () => {
    const cases: readonly { readonly catalog: readonly SearchCatalogItem[]; readonly message: RegExp }[] = [
      {
        catalog: [{ ...expectedItem, tags: ['production', 'search'] }],
        message: /tags mismatch/,
      },
      {
        catalog: [
          {
            ...expectedItem,
            keywords: ['Search Artifact', 'search-artifact', 'artifact contract'],
          },
        ],
        message: /keywords mismatch/,
      },
    ];

    for (const testCase of cases) {
      const repoRoot = await createFixtureRepo({ catalog: testCase.catalog });
      try {
        await withProductionSiteEnv({ siteOrigin }, async () => {
          await expect(
            assertProductionSearchArtifacts({ repoRoot, expectedItemsForTestOnly: expectedItems }),
          ).rejects.toThrow(testCase.message);
        });
      } finally {
        await rm(repoRoot, { recursive: true, force: true });
      }
    }
  });

  it('route manifest の欠落、不正 JSON、parse failure、siteUrlContext mismatch を失敗させること', async () => {
    const cases: readonly {
      readonly prepare: (repoRoot: string) => Promise<void>;
      readonly message: RegExp;
    }[] = [
      {
        prepare: async (repoRoot) => {
          await unlink(path.join(repoRoot, 'dist', 'assets', 'internal-document-routes.json'));
        },
        message: /route manifest is missing/,
      },
      {
        prepare: async (repoRoot) => {
          await writeFile(
            path.join(repoRoot, 'dist', 'assets', 'internal-document-routes.json'),
            '{',
            'utf8',
          );
        },
        message: /route manifest JSON is invalid/,
      },
      {
        prepare: async (repoRoot) => {
          await writeJson(path.join(repoRoot, 'dist', 'assets', 'internal-document-routes.json'), {
            ...createRouteManifest(),
            routes: ['relative'],
          });
        },
        message: /Internal document route manifest build metadata is invalid/,
      },
      {
        prepare: async (repoRoot) => {
          await writeJson(
            path.join(repoRoot, 'dist', 'assets', 'internal-document-routes.json'),
            createRouteManifest('/docs'),
          );
        },
        message: /route manifest site URL context mismatch/,
      },
    ];

    for (const testCase of cases) {
      const repoRoot = await createFixtureRepo();
      try {
        await testCase.prepare(repoRoot);
        await withProductionSiteEnv({ siteOrigin }, async () => {
          await expect(
            assertProductionSearchArtifacts({ repoRoot, expectedItemsForTestOnly: expectedItems }),
          ).rejects.toThrow(testCase.message);
        });
      } finally {
        await rm(repoRoot, { recursive: true, force: true });
      }
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

  it('Pagefind artifact の欠落と空ファイルを失敗させること', async () => {
    const cases: readonly {
      readonly prepare: (repoRoot: string) => Promise<void>;
      readonly message: RegExp;
    }[] = [
      {
        prepare: async (repoRoot) => {
          await unlink(path.join(repoRoot, 'dist', 'pagefind', 'pagefind.js'));
        },
        message: /Pagefind module is missing/,
      },
      {
        prepare: async (repoRoot) => {
          await writeFile(path.join(repoRoot, 'dist', 'pagefind', 'pagefind.js'), '', 'utf8');
        },
        message: /Pagefind module is empty/,
      },
      {
        prepare: async (repoRoot) => {
          await unlink(path.join(repoRoot, 'dist', 'pagefind', 'pagefind-entry.json'));
        },
        message: /Pagefind entry is missing/,
      },
      {
        prepare: async (repoRoot) => {
          await writeFile(path.join(repoRoot, 'dist', 'pagefind', 'pagefind-entry.json'), '', 'utf8');
        },
        message: /Pagefind entry is empty/,
      },
    ];

    for (const testCase of cases) {
      const repoRoot = await createFixtureRepo();
      try {
        await testCase.prepare(repoRoot);
        await withProductionSiteEnv({ siteOrigin }, async () => {
          await expect(
            assertProductionSearchArtifacts({ repoRoot, expectedItemsForTestOnly: expectedItems }),
          ).rejects.toThrow(testCase.message);
        });
      } finally {
        await rm(repoRoot, { recursive: true, force: true });
      }
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
    const originalBasePath = process.env['ROUAULT_BASE_PATH'];
    await withProductionSiteEnv({ siteOrigin, basePath: '/inside' }, async () => {
      expect(process.env['ROUAULT_SITE_ORIGIN']).to.equal(siteOrigin);
      expect(process.env['ROUAULT_BASE_PATH']).to.equal('/inside');
    });
    expect(process.env['ROUAULT_SITE_ORIGIN']).to.equal(originalSiteOrigin);
    expect(process.env['ROUAULT_BASE_PATH']).to.equal(originalBasePath);
  });
});
