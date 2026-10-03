import { existsSync } from 'node:fs';
import { createManifestLoadedRouteClassificationMode } from '../../shared/link/link-annotation.js';
import { describe, expect, it } from 'vitest';
import { normalizeRouaultStaticSurfaceHtml } from '../../build/rehype/rouault-components.js';
import { annotateGeneratedPageHtmlLinkContracts } from '../../build/content/page-html-link-contracts.js';
import { RUN_BUILD_STEPS } from '../../scripts/run-build-process.js';
import { validateNoteContentContracts } from '../../build/content/note-content-contracts.js';

describe('native build output', () => {
  it('native loweringは内容を保持しstateful tag/DSDを出力しない', () => {
    const html = normalizeRouaultStaticSurfaceHtml(
      '<p>本文</p><ui-translation original="Original" translated="訳"></ui-translation><ui-tabs><div slot="tab" value="one"><em>One</em></div><div slot="panel"><h2>Panel</h2></div></ui-tabs>',
      { namespace: 'native-test' },
    );
    if (html === undefined) throw new Error('Native output missing');
    expect(html).toContain('<p>本文</p>');
    expect(html).toContain('<em>One</em>');
    expect(html).toContain('<h2>Panel</h2>');
    expect(html).toContain('data-tabs-root');
    expect(html).toContain('data-translation-overlay');
    expect(html).not.toMatch(/<ui-|shadowrootmode/);
    const linkContext = {
      siteUrlContext: { siteOrigin: 'https://example.com', basePath: '' },
      currentUrl: 'https://example.com/note',
      routeClassificationMode: createManifestLoadedRouteClassificationMode({
        isInternalDocumentPathname: () => true,
      }),
    };
    expect(() =>
      validateNoteContentContracts({
        ...linkContext,
        html: annotateGeneratedPageHtmlLinkContracts({
          ...linkContext,
          html,
          sourceLabel: 'native-test',
        }),
        kind: 'reader',
        sourceLabel: 'native-test',
      }),
    ).not.toThrow();
  });

  it('build順序はEleventyからnavigation/search生成へ直接進む', () => {
    const labels = RUN_BUILD_STEPS.map(({ label }) => label);
    expect(labels).not.toContain('apply-lit-ssr');
    expect(labels.indexOf('eleventy')).toBeLessThan(labels.indexOf('emit-navigation-artifacts'));
    expect(labels.indexOf('emit-navigation-artifacts')).toBeLessThan(
      labels.indexOf('emit-search-artifacts'),
    );
    for (const path of [
      'scripts/apply-lit-ssr.ts',
      'build/ssr/server-entry.ts',
      'build/ssr/html-transform.ts',
      'build/ssr/targets.ts',
    ])
      expect(existsSync(path), path).toBe(false);
  });
});
