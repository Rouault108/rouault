import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import {
  collectCspStageOne,
  renderCspHeaders,
  resolveCspReportOnly,
} from '../../build/security/csp-report-only.js';
import {
  assemblePreviewHeaders,
  parsePreviewHeaders,
} from '../../build/security/csp-preview-headers.js';
import {
  assertCredentialFreePreview,
  assertPreviewPaths,
  createPreviewBuildEnvironment,
  assertPreviewFileSet,
  copyPreviewBaseline,
  PREVIEW_TARGET,
  previewReceipt,
  previewBuildStamp,
  scanPreviewFiles,
  validatePreviewIdentity,
  verifyPreviewCopy,
  verifyPreviewBuildStamp,
} from '../../build/security/csp-preview-artifact.js';
import {
  assertPreviewPublication,
  previewPublicationFiles,
  validatePreviewRedirects,
} from '../../build/security/csp-preview-source.js';
import { buildThemeDocumentBootstrapScript } from '../../src/theme/theme-document-bootstrap.js';
import { buildThemeChromeBootstrapScript } from '../../src/theme/theme-chrome-bootstrap.js';
import { escapeInlineExecutableScriptText } from '../../src/layouts/html-output.js';

const sha = '12345678'.repeat(5);
const cache = '/client-assets/*\n  Cache-Control: public, max-age=31536000, immutable\n';
const fixture = async (
  run: (
    root: string,
    dist: string,
    manifest: Awaited<ReturnType<typeof collectCspStageOne>>,
  ) => Promise<void>,
) => {
  const root = await mkdtemp(path.join(tmpdir(), 'csp-preview-'));
  const dist = path.join(root, 'dist');
  await mkdir(path.join(dist, 'client-assets'), { recursive: true });
  const scripts = [buildThemeDocumentBootstrapScript(), buildThemeChromeBootstrapScript()].map(
    escapeInlineExecutableScriptText,
  );
  await writeFile(
    path.join(dist, 'index.html'),
    `<html><head><meta name="rouault-site-origin" content="${PREVIEW_TARGET.origin}"><meta name="rouault-build-id" content="12345678"><script>${scripts[0]}</script><script type="module" src="/client-assets/app.js"></script></head><body><script>${scripts[1]}</script></body></html>`,
  );
  await writeFile(path.join(dist, '_headers'), cache);
  await writeFile(
    path.join(dist, 'client-assets/app.js'),
    'new Worker(new URL("./worker.js",import.meta.url),{type:"module"});',
  );
  await writeFile(path.join(dist, 'client-assets/worker.js'), 'export {};');
  const viteManifestFile = path.join(root, 'vite.json');
  await writeFile(
    viteManifestFile,
    JSON.stringify({ 'src/client.ts': { file: 'client-assets/app.js', isEntry: true } }),
  );
  try {
    await run(
      root,
      dist,
      await collectCspStageOne(dist, PREVIEW_TARGET.mediaOrigin, { viteManifestFile }),
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
};

describe('unprivileged preview preparation', () => {
  it('preserves the configured package cache while excluding unrelated child environment', () => {
    const env = createPreviewBuildEnvironment(
      { PATH: '/safe', XDG_CACHE_HOME: '/safe/cache', UNRELATED_PRIVATE: 'private-value' },
      sha,
    );
    expect(env['XDG_CACHE_HOME']).toBe('/safe/cache');
    expect(env['UNRELATED_PRIVATE']).toBeUndefined();
    expect(env['ROUAULT_SITE_ORIGIN']).toBe(PREVIEW_TARGET.origin);
    expect(env['GITHUB_SHA']).toBe(sha);
    expect(() =>
      createPreviewBuildEnvironment({ CLOUDFLARE_API_TOKEN: 'private-value' }, sha),
    ).toThrow();
  });
  it.each([['deploy'], ['dry-run', '--branch', 'main'], ['assemble', '../arbitrary']])(
    'refuses one CLI target/command override (%s)',
    (...args) => {
      const result = spawnSync(
        process.execPath,
        ['--import', 'tsx', 'scripts/prepare-csp-preview.ts', ...args],
        { encoding: 'utf8' },
      );
      expect(result.status).toBe(1);
      expect(result.stdout).toBe('');
      expect(result.stderr).toContain('without other arguments');
    },
  );
  it('refuses credentials without echoing secrets or a stack', () => {
    const result = spawnSync(
      process.execPath,
      ['--import', 'tsx', 'scripts/prepare-csp-preview.ts', 'dry-run'],
      {
        env: { ...process.env, R2_SECRET_ACCESS_KEY: 'preview-private-sentinel' },
        encoding: 'utf8',
      },
    );
    expect(result.status).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('must not enter preparation');
    expect(result.stderr).not.toContain('preview-private-sentinel');
    expect(result.stderr).not.toContain(process.cwd());
    expect(result.stderr).not.toContain('    at ');
  });
  it('binds full SHA, target and baseline bytes independently of the short buildId', async () =>
    fixture(async (_root, dist) => {
      const files = await scanPreviewFiles(dist),
        stamp = previewBuildStamp(sha, files);
      expect(() => verifyPreviewBuildStamp(sha, files, stamp)).not.toThrow();
      expect(() =>
        verifyPreviewBuildStamp(sha.slice(0, 8) + 'f'.repeat(32), files, stamp),
      ).toThrow();
      expect(() => verifyPreviewBuildStamp(sha, files.slice(1), stamp)).toThrow();
      expect(() =>
        verifyPreviewBuildStamp(sha, files, stamp.replace('csp-verify', 'main')),
      ).toThrow();
      expect(() => verifyPreviewBuildStamp(sha, files, '{}')).toThrow();
    }));

  it('distinguishes physical HTML paths from encoded router storage and rejects private/missing publication rows', async () =>
    fixture(async (_root, _dist, manifest) => {
      expect(previewPublicationFiles(['/tags/C%23/'])).toEqual({
        html: ['404.html', 'tags/C#/index.html'],
        envelopes: ['__router/tags/C%23/index.router.json'],
      });
      const document = manifest.documents[0];
      if (!document) throw new Error('fixture missing document');
      const complete = {
        ...manifest,
        documents: [document, { ...document, file: '404.html' }],
        envelopes: [{ ...document, file: '__router/index.router.json' }],
      };
      expect(() => assertPreviewPublication(complete, ['/'])).not.toThrow();
      expect(() =>
        assertPreviewPublication(
          {
            ...complete,
            documents: [...complete.documents, { ...document, file: 'private/index.html' }],
          },
          ['/'],
        ),
      ).toThrow('private');
      expect(() => assertPreviewPublication({ ...complete, envelopes: [] }, ['/'])).toThrow(
        'missing',
      );
      expect(() => assertPreviewPublication(complete, ['/', '/private/'])).toThrow();
    }));
  it('assembles only header changes, freezes a CSP-free rollback and detects later changes', async () =>
    fixture(async (root, dist, manifest) => {
      validatePreviewIdentity(PREVIEW_TARGET, sha, manifest);
      const files = await scanPreviewFiles(dist);
      const fragment = renderCspHeaders(manifest);
      const headers = assemblePreviewHeaders(cache, fragment, manifest);
      const output = path.join(root, 'ro'),
        rollback = path.join(root, 'baseline');
      await copyPreviewBaseline(dist, rollback, files);
      await copyPreviewBaseline(dist, output, files);
      await writeFile(path.join(output, '_headers'), headers);
      const assembled = await verifyPreviewCopy(dist, output, files, headers);
      await verifyPreviewCopy(dist, rollback, files, cache);
      expect(await readFile(path.join(dist, '_headers'), 'utf8')).toBe(cache);
      const receipt = previewReceipt(sha, manifest, files, assembled, fragment);
      expect(receipt.publicationAllowed).toBe(false);
      expect(receipt.target.hostnameStatus).toBe('proposed-unverified');
      expect(receipt.target.accountStatus).toBe('unknown');
      expect(receipt.rollback.baselineDigest).toBe(receipt.baselineDigest);
      expect(receipt.artifactDigest).not.toBe(receipt.baselineDigest);
      expect(receipt.includedFiles.length).toBe(files.length);
      expect(JSON.stringify(receipt)).not.toMatch(/<html>|const root|\?token|\/tmp\//u);
      await writeFile(path.join(output, 'client-assets/worker.js'), 'changed');
      await expect(verifyPreviewCopy(dist, output, files, headers)).rejects.toThrow('bytes differ');
    }));

  it('rejects production, arbitrary branch/origin/account/extra fields and wrong source/build', async () =>
    fixture(async (_root, _dist, manifest) => {
      for (const target of [
        { ...PREVIEW_TARGET, branch: 'main' },
        { ...PREVIEW_TARGET, origin: 'https://rouault.page' },
        { ...PREVIEW_TARGET, origin: 'https://arbitrary.invalid?secret=x' },
        { ...PREVIEW_TARGET, project: 'other' },
        { ...PREVIEW_TARGET, branch: 'other' },
        { ...PREVIEW_TARGET, command: 'deploy' },
        { ...PREVIEW_TARGET, accountStatus: 'ready' },
      ])
        expect(() => validatePreviewIdentity(target, sha, manifest)).toThrow();
      expect(() => validatePreviewIdentity(PREVIEW_TARGET, 'f'.repeat(40), manifest)).toThrow(
        'identity',
      );
      expect(() =>
        validatePreviewIdentity(PREVIEW_TARGET, sha, {
          ...manifest,
          siteOrigin: 'https://rouault.page',
        }),
      ).toThrow('origin');
      expect(() =>
        validatePreviewIdentity(PREVIEW_TARGET, sha, {
          ...manifest,
          mediaOrigin: 'https://other.invalid',
        }),
      ).toThrow('origin');
      expect(() =>
        validatePreviewIdentity(PREVIEW_TARGET, sha, { ...manifest, basePath: '/different' }),
      ).toThrow('origin');
    }));

  it('preserves one parent policy and detaches it before setting the Worker policy', async () =>
    fixture(async (_root, _dist, manifest) => {
      const header = assemblePreviewHeaders(cache, renderCspHeaders(manifest), manifest);
      expect(parsePreviewHeaders(header)).toHaveLength(3);
      const worker = manifest.rules.find((rule) => rule.context === 'worker');
      expect(worker).toBeDefined();
      expect(resolveCspReportOnly(manifest.rules, worker?.pattern ?? '')).toBe(worker?.policy);
      const broken = {
        ...manifest,
        rules: manifest.rules.map((rule) => ({ ...rule, reset: false })),
      };
      expect(() => assemblePreviewHeaders(cache, renderCspHeaders(broken), broken)).toThrow();
      expect(() =>
        assemblePreviewHeaders(
          cache,
          renderCspHeaders(manifest).replace('  ! Content-', '  # Content-'),
          manifest,
        ),
      ).toThrow();
      expect(() =>
        assemblePreviewHeaders(
          cache + "/*\n  Content-Security-Policy: default-src 'self'\n",
          renderCspHeaders(manifest),
          manifest,
        ),
      ).toThrow();
      expect(() =>
        assemblePreviewHeaders(
          cache + "/*\n  Content-Security-Policy-Report-Only: default-src 'self'\n",
          renderCspHeaders(manifest),
          manifest,
        ),
      ).toThrow();
    }));

  it.each([
    '/*\n  Content-Security-Policy-Report-Only: a\n  Content-Security-Policy-Report-Only: b',
    '/*\n  Content-Security-Policy-Report-Only: a\n  ! Content-Security-Policy-Report-Only',
    '/*\n  ! Content-Security-Policy-Report-Only\n  ! Content-Security-Policy-Report-Only',
    '/*\n  Cache-Control: x\n/*\n  Cache-Control: y',
    'https://external.invalid/*\n  Cache-Control: x',
    '/*\n  Reporting-Endpoints: x',
    '/*\n  Cache-Control: ' + 'x'.repeat(2000),
    Array.from({ length: 101 }, (_, i) => `/path${String(i)}\n  Cache-Control: x`).join('\n'),
  ])('rejects header conflicts and unsupported operations', (source) => {
    expect(() => parsePreviewHeaders(source)).toThrow();
  });

  it('rejects extra/missing/diagnostic/private/Functions/Worker deployment files', async () =>
    fixture(async (root, dist, manifest) => {
      const files = await scanPreviewFiles(dist),
        allowed = new Set(files.map(({ file }) => file));
      assertPreviewFileSet(files, allowed);
      for (const file of [
        'private/index.html',
        'report.json',
        'search/diagnostic.json',
        '_worker.js',
        '_routes.json',
        'functions/index.js',
        'wrangler.jsonc',
        'dist.zip',
      ]) {
        expect(() =>
          assertPreviewFileSet([...files, { file, bytes: 0, sha256: '0'.repeat(64) }], allowed),
        ).toThrow();
      }
      expect(() => assertPreviewFileSet(files.slice(1), allowed)).toThrow();
      const duplicate = files.at(1);
      if (!duplicate) throw new Error('fixture missing file');
      expect(() => assertPreviewFileSet([...files.slice(1), duplicate], allowed)).toThrow();
      const output = path.join(root, 'output');
      await copyPreviewBaseline(dist, output, files);
      await writeFile(path.join(dist, 'client-assets/worker.js'), 'baseline changed');
      await expect(
        verifyPreviewCopy(
          dist,
          output,
          files,
          assemblePreviewHeaders(cache, renderCspHeaders(manifest), manifest),
        ),
      ).rejects.toThrow('baseline changed');
      await expect(copyPreviewBaseline(dist, output, files)).rejects.toThrow();
    }));

  it('rejects symlinks rather than copying outside files', async () =>
    fixture(async (_root, dist) => {
      await symlink(path.join(dist, 'index.html'), path.join(dist, 'linked.html'));
      await expect(scanPreviewFiles(dist)).rejects.toThrow('symlink');
    }));

  it('rejects a build receipt symlink before reading or overwriting it', async () =>
    fixture(async (root, dist) => {
      await mkdir(path.join(root, '.generated'));
      await symlink(
        path.join(dist, 'index.html'),
        path.join(root, '.generated/csp-preview-build.json'),
      );
      await expect(assertPreviewPaths(root)).rejects.toThrow('indirection');
    }));

  it('rejects deployment credentials without including values in errors', () => {
    for (const name of [
      'CLOUDFLARE_API_TOKEN',
      'CLOUDFLARE_ACCOUNT_ID',
      'R2_ACCESS_KEY_ID',
      'R2_SECRET_ACCESS_KEY',
      'AWS_PROFILE',
      'CF_PAGES_PROJECT',
    ]) {
      expect(() => assertCredentialFreePreview({ [name]: 'private-value' })).toThrow(
        'must not enter',
      );
    }
    expect(() => assertCredentialFreePreview({ PATH: '/fixture', GITHUB_SHA: sha })).not.toThrow();
  });

  it('accepts only the existing finite static rewrites', () => {
    const supported = [
      '/notes/* /notes/:splat/ 200',
      '/memos/* /memos/:splat/ 200',
      '/about /about/ 200',
      '/corpora /corpora/ 200',
      '/corpora/* /corpora/:splat/ 200',
      '/search /search/ 200',
      '/tags/* /tags/:splat/ 200',
    ].join('\n');
    expect(() => validatePreviewRedirects(supported)).not.toThrow();
    for (const other of [
      supported + '\n/* https://external.invalid 302',
      supported.replace('200', '301'),
      supported.replace('/:splat/', '/function'),
      '',
    ])
      expect(() => validatePreviewRedirects(other)).toThrow();
  });
});
