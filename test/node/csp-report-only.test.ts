import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createServer } from 'node:http';
import { describe, expect, it } from 'vitest';
import { buildThemeDocumentBootstrapScript } from '../../src/theme/theme-document-bootstrap.js';
import { buildThemeChromeBootstrapScript } from '../../src/theme/theme-chrome-bootstrap.js';
import { escapeInlineExecutableScriptText } from '../../src/layouts/html-output.js';
import {
  collectCspStageOne,
  documentPolicy,
  inventoryCspDocument,
  matchesCspPath,
  resolveCspReportOnly,
  renderCspHeaders,
  readVerifiedCspStageOne,
  verifyCspStageOne,
  workerPolicy,
} from '../../build/security/csp-report-only.js';
import { cssResourceUrls, srcsetUrls } from '../../build/security/csp-resources.js';
import { createDocumentPolicy, serializeCspPolicy } from '../../build/security/csp-policy.js';
import { createCspReportOnlyMiddleware } from '../../build/preview/csp-report-only.js';

const bodies = [buildThemeDocumentBootstrapScript(), buildThemeChromeBootstrapScript()].map(
  escapeInlineExecutableScriptText,
);
const html = (content = '', base = '') =>
  `<html><head><meta name="rouault-site-origin" content="https://rouault.invalid"><meta name="rouault-base-path" content="${base}"><meta name="rouault-build-id" content="fixture"><script>${bodies[0]}</script><script type="module" src="${base}/client-assets/client.js"></script></head><body><script>${bodies[1]}</script>${content}</body></html>`;
const rootUrl = 'https://rouault.invalid/';
const fixture = async (run: (dist: string, manifestFile: string) => Promise<void>) => {
  const dist = await mkdtemp(path.join(tmpdir(), 'rouault-csp-'));
  const manifestFile = path.join(dist, 'vite-manifest.json');
  await mkdir(path.join(dist, 'client-assets'));
  await writeFile(path.join(dist, 'index.html'), html());
  await writeFile(
    path.join(dist, 'client-assets/client.js'),
    'new Worker(new URL("/client-assets/lexical-hash.js",import.meta.url),{type:"module"});',
  );
  await writeFile(path.join(dist, 'client-assets/lexical-hash.js'), 'export {};');
  await writeFile(
    manifestFile,
    JSON.stringify({ 'src/client.ts': { file: 'client-assets/client.js', isEntry: true } }),
  );
  try {
    await run(dist, manifestFile);
  } finally {
    await rm(dist, { recursive: true, force: true });
  }
};

