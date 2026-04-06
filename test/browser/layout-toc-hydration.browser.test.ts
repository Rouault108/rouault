import { expect, fixture, html } from '@open-wc/testing';
import '../../src/components/layout/layout-toc.js';
import '../../src/components/ui/toc/toc.js';
import type { LayoutToc } from '../../src/components/layout/layout-toc.js';
import type { Toc } from '../../src/components/ui/toc/toc.js';
import { nextAnimationFrame, waitForLitUpdate } from './helpers/wait-for-lit.js';

const headingsJson = JSON.stringify([
  { id: '71-配列の生成', text: '7.1 配列の生成', level: 2 },
  { id: '72-配列の要素の読み書き', text: '7.2 配列の要素の読み書き', level: 2 },
]);

interface LayoutTocInternals {
  _applyActiveId(id: string): void;
}

const flush = async (host: LayoutToc): Promise<void> => {
  await waitForLitUpdate(host);
  await nextAnimationFrame();

  const tocs = host.shadowRoot?.querySelectorAll<Toc>('ui-toc') ?? [];
  for (const toc of tocs) {
    await waitForLitUpdate(toc);
  }

  await nextAnimationFrame();
  await waitForLitUpdate(host);
};

const queryDesktopToc = (host: LayoutToc): Toc | null =>
  host.shadowRoot?.querySelector<Toc>('.desktop ui-toc') ?? null;

const appendArticleFixture = (): (() => void) => {
  const wrapper = document.createElement('div');
  wrapper.setAttribute('data-test-article-fixture', 'layout-toc');
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

describe('layout-toc hydration rendering', () => {
  it('host の activeId 変更が通常の property binding で ui-toc へ反映されること', async () => {
    const cleanup = appendArticleFixture();

    try {
      const host = await fixture<LayoutToc>(html`
        <layout-toc
          .headingsJson=${headingsJson}
          content-root-id="note-content"
          data-hydration-trigger="manual"
        ></layout-toc>
      `);

      await flush(host);

      const internals = host as unknown as LayoutTocInternals;
      internals._applyActiveId('72-配列の要素の読み書き');
      await flush(host);

      const desktopToc = queryDesktopToc(host);
      if (!desktopToc) {
        throw new Error('desktop ui-toc が見つかりません');
      }

      expect(desktopToc.activeId).to.equal('72-配列の要素の読み書き');
      expect(desktopToc.getAttribute('active-id')).to.equal('72-配列の要素の読み書き');
      expect(
        desktopToc.shadowRoot
          ?.querySelector('a.toc-link.is-active .toc-link-label')
          ?.textContent?.trim(),
      ).to.equal('7.2 配列の要素の読み書き');
    } finally {
      cleanup();
    }
  });

  it('SSR 済み shadow root を初回 client update 前に空へ戻して再描画すること', async () => {
    const cleanup = appendArticleFixture();

    try {
      const host = document.createElement('layout-toc') as LayoutToc;
      host.setAttribute('headings-json', headingsJson);
      host.setAttribute('content-root-id', 'note-content');
      host.setAttribute('data-hydration-trigger', 'manual');

      const shadowRoot = host.attachShadow({ mode: 'open' });
      shadowRoot.innerHTML = `
        <div class="desktop">
          <ui-toc active-id="71-配列の生成">
            <template shadowrootmode="open">
              <nav>
                <a class="toc-link is-active" href="#71-配列の生成">
                  <span class="toc-link-label">stale</span>
                </a>
              </nav>
            </template>
          </ui-toc>
        </div>
      `;

      document.body.append(host);
      await flush(host);

      const desktopToc = queryDesktopToc(host);
      if (!desktopToc) {
        throw new Error('desktop ui-toc が見つかりません');
      }

      expect(host.shadowRoot?.textContent ?? '').not.to.contain('stale');
      expect(desktopToc.shadowRoot?.textContent ?? '').to.contain('7.1 配列の生成');
      expect(desktopToc.shadowRoot?.textContent ?? '').to.contain('7.2 配列の要素の読み書き');

      const internals = host as unknown as LayoutTocInternals;
      internals._applyActiveId('72-配列の要素の読み書き');
      await flush(host);

      expect(desktopToc.activeId).to.equal('72-配列の要素の読み書き');
      expect(
        desktopToc.shadowRoot
          ?.querySelector('a.toc-link.is-active .toc-link-label')
          ?.textContent?.trim(),
      ).to.equal('7.2 配列の要素の読み書き');
    } finally {
      document.querySelectorAll('layout-toc').forEach((element) => element.remove());
      cleanup();
    }
  });
});