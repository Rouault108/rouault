import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { assertProductionFontAssets } from '../../scripts/assert-production-font-assets.js';
import { collectGeistMonoFontFaceUrls } from '../../build/assets/font-face-sources.js';

const ORIGIN = 'https://rouault.page';
const CSS_ASSET = 'client-assets/nested/main-hash.css';
const GEIST_ASSET = 'client-assets/geist-latin-variable-hash.woff2';
const NOTO_ASSET = 'assets/fonts/noto-sans-jp/noto-normal.woff2';
const face = (src = 'url(../geist-latin-variable-hash.woff2) format("woff2")'): string =>
  `@font-face{font-family:"Geist Mono Variable";src:${src};font-weight:100 900}`;
let root: string;

const write = async (file: string, text: string): Promise<void> => {
  await mkdir(path.dirname(path.join(root, file)), { recursive: true });
  await writeFile(path.join(root, file), text);
};

const fixture = async (
  options: { base?: string; geistCss?: string; notoCss?: string; html?: string } = {},
): Promise<void> => {
  const base = options.base ?? '';
  vi.stubEnv('ROUAULT_SITE_ORIGIN', ORIGIN);
  vi.stubEnv('ROUAULT_BASE_PATH', base);
  // 開発originが異なっても、本番originを基準に検査する。
  vi.stubEnv('ROUAULT_DEV_SITE_ORIGIN', 'http://localhost:5173');
  await write(
    'dist/index.html',
    options.html ?? `<link rel="stylesheet" href="${base}/${CSS_ASSET}">`,
  );
  await write(
    `dist/${CSS_ASSET}`,
    [
      options.notoCss ??
        `@font-face{font-family:"Noto Sans JP Variable";src:url(${base}/${NOTO_ASSET})}`,
      options.geistCss ?? face(),
    ].join('\n'),
  );
  await write(`dist/${GEIST_ASSET}`, 'font fixture bytes');
  await write(`dist/${NOTO_ASSET}`, 'noto fixture bytes');
};

