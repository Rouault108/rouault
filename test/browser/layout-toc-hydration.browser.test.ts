import { html } from 'lit/static-html.js';
import { afterEach, describe, expect, it } from 'vitest';
import { fixture } from './harness/browser-fixture.js';
import '@lit-labs/ssr-client/lit-element-hydrate-support.js';
import { HydrationScheduler } from '../../src/client/hydration/scheduler.js';
import { planHydration } from '../../src/client/hydration/planner.js';
import '../../src/components/layout/layout-toc.js';
import '../../src/components/ui/toc/toc.js';
import type { LayoutToc } from '../../src/components/layout/layout-toc.js';
import { activateLayoutToc } from '../../src/components/layout/layout-toc.js';
import { layoutTocMobileController } from '../../src/components/layout/layout-toc-mobile-controller.js';
import { layoutTocRuntimeStore } from '../../src/components/layout/layout-toc-runtime-store.js';
import type { Toc } from '../../src/components/ui/toc/toc.js';
import type { HydrationDiagnostics } from '../../src/client/hydration/types.js';
import { TOC_MOBILE_PANEL_SELECTOR } from '../../src/toc/toc-mobile-panel-dom-css-contract.js';
import { replaceElementChildrenFromHtml } from '../../src/router/declarative-shadow-dom.js';
import {
  nextAnimationFrame,
  waitForCondition,
  waitForLitUpdate,
} from './harness/browser-test-utilities.js';

const headings = [
  { id: '71-配列の生成', text: '7.1 配列の生成', level: 2 },
  { id: '72-配列の要素の読み書き', text: '7.2 配列の要素の読み書き', level: 2 },
] as const;

const headingsJson = JSON.stringify(headings);
const secondHeadingId = '72-配列の要素の読み書き';
const secondHeadingLabel = '7.2 配列の要素の読み書き';

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

const queryMobileToc = (host: LayoutToc): Toc | null =>
  host.shadowRoot?.querySelector<Toc>(`${TOC_MOBILE_PANEL_SELECTOR} ui-toc`) ?? null;

const hasMobilePanelTitle = (host: LayoutToc): boolean =>
  (host.shadowRoot?.querySelector('.mobile-panel-title') ?? null) !== null;

const queryMobilePanelCloseButton = (host: LayoutToc): HTMLButtonElement | null =>
  host.shadowRoot?.querySelector<HTMLButtonElement>(`${TOC_MOBILE_PANEL_SELECTOR} .close-button`) ??
  null;

const readTocNavigationLabel = (toc: Toc | null): string | null =>
  toc?.shadowRoot?.querySelector<HTMLElement>('nav')?.getAttribute('aria-label') ?? null;

const readActiveLabel = (toc: Toc | null): string | null =>
  toc?.shadowRoot
    ?.querySelector<HTMLElement>('a.toc-link.is-active .toc-link-label')
    ?.textContent?.trim() ?? null;

const queryActiveTocLink = (toc: Toc | null): HTMLAnchorElement | null =>
  toc?.shadowRoot?.querySelector<HTMLAnchorElement>('a.toc-link.is-active') ?? null;

const queryActiveTocTooltip = (toc: Toc | null): HTMLElement | null =>
  queryActiveTocLink(toc)?.closest<HTMLElement>('ui-tooltip') ?? null;

const readActiveControllerLabel = (root: ParentNode): string | null =>
  root
    .querySelector<HTMLElement>(
      '[data-layout-toc-nav] [data-toc-link][data-active="true"] .layout-toc__link-label',
    )
    ?.textContent?.trim() ?? null;

const waitForActiveDom = async (toc: Toc, expected: string): Promise<void> => {
  await waitForCondition(async () => {
    await waitForLitUpdate(toc);
    await nextAnimationFrame();
    return readActiveLabel(toc) === expected;
  }, `active DOM label が ${expected} へ同期すること`);
};

