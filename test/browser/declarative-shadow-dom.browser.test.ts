import { expect, fixture, html } from '@open-wc/testing';
import {
  promoteDeclarativeShadowRoots,
  replaceElementChildrenFromHtml,
} from '../../src/router/declarative-shadow-dom.js';

describe('declarative-shadow-dom', () => {
  it('replaceElementChildrenFromHtml が retained chrome の DSD を実 shadow root に昇格すること', async () => {
    const outlet = await fixture<HTMLElement>(html`<main id="main-content"></main>`);

    replaceElementChildrenFromHtml(
      outlet,
      `
        <article class="layout-main-col container-reading">
          <layout-header site-title="Rouault">
            <template shadowrootmode="open">
              <header class="layout-header">
                <a href="/">Rouault</a>
              </header>
            </template>
          </layout-header>

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

    const header = outlet.querySelector('layout-header');
    if (!(header instanceof HTMLElement)) {
      throw new Error('layout-header が見つかりません');
    }

    const toc = outlet.querySelector('layout-toc');
    if (!(toc instanceof HTMLElement)) {
      throw new Error('layout-toc が見つかりません');
    }

    expect(header.shadowRoot).not.to.equal(null);
    expect(header.querySelectorAll(':scope > template').length).to.equal(0);
    expect(header.shadowRoot?.textContent ?? '').to.contain('Rouault');

    expect(toc.shadowRoot).not.to.equal(null);
    expect(toc.querySelectorAll(':scope > template').length).to.equal(0);
    expect(toc.shadowRoot?.textContent ?? '').to.contain('7.1 配列の生成');
    expect(toc.shadowRoot?.textContent ?? '').to.contain('7.2 配列の要素の読み書き');
  });

  it('promoteDeclarativeShadowRoots が重複した DSD template を 1 つの shadow root に正規化すること', async () => {
    const root = await fixture<HTMLElement>(html`
      <section data-hydration-scope="note-content">
        <layout-header site-title="Rouault">
          <template shadowrootmode="open">
            <header><a href="/">Rouault</a></header>
          </template>
          <template shadowrootmode="open">
            <header><h1>duplicate</h1></header>
          </template>
        </layout-header>

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

    const header = root.querySelector('layout-header');
    if (!(header instanceof HTMLElement)) {
      throw new Error('layout-header が見つかりません');
    }

    const toc = root.querySelector('layout-toc');
    if (!(toc instanceof HTMLElement)) {
      throw new Error('layout-toc が見つかりません');
    }

    expect(header.shadowRoot).not.to.equal(null);
    expect(header.querySelectorAll(':scope > template').length).to.equal(0);
    expect(header.shadowRoot?.textContent ?? '').to.contain('Rouault');
    expect(header.shadowRoot?.textContent ?? '').not.to.contain('duplicate');

    expect(toc.shadowRoot).not.to.equal(null);
    expect(toc.querySelectorAll(':scope > template').length).to.equal(0);
    expect(toc.shadowRoot?.textContent ?? '').to.contain('7.1 配列の生成');
    expect(toc.shadowRoot?.textContent ?? '').not.to.contain('duplicate');
  });
});
