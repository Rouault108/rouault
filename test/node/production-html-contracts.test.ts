import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { FINAL_SOURCE_MARKER_ATTRIBUTES } from '../../build/content/final-source-marker-contract.js';
import { assertProductionHtmlContracts } from '../../scripts/assert-production-html-contracts.js';

const createRepoFixture = async (): Promise<string> =>
  mkdtemp(path.join(tmpdir(), 'rouault-production-html-contracts-'));

const writeDistFile = async (
  repoRoot: string,
  relativePath: string,
  content: string,
): Promise<void> => {
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

const wrapCanonicalAppShellDocument = (bodyHtml: string): string => `
  <!doctype html>
  <html>
    <body>
      <a href="#main-content">skip</a>
      <div data-app-shell-root class="app-shell-root">
        ${bodyHtml}
      </div>
    </body>
  </html>
`;

describe('production HTML artifact contracts', () => {
  it('V-CI-HTML-CONTRACT-001: fixture dist HTML with data-table-source fails', async () => {
    await withRepoFixture(async (repoRoot) => {
      await writeDistFile(
        repoRoot,
        'index.html',
        wrapCanonicalAppShellDocument('<main data-table-source="true"></main>'),
      );

      await expect(assertProductionHtmlContracts({ repoRoot })).rejects.toThrow(
        'dist/index.html contains final source marker attribute data-table-source on <main>',
      );
    });
  });

  it('V-CI-HTML-CONTRACT-002: fixture dist HTML with data-table-column-widths fails', async () => {
    await withRepoFixture(async (repoRoot) => {
      await writeDistFile(
        repoRoot,
        'index.html',
        wrapCanonicalAppShellDocument('<div data-table-column-widths="fit wide"></div>'),
      );

      await expect(assertProductionHtmlContracts({ repoRoot })).rejects.toThrow(
        'dist/index.html contains final source marker attribute data-table-column-widths on <div>',
      );
    });
  });

  it('V-CI-HTML-CONTRACT-003: fixture dist HTML with another source marker fails', async () => {
    await withRepoFixture(async (repoRoot) => {
      await writeDistFile(
        repoRoot,
        'notes/code/index.html',
        wrapCanonicalAppShellDocument('<section data-code-group-source="true"></section>'),
      );

      await expect(assertProductionHtmlContracts({ repoRoot })).rejects.toThrow(
        'dist/notes/code/index.html contains final source marker attribute data-code-group-source on <section>',
      );
    });
  });

  it('V-CI-HTML-CONTRACT-004: one marked file among multiple files reports file path and attribute', async () => {
    await withRepoFixture(async (repoRoot) => {
      await writeDistFile(
        repoRoot,
        'index.html',
        wrapCanonicalAppShellDocument('<main><p>ok</p></main>'),
      );
      await writeDistFile(
        repoRoot,
        'notes/leak/index.html',
        wrapCanonicalAppShellDocument('<article data-score-src="score.ly"></article>'),
      );

      await expect(assertProductionHtmlContracts({ repoRoot })).rejects.toThrow(
        /dist\/notes\/leak\/index\.html contains final source marker attribute data-score-src on <article>/u,
      );
    });
  });

  it('V-CI-HTML-CONTRACT-005: normal HTML without source markers passes', async () => {
    await withRepoFixture(async (repoRoot) => {
      await writeDistFile(
        repoRoot,
        'index.html',
        wrapCanonicalAppShellDocument('<main><h1>Rouault</h1><p>静かな本文</p></main>'),
      );

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
      await writeDistFile(
        repoRoot,
        'nested/page.html',
        wrapCanonicalAppShellDocument('<article><p>ok</p></article>'),
      );

      const result = await assertProductionHtmlContracts({ repoRoot });

      expect(result.htmlFiles).toEqual(['dist/nested/page.html']);
    });
  });

  it('V-CI-HTML-CONTRACT-009: returns checkedMarkerAttributes with shared values and order', async () => {
    await withRepoFixture(async (repoRoot) => {
      await writeDistFile(repoRoot, 'index.html', wrapCanonicalAppShellDocument('<main></main>'));

      const result = await assertProductionHtmlContracts({ repoRoot });

      expect(result.checkedMarkerAttributes).toEqual([...FINAL_SOURCE_MARKER_ATTRIBUTES]);
    });
  });

  it('V-CI-HTML-CONTRACT-010: marker names in text, code, or comments are not rejected', async () => {
    await withRepoFixture(async (repoRoot) => {
      await writeDistFile(
        repoRoot,
        'index.html',
        wrapCanonicalAppShellDocument(
          [
            '<main>',
            '<p>data-table-source is a marker name.</p>',
            '<pre><code>&lt;div data-table-column-widths="fit"&gt;&lt;/div&gt;</code></pre>',
            '<!-- data-code-group-source -->',
            '</main>',
          ].join(''),
        ),
      );

      await expect(assertProductionHtmlContracts({ repoRoot })).resolves.toMatchObject({
        htmlFiles: ['dist/index.html'],
      });
    });
  });

  it('A-APP-SHELL-ROOT-014: canonical app shell root passes', async () => {
    await withRepoFixture(async (repoRoot) => {
      await writeDistFile(
        repoRoot,
        'index.html',
        wrapCanonicalAppShellDocument('<main id="main-content"></main>'),
      );

      await expect(assertProductionHtmlContracts({ repoRoot })).resolves.toMatchObject({
        htmlFiles: ['dist/index.html'],
      });
    });
  });

  it('A-APP-SHELL-ROOT-014: missing structural root fails', async () => {
    await withRepoFixture(async (repoRoot) => {
      await writeDistFile(repoRoot, 'index.html', '<!doctype html><main></main>');

      await expect(assertProductionHtmlContracts({ repoRoot })).rejects.toThrow(
        'dist/index.html contains 0 app shell roots identified by data-app-shell-root; expected exactly 1',
      );
    });
  });

  it('A-APP-SHELL-ROOT-014: duplicate structural roots fail', async () => {
    await withRepoFixture(async (repoRoot) => {
      await writeDistFile(
        repoRoot,
        'index.html',
        '<div data-app-shell-root class="app-shell-root"></div><div data-app-shell-root class="app-shell-root"></div>',
      );

      await expect(assertProductionHtmlContracts({ repoRoot })).rejects.toThrow(
        'dist/index.html contains 2 app shell roots identified by data-app-shell-root; expected exactly 1',
      );
    });
  });

  it('A-APP-SHELL-ROOT-014: structural root without presentation class fails', async () => {
    await withRepoFixture(async (repoRoot) => {
      await writeDistFile(repoRoot, 'index.html', '<div data-app-shell-root></div>');

      await expect(assertProductionHtmlContracts({ repoRoot })).rejects.toThrow(
        'dist/index.html app shell root is missing app-shell-root class token',
      );
    });
  });

  it('A-APP-SHELL-ROOT-003: any id attribute on the structural root fails', async () => {
    await withRepoFixture(async (repoRoot) => {
      await writeDistFile(
        repoRoot,
        'index.html',
        '<div data-app-shell-root class="app-shell-root" id="shell"></div>',
      );

      await expect(assertProductionHtmlContracts({ repoRoot })).rejects.toThrow(
        'dist/index.html app shell root must not have an id attribute',
      );
    });
  });

  it('A-APP-SHELL-ROOT-003: empty id attribute on the structural root fails', async () => {
    await withRepoFixture(async (repoRoot) => {
      await writeDistFile(
        repoRoot,
        'index.html',
        '<div data-app-shell-root class="app-shell-root" id=""></div>',
      );

      await expect(assertProductionHtmlContracts({ repoRoot })).rejects.toThrow(
        'dist/index.html app shell root must not have an id attribute',
      );
    });
  });

  it('A-APP-SHELL-ROOT-003: document-wide legacy id fails outside the structural root', async () => {
    await withRepoFixture(async (repoRoot) => {
      await writeDistFile(
        repoRoot,
        'index.html',
        wrapCanonicalAppShellDocument('<span id="app"></span>'),
      );

      await expect(assertProductionHtmlContracts({ repoRoot })).rejects.toThrow(
        'dist/index.html contains legacy id="app" on <span>',
      );
    });
  });

  it('A-APP-SHELL-ROOT-003: document-wide legacy class token fails', async () => {
    await withRepoFixture(async (repoRoot) => {
      await writeDistFile(
        repoRoot,
        'index.html',
        wrapCanonicalAppShellDocument('<section class="before app-root after"></section>'),
      );

      await expect(assertProductionHtmlContracts({ repoRoot })).rejects.toThrow(
        'dist/index.html contains legacy app-root class token on <section>',
      );
    });
  });

  it('A-APP-SHELL-ROOT-014: legacy fragment href fails', async () => {
    await withRepoFixture(async (repoRoot) => {
      await writeDistFile(
        repoRoot,
        'index.html',
        wrapCanonicalAppShellDocument('<a href="#app">legacy</a>'),
      );

      await expect(assertProductionHtmlContracts({ repoRoot })).rejects.toThrow(
        'dist/index.html contains legacy href="#app" on <a>',
      );
    });
  });

  describe('ARIA ID-reference attributes', () => {
    const attributes = [
      'aria-controls',
      'aria-describedby',
      'aria-labelledby',
      'aria-owns',
      'aria-details',
      'aria-errormessage',
      'aria-flowto',
      'aria-activedescendant',
    ] as const;

    for (const attribute of attributes) {
      it(`A-APP-SHELL-ROOT-014: ${attribute} rejects app as a single token`, async () => {
        await withRepoFixture(async (repoRoot) => {
          await writeDistFile(
            repoRoot,
            'index.html',
            wrapCanonicalAppShellDocument(`<span ${attribute}="app"></span>`),
          );

          await expect(assertProductionHtmlContracts({ repoRoot })).rejects.toThrow(
            `dist/index.html contains legacy app ID-reference token in ${attribute} on <span>`,
          );
        });
      });

      it(`A-APP-SHELL-ROOT-014: ${attribute} rejects app in a multiple-token value`, async () => {
        await withRepoFixture(async (repoRoot) => {
          await writeDistFile(
            repoRoot,
            'index.html',
            wrapCanonicalAppShellDocument(`<span ${attribute}="before app after"></span>`),
          );

          await expect(assertProductionHtmlContracts({ repoRoot })).rejects.toThrow(
            `dist/index.html contains legacy app ID-reference token in ${attribute} on <span>`,
          );
        });
      });
    }
  });

  describe('HTML ID-reference attributes', () => {
    const attributes = [
      'for',
      'form',
      'list',
      'headers',
      'itemref',
      'popovertarget',
      'commandfor',
    ] as const;

    for (const attribute of attributes) {
      it(`A-APP-SHELL-ROOT-014: ${attribute} rejects app as a single token`, async () => {
        await withRepoFixture(async (repoRoot) => {
          await writeDistFile(
            repoRoot,
            'index.html',
            wrapCanonicalAppShellDocument(`<span ${attribute}="app"></span>`),
          );

          await expect(assertProductionHtmlContracts({ repoRoot })).rejects.toThrow(
            `dist/index.html contains legacy app ID-reference token in ${attribute} on <span>`,
          );
        });
      });

      it(`A-APP-SHELL-ROOT-014: ${attribute} rejects app in a multiple-token value`, async () => {
        await withRepoFixture(async (repoRoot) => {
          await writeDistFile(
            repoRoot,
            'index.html',
            wrapCanonicalAppShellDocument(`<span ${attribute}="before app after"></span>`),
          );

          await expect(assertProductionHtmlContracts({ repoRoot })).rejects.toThrow(
            `dist/index.html contains legacy app ID-reference token in ${attribute} on <span>`,
          );
        });
      });
    }
  });

  it.each([
    ['tab', '\t'],
    ['LF', '\n'],
    ['FF', '\f'],
    ['CR', '\r'],
    ['space', ' '],
  ])(
    'A-APP-SHELL-ROOT-014: ASCII %s separates ARIA ID-reference tokens',
    async (_label, separator) => {
      await withRepoFixture(async (repoRoot) => {
        await writeDistFile(
          repoRoot,
          'index.html',
          wrapCanonicalAppShellDocument(
            `<span aria-controls="before${separator}app${separator}after"></span>`,
          ),
        );

        await expect(assertProductionHtmlContracts({ repoRoot })).rejects.toThrow(
          'dist/index.html contains legacy app ID-reference token in aria-controls on <span>',
        );
      });
    },
  );

  it.each([
    ['tab', '\t'],
    ['LF', '\n'],
    ['FF', '\f'],
    ['CR', '\r'],
    ['space', ' '],
  ])(
    'A-APP-SHELL-ROOT-014: ASCII %s separates HTML ID-reference tokens',
    async (_label, separator) => {
      await withRepoFixture(async (repoRoot) => {
        await writeDistFile(
          repoRoot,
          'index.html',
          wrapCanonicalAppShellDocument(
            `<span itemref="before${separator}app${separator}after"></span>`,
          ),
        );

        await expect(assertProductionHtmlContracts({ repoRoot })).rejects.toThrow(
          'dist/index.html contains legacy app ID-reference token in itemref on <span>',
        );
      });
    },
  );

  it('A-APP-SHELL-ROOT-014: NBSP is not an ARIA ID-reference token boundary', async () => {
    await withRepoFixture(async (repoRoot) => {
      await writeDistFile(
        repoRoot,
        'index.html',
        wrapCanonicalAppShellDocument('<span aria-controls="before\u00a0app\u00a0after"></span>'),
      );

      await expect(assertProductionHtmlContracts({ repoRoot })).resolves.toMatchObject({
        htmlFiles: ['dist/index.html'],
      });
    });
  });

  it('A-APP-SHELL-ROOT-014: NBSP is not an HTML ID-reference token boundary', async () => {
    await withRepoFixture(async (repoRoot) => {
      await writeDistFile(
        repoRoot,
        'index.html',
        wrapCanonicalAppShellDocument('<span itemref="before\u00a0app\u00a0after"></span>'),
      );

      await expect(assertProductionHtmlContracts({ repoRoot })).resolves.toMatchObject({
        htmlFiles: ['dist/index.html'],
      });
    });
  });

  it('A-APP-SHELL-ROOT-014: ARIA app substrings are not legacy tokens', async () => {
    await withRepoFixture(async (repoRoot) => {
      await writeDistFile(
        repoRoot,
        'index.html',
        wrapCanonicalAppShellDocument(
          '<span id="application" class="application-root" aria-controls="application mapping"></span>',
        ),
      );

      await expect(assertProductionHtmlContracts({ repoRoot })).resolves.toMatchObject({
        htmlFiles: ['dist/index.html'],
      });
    });
  });

  it('A-APP-SHELL-ROOT-014: HTML ID-reference app substrings are not legacy tokens', async () => {
    await withRepoFixture(async (repoRoot) => {
      await writeDistFile(
        repoRoot,
        'index.html',
        wrapCanonicalAppShellDocument('<span itemref="application mapping"></span>'),
      );

      await expect(assertProductionHtmlContracts({ repoRoot })).resolves.toMatchObject({
        htmlFiles: ['dist/index.html'],
      });
    });
  });

});