describe('production font asset contract', () => {
  beforeEach(async () => {
    root = await mkdtemp(path.join(os.tmpdir(), 'rouault-font-assets-'));
  });
  afterEach(async () => {
    vi.unstubAllEnvs();
    await rm(root, { recursive: true, force: true });
  });

  it.each(['', '/notes/site', '/ノート'])('validates both families under base %s', async (base) => {
    await fixture({ base });
    await expect(assertProductionFontAssets(root)).resolves.toEqual({
      reachableCssAssets: [CSS_ASSET],
      fontPathnames: [`/${NOTO_ASSET}`],
      geistFontPathnames: [new URL(`${ORIGIN}${base}/${GEIST_ASSET}`).pathname],
    });
  });

  it.each([
    '../geist-latin-variable-hash.woff2',
    '/notes/client-assets/geist-latin-variable-hash.woff2',
    `${ORIGIN}/notes/client-assets/geist-latin-variable-hash.woff2`,
    '//rouault.page/notes/client-assets/geist-latin-variable-hash.woff2',
    '../geist-latin-variable-hash.woff2?v=1#font',
  ])('resolves every supported URL form against the CSS URL: %s', async (url) => {
    await fixture({ base: '/notes', geistCss: face(`url("${url}")`) });
    await expect(assertProductionFontAssets(root)).resolves.toMatchObject({
      geistFontPathnames: [`/notes/${GEIST_ASSET}`],
    });
  });

  it('uses HTML parsing, document-relative links and real attribute/rel semantics', async () => {
    await fixture({ base: '/notes', html: '<!-- <link rel="stylesheet" href="/ignored.css"> -->' });
    await write(
      'dist/pages/note.html',
      `<LINK HREF="../${CSS_ASSET}?a=1&amp;b=2" REL="alternate StyleSheet">`,
    );
    await expect(assertProductionFontAssets(root)).resolves.toMatchObject({
      reachableCssAssets: [CSS_ASSET],
    });
  });

  it('accepts a same-origin absolute stylesheet link under the hosting base', async () => {
    await fixture({
      base: '/notes',
      html: `<link href="${ORIGIN}/notes/${CSS_ASSET}" rel="stylesheet">`,
    });
    await expect(assertProductionFontAssets(root)).resolves.toMatchObject({
      reachableCssAssets: [CSS_ASSET],
    });
  });

  it('maps CSS escapes, encoded filenames and quoted parentheses to their actual file', async () => {
    await fixture({ geistCss: face(String.raw`url("../gei\73 t%20日本語).woff2")`) });
    await write('dist/client-assets/geist 日本語).woff2', 'font');
    await expect(assertProductionFontAssets(root)).resolves.toMatchObject({
      geistFontPathnames: [new URL(`${ORIGIN}/client-assets/geist 日本語).woff2`).pathname],
    });
  });

  it('does not count a link element in a foreign namespace', async () => {
    await fixture({ geistCss: '' });
    await write('dist/old.css', face());
    await write(
      'dist/index.html',
      `<link rel="stylesheet" href="/${CSS_ASSET}"><svg><link rel="stylesheet" href="/old.css"></link></svg>`,
    );
    await expect(assertProductionFontAssets(root)).rejects.toThrow(/no Geist Mono/u);
  });

  it('rejects a linked CSS symlink that reads outside dist', async () => {
    await fixture();
    await write('external.css', face());
    await rm(path.join(root, 'dist', CSS_ASSET));
    await symlink(path.join(root, 'external.css'), path.join(root, 'dist', CSS_ASSET));
    await expect(assertProductionFontAssets(root)).rejects.toThrow(
      /CSS: asset real path is outside dist/u,
    );
  });

  it('checks all subsets and all URL alternatives without pinning a subset count or hash', async () => {
    await fixture({
      geistCss: [
        face(),
        face(
          'local("Geist Mono Variable"), url(../second.woff2), url(../third.woff2) format(woff2)',
        ),
      ].join(''),
    });
    await write('dist/client-assets/second.woff2', 'second');
    await write('dist/client-assets/third.woff2', 'third');
    const result = await assertProductionFontAssets(root);
    expect(result.geistFontPathnames).toHaveLength(3);
    await write('dist/client-assets/third.woff2', '');
    await expect(assertProductionFontAssets(root)).rejects.toThrow(
      /Geist Mono Variable: empty asset.*third/u,
    );
  });

  it.each([
    ['missing face', '.code{font-family:"Geist Mono Variable"}'],
    [
      'other family source',
      '@font-face{font-family:Other;src:url(../geist-latin-variable-hash.woff2)}',
    ],
    ['missing src', '@font-face{font-family:"Geist Mono Variable"}'],
    ['local only', face('local("Geist Mono Variable")')],
    ['empty source', face('')],
  ])('rejects %s', async (_name, geistCss) => {
    await fixture({ geistCss });
    await expect(assertProductionFontAssets(root)).rejects.toThrow(/Geist Mono/u);
  });

  it.each([
    'data:font/woff2;base64,d09GMg==',
    'https://cdn.example/font.woff2',
    '//cdn.example/font.woff2',
    'http://rouault.page/font.woff2',
    'blob:https://rouault.page/id',
    'file:///tmp/font.woff2',
    'javascript:font()',
    `${ORIGIN.replace('https://', 'https://user:pass@')}/notes/${GEIST_ASSET}`,
  ])('rejects an unsafe URL even after a valid alternative: %s', async (url) => {
    await fixture({
      base: '/notes',
      geistCss: face(`url(../geist-latin-variable-hash.woff2),url("${url}")`),
    });
    await expect(assertProductionFontAssets(root)).rejects.toThrow(/production-assets/u);
  });

  it.each([
    '/client-assets/geist-latin-variable-hash.woff2',
    '/notes-other/client-assets/geist-latin-variable-hash.woff2',
    '../../../client-assets/geist-latin-variable-hash.woff2',
    '/notes/%2e%2e/client-assets/geist-latin-variable-hash.woff2',
    '/notes/..%2f..%2fsecret.woff2',
    '/notes/%5c..%5csecret.woff2',
    '/notes/%00font.woff2',
    '/notes/%ZZfont.woff2',
  ])('rejects base escape or unsafe filesystem mapping: %s', async (url) => {
    await fixture({ base: '/notes', geistCss: face(`url("${url}")`) });
    await expect(assertProductionFontAssets(root)).rejects.toThrow();
  });

  it.each(['missing', 'empty', 'directory'] as const)(
    'rejects a %s Geist artifact',
    async (kind) => {
      await fixture();
      const file = path.join(root, 'dist', GEIST_ASSET);
      if (kind === 'empty') await writeFile(file, '');
      else {
        await rm(file);
        if (kind === 'directory') await mkdir(file);
      }
      await expect(assertProductionFontAssets(root)).rejects.toThrow(
        /Geist Mono Variable: (missing asset|empty asset|asset is not a regular file)/u,
      );
    },
  );

  it.each([true, false])('restricts symlink targets to dist (inside=%s)', async (inside) => {
    await fixture();
    await write(inside ? 'dist/target.woff2' : 'target.woff2', 'font');
    await rm(path.join(root, 'dist', GEIST_ASSET));
    await symlink(
      path.join(root, inside ? 'dist/target.woff2' : 'target.woff2'),
      path.join(root, 'dist', GEIST_ASSET),
    );
    if (inside) await expect(assertProductionFontAssets(root)).resolves.toBeDefined();
    else
      await expect(assertProductionFontAssets(root)).rejects.toThrow(/real path is outside dist/u);
  });

  it.each(['unlinked', 'import only', 'template only'] as const)(
    'does not accept Geist from %s CSS',
    async (kind) => {
      await fixture({ geistCss: kind === 'import only' ? '@import "./old.css";' : '' });
      await write('dist/client-assets/nested/old.css', face());
      if (kind === 'template only') {
        await write(
          'dist/index.html',
          `<link rel="stylesheet" href="/${CSS_ASSET}"><template><link rel="stylesheet" href="/client-assets/nested/old.css"></template>`,
        );
      }
      await expect(assertProductionFontAssets(root)).rejects.toThrow(/no Geist Mono/u);
    },
  );

  it.each(['missing', 'empty', 'absent URL', 'directory'] as const)(
    'preserves Noto checks: %s',
    async (kind) => {
      await fixture({ ...(kind === 'absent URL' ? { notoCss: '' } : {}) });
      if (kind === 'empty') await write(`dist/${NOTO_ASSET}`, '');
      if (kind === 'missing' || kind === 'directory') {
        await rm(path.join(root, 'dist', NOTO_ASSET));
        if (kind === 'directory') await mkdir(path.join(root, 'dist', NOTO_ASSET));
      }
      await expect(assertProductionFontAssets(root)).rejects.toThrow(/Noto Sans JP|noto-sans-jp/u);
    },
  );

  it.each([
    '<link rel="stylesheet" href="https://cdn.example/main.css">',
    `<link rel="stylesheet" href="/${CSS_ASSET}">`,
    '<link rel="stylesheet" href="/notes/..%2fmain.css">',
    `<base href="/elsewhere/"><link rel="stylesheet" href="/notes/${CSS_ASSET}">`,
  ])('rejects unsafe stylesheet resolution: %s', async (html) => {
    await fixture({ base: '/notes', html });
    await expect(assertProductionFontAssets(root)).rejects.toThrow(/production-assets/u);
  });
});

