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
  await nextAnimationFrame();
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

describe('layout-toc hydration reconciliation', () => {
  it('hydrate 後に host の activeId 変更が ui-toc へ追従すること', async () => {
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
      host.activateHydration();
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

  it('hydrate 開始直後でも _applyActiveId による同期が失われないこと', async () => {
    const cleanup = appendArticleFixture();

    try {
      const host = await fixture<LayoutToc>(html`
        <layout-toc
          .headingsJson=${headingsJson}
          content-root-id="note-content"
          data-hydration-trigger="manual"
        ></layout-toc>
      `);

      host.activateHydration();

      const internals = host as unknown as LayoutTocInternals;
      internals._applyActiveId('72-配列の要素の読み書き');

      await flush(host);

      const desktopToc = queryDesktopToc(host);
      if (!desktopToc) {
        throw new Error('desktop ui-toc が見つかりません');
      }

      expect(desktopToc.activeId).to.equal('72-配列の要素の読み書き');
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