const withLocationHash = (nextId: string | null): (() => void) => {
  const previousUrl = window.location.href;
  const nextUrl = new URL(previousUrl);
  nextUrl.hash = nextId ? `#${encodeURIComponent(nextId)}` : '';
  window.history.replaceState({}, '', nextUrl.toString());
  return () => {
    window.history.replaceState({}, '', previousUrl);
  };
};

const hydrateWithScheduler = async (root: HTMLElement): Promise<HydrationDiagnostics> => {
  const scheduler = new HydrationScheduler();
  let diagnostics: HydrationDiagnostics | null = null;

  root.addEventListener(
    'router-document-host:hydration-diagnostics',
    (event: Event) => {
      diagnostics = (event as CustomEvent<HydrationDiagnostics>).detail;
    },
    { once: true },
  );

  await scheduler.hydrateContent(root, { dispatchTarget: root });
  await waitForCondition(() => diagnostics !== null, 'layout-toc の hydration diagnostics が発火すること');

  if (diagnostics === null) {
    throw new Error('hydration diagnostics が取得できません');
  }

  return diagnostics;
};

const withTruncatedTocLabels = (): (() => void) => {
  const scrollWidthDescriptor = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    'scrollWidth',
  );
  const clientWidthDescriptor = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    'clientWidth',
  );
  const scrollHeightDescriptor = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    'scrollHeight',
  );
  const clientHeightDescriptor = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    'clientHeight',
  );

  Object.defineProperties(HTMLElement.prototype, {
    scrollWidth: {
      configurable: true,
      get() {
        return this instanceof HTMLElement && this.classList.contains('toc-link-label') ? 320 : 0;
      },
    },
    clientWidth: {
      configurable: true,
      get() {
        return this instanceof HTMLElement && this.classList.contains('toc-link-label') ? 120 : 0;
      },
    },
    scrollHeight: {
      configurable: true,
      get() {
        return this instanceof HTMLElement && this.classList.contains('toc-link-label') ? 72 : 0;
      },
    },
    clientHeight: {
      configurable: true,
      get() {
        return this instanceof HTMLElement && this.classList.contains('toc-link-label') ? 48 : 0;
      },
    },
  });

  return () => {
    for (const [property, descriptor] of [
      ['scrollWidth', scrollWidthDescriptor],
      ['clientWidth', clientWidthDescriptor],
      ['scrollHeight', scrollHeightDescriptor],
      ['clientHeight', clientHeightDescriptor],
    ] as const) {
      if (descriptor) {
        Object.defineProperty(HTMLElement.prototype, property, descriptor);
      } else {
        Reflect.deleteProperty(HTMLElement.prototype, property);
      }
    }
  };
};

const appendArticleFixture = (): (() => void) => {
  const wrapper = document.createElement('div');
  wrapper.setAttribute('data-test-article-fixture', 'layout-toc');
  wrapper.innerHTML = `
    <article id="note-content">
      <h2 id="71-配列の生成">7.1 配列の生成</h2>
      <p style="min-height: 160px">配列の生成に関する本文。</p>
      <h2 id="72-配列の要素の読み書き">7.2 配列の要素の読み書き</h2>
      <p>配列の要素の読み書きに関する本文。</p>
    </article>
    <script id="toc-source-test" type="application/json">${headingsJson}</script>
  `;
  document.body.append(wrapper);
  return () => {
    wrapper.remove();
  };
};