describe('isolated CSP Stage 1', () => {
  it('hashes emitted text without authorizing inert JSON or template scripts', () => {
    const inventory = inventoryCspDocument(
      html(
        '<template data-preview-kind="html">&lt;script&gt;demo()&lt;/script&gt;</template><script type="application/json">{}</script><span style="color:red"></span>',
      ),
      'index.html',
      rootUrl,
    );
    expect(inventory.inlineScriptHashes).toEqual(
      bodies.map((body) => `'sha256-${createHash('sha256').update(body).digest('base64')}'`),
    );
    expect(inventory.previewPayloads).toBe(1);
    expect(inventory.styleAttributes).toBe(1);
    expect(
      inventoryCspDocument(html().replaceAll('\n', '\r\n'), 'crlf.html', rootUrl)
        .inlineScriptHashes,
    ).toEqual(inventory.inlineScriptHashes);
  });

  it('rejects modified/missing/extra executable bootstrap, nonce, event handler, javascript URL and base', () => {
    for (const source of [
      html().replace('const root', 'let root'),
      html('<script>extra()</script>'),
      html().replace(`<script>${bodies[0]}</script>`, ''),
      html('<b nonce="fixed"></b>'),
      html('<b onclick="demo()"></b>'),
      html('<a href="javascript:demo()">x</a>'),
      html('<base href="/changed/">'),
      html('<iframe srcdoc="&lt;script&gt;bad()&lt;/script&gt;"></iframe>'),
      html('<object data="/unexpected.html"></object>'),
    ])
      expect(() => inventoryCspDocument(source, 'bad.html', rootUrl)).toThrow();
  });

  it('classifies stylesheet, template, srcset, font and approved media origins without URL query/body persistence', () => {
    const inventory = inventoryCspDocument(
      html(
        '<link rel="preload" as="font" href="/font.woff2"><img srcset="/a.png 1x, /b.png 2x"><template data-preview-kind="html">&lt;img src="https://media.invalid/c.png"&gt;</template>',
      ),
      'index.html',
      rootUrl,
      { mediaOrigin: 'https://media.invalid' },
    );
    expect(
      inventory.resources.filter(({ kind }) => kind !== 'script').map(({ kind }) => kind),
    ).toEqual(['font', 'image', 'image', 'image']);
    expect(inventory.resources.at(-1)).toMatchObject({
      origin: 'https://media.invalid',
      pathname: '/c.png',
      scope: 'template',
      reason: 'explicit-ROUAULT_MEDIA_BASE_URL',
    });
    expect(
      cssResourceUrls(
        '@IMPORT "https://css.invalid/a.css"; @font-face{src:url(../fonts/a.woff2)}',
        'https://rouault.invalid/css/main.css',
      ),
    ).toEqual(['https://rouault.invalid/fonts/a.woff2', 'https://css.invalid/a.css']);
    expect(srcsetUrls('data:image/png;base64,AAAA 1x, /b.png 2x')).toEqual([
      'data:image/png;base64,AAAA',
      '/b.png',
    ]);
    expect(() =>
      inventoryCspDocument(html('<img src="/a.png?private=value#fragment">'), 'bad.html', rootUrl),
    ).toThrow('query');
  });

  it('rejects unknown origins, external HTTP, arbitrary script/data, SVG data and oversized data image', () => {
    for (const resource of [
      '<img src="https://unapproved.invalid/a.png">',
      '<img src="http://unapproved.invalid/a.png">',
      '<script src="https://media.invalid/a.js"></script>',
      '<img src="data:image/svg+xml;base64,AAAA">',
      `<img src="data:image/png;base64,${'AAAA'.repeat(12000)}">`,
      '<iframe src="/runner/"></iframe>',
    ])
      expect(() =>
        inventoryCspDocument(html(resource), 'bad.html', rootUrl, {
          mediaOrigin: 'https://media.invalid',
        }),
      ).toThrow();
    const approved = inventoryCspDocument(
      html('<img src="data:image/png;base64,AAAA">'),
      'data.html',
      rootUrl,
    );
    expect(approved.resources.find(({ kind }) => kind === 'image')).toMatchObject({
      origin: 'data:',
      pathname: '',
    });
    expect(JSON.stringify(approved.resources)).not.toContain('AAAA');
  });

  it('matches design 1.1 parent/style exceptions and keeps WASM/blob exclusively in Worker', () => {
    const policy = createDocumentPolicy(
      bodies.map((body) => `'sha256-${createHash('sha256').update(body).digest('base64')}'`),
      'https://media.invalid',
    );
    expect(policy['script-src']).not.toContain("'unsafe-inline'");
    expect(policy['script-src']).not.toContain("'unsafe-eval'");
    expect(policy['style-src-elem']).toEqual(["'self'", "'unsafe-inline'"]);
    for (const directive of [
      'base-uri',
      'form-action',
      'frame-ancestors',
      'manifest-src',
      'frame-src',
    ] as const)
      expect(policy[directive]).toEqual(["'none'"]);
    expect(policy['img-src']).toEqual(["'self'", 'data:', 'https://media.invalid']);
    const parent = documentPolicy([], null);
    expect(parent).not.toMatch(/wasm-unsafe-eval|blob:|report-uri|report-to|nonce-/u);
    expect(workerPolicy).toContain("script-src 'self' 'wasm-unsafe-eval'");
    expect(workerPolicy).toContain("connect-src 'self' blob:");
    expect(() => serializeCspPolicy({ 'script-src': [] })).toThrow();
    expect(() => serializeCspPolicy({ 'script-src': ["'none'", "'self'"] })).toThrow();
    expect(() => serializeCspPolicy({ 'script-src': ['{HASH}'] })).toThrow();
  });

  it('freezes build/policy/hash owners, Vite graph, assets and envelope resource inventory', async () =>
    fixture(async (dist, viteManifestFile) => {
      await mkdir(path.join(dist, '__router/notes'), { recursive: true });
      await writeFile(path.join(dist, 'image.png'), 'fixture');
      await writeFile(
        path.join(dist, '__router/notes/index.router.json'),
        JSON.stringify({
          buildId: 'fixture',
          document: { html: '<article><img src="/image.png"></article>' },
          shell: { headerHtml: '<header>fixture</header>' },
        }),
      );
      const options = { viteManifestFile };
      const manifest = await collectCspStageOne(dist, null, options);
      expect(manifest.envelopes).toHaveLength(1);
      expect(manifest.hashOwners.map(({ owner }) => owner)).toEqual([
        'theme-document',
        'theme-chrome',
      ]);
      expect(manifest.policyDigest).toMatch(/^[a-f0-9]{64}$/u);
      expect(manifest.buildId).toBe('fixture');
      expect(manifest.assets.map(({ file }) => file)).toContain('client-assets/lexical-hash.js');
      const frozen = path.join(dist, 'frozen.json');
      await writeFile(frozen, JSON.stringify(manifest));
      await expect(readVerifiedCspStageOne(dist, frozen, options)).resolves.toEqual(manifest);
      await verifyCspStageOne(dist, manifest, options);
      await writeFile(
        path.join(dist, 'client-assets/lexical-hash.js'),
        'export {};\n// changed bytes',
      );
      await expect(verifyCspStageOne(dist, manifest, options)).rejects.toThrow('frozen inventory');
      await expect(readVerifiedCspStageOne(dist, frozen, options)).rejects.toThrow(
        'stale inventory',
      );
    }));

  it('rejects an unowned executable, dynamic Worker, unknown bundle, and executable envelope', async () =>
    fixture(async (dist, viteManifestFile) => {
      const options = { viteManifestFile };
      await writeFile(
        path.join(dist, 'index.html'),
        html('<script src="/unexpected.js"></script>'),
      );
      await writeFile(path.join(dist, 'unexpected.js'), 'export {};');
      await expect(collectCspStageOne(dist, null, options)).rejects.toThrow(
        'unexpected executable',
      );
      await writeFile(path.join(dist, 'index.html'), html());
      await writeFile(path.join(dist, 'client-assets/client.js'), 'new Worker(dynamicUrl);');
      await expect(collectCspStageOne(dist, null, options)).rejects.toThrow('Worker constructor');
      await writeFile(
        path.join(dist, 'client-assets/client.js'),
        'new Worker(new URL("/client-assets/lexical-hash.js",import.meta.url),{type:"module"});',
      );
      await writeFile(path.join(dist, 'client-assets/unknown.js'), 'export {};');
      await expect(collectCspStageOne(dist, null, options)).rejects.toThrow('not accounted');
      expect(() =>
        inventoryCspDocument('<script>bad()</script>', 'fragment', rootUrl, { fragment: true }),
      ).toThrow('no fragment');
    }));

  it('uses prefixed global coverage, Worker reset and Pages limits without enforce headers', async () =>
    fixture(async (dist, viteManifestFile) => {
      await writeFile(path.join(dist, 'index.html'), html('', '/nested'));
      await writeFile(
        path.join(dist, 'client-assets/client.js'),
        'new Worker(new URL("/nested/client-assets/lexical-hash.js",import.meta.url),{type:"module"});',
      );
      const manifest = await collectCspStageOne(dist, null, { viteManifestFile });
      expect(
        manifest.rules
          .filter(({ pattern }) => matchesCspPath(pattern, '/nested/client-assets/lexical-hash.js'))
          .map(({ context }) => context),
      ).toEqual(['document', 'worker']);
      expect(resolveCspReportOnly(manifest.rules, '/nested/client-assets/lexical-hash.js')).toBe(
        workerPolicy,
      );
      expect(resolveCspReportOnly(manifest.rules, '/nested/unknown-path')).toBe(
        manifest.rules[0]?.policy,
      );
      expect(resolveCspReportOnly(manifest.rules, '/unprefixed')).toBeNull();
      expect(renderCspHeaders(manifest)).toContain('  ! Content-Security-Policy-Report-Only\n');
      expect(() => renderCspHeaders({ ...manifest, rules: [...manifest.rules].reverse() })).toThrow(
        'reset order',
      );
      expect(renderCspHeaders(manifest)).not.toMatch(/\n\s+Content-Security-Policy:/u);
      expect(() =>
        renderCspHeaders({
          ...manifest,
          rules: Array.from({ length: 101 }, (_, i) => ({
            pattern: `/route-${String(i)}`,
            policy: workerPolicy,
            context: 'document' as const,
          })),
        }),
      ).toThrow('100 rule');
      expect(() =>
        renderCspHeaders({
          ...manifest,
          rules: [{ pattern: '/', policy: 'a'.repeat(2000), context: 'document' }],
        }),
      ).toThrow('2000 character');
      expect(() =>
        renderCspHeaders({
          ...manifest,
          rules: manifest.rules.map((rule) =>
            rule.context === 'worker' ? { ...rule, reset: false } : rule,
          ),
        }),
      ).toThrow('overlap');
    }));

  it('sends real HTTP RO headers on GET/HEAD with Pages duplicate composition', async () => {
    const middleware = createCspReportOnlyMiddleware({
      rules: [
        { pattern: '/notes/*', policy: "script-src 'self'", context: 'document' },
        { pattern: '/notes/example', policy: "object-src 'none'", context: 'document' },
      ],
    });
    const server = createServer((req, res) => middleware(req, res, () => res.end('ok')));
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    try {
      const address = server.address();
      if (!address || typeof address === 'string') throw new Error('HTTP address');
      for (const method of ['GET', 'HEAD', 'POST']) {
        const response = await fetch(`http://127.0.0.1:${String(address.port)}/notes/example?x=1`, {
          method,
        });
        expect(response.headers.get('content-security-policy-report-only')).toBe(
          method === 'POST' ? null : "script-src 'self', object-src 'none'",
        );
        expect(response.headers.get('content-security-policy')).toBeNull();
        await response.text();
      }
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  });
});
