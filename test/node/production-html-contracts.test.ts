import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { FINAL_SOURCE_MARKER_ATTRIBUTES } from '../../build/content/final-source-marker-contract.js';
import { assertProductionHtmlContracts } from '../../scripts/assert-production-html-contracts.js';

const createRepoFixture = async (): Promise<string> =>
  mkdtemp(path.join(tmpdir(), 'rouault-production-html-contracts-'));

const writeDistFile = async (repoRoot: string, relativePath: string, content: string): Promise<void> => {
  const filePath = path.join(repoRoot, 'dist', ...relativePath.split('/'));
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content, 'utf8');
};

const withRepoFixture = async (run: (repoRoot: string) => Promise<void>): Promise<void> => {
  const repoRoot = await createRepoFixture();
  try {
    await run(repoRoot);
  } finally {
    await rm(repoRoot, { recursive: true, force: true });
  }
};

describe('production HTML artifact contracts', () => {
  it('V-CI-HTML-CONTRACT-001: fixture dist HTML with data-table-source fails', async () => {
    await withRepoFixture(async (repoRoot) => {
      await writeDistFile(repoRoot, 'index.html', '<main data-table-source="true"></main>');

      await expect(assertProductionHtmlContracts({ repoRoot })).rejects.toThrow(
        'dist/index.html contains final source marker attribute data-table-source on <main>',
      );
    });
  });

  it('V-CI-HTML-CONTRACT-002: fixture dist HTML with data-table-column-widths fails', async () => {
    await withRepoFixture(async (repoRoot) => {
      await writeDistFile(repoRoot, 'index.html', '<div data-table-column-widths="fit wide"></div>');

      await expect(assertProductionHtmlContracts({ repoRoot })).rejects.toThrow(
        'dist/index.html contains final source marker attribute data-table-column-widths on <div>',
      );
    });
  });

  it('V-CI-HTML-CONTRACT-003: fixture dist HTML with another source marker fails', async () => {
    await withRepoFixture(async (repoRoot) => {
      await writeDistFile(repoRoot, 'notes/code/index.html', '<section data-code-group-source="true"></section>');

      await expect(assertProductionHtmlContracts({ repoRoot })).rejects.toThrow(
        'dist/notes/code/index.html contains final source marker attribute data-code-group-source on <section>',
      );
    });
  });

  it('V-CI-HTML-CONTRACT-004: one marked file among multiple files reports file path and attribute', async () => {
    await withRepoFixture(async (repoRoot) => {
      await writeDistFile(repoRoot, 'index.html', '<main><p>ok</p></main>');
      await writeDistFile(repoRoot, 'notes/leak/index.html', '<article data-score-src="score.ly"></article>');

      await expect(assertProductionHtmlContracts({ repoRoot })).rejects.toThrow(
        /dist\/notes\/leak\/index\.html contains final source marker attribute data-score-src on <article>/u,
      );
    });
  });

  it('V-CI-HTML-CONTRACT-005: normal HTML without source markers passes', async () => {
    await withRepoFixture(async (repoRoot) => {
      await writeDistFile(repoRoot, 'index.html', '<main><h1>Rouault</h1><p>静かな本文</p></main>');

      await expect(assertProductionHtmlContracts({ repoRoot })).resolves.toMatchObject({
        htmlFiles: ['dist/index.html'],
      });
    });
  });

  it('V-CI-HTML-CONTRACT-006: missing dist/ fails', async () => {
    await withRepoFixture(async (repoRoot) => {
      await expect(assertProductionHtmlContracts({ repoRoot })).rejects.toThrow(
        '[production-html-contracts] dist/ does not exist.',
      );
    });
  });

  it('V-CI-HTML-CONTRACT-007: dist/ with zero HTML files fails', async () => {
    await withRepoFixture(async (repoRoot) => {
      await mkdir(path.join(repoRoot, 'dist'), { recursive: true });
      await writeDistFile(repoRoot, 'assets/app.js', 'console.log("not html");');

      await expect(assertProductionHtmlContracts({ repoRoot })).rejects.toThrow(
        '[production-html-contracts] found no generated HTML files in dist/.',
      );
    });
  });

  it('V-CI-HTML-CONTRACT-008: supports repoRoot injection with temporary fixture directories', async () => {
    await withRepoFixture(async (repoRoot) => {
      await writeDistFile(repoRoot, 'nested/page.html', '<article><p>ok</p></article>');

      const result = await assertProductionHtmlContracts({ repoRoot });

      expect(result.htmlFiles).toEqual(['dist/nested/page.html']);
    });
  });

  it('V-CI-HTML-CONTRACT-009: returns checkedMarkerAttributes with shared values and order', async () => {
    await withRepoFixture(async (repoRoot) => {
      await writeDistFile(repoRoot, 'index.html', '<main></main>');

      const result = await assertProductionHtmlContracts({ repoRoot });

      expect(result.checkedMarkerAttributes).toEqual([...FINAL_SOURCE_MARKER_ATTRIBUTES]);
    });
  });

  it('V-CI-HTML-CONTRACT-010: marker names in text, code, or comments are not rejected', async () => {
    await withRepoFixture(async (repoRoot) => {
      await writeDistFile(
        repoRoot,
        'index.html',
        [
          '<main>',
          '<p>data-table-source is a marker name.</p>',
          '<pre><code>&lt;div data-table-column-widths="fit"&gt;&lt;/div&gt;</code></pre>',
          '<!-- data-code-group-source -->',
          '</main>',
        ].join(''),
      );

      await expect(assertProductionHtmlContracts({ repoRoot })).resolves.toMatchObject({
        htmlFiles: ['dist/index.html'],
      });
    });
  });
});
