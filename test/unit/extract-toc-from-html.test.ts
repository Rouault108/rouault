import { expect } from '@open-wc/testing';
import { extractTocFromHtml } from '../../lib/content/extract-toc-from-html.js';

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

  it('見出し内の固定リンクは TOC テキストに混ざらないこと', () => {
    const html = `
      <h2 id="intro">
        <span class="heading-text">はじめに</span>
        <a class="heading-anchor" href="#intro" aria-label="「はじめに」への固定リンク">
          <ui-icon icon="link" aria-hidden="true"></ui-icon>
        </a>
      </h2>
    `;

    const toc = extractTocFromHtml(html);

    expect(toc).to.deep.equal([{ id: 'intro', text: 'はじめに', level: 2 }]);
  });
});
