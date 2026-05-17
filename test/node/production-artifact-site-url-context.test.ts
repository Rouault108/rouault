import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { assertProductionSiteUrlContext } from '../../scripts/assert-production-site-url-context.js';
import { INTERNAL_DOCUMENT_ROUTE_MANIFEST_VERSION } from '../../shared/navigation/internal-document-route-manifest-path.js';

const SITE_ORIGIN = 'https://rouault.page';
const BASE_PATH = '/rouault';
const BUILD_ID = 'build-current';
const MANIFEST_PATH = 'dist/assets/internal-document-routes.json';

let tmpRoot: string;
let previousSiteOrigin: string | undefined;
let previousBasePath: string | undefined;

const restoreEnv = (): void => {
  if (previousSiteOrigin === undefined) {
    delete process.env['ROUAULT_SITE_ORIGIN'];
  } else {
    process.env['ROUAULT_SITE_ORIGIN'] = previousSiteOrigin;
  }

  if (previousBasePath === undefined) {
    delete process.env['ROUAULT_BASE_PATH'];
  } else {
    process.env['ROUAULT_BASE_PATH'] = previousBasePath;
  }
};

const createManifest = (
  overrides: Partial<{
    siteOrigin: string;
    basePath: string;
    buildId: string;
  }> = {},
): string =>
  `${JSON.stringify(
    {
      version: INTERNAL_DOCUMENT_ROUTE_MANIFEST_VERSION,
      buildId: overrides.buildId ?? BUILD_ID,
      buildLabel: 'build test',
      generatedAt: '2026-05-17T00:00:00.000Z',
      siteOrigin: overrides.siteOrigin ?? SITE_ORIGIN,
      basePath: overrides.basePath ?? BASE_PATH,
      routes: ['/'],
    },
    null,
    2,
  )}\n`;

const createHtml = (
  overrides: Partial<{
    siteOrigin: string | null;
    basePath: string | null;
    manifestUrl: string | null;
    buildId: string | null;
  }> = {},
): string => {
  const siteOrigin = Object.hasOwn(overrides, 'siteOrigin') ? overrides.siteOrigin : SITE_ORIGIN;
  const basePath = Object.hasOwn(overrides, 'basePath') ? overrides.basePath : BASE_PATH;
  const manifestUrl = Object.hasOwn(overrides, 'manifestUrl')
    ? overrides.manifestUrl
    : '/rouault/assets/internal-document-routes.json?buildId=build-current';
  const buildId = Object.hasOwn(overrides, 'buildId') ? overrides.buildId : BUILD_ID;

  return [
    '<!doctype html>',
    '<html lang="ja">',
    '<head>',
    siteOrigin === null ? '' : `<meta name="rouault-site-origin" content="${siteOrigin}">`,
    basePath === null ? '' : `<meta name="rouault-base-path" content="${basePath}">`,
    manifestUrl === null ? '' : `<meta name="rouault-route-manifest" content="${manifestUrl}">`,
    buildId === null ? '' : `<meta name="rouault-route-manifest-build-id" content="${buildId}">`,
    '</head>',
    '<body></body>',
    '</html>',
  ].join('\n');
};

const writeFixture = async (
  options: {
    readonly html?: string;
    readonly manifest?: string | null;
  } = {},
): Promise<void> => {
  await mkdir(path.join(tmpRoot, 'dist'), { recursive: true });
  await writeFile(path.join(tmpRoot, 'dist/index.html'), options.html ?? createHtml(), 'utf8');

  if (options.manifest !== null) {
    await mkdir(path.join(tmpRoot, 'dist/assets'), { recursive: true });
    await writeFile(
      path.join(tmpRoot, MANIFEST_PATH),
      options.manifest ?? createManifest(),
      'utf8',
    );
  }
};