describe('Geist font-face CSS grammar', () => {
  it.each([
    ['@FONT-FACE{FONT-FAMILY:geist mono variable;SRC:URL("a.woff2") FORMAT(woff2)}', ['a.woff2']],
    [face("url('a)b.woff2') format('woff2')"), ['a)b.woff2']],
    [face(String.raw`url(a\)b.woff2)`), ['a)b.woff2']],
    [
      String.raw`@font-face{font-family:"\47 eist Mono Variable";src:url("gei\73 t.woff2")}`,
      ['geist.woff2'],
    ],
    [
      face('local(Geist Mono Variable), url("a.woff2") format("woff2") tech(variations)'),
      ['a.woff2'],
    ],
    [face('url("a.woff2")/* comment */format("woff2"),url(b.woff2)'), ['a.woff2', 'b.woff2']],
    [face('url(/**/a.woff2)'), ['/**/a.woff2']],
    [
      face('url("a.woff2" /* comment */) format(woff2) tech(color-COLRv1, variations)'),
      ['a.woff2'],
    ],
    [face('url("a\\\nb.woff2")'), ['ab.woff2']],
  ])('parses valid CSS without regex URL extraction: %s', (css, urls) => {
    expect(collectGeistMonoFontFaceUrls(css, 'fixture.css')).toEqual(urls);
  });

  it.each([
    'url()',
    'url("a.woff2" garbage)',
    'url(a b.woff2)',
    'url(a(b).woff2)',
    'url("a.woff2"),',
    ',url(a.woff2)',
    'var(--font-url)',
    'url(a.woff2), var(--other-url)',
    'url(a.woff2) unknown(foo)',
    'url(a.woff2) format()',
    'url(a.woff2) format("woff2") format("woff")',
    'url(/* comment */"a.woff2")',
    'url(a.woff2 /* comment */)',
    'url(a.woff2) format(unknown)',
    'url(a.woff2) tech(unknown)',
    'local("Geist Mono Variable") format("woff2"),url(a.woff2)',
  ])('rejects unsupported or malformed source grammar: %s', (src) => {
    expect(() => collectGeistMonoFontFaceUrls(face(src), 'fixture.css')).toThrow(
      /production-font-assets/u,
    );
  });

  it.each([
    '@font-face{font-family:"Geist Mono Variable";src:url(a);src:local(Geist)}',
    '@font-face{font-family:"Geist Mono Variable";font-family:Other;src:url(a)}',
    '@font-face{font-family:"Geist Mono Variable";src:url(a)!important}',
    String.raw`@font\-face{font-family:"Geist Mono Variable";src:url(a)}`,
    String.raw`@font\2d face{font-family:"Geist Mono Variable";src:url(a)}`,
    '@font-face{*font-family:"Geist Mono Variable";src:url(a)}',
    '@font-face{_font-family:"Geist Mono Variable";src:url(a)}',
    '@font-face{font-family:"Geist Mono Variable";*src:url(a)}',
    '@font-face{font-family:"Geist Mono Variable";_src:url(a)}',
  ])('rejects ambiguous or invalid descriptors: %s', (css) => {
    expect(() => collectGeistMonoFontFaceUrls(css, 'fixture.css')).toThrow();
  });
});
