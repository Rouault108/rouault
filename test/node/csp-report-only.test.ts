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
  cssResourceUrls,
  documentPolicy,
  inventoryCspDocument,
  matchesCspPath,
  renderCspHeaders,
  readVerifiedCspStageOne,
  verifyCspStageOne,
  workerPolicy,
} from '../../build/security/csp-report-only.js';
import { createCspReportOnlyMiddleware } from '../../build/preview/csp-report-only.js';

const bodies = [buildThemeDocumentBootstrapScript(), buildThemeChromeBootstrapScript()].map(
  escapeInlineExecutableScriptText,
);
const html = (content = '', base = '') => `<html><head>
  <meta name="rouault-site-origin" content="https://rouault.invalid">
  <meta name="rouault-base-path" content="${base}">
  <script>${bodies[0]}</script></head><body><script>${bodies[1]}</script>${content}</body></html>`;

describe('isolated CSP Stage 1', () => {
  it('resolves effective base URLs and CSS fonts/imports without expanding policy automatically', () => {
    const inventory = inventoryCspDocument(
      html('<base href="https://media.invalid/nested/"><img src="image.png">'),
      'index.html',
      'https://rouault.invalid/',
    );
    expect(inventory.resources[0]?.url).toBe('https://media.invalid/nested/image.png');
    expect(
      cssResourceUrls(
        '@import "https://css.invalid/a.css"; @font-face { src: url(../fonts/a.woff2) }',
        'https://rouault.invalid/css/main.css',
      ),
    ).toEqual(['https://rouault.invalid/fonts/a.woff2', 'https://css.invalid/a.css']);
  });
  it('hashes the emitted executable text, excluding inert JSON and template payloads', () => {
    const inventory = inventoryCspDocument(
      html(`<template data-preview-kind="html"><script>demo()</script></template>
      <script type="application/json">{"example":1}</script><span style="color:red" onclick="demo()"></span>
      <link rel="stylesheet" href="/style.css"><img src="https://media.invalid/a.png">`),
      'index.html',
      'https://rouault.invalid/',
    );
    expect(inventory.inlineScriptHashes).toEqual(
      bodies.map((body) => `'sha256-${createHash('sha256').update(body).digest('base64')}'`),
    );
    expect(inventory.styleAttributes).toBe(1);
    expect(inventory.eventHandlers).toBe(1);
    expect(inventory.previewPayloads).toBe(1);
    expect(inventory.resources.map(({ origin }) => origin)).toEqual([
      'https://rouault.invalid',
      'https://media.invalid',
    ]);
    expect(
      inventoryCspDocument(html().replaceAll('\n', '\r\n'), 'crlf.html', 'https://rouault.invalid/')
        .inlineScriptHashes,
    ).toEqual(inventory.inlineScriptHashes);
  });

  it('rejects a modified bootstrap, extra executable script and missing bootstrap before generating permission', () => {
    for (const source of [
      html().replace('const root', 'let root'),
      html('<script>extra()</script>'),
      html().replace(`<script>${bodies[0]}</script>`, ''),
    ]) {
      expect(() =>
        inventoryCspDocument(source, 'tampered.html', 'https://rouault.invalid/'),
      ).toThrow('two emitted theme');
    }
  });

  it('keeps WASM/blob permissions exclusively in the Worker and style attributes separate from scripts', () => {
    const parent = documentPolicy(["'sha256-example='"], 'https://media.invalid');
    expect(parent).not.toContain('wasm-unsafe-eval');
    expect(parent).not.toContain('blob:');
    expect(parent).not.toContain("script-src 'unsafe-inline'");
    expect(parent).not.toContain("'unsafe-eval'");
    expect(parent).not.toContain('nonce-');
    expect(parent).toContain("style-src-attr 'unsafe-inline'");
    expect(parent).toContain("img-src 'self' https://media.invalid");
    expect(workerPolicy).toContain("script-src 'self' 'wasm-unsafe-eval'");
    expect(workerPolicy).toContain("connect-src 'self' blob:");
    expect(parent + workerPolicy).not.toMatch(/report-uri|report-to/u);
  });

  it('freezes output and separates prefixed document rules from the exact hashed Worker', async () => {
    const dist = await mkdtemp(path.join(tmpdir(), 'rouault-csp-'));
    try {
      await mkdir(path.join(dist, 'notes'), { recursive: true });
      await mkdir(path.join(dist, 'client-assets'), { recursive: true });
      await writeFile(path.join(dist, 'index.html'), html('', '/nested'));
      await writeFile(path.join(dist, 'notes/index.html'), html('', '/nested'));
      await writeFile(path.join(dist, 'client-assets/worker-build.js'), 'export {};');
      const manifest = await collectCspStageOne(dist);
      const manifestFile = path.join(dist, 'manifest.json');
      await writeFile(manifestFile, JSON.stringify(manifest));
      await expect(readVerifiedCspStageOne(dist, manifestFile)).resolves.toEqual(manifest);
      expect(
        manifest.rules.filter(({ pattern }) => matchesCspPath(pattern, '/nested/notes/')),
      ).toHaveLength(1);
      const workers = manifest.rules.filter(({ pattern }) =>
        matchesCspPath(pattern, '/nested/client-assets/worker-build.js'),
      );
      expect(workers).toHaveLength(1);
      expect(workers[0]?.context).toBe('worker');
      expect(renderCspHeaders(manifest)).not.toMatch(/\n\s+Content-Security-Policy:/u);
      await verifyCspStageOne(dist, manifest);
      await writeFile(
        path.join(dist, 'notes/index.html'),
        html('<img src="/changed.png">', '/nested'),
      );
      await expect(verifyCspStageOne(dist, manifest)).rejects.toThrow('frozen inventory');
      await expect(readVerifiedCspStageOne(dist, manifestFile)).rejects.toThrow('stale inventory');
      await writeFile(
        path.join(dist, 'notes/index.html'),
        html().replace('const root', 'let root'),
      );
      await expect(verifyCspStageOne(dist, manifest)).rejects.toThrow();
      expect(() =>
        renderCspHeaders({
          ...manifest,
          rules: Array.from({ length: 101 }, () => ({
            pattern: '/',
            policy: workerPolicy,
            context: 'worker' as const,
          })),
        }),
      ).toThrow('100 rule');
      expect(() =>
        renderCspHeaders({
          ...manifest,
          rules: [{ pattern: '/', context: 'document', policy: 'a'.repeat(2000) }],
        }),
      ).toThrow('2000 character');
    } finally {
      await rm(dist, { recursive: true, force: true });
    }
  });

  it('sends actual HTTP Report-Only headers on GET/HEAD, with Pages-style duplicate composition', async () => {
    const middleware = createCspReportOnlyMiddleware({
      schema: 1,
      siteOrigin: 'https://rouault.invalid',
      mediaOrigin: null,
      documents: [],
      stylesheetResources: [],
      rules: [
        { pattern: '/notes/*', policy: "script-src 'self'", context: 'document' },
        { pattern: '/notes/example', policy: "object-src 'none'", context: 'document' },
      ],
    });
    const server = createServer((req, res) => middleware(req, res, () => res.end('ok')));
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    try {
      const address = server.address();
      if (!address || typeof address === 'string') throw new Error('Missing HTTP address');
      for (const method of ['GET', 'HEAD', 'POST']) {
        const response = await fetch(`http://127.0.0.1:${address.port}/notes/example?x=1`, {
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
