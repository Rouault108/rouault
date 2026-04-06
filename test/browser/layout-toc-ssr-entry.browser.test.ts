import { expect, fixture, html, waitUntil } from '@open-wc/testing';
import '@lit-labs/ssr-client/lit-element-hydrate-support.js';
import { replaceElementChildrenFromHtml } from '../../src/router/declarative-shadow-dom.js';
import { nextAnimationFrame, waitForLitUpdate } from './helpers/wait-for-lit.js';

const headingsJson = JSON.stringify([
  { id: '71-配列の生成', text: '7.1 配列の生成', level: 2 },
  { id: '72-配列の要素の読み書き', text: '7.2 配列の要素の読み書き', level: 2 },
]);

interface LayoutTocLike extends HTMLElement {
  _activeId?: string;
  activateHydration?: () => void;
  updateComplete?: Promise<unknown>;
}

interface UiTocLike extends HTMLElement {
  activeId?: string;
  updateComplete?: Promise<unknown>;
}

const appendArticleFixture = (): (() => void) => {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = `
    <article id="note-content">
      <h2 id="71-配列の生成">7.1 配列の生成</h2>
      <p>配列の生成に関する本文。</p>
      <h2 id="72-配列の要素の読み書き">7.2 配列の要素の読み書き</h2>
      <p>配列の要素の読み書きに関する本文。</p>
    </article>
  `;
  document.body.append(wrapper);
  return () => {
    wrapper.remove();
  };
};

const flush = async (host: LayoutTocLike): Promise<void> => {
  await waitForLitUpdate(host);
  await nextAnimationFrame();

  const tocs = host.shadowRoot?.querySelectorAll<UiTocLike>('ui-toc') ?? [];
  for (const toc of tocs) {
    await waitForLitUpdate(toc);
  }

  await nextAnimationFrame();
  await waitForLitUpdate(host);
  await nextAnimationFrame();
};

describe('layout-toc SSR entry hydration', () => {
  it('未定義 host を scheduler が upgrade した後も activeId の同期を維持すること', async () => {
    const cleanup = appendArticleFixture();

    try {
      const root = await fixture<HTMLElement>(html`<main id="main-content"></main>`);

      replaceElementChildrenFromHtml(
        root,
        `
          <aside
            class="layout-toc-col"
            aria-label="目次"
            data-hydration-scope="note-toc"
          >
            <layout-toc
              headings-json='${headingsJson}'
              capabilities-json='{"activeTracking":false,"dynamicScopes":false,"mobileSummary":false}'
              content-root-id="note-content"
              data-hydration-capability="interactive"
              data-hydration-trigger="initial"
              defer-hydration
            >
              <template shadowrootmode="open">
                <div class="desktop">
                  <ui-toc active-id="71-配列の生成" defer-hydration>
                    <template shadowrootmode="open">
                      <nav aria-label="Table of Contents">
                        <ul>
                          <li>
                            <a class="toc-link is-active is-scroll" href="#71-配列の生成">
                              <span class="toc-link-label" data-heading-id="71-配列の生成">
                                7.1 配列の生成
                              </span>
                            </a>
                          </li>
                          <li>
                            <a class="toc-link" href="#72-配列の要素の読み書き">
                              <span class="toc-link-label" data-heading-id="72-配列の要素の読み書き">
                                7.2 配列の要素の読み書き
                              </span>
                            </a>
                          </li>
                        </ul>
                      </nav>
                    </template>
                  </ui-toc>
                </div>
                <div class="mobile-panel" data-open="false" aria-hidden="true" inert></div>
              </template>
            </layout-toc>
          </aside>
        `,
        root.ownerDocument,
      );

      await import('../../src/components/layout/layout-toc.js');
      await customElements.whenDefined('layout-toc');
      await customElements.whenDefined('ui-toc');

      const host = root.querySelector<LayoutTocLike>('layout-toc');
      if (!(host instanceof HTMLElement)) {
        throw new Error('layout-toc が見つかりません');
      }

      await flush(host);

      expect(typeof host.activateHydration).to.equal('function');
      expect(host.hasAttribute('defer-hydration')).to.equal(false);
      expect(host._activeId).to.equal('71-配列の生成');

      const desktopToc = host.shadowRoot?.querySelector<UiTocLike>('.desktop ui-toc') ?? null;
      if (!(desktopToc instanceof HTMLElement)) {
        throw new Error('desktop ui-toc が見つかりません');
      }

      await waitUntil(
        () => desktopToc.activeId === '71-配列の生成',
        '初期 activeId が host と一致すること',
      );

      (host as LayoutTocLike & { _applyActiveId?: (id: string) => void })._applyActiveId?.(
        '72-配列の要素の読み書き',
      );
      await flush(host);

      expect(host._activeId).to.equal('72-配列の要素の読み書き');
      expect(desktopToc.activeId).to.equal('72-配列の要素の読み書き');
      expect(desktopToc.getAttribute('active-id')).to.equal('72-配列の要素の読み書き');

      const mobilePanel = host.shadowRoot?.querySelector<HTMLElement>('.mobile-panel') ?? null;
      expect(mobilePanel?.getAttribute('aria-hidden')).to.equal('true');
      expect(mobilePanel?.hasAttribute('inert')).to.equal(true);

      expect(
        desktopToc.shadowRoot
          ?.querySelector('a.toc-link.is-active .toc-link-label')
          ?.textContent?.trim(),
      ).to.equal('7.2 配列の要素の読み書き');
    } finally {
      cleanup();
    }
  });
});
