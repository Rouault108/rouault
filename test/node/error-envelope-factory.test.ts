import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { NOT_FOUND_PAGE_TITLE } from '../../src/components/not-found/not-found-page.js';
import { ErrorEnvelopeFactory } from '../../src/router/error-envelope-factory.js';
import { collectImportEdges } from '../../scripts/import-boundary-graph.js';

const factory = (): ErrorEnvelopeFactory =>
  new ErrorEnvelopeFactory({
    siteOrigin: 'https://rouault.invalid',
    basePath: '/base',
  });

describe('ErrorEnvelopeFactory', () => {
  it('404 error envelope では document.title のみ文書タイトル化し announcedTitle は短いタイトルを維持すること', () => {
    const result = factory().createHttpErrorResult(404, '/missing/');

    expect(result.envelope.document.title).toBe(`${NOT_FOUND_PAGE_TITLE} - Rouault`);
    expect(result.envelope.document.announcedTitle).toBe(NOT_FOUND_PAGE_TITLE);
  });

  it('404 error envelope は static not-found fallback HTML を返すこと', () => {
    const result = factory().createHttpErrorResult(404, '/missing/?x=<script>');

    expect(result.envelope.document.html).toContain('data-not-found-page');
    expect(result.envelope.document.html).toContain('data-requested-path=');
    expect(result.envelope.document.html).toContain('&lt;script&gt;');
    expect(result.envelope.document.html).not.toContain('<script>');
    expect(result.envelope.document.html).not.toContain('<not-found-page');
    expect(result.envelope.document.html).not.toContain('</not-found-page>');
    expect(result.envelope.document.html).not.toContain(' requested-path=');
    expect(result.envelope.document.renderedKind).toBe('not-found');
    expect(result.envelope.shell.headerHtml).toContain('header');
    expect(result.envelope.shell.headerHtml).toContain('/base/search/');
    expect(result.envelope.hydrationPlan).toBeNull();
  });

  it('汎用 HTTP error envelope でも document.title と announcedTitle の責務を分離すること', () => {
    const result = factory().createHttpErrorResult(500, '/broken/');

    expect(result.envelope.document.title).toBe('500 - サーバーエラー - Rouault');
    expect(result.envelope.document.announcedTitle).toBe('500 - サーバーエラー');
  });

  it('通常 exception result でも document.title と announcedTitle の責務を分離すること', () => {
    const result = factory().createExceptionResult(new Error('boom'));

    expect(result.envelope.document.title).toBe('エラー - Rouault');
    expect(result.envelope.document.announcedTitle).toBe('エラー');
  });

  it('network exception result でも document.title と announcedTitle の責務を分離すること', () => {
    const result = factory().createExceptionResult(new TypeError('fetch failed'));

    expect(result.envelope.document.title).toBe('ネットワークエラー - Rouault');
    expect(result.envelope.document.announcedTitle).toBe('ネットワークエラー');
  });

  it('timeout exception result でも document.title と announcedTitle の責務を分離すること', () => {
    const error = new Error('timeout');
    error.name = 'TimeoutError';

    const result = factory().createExceptionResult(error);

    expect(result.envelope.document.title).toBe('タイムアウト - Rouault');
    expect(result.envelope.document.announcedTitle).toBe('タイムアウト');
  });

  it('browser bundle unsafe な依存へ到達しないこと', () => {
    const sourceRoots = ['src', 'shared'];
    const edges = collectImportEdges(sourceRoots);
    const bySource = new Map<string, typeof edges>();
    for (const edge of edges) {
      const existing = bySource.get(edge.from) ?? [];
      bySource.set(edge.from, [...existing, edge]);
    }

    const normalizeModulePath = (path: string): string => {
      if (existsSync(path)) return path;
      if (path.endsWith('.js')) {
        const tsPath = path.slice(0, -'.js'.length) + '.ts';
        if (existsSync(tsPath)) return tsPath;
      }
      return path;
    };

    const unsafeSpecifiers = new Set([
      'node:fs',
      'node:fs/promises',
      'node:path',
      'node:process',
      'fs',
      'path',
      'process',
    ]);
    const unsafePrefixes = ['build/', 'src/data/'];
    const reachable = new Set<string>();
    const pending = ['src/router/error-envelope-factory.ts'];
    const violations: string[] = [];

    while (pending.length > 0) {
      const current = pending.pop();
      if (current === undefined || reachable.has(current)) continue;
      reachable.add(current);

      for (const edge of bySource.get(current) ?? []) {
        const target = normalizeModulePath(edge.to);
        if (unsafeSpecifiers.has(edge.specifier)) {
          violations.push(`${edge.from} -> ${edge.specifier}`);
        }
        if (unsafePrefixes.some((prefix) => target.startsWith(prefix))) {
          violations.push(`${edge.from} -> ${edge.specifier}`);
        }
        if (sourceRoots.some((root) => target.startsWith(`${root}/`))) {
          pending.push(target);
        }
      }
    }

    expect(violations).toEqual([]);
  });
});
