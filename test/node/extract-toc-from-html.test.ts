import { describe, expect, it } from 'vitest';
import { extractTocFromHtml, prepareTocHtml } from '../../build/content/extract-toc-from-html.js';
import { validateNoteContentContracts } from '../../build/content/note-content-contracts.js';

describe('extractTocFromHtml', () => {
  it('id付きのh2-h6見出しを抽出できること', () => {
    const html = `
      <h1 id="title">タイトル</h1>
      <h2 id="intro">はじめに</h2>
      <h3 id="setup"><code>Setup</code> &amp; 準備</h3>
      <h4>idなし</h4>
    `;

    const toc = extractTocFromHtml(html);

    expect(toc).to.deep.equal([
      { id: 'intro', text: 'はじめに', level: 2 },
      { id: 'setup', text: 'Setup & 準備', level: 3 },
    ]);
  });

  it('空入力では空配列を返すこと', () => {
    expect(extractTocFromHtml('')).to.deep.equal([]);
  });

  it('抽出結果は runtime heading helper と同じ heading shape を使うこと', () => {
    const toc = extractTocFromHtml('<h2 id="intro"> Intro </h2>');

    expect(toc).to.deep.equal([{ id: 'intro', text: 'Intro', level: 2 }]);
  });

  it('見出し内の固定リンクは TOC テキストに混ざらないこと', () => {
    const html = `
      <h2 id="intro">
        <span class="heading-text">はじめに</span>
        <a class="heading-anchor" href="#intro" aria-label="「はじめに」への固定リンク">
          <ui-icon name="link" aria-hidden="true"></ui-icon>
        </a>
      </h2>
    `;

    const toc = extractTocFromHtml(html);

    expect(toc).to.deep.equal([{ id: 'intro', text: 'はじめに', level: 2 }]);
  });

  it('tabs 配下の見出しに scopeSelections を付与し、HTML に data-toc-scope を補完すること', () => {
    const source = `
      <ui-tabs>
        <div slot="tab" value="overview">概要</div>
        <div slot="panel">
          <h2 id="overview-heading">Overview</h2>
        </div>
        <div slot="tab" value="details">詳細</div>
        <div slot="panel">
          <h2 id="details-heading">Details</h2>
        </div>
      </ui-tabs>
    `;

    const prepared = prepareTocHtml(source);

    expect(prepared.html).to.contain('data-toc-scope="toc-scope-1"');
    expect(prepared.headings).to.deep.equal([
      {
        id: 'overview-heading',
        text: 'Overview',
        level: 2,
        scopeSelections: [{ scopeId: 'toc-scope-1', value: 'overview' }],
      },
      {
        id: 'details-heading',
        text: 'Details',
        level: 2,
        scopeSelections: [{ scopeId: 'toc-scope-1', value: 'details' }],
      },
    ]);
  });

  it('endnotes 内の footnote-label を TOC から除外すること', () => {
    const html = `
      <h2 id="intro">本文見出し</h2>
      <section role="doc-endnotes">
        <h2 id="footnote-label">脚注</h2>
        <ol><li id="fn-a">脚注本文</li></ol>
      </section>
    `;

    const prepared = prepareTocHtml(html);

    expect(prepared.headings).to.deep.equal([{ id: 'intro', text: '本文見出し', level: 2 }]);
    expect(prepared.html).to.contain('id="footnote-label"');
  });

  it('canonical 脚注構造リンクの値なし structural 属性を post-prepare-toc 前に true へ正規化すること', () => {
    const html = `
      <p>
        脚注
        <a
          id="fn-a-ref-1"
          href="#fn-a"
          data-footnote-ref
          data-footnote-id="fn-a"
          data-footnote-index="1"
          data-footnote-ref-instance="1"
          data-footnote-role="primary"
          role="doc-noteref"
          aria-label="脚注 1 を開く"
          data-hydration-key="footnote-popover-enhancer"
          data-hydration-capability="progressive"
          data-hydration-trigger="post-commit"
        ><sup>1</sup></a>
      </p>
      <section role="doc-endnotes">
        <h2 id="footnote-label">脚注</h2>
        <ol>
          <li id="fn-a">
            <p>本文 <a href="#fn-a-ref-1" data-footnote-backref role="doc-backlink" aria-label="脚注参照 1 に戻る">↩︎</a></p>
          </li>
        </ol>
      </section>
    `;

    const prepared = prepareTocHtml(html);

    expect(prepared.html).to.contain('data-footnote-ref="true"');
    expect(prepared.html).to.contain('data-footnote-backref="true"');
    expect(() =>
      validateNoteContentContracts(
        'testing',
        prepared.html,
        'test:post-prepare-toc',
        'markdown-basic',
      ),
    ).not.toThrow();
  });
});