const renderStaleSsrLayoutTocController = async (): Promise<{
  root: HTMLElement;
  controller: HTMLElement;
}> => {
  const root = await fixture<HTMLElement>(html`<main id="main-content"></main>`);

  replaceElementChildrenFromHtml(
    root,
    `
      <div
        class="layout-toc-col"
        data-layout-toc-root
        data-hydration-scope="note-toc"
      >
        <nav class="layout-toc" aria-label="目次" data-layout-toc-nav>
          <ol class="layout-toc__list">
            <li class="layout-toc__item" data-heading-id="71-配列の生成">
              <a
                class="layout-toc__link is-active"
                href="#71-配列の生成"
                data-toc-link
                data-heading-id="71-配列の生成"
                aria-current="location"
                data-active="true"
              >
                <span class="layout-toc__link-label">7.1 配列の生成</span>
              </a>
            </li>
            <li class="layout-toc__item" data-heading-id="72-配列の要素の読み書き">
              <a
                class="layout-toc__link"
                href="#72-配列の要素の読み書き"
                data-toc-link
                data-heading-id="72-配列の要素の読み書き"
              >
                <span class="layout-toc__link-label">7.2 配列の要素の読み書き</span>
              </a>
            </li>
          </ol>
        </nav>
        <layout-toc-controller
          source-id="toc-source-test"
          toc-runtime-id="toc-source-test"
          content-root-id="note-content"
          capabilities-json='{"activeTracking":true,"dynamicScopes":false,"mobilePanel":true}'
          data-hydration-capability="interactive"
          data-hydration-trigger="initial"
        ></layout-toc-controller>
      </div>
    `,
    root.ownerDocument,
  );

  const controller = root.querySelector<HTMLElement>('layout-toc-controller');
  if (!(controller instanceof HTMLElement)) {
    throw new Error('layout-toc-controller が見つかりません');
  }

  return { root, controller };
};

