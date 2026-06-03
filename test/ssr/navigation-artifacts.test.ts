import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  createNavigationEnvelopeFromHtml,
  emitNavigationArtifacts,
} from '../../build/navigation/emit-navigation-artifacts.js';
import { resolveGeneratedDocumentCurrentUrlFromHtmlFile } from '../../build/content/generated-document-route-set.js';
import { NAVIGATION_ENVELOPE_SCHEMA_VERSION } from '../../shared/navigation/navigation-envelope.js';
import type { SiteUrlContext } from '../../shared/site/site-url-context.js';

const siteUrlContext: SiteUrlContext = {
  siteOrigin: 'https://rouault.invalid',
  basePath: '/base',
};

const context = {
  siteUrlContext,
  currentUrl: 'https://rouault.invalid/base/notes/example/',
  isInternalDocumentPathname: (pathname: string) =>
    new Set(['/', '/search', '/search/', '/base/search/', '/notes/example', '/notes/example/']).has(
      pathname,
    ),
};

const html = (headerAttrs = ''): string => `
<!doctype html>
<html>
  <head>
    <title>Example</title>
    <meta name="description" content="Example description">
    <meta name="rouault-build-id" content="build-test">
    <meta name="rouault-generated-at" content="2026-01-01T00:00:00.000Z">
  </head>
  <body>
    <header
      class="layout-header"
      data-layout-header="true"
      data-note-layout="true"
      data-sidebar-enabled="true"
      data-sidebar-id="note-primary"
      data-toc-presence="present"
      data-toc-runtime-id="toc-runtime"
      data-toc-owner-id="toc-owner"
      data-toc-trigger-reserved="true"
      data-current-corpus-key="all"
	      ${headerAttrs}
	    >
	      <a href="/base/search/" data-no-router data-link-kind="internal-document" data-link-surface="header">検索</a>
	      <a href="#layout-toc-toc-runtime" data-toc-trigger data-link-kind="internal-fragment" data-link-surface="header">目次</a>
	    </header>
    <app-router data-sidebar-presence="present">
      <aside data-app-shell-sidebar-host>
        <layout-sidebar
          sidebar-id="note-primary"
          state-scope-id="note-navigation"
          selected-id="notes/example"
          initial-expanded-ids='[]'
          topology-revision="rev-1"
          fixed-breakpoint="1024"
          presentation="auto"
        ><nav data-sidebar-nav data-sidebar-id="note-primary" data-topology-revision="rev-1"><ul><li data-node-id="notes/example" data-node-kind="leaf" data-node-depth="0"><a data-sidebar-nav-control data-sidebar-nav-link href="/base/notes/example/" data-link-kind="internal-document" data-link-surface="navigation" aria-current="page">Example</a></li></ul></nav></layout-sidebar>
      </aside>
      <main id="main-content"><article>本文</article></main>
    </app-router>
  </body>
</html>
`;

describe('navigation artifacts static header contract', () => {
  it('schema v2 envelope に shell.headerHtml と sidebarProjection を格納すること', () => {
    const envelope = createNavigationEnvelopeFromHtml(
      html(),
      '/dist/notes/example/index.html',
      {
        mode: 'strict-artifact',
        buildId: 'build-test',
        generatedAt: '2026-01-01T00:00:00.000Z',
      },
      context,
    );

    expect(envelope.schemaVersion).toBe(NAVIGATION_ENVELOPE_SCHEMA_VERSION);
    expect(envelope.shell.headerHtml).toContain('data-layout-header');
    expect(envelope.shell.headerHtml).not.toContain(`<${'layout-header'}`);
    expect(envelope.shell.sidebarProjection?.sidebarId).toBe('note-primary');
    expect(envelope.document.html).toContain('<article>本文</article>');
  });

  it('static header 内の script と data-hydration-key を拒否すること', () => {
    expect(() =>
      createNavigationEnvelopeFromHtml(
        html('data-hydration-key="layout-header"'),
        '/dist/notes/example/index.html',
        {
          mode: 'strict-artifact',
          buildId: 'build-test',
          generatedAt: '2026-01-01T00:00:00.000Z',
        },
        context,
      ),
    ).toThrow(/data-hydration-key/u);
  });

  it('static header 外に残った layout-header / ui-header custom element も拒否すること', () => {
    for (const legacyElement of ['layout-header', 'ui-header']) {
      expect(() =>
        createNavigationEnvelopeFromHtml(
          html().replace('</body>', `<${legacyElement}></${legacyElement}></body>`),
          '/dist/notes/example/index.html',
          {
            mode: 'strict-artifact',
            buildId: 'build-test',
            generatedAt: '2026-01-01T00:00:00.000Z',
          },
          context,
        ),
      ).toThrow(/must not contain layout-header\/ui-header/u);
    }
  });

  it('HTML meta と明示 SiteUrlContext の不一致を拒否すること', () => {
    expect(() =>
      createNavigationEnvelopeFromHtml(
        html().replace(
          '<meta name="rouault-generated-at" content="2026-01-01T00:00:00.000Z">',
          '<meta name="rouault-generated-at" content="2026-01-01T00:00:00.000Z"><meta name="rouault-site-origin" content="https://wrong.invalid">',
        ),
        '/dist/notes/example/index.html',
        {
          mode: 'strict-artifact',
          buildId: 'build-test',
          generatedAt: '2026-01-01T00:00:00.000Z',
        },
        context,
      ),
    ).toThrow(/rouault-site-origin meta/u);
  });

  it('headerHtml 内の hash-only TOC fallback link を絶対 currentUrl で internal-fragment として検証すること', () => {
    expect(() =>
      createNavigationEnvelopeFromHtml(
        html(),
        '/dist/notes/example/index.html',
        {
          mode: 'strict-artifact',
          buildId: 'build-test',
          generatedAt: '2026-01-01T00:00:00.000Z',
        },
        context,
      ),
    ).not.toThrow();

    expect(() =>
      createNavigationEnvelopeFromHtml(
        html().replace('data-link-kind="internal-fragment"', 'data-link-kind="internal-document"'),
        '/dist/notes/example/index.html',
        {
          mode: 'strict-artifact',
          buildId: 'build-test',
          generatedAt: '2026-01-01T00:00:00.000Z',
        },
        context,
      ),
    ).toThrow(/link kind does not match classified href/u);
  });

  it('emitNavigationArtifacts は siteUrlContext と絶対 currentUrl 意味論で artifact を出すこと', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'rouault-nav-artifact-'));
    try {
      const noteDir = path.join(dir, 'notes', 'example');
      mkdirSync(noteDir, { recursive: true });
      writeFileSync(path.join(noteDir, 'index.html'), html(), 'utf8');
      const unicodeNoteDir = path.join(dir, 'notes', '日本語');
      mkdirSync(unicodeNoteDir, { recursive: true });
      writeFileSync(path.join(unicodeNoteDir, 'index.html'), html(), 'utf8');

      await emitNavigationArtifacts({
        outputDir: dir,
        buildId: 'build-test',
        generatedAt: '2026-01-01T00:00:00.000Z',
        siteUrlContext,
      });

      const artifact = JSON.parse(
        readFileSync(path.join(dir, '__router', 'notes', 'example', 'index.router.json'), 'utf8'),
      ) as { readonly shell: { readonly headerHtml: string } };
      expect(artifact.shell.headerHtml).toContain('/base/search/');
      expect(
        resolveGeneratedDocumentCurrentUrlFromHtmlFile({
          outputDir: dir,
          htmlFilePath: path.join(noteDir, 'index.html'),
          siteUrlContext,
        }),
      ).toBe('https://rouault.invalid/base/notes/example/');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
