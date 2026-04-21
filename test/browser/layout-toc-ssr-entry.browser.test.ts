import { expect, fixture, html, waitUntil } from '@open-wc/testing';
import '@lit-labs/ssr-client/lit-element-hydrate-support.js';
import { HydrationScheduler } from '../../src/client/hydration/scheduler.js';
import { replaceElementChildrenFromHtml } from '../../src/router/declarative-shadow-dom.js';
import { nextAnimationFrame, waitForLitUpdate } from './helpers/wait-for-lit.js';

const headingsJson = JSON.stringify([
  { id: '71-配列の生成', text: '7.1 配列の生成', level: 2 },
  { id: '72-配列の要素の読み書き', text: '7.2 配列の要素の読み書き', level: 2 },
]);

interface LayoutTocLike extends HTMLElement {
  _activeId?: string;
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

const getDesktopToc = (host: LayoutTocLike): UiTocLike => {
  const desktopToc = host.shadowRoot?.querySelector<UiTocLike>('.desktop ui-toc') ?? null;
  if (!(desktopToc instanceof HTMLElement)) {
    throw new Error('desktop ui-toc が見つかりません');
  }

  return desktopToc;
};

const getActiveLabel = (toc: UiTocLike): string | null =>
  toc.shadowRoot
    ?.querySelector<HTMLElement>('a.toc-link.is-active .toc-link-label')
    ?.textContent?.trim() ?? null;

const waitForDesktopTocSync = async (
  host: LayoutTocLike,
  expectedActiveId: string,
  expectedLabel: string,
): Promise<void> => {
  await waitUntil(
    async () => {
      const toc = getDesktopToc(host);
      await waitForLitUpdate(toc);
      await nextAnimationFrame();

      return (
        toc.activeId === expectedActiveId &&
        toc.getAttribute('active-id') === expectedActiveId &&
        getActiveLabel(toc) === expectedLabel
      );
    },
    `desktop ui-toc が ${expectedActiveId} / ${expectedLabel} へ同期すること`,
    { timeout: 4000, interval: 50 },
  );
};

describe('layout-toc SSR entry hydration', () => {
  it('未定義 host を scheduler が upgrade した後も activeId の同期を維持すること', async function () {
    // Firefox では scheduler 経由の upgrade と post-render 同期が 2s を超える回があり、
    // waitUntil の個別 timeout より先に Mocha 側 timeout が発火し得る。
    this.timeout(7000);

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
              capabilities-json='{"activeTracking":false,"dynamicScopes":false,"mobilePanel":false}'
              content-root-id="note-content"
              data-hydration-capability="interactive"
              data-hydration-trigger="initial"
            >
              <template shadowrootmode="open">
                <div class="desktop">
                  <ui-toc active-id="71-配列の生成">
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

      const scheduler = new HydrationScheduler();
      await scheduler.hydrateContent(root, { dispatchTarget: root });
      await flush(host);

      expect(host._activeId).to.equal('71-配列の生成');

      await waitForDesktopTocSync(host, '71-配列の生成', '7.1 配列の生成');

      (host as LayoutTocLike & { _applyActiveId?: (id: string) => void })._applyActiveId?.(
        '72-配列の要素の読み書き',
      );
      await flush(host);
      await waitForDesktopTocSync(host, '72-配列の要素の読み書き', '7.2 配列の要素の読み書き');

      const syncedDesktopToc = getDesktopToc(host);

      expect(host._activeId).to.equal('72-配列の要素の読み書き');
      expect(syncedDesktopToc.activeId).to.equal('72-配列の要素の読み書き');
      expect(syncedDesktopToc.getAttribute('active-id')).to.equal('72-配列の要素の読み書き');

      const mobilePanel = host.shadowRoot?.querySelector<HTMLElement>('.mobile-panel') ?? null;
      expect(mobilePanel?.getAttribute('aria-hidden')).to.equal('true');
      expect(mobilePanel?.hasAttribute('inert')).to.equal(true);
      expect(host.shadowRoot?.querySelector('.mobile-bar')).to.equal(null);

      expect(getActiveLabel(syncedDesktopToc)).to.equal('7.2 配列の要素の読み書き');
    } finally {
      cleanup();
    }
  });
});
