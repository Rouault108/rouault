import { expect, fixture, html } from '@open-wc/testing';
import {
  promoteDeclarativeShadowRoots,
  replaceElementChildrenFromHtml,
} from '../../src/router/declarative-shadow-dom.js';

describe('declarative-shadow-dom', () => {
  it('replaceElementChildrenFromHtml が note chrome の DSD を実 shadow root に昇格すること', async () => {
    const outlet = await fixture<HTMLElement>(html`<main id="main-content"></main>`);

    replaceElementChildrenFromHtml(
      outlet,
      `
        <article class="layout-main-col container-reading">
          <ui-article-header heading="JavaScriptの配列">
            <template shadowrootmode="open">
              <header class="article-header">
                <h1>JavaScriptの配列</h1>
                <p>javascript programming</p>
              </header>
            </template>
          </ui-article-header>

          <aside class="layout-toc-col" aria-label="目次">
            <layout-toc>
              <template shadowrootmode="open">
                <nav aria-label="目次">
                  <a class="toc-link-label" href="#sec-7-1">7.1 配列の生成</a>
                  <a class="toc-link-label" href="#sec-7-2">7.2 配列の要素の読み書き</a>
                </nav>
              </template>
            </layout-toc>
          </aside>
        </article>
      `,
      outlet.ownerDocument,
    );

    const articleHeader = outlet.querySelector('ui-article-header');
    if (!(articleHeader instanceof HTMLElement)) {
      throw new Error('ui-article-header が見つかりません');
    }

    const toc = outlet.querySelector('layout-toc');
    if (!(toc instanceof HTMLElement)) {
      throw new Error('layout-toc が見つかりません');
    }

    expect(articleHeader.shadowRoot).not.to.equal(null);
    expect(articleHeader.querySelectorAll(':scope > template').length).to.equal(0);
    expect(articleHeader.shadowRoot?.textContent ?? '').to.contain('JavaScriptの配列');

    expect(toc.shadowRoot).not.to.equal(null);
    expect(toc.querySelectorAll(':scope > template').length).to.equal(0);
    expect(toc.shadowRoot?.textContent ?? '').to.contain('7.1 配列の生成');
    expect(toc.shadowRoot?.textContent ?? '').to.contain('7.2 配列の要素の読み書き');
  });

  it('promoteDeclarativeShadowRoots が重複した DSD template を 1 つの shadow root に正規化すること', async () => {
    const root = await fixture<HTMLElement>(html`
      <section data-hydration-scope="note-content">
        <ui-article-header heading="JavaScriptの配列">
          <template shadowrootmode="open">
            <header><h1>JavaScriptの配列</h1></header>
          </template>
          <template shadowrootmode="open">
            <header><h1>duplicate</h1></header>
          </template>
        </ui-article-header>

        <layout-toc>
          <template shadowrootmode="open">
            <nav><a class="toc-link-label" href="#sec-7-1">7.1 配列の生成</a></nav>
          </template>
          <template shadowrootmode="open">
            <nav><a class="toc-link-label" href="#duplicate">duplicate</a></nav>
          </template>
        </layout-toc>
      </section>
    `);

    promoteDeclarativeShadowRoots(root);

    const articleHeader = root.querySelector('ui-article-header');
    if (!(articleHeader instanceof HTMLElement)) {
      throw new Error('ui-article-header が見つかりません');
    }

    const toc = root.querySelector('layout-toc');
    if (!(toc instanceof HTMLElement)) {
      throw new Error('layout-toc が見つかりません');
    }

    expect(articleHeader.shadowRoot).not.to.equal(null);
    expect(articleHeader.querySelectorAll(':scope > template').length).to.equal(0);
    expect(articleHeader.shadowRoot?.textContent ?? '').to.contain('JavaScriptの配列');
    expect(articleHeader.shadowRoot?.textContent ?? '').not.to.contain('duplicate');

    expect(toc.shadowRoot).not.to.equal(null);
    expect(toc.querySelectorAll(':scope > template').length).to.equal(0);
    expect(toc.shadowRoot?.textContent ?? '').to.contain('7.1 配列の生成');
    expect(toc.shadowRoot?.textContent ?? '').not.to.contain('duplicate');
  });
});