describe('layout-toc hydration reconciliation', () => {
  afterEach(() => {
    layoutTocMobileController.reset();
    layoutTocRuntimeStore.reset();
    document.querySelectorAll(TOC_MOBILE_PANEL_SELECTOR).forEach((element) => element.remove());
  });

  it('hydrate 後に location hash と ui-toc の active DOM が一致すること', async () => {
    const cleanup = appendArticleFixture();
    const restoreHash = withLocationHash(secondHeadingId);

    try {
      const host = await fixture<LayoutToc>(html`
        <layout-toc
          .headingsJson=${headingsJson}
          content-root-id="note-content"
          data-hydration-trigger="manual"
        ></layout-toc>
      `);

      await flush(host);
      await activateLayoutToc(host);
      await flush(host);

      const desktopToc = queryDesktopToc(host);
      if (!desktopToc) {
        throw new Error('desktop ui-toc が見つかりません');
      }

      expect(desktopToc.activeId).to.equal(secondHeadingId);
      expect(desktopToc.getAttribute('active-id')).to.equal(secondHeadingId);

      const mobilePanel =
        host.shadowRoot?.querySelector<HTMLElement>(TOC_MOBILE_PANEL_SELECTOR) ?? null;
      expect(mobilePanel?.getAttribute('aria-hidden')).to.equal('true');
      expect(mobilePanel?.hasAttribute('inert')).to.equal(true);
      expect(mobilePanel?.getAttribute('data-hydration-state')).to.equal('hydrated');

      await waitForActiveDom(desktopToc, secondHeadingLabel);
      expect(readActiveLabel(desktopToc)).to.equal(secondHeadingLabel);
    } finally {
      restoreHash();
      cleanup();
    }
  });

  it('reserved layout-toc-controller trigger は hydration plan から除外すること', async () => {
    const root = await fixture<HTMLElement>(html`
      <section data-hydration-scope="note-toc">
        <layout-toc-controller
          data-toc-trigger-reserved="true"
          data-hydration-capability="interactive"
          data-hydration-trigger="initial"
        ></layout-toc-controller>
      </section>
    `);

    expect(planHydration(root)).to.deep.equal([{ scope: 'note-toc', items: [] }]);
  });

  it('hydrate 開始直後でも location hash の active が失われないこと', async () => {
    const cleanup = appendArticleFixture();
    const restoreHash = withLocationHash(secondHeadingId);

    try {
      const host = await fixture<LayoutToc>(html`
        <layout-toc
          .headingsJson=${headingsJson}
          content-root-id="note-content"
          data-hydration-trigger="manual"
        ></layout-toc>
      `);

      await activateLayoutToc(host);
      await flush(host);

      const desktopToc = queryDesktopToc(host);
      if (!desktopToc) {
        throw new Error('desktop ui-toc が見つかりません');
      }

      expect(desktopToc.activeId).to.equal(secondHeadingId);
      await waitForActiveDom(desktopToc, secondHeadingLabel);
      expect(readActiveLabel(desktopToc)).to.equal(secondHeadingLabel);
    } finally {
      restoreHash();
      cleanup();
    }
  });

  it('ui-toc は activeId prop 更新後に updateComplete をまたいでも active DOM が非 null のままであること', async () => {
    const toc = await fixture<Toc>(html`
      <ui-toc .headers=${[...headings]} active-id="71-配列の生成"></ui-toc>
    `);

    await waitForLitUpdate(toc);
    await nextAnimationFrame();

    toc.activeId = secondHeadingId;
    await toc.updateComplete;
    await nextAnimationFrame();
    await toc.updateComplete;
    await nextAnimationFrame();

    expect(toc.activeId).to.equal(secondHeadingId);
    expect(toc.getAttribute('active-id')).to.equal(secondHeadingId);

    await waitForActiveDom(toc, secondHeadingLabel);
    expect(readActiveLabel(toc)).to.equal(secondHeadingLabel);
  });

  it('ui-toc は truncated な active 項目の tooltip を有効にし、native title を付与しないこと', async () => {
    const restoreMetrics = withTruncatedTocLabels();
    const longHeadingLabel = '3.3 前処理ディレクティブとビルド文脈における長い見出し表示の検証項目';

    try {
      const toc = await fixture<Toc>(html`
        <ui-toc
          .headers=${[
            { id: 'long-current', text: longHeadingLabel, level: 2 },
            { id: 'long-next', text: '次の見出し', level: 4 },
          ]}
          active-id="long-current"
        ></ui-toc>
      `);

      await waitForCondition(async () => {
        await waitForLitUpdate(toc);
        await nextAnimationFrame();
        return queryActiveTocTooltip(toc)?.hasAttribute('disabled') === false;
      }, 'truncated な active tooltip が有効化されること');

      const activeLink = queryActiveTocLink(toc);
      expect(activeLink?.getAttribute('title')).to.equal(null);
      expect(activeLink?.getAttribute('data-heading-depth')).to.equal('0');
      expect(readActiveLabel(toc)).to.equal(longHeadingLabel);
      expect(queryActiveTocTooltip(toc)?.hasAttribute('disabled')).to.equal(false);

      toc.activeId = 'long-next';
      await waitForCondition(async () => {
        await waitForLitUpdate(toc);
        await nextAnimationFrame();
        return readActiveLabel(toc) === '次の見出し';
      }, 'active DOM が更新後の見出しへ同期すること');

      expect(queryActiveTocTooltip(toc)?.hasAttribute('disabled')).to.equal(false);
      expect(queryActiveTocLink(toc)?.getAttribute('title')).to.equal(null);
      expect(queryActiveTocLink(toc)?.getAttribute('data-heading-depth')).to.equal('2');
    } finally {
      restoreMetrics();
    }
  });

  it('SSR の DSD 経路でも stale な ui-toc が hydrate 後に hash と同期できること', async () => {
    const cleanup = appendArticleFixture();
    const restoreHash = withLocationHash(secondHeadingId);

    try {
      const root = await fixture<HTMLElement>(html`<main></main>`);

      replaceElementChildrenFromHtml(
        root,
        `
          <layout-toc
            headings-json='${headingsJson}'
            content-root-id="note-content"
            data-hydration-trigger="manual"
          >
            <template shadowrootmode="open">
              <div class="desktop">
                <ui-toc active-id="71-配列の生成">
                  <template shadowrootmode="open">
                    <nav aria-label="目次">
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
      await activateLayoutToc(host);
      await flush(host);

      const desktopToc = queryDesktopToc(host);
      if (!desktopToc) {
        throw new Error('desktop ui-toc が見つかりません');
      }

      expect(desktopToc.activeId).to.equal(secondHeadingId);
      expect(desktopToc.getAttribute('active-id')).to.equal(secondHeadingId);

      const mobilePanel =
        host.shadowRoot?.querySelector<HTMLElement>(TOC_MOBILE_PANEL_SELECTOR) ?? null;
      expect(mobilePanel?.getAttribute('aria-hidden')).to.equal('true');
      expect(mobilePanel?.hasAttribute('inert')).to.equal(true);

      await waitForActiveDom(desktopToc, secondHeadingLabel);
      expect(readActiveLabel(desktopToc)).to.equal(secondHeadingLabel);
    } finally {
      restoreHash();
      cleanup();
    }
  });

  it('HydrationScheduler の SSR 経路でも stale な layout-toc-controller が hydrate 後に hash と同期できること', async () => {
    const cleanup = appendArticleFixture();
    const restoreHash = withLocationHash(secondHeadingId);

    try {
      const { root } = await renderStaleSsrLayoutTocController();

      const diagnostics = await hydrateWithScheduler(root);

      expect(diagnostics.plannedCount).to.equal(1);
      expect(diagnostics.failedCount).to.equal(0);
      expect(diagnostics.activatedCount).to.equal(1);

      await waitForCondition(
        () => readActiveControllerLabel(root) === secondHeadingLabel,
        'layout-toc-controller の active DOM が hash と同期すること',
      );
      const activeLink = root.querySelector<HTMLAnchorElement>(
        `[data-layout-toc-nav] [data-toc-link][data-heading-id="${secondHeadingId}"]`,
      );
      expect(activeLink?.getAttribute('aria-current')).to.equal('location');
      expect(activeLink?.getAttribute('data-active')).to.equal('true');

      const mobilePanel = document.querySelector<HTMLElement>(TOC_MOBILE_PANEL_SELECTOR);
      expect(mobilePanel?.getAttribute('aria-hidden')).to.equal('true');
      expect(mobilePanel?.hasAttribute('inert')).to.equal(true);
      expect(mobilePanel?.hasAttribute('hidden')).to.equal(true);
      expect(mobilePanel?.getAttribute('data-hydration-state')).to.equal('hydrated');
      expect(layoutTocRuntimeStore.getSnapshot('toc-source-test').hydrationState).to.equal(
        'hydrated',
      );
    } finally {
      restoreHash();
      cleanup();
    }
  });

  it('mobile panel header は視覚タイトルを持たず close-only で、目次ラベルは ui-toc が保持すること', async () => {
    const cleanup = appendArticleFixture();
    const restoreHash = withLocationHash(secondHeadingId);

    try {
      const host = await fixture<LayoutToc>(html`
        <layout-toc
          .headingsJson=${headingsJson}
          content-root-id="note-content"
          toc-runtime-id="test-toc"
          data-hydration-trigger="manual"
        ></layout-toc>
      `);

      await activateLayoutToc(host);
      await flush(host);

      expect(hasMobilePanelTitle(host)).to.equal(false);
      expect(queryMobilePanelCloseButton(host)).to.be.instanceOf(HTMLButtonElement);

      layoutTocMobileController.open('test-toc');
      await flush(host);

      expect(hasMobilePanelTitle(host)).to.equal(false);
      expect(queryMobilePanelCloseButton(host)?.getAttribute('aria-label')).to.equal(
        '目次を閉じる',
      );

      const mobileToc = queryMobileToc(host);
      if (!mobileToc) {
        throw new Error('mobile ui-toc が見つかりません');
      }

      expect(readTocNavigationLabel(mobileToc)).to.equal('目次');
      expect(mobileToc.activeId).to.equal(secondHeadingId);
      await waitForActiveDom(mobileToc, secondHeadingLabel);
      expect(readActiveLabel(mobileToc)).to.equal(secondHeadingLabel);
    } finally {
      restoreHash();
      cleanup();
    }
  });
});
