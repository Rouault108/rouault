import { expect, fixture, html, waitUntil } from '@open-wc/testing';
import '@lit-labs/ssr-client/lit-element-hydrate-support.js';
import { HydrationScheduler } from '../../src/client/hydration/scheduler.js';
import '../../src/components/layout/layout-toc.js';
import '../../src/components/ui/toc/toc.js';
import type { LayoutToc } from '../../src/components/layout/layout-toc.js';
import type { Toc } from '../../src/components/ui/toc/toc.js';
import type { HydrationDiagnostics } from '../../src/client/hydration/types.js';
import { replaceElementChildrenFromHtml } from '../../src/router/declarative-shadow-dom.js';
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

const hydrateWithScheduler = async (root: HTMLElement): Promise<HydrationDiagnostics> => {
  const scheduler = new HydrationScheduler();
  let diagnostics: HydrationDiagnostics | null = null;

  root.addEventListener(
    'app-router:hydration-diagnostics',
    (event: Event) => {
      diagnostics = (event as CustomEvent<HydrationDiagnostics>).detail;
    },
    { once: true },
  );

  await scheduler.hydrateContent(root, { dispatchTarget: root });
  await waitUntil(() => diagnostics !== null, 'layout-toc の hydration diagnostics が発火すること');

  if (diagnostics === null) {
    throw new Error('hydration diagnostics が取得できません');
  }

  return diagnostics;
};

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

  it('SSR の DSD / defer-hydration 経路でも stale な ui-toc を張り直して同期できること', async () => {
    const cleanup = appendArticleFixture();

    try {
      const root = await fixture<HTMLElement>(html`<main></main>`);

      replaceElementChildrenFromHtml(
        root,
        `
          <layout-toc
            headings-json='${headingsJson}'
            content-root-id="note-content"
            data-hydration-trigger="manual"
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
        `,
        root.ownerDocument,
      );

      const host = root.querySelector<LayoutToc>('layout-toc');
      if (!(host instanceof HTMLElement)) {
        throw new Error('layout-toc が見つかりません');
      }

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

      expect(host.hasAttribute('defer-hydration')).to.equal(false);
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

  it('HydrationScheduler の SSR 経路でも stale な ui-toc を張り直して同期できること', async () => {
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

      const diagnostics = await hydrateWithScheduler(root);

      const host = root.querySelector<LayoutToc>('layout-toc');
      if (!(host instanceof HTMLElement)) {
        throw new Error('layout-toc が見つかりません');
      }

      await flush(host);

      expect(diagnostics.plannedCount).to.equal(1);
      expect(diagnostics.failedCount).to.equal(0);
      expect(diagnostics.activatedCount).to.equal(1);
      expect(host.hasAttribute('defer-hydration')).to.equal(false);

      const internals = host as unknown as LayoutTocInternals;
      internals._applyActiveId('72-配列の要素の読み書き');
      await flush(host);

      const desktopToc = queryDesktopToc(host);
      if (!desktopToc) {
        throw new Error('desktop ui-toc が見つかりません');
      }

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