describe('production artifact site URL context assertion', () => {
  beforeEach(async () => {
    tmpRoot = await mkdtemp(path.join(os.tmpdir(), 'rouault-production-artifact-'));
    previousSiteOrigin = process.env['ROUAULT_SITE_ORIGIN'];
    previousBasePath = process.env['ROUAULT_BASE_PATH'];
    process.env['ROUAULT_SITE_ORIGIN'] = SITE_ORIGIN;
    process.env['ROUAULT_BASE_PATH'] = BASE_PATH;
  });

  afterEach(async () => {
    restoreEnv();
    await rm(tmpRoot, { recursive: true, force: true });
  });

  it('正しい HTML meta と route manifest JSON で成功すること', async () => {
    await writeFixture();

    await expect(assertProductionSiteUrlContext(tmpRoot)).resolves.to.deep.equal({
      htmlFiles: ['dist/index.html'],
      manifestFiles: [MANIFEST_PATH],
    });
  });

  it('HTML の rouault-site-origin 不一致で失敗すること', async () => {
    await writeFixture({ html: createHtml({ siteOrigin: 'https://example.com' }) });

    await expect(assertProductionSiteUrlContext(tmpRoot)).rejects.toThrow(
      /rouault-site-origin mismatch/u,
    );
  });

  it('HTML の rouault-base-path 不一致で失敗すること', async () => {
    await writeFixture({ html: createHtml({ basePath: '' }) });

    await expect(assertProductionSiteUrlContext(tmpRoot)).rejects.toThrow(
      /rouault-base-path mismatch/u,
    );
  });

  it('rouault-route-manifest meta 欠落で失敗すること', async () => {
    await writeFixture({ html: createHtml({ manifestUrl: null }) });

    await expect(assertProductionSiteUrlContext(tmpRoot)).rejects.toThrow(
      /missing meta\[name="rouault-route-manifest"\]/u,
    );
  });

  it('rouault-route-manifest content が expected URL と違う場合に失敗すること', async () => {
    await writeFixture({
      html: createHtml({
        manifestUrl:
          'https://rouault.page/rouault/assets/internal-document-routes.json?buildId=build-current',
      }),
    });

    await expect(assertProductionSiteUrlContext(tmpRoot)).rejects.toThrow(
      /rouault-route-manifest mismatch/u,
    );
  });

  it('rouault-route-manifest の pathname が expected basePath を反映していない場合に失敗すること', async () => {
    await writeFixture({
      html: createHtml({
        manifestUrl: '/assets/internal-document-routes.json?buildId=build-current',
      }),
    });

    await expect(assertProductionSiteUrlContext(tmpRoot)).rejects.toThrow(
      /route manifest pathname mismatch/u,
    );
  });

  it('rouault-route-manifest の buildId query が HTML meta buildId と違う場合に失敗すること', async () => {
    await writeFixture({
      html: createHtml({
        manifestUrl: '/rouault/assets/internal-document-routes.json?buildId=build-stale',
      }),
    });

    await expect(assertProductionSiteUrlContext(tmpRoot)).rejects.toThrow(
      /route manifest buildId query mismatch/u,
    );
  });

  it('rouault-route-manifest が指す JSON 実ファイルが存在しない場合に失敗すること', async () => {
    await writeFixture({ manifest: null });

    await expect(assertProductionSiteUrlContext(tmpRoot)).rejects.toThrow(
      /route manifest JSON does not exist/u,
    );
  });

  it('route manifest JSON の siteOrigin 不一致で失敗すること', async () => {
    await writeFixture({ manifest: createManifest({ siteOrigin: 'https://example.com' }) });

    await expect(assertProductionSiteUrlContext(tmpRoot)).rejects.toThrow(
      /site URL context mismatch/u,
    );
  });

  it('route manifest JSON の basePath 不一致で失敗すること', async () => {
    await writeFixture({ manifest: createManifest({ basePath: '' }) });

    await expect(assertProductionSiteUrlContext(tmpRoot)).rejects.toThrow(
      /site URL context mismatch/u,
    );
  });

  it('route manifest JSON の buildId 不一致で失敗すること', async () => {
    await writeFixture({ manifest: createManifest({ buildId: 'build-stale' }) });

    await expect(assertProductionSiteUrlContext(tmpRoot)).rejects.toThrow(
      /route manifest buildId mismatch/u,
    );
  });

  it('route manifest JSON の siteOrigin が fallback origin の場合に失敗すること', async () => {
    await writeFixture({ manifest: createManifest({ siteOrigin: 'https://rouault.invalid' }) });

    await expect(assertProductionSiteUrlContext(tmpRoot)).rejects.toThrow(
      /site URL context is invalid|site URL context mismatch/u,
    );
  });
});
