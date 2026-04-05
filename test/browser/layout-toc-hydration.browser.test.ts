import { expect, fixture, html } from '@open-wc/testing';
import '../../src/components/layout/layout-toc.js';
import type { LayoutToc } from '../../src/components/layout/layout-toc.js';
import type { Toc, UiTocHostState } from '../../src/components/ui/toc/toc.js';
import { nextAnimationFrame, waitForLitUpdate } from './helpers/wait-for-lit.js';

const headingsJson = JSON.stringify([
  { id: '71-配列の生成', text: '7.1 配列の生成', level: 2 },
  { id: '72-配列の要素の読み書き', text: '7.2 配列の要素の読み書き', level: 2 },
]);

interface LayoutTocInternals {
  _applyActiveId(id: string): void;
  _syncRenderedTocProps(): void;
}

type SyncableUiToc = Toc & {
  applyHostState?(state: UiTocHostState): void;
  matchesHostState?(state: UiTocHostState): boolean;
};

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

const queryDesktopToc = (host: LayoutToc): SyncableUiToc | null =>
  host.shadowRoot?.querySelector<SyncableUiToc>('.desktop ui-toc') ?? null;

describe('layout-toc hydration reconciliation', () => {
  it('子 ui-toc が host state と不整合な場合でも再生成して activeId を復旧すること', async () => {
    document.body.innerHTML = `
      <article id="note-content">
        <h2 id="71-配列の生成">7.1 配列の生成</h2>
        <p>配列の生成に関する本文。</p>
        <h2 id="72-配列の要素の読み書き">7.2 配列の要素の読み書き</h2>
        <p>配列の要素の読み書きに関する本文。</p>
      </article>
    `;

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
    const staleChild = queryDesktopToc(host);
    if (!staleChild) {
      throw new Error('desktop ui-toc が見つかりません');
    }

    staleChild.applyHostState = () => undefined;
    staleChild.matchesHostState = () => false;
    staleChild.activeId = '71-配列の生成';
    staleChild.setAttribute('active-id', '71-配列の生成');

    internals._applyActiveId('72-配列の要素の読み書き');
    internals._syncRenderedTocProps();
    await flush(host);

    const repairedChild = queryDesktopToc(host);
    if (!repairedChild) {
      throw new Error('復旧後の desktop ui-toc が見つかりません');
    }

    expect(repairedChild).to.not.equal(staleChild);
    expect(repairedChild.activeId).to.equal('72-配列の要素の読み書き');
    expect(repairedChild.getAttribute('active-id')).to.equal('72-配列の要素の読み書き');
    expect(
      repairedChild.shadowRoot
        ?.querySelector('a.toc-link.is-active .toc-link-label')
        ?.textContent?.trim(),
    ).to.equal('7.2 配列の要素の読み書き');
  });
});