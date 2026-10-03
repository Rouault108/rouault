import { describe, expect, it } from 'vitest';
import { parseFragment, serialize } from 'parse5';
import { normalizeRouaultStaticSurfaceHtml } from '../../build/rehype/rouault-components.js';
import { resolveNotePreviewProfile } from '../../build/content/note-content-contracts.js';
import { prepareTocHtml } from '../../build/content/extract-toc-from-html.js';

const render = (html: string, profile: 'reader' | 'demo' = 'demo'): string =>
  normalizeRouaultStaticSurfaceHtml(html, {
    previewProfile: profile,
    documentUrl: 'https://example.test/note/',
  }) ?? '';

describe('native note output', () => {
  it('profile resolution は既存kind mappingを維持する', () => {
    expect(
      ['reader', 'testing', 'demo'].map((kind) =>
        resolveNotePreviewProfile(kind as 'reader' | 'testing' | 'demo'),
      ),
    ).toEqual(['reader', 'demo', 'demo']);
  });
  it('translation はnative disclosureと通常テキストへlowerする', () => {
    const html = render(
      '<ui-translation original="bonjour" translated="こんにちは" lang="fr"></ui-translation>',
    );
    expect(html).toContain('<details');
    expect(html).toContain('<summary lang="fr">bonjour</summary>');
    expect(html).toContain('こんにちは');
    expect(html).not.toContain('role="dialog"');
    expect(
      render('<ui-translation original="bonjour" translated=""></ui-translation>'),
    ).not.toContain('<details');
  });
  it('Code Preview はdirect toolbar存在だけでもvisible対象になる', () => {
    expect(render('<ui-code-preview><div slot="toolbar"></div></ui-code-preview>')).toContain(
      'data-hydration-key="code-preview-enhancer"',
    );
    expect(
      render(
        '<ui-code-preview><div slot="preview"><span slot="toolbar"></span></div></ui-code-preview>',
      ),
    ).not.toContain('data-hydration-key="code-preview-enhancer"');
    expect(render('<ui-code-preview controls="theme"></ui-code-preview>')).toContain(
      'data-command-menu-trigger',
    );
    expect(() => render('<ui-code-preview controls="unknown"></ui-code-preview>')).toThrow();
  });
  it('sandbox payloadは走査せずcapabilityをcanonical metadataへ移す', () => {
    const html = render(
      '<ui-preview-sandbox activation-policy="manual" allow-js height="42.3"><template data-preview-kind="html">&lt;ui-tabs&gt;&lt;/ui-tabs&gt;</template></ui-preview-sandbox>',
    );
    expect(html).toContain('data-hydration-trigger="interaction"');
    expect(html).toContain('data-hydration-capability="sandboxed"');
    expect(html).toContain('data-sandbox-height="43"');
    expect(html).toContain('data-sandbox-allow-js');
    expect(html).toContain('data-sandbox-base-url="https://example.test/note/"');
    expect(serialize(parseFragment(html))).toContain('&lt;ui-tabs&gt;');
    expect(html).not.toContain('<iframe');
  });
  it('videoのbaselineはnative controlsでdurable controlsはhidden', () => {
    const html = render('<ui-video src="/movie.mp4" caption="動画説明"></ui-video>');
    expect(html).toContain('<video controls');
    expect(html).toContain('data-video-enhanced-controls');
    expect(html).toContain('data-hydration-trigger="visible"');
    expect(html).toContain('<figcaption');
    expect(html).not.toMatch(/<ui-(?:video|button)/u);
  });
  it('nested native tabsからouter-to-inner TOC selectionを導出する', () => {
    const html = render(
      '<ui-tabs><span slot="tab" value="outer">Outer</span><div slot="panel"><ui-tabs><span slot="tab" value="inner">Inner</span><div slot="panel"><h2 id="target">Target</h2></div></ui-tabs></div></ui-tabs>',
    );
    const prepared = prepareTocHtml(html);
    expect(prepared.headings[0]?.scopeSelections).toEqual([
      { scopeId: 'toc-scope-1', value: 'outer' },
      { scopeId: 'toc-scope-2', value: 'inner' },
    ]);
  });
});
