import { expect, fixture, html, waitUntil } from '@open-wc/testing';
import {
  activateLayoutTocController,
  type LayoutTocController,
} from '../../src/components/layout/layout-toc-controller.js';
import { layoutTocMobileController } from '../../src/components/layout/layout-toc-mobile-controller.js';
import { layoutTocRuntimeStore } from '../../src/components/layout/layout-toc-runtime-store.js';
import {
  syncTocActiveLinks,
  syncTocHeadingVisibility,
} from '../../src/toc/toc-desktop-nav-sync.js';
import { TOC_MOBILE_PANEL_SELECTOR } from '../../src/toc/toc-mobile-panel-dom-css-contract.js';

const headings = [
  { id: 'section-1', text: 'Section 1', level: 2 },
  { id: 'section-2', text: 'Section 2', level: 3 },
] as const;

const appendContentFixture = (): (() => void) => {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = `
    <article id="note-content-test">
      <h2 id="section-1">Section 1</h2>
      <p style="min-height: 160px">first</p>
      <h3 id="section-2">Section 2</h3>
      <p>second</p>
    </article>
    <script id="toc-source-test" type="application/json" data-toc-owner-id="toc-owner-test">${JSON.stringify(headings)}</script>
  `;
  document.body.append(wrapper);

  return () => {
    wrapper.remove();
  };
};

const withLocationHash = (id: string): (() => void) => {
  const previousUrl = window.location.href;
  const nextUrl = new URL(previousUrl);
  nextUrl.hash = `#${encodeURIComponent(id)}`;
  window.history.replaceState({}, '', nextUrl.toString());

  return () => {
    window.history.replaceState({}, '', previousUrl);
  };
};

describe('layout-toc-controller', () => {
  afterEach(() => {
    layoutTocMobileController.reset();
    layoutTocRuntimeStore.reset();
    document.querySelectorAll(TOC_MOBILE_PANEL_SELECTOR).forEach((element) => element.remove());
  });

  it('hydrate 後に SSR nav の active state と runtime snapshot を同期すること', async () => {
    const cleanup = appendContentFixture();
    const restoreHash = withLocationHash('section-2');
    let root: HTMLElement | null = null;

    try {
      const currentRoot = await fixture<HTMLElement>(html`
        <aside data-layout-toc-root>
          <nav class="layout-toc" aria-label="目次" data-layout-toc-nav>
            <ol class="layout-toc__list">
              <li class="layout-toc__item" data-heading-id="section-1">
                <a
                  class="layout-toc__link"
                  href="#section-1"
                  data-toc-link
                  data-heading-id="section-1"
                >
                  <span class="layout-toc__link-label">Section 1</span>
                </a>
              </li>
              <li class="layout-toc__item" data-heading-id="section-2">
                <a
                  class="layout-toc__link"
                  href="#section-2"
                  data-toc-link
                  data-heading-id="section-2"
                >
                  <span class="layout-toc__link-label">Section 2</span>
                </a>
              </li>
            </ol>
          </nav>
          <layout-toc-controller
            source-id="toc-source-test"
            toc-runtime-id="toc-source-test"
            content-root-id="note-content-test"
            capabilities-json='{"activeTracking":true,"dynamicScopes":false,"mobilePanel":true}'
          ></layout-toc-controller>
        </aside>
      `);
      root = currentRoot;

      const controller = currentRoot.querySelector<LayoutTocController>('layout-toc-controller');
      if (!(controller instanceof HTMLElement)) {
        throw new Error('layout-toc-controller が見つかりません');
      }

      activateLayoutTocController(controller);

      await waitUntil(() => {
        return (
          currentRoot
            .querySelector<HTMLAnchorElement>('[data-toc-link][data-heading-id="section-2"]')
            ?.getAttribute('aria-current') === 'location'
        );
      }, 'active link が hash と同期すること');

      const activeLink = currentRoot.querySelector<HTMLAnchorElement>(
        '[data-toc-link][data-heading-id="section-2"]',
      );
      const inactiveLink = currentRoot.querySelector<HTMLAnchorElement>(
        '[data-toc-link][data-heading-id="section-1"]',
      );
      const mobilePanel = document.querySelector<HTMLElement>(TOC_MOBILE_PANEL_SELECTOR);
      const mobileActiveLink = mobilePanel?.querySelector<HTMLAnchorElement>(
        '[data-layout-toc-mobile-nav] [data-toc-link][data-heading-id="section-2"]',
      );

      expect(activeLink?.classList.contains('is-active')).to.equal(true);
      expect(activeLink?.getAttribute('data-active')).to.equal('true');
      expect(activeLink?.getAttribute('aria-current')).to.equal('location');
      expect(inactiveLink?.classList.contains('is-active')).to.equal(false);
      expect(inactiveLink?.hasAttribute('data-active')).to.equal(false);
      expect(inactiveLink?.hasAttribute('aria-current')).to.equal(false);
      expect(mobileActiveLink?.classList.contains('is-active')).to.equal(true);
      expect(mobileActiveLink?.getAttribute('data-active')).to.equal('true');
      expect(mobileActiveLink?.getAttribute('aria-current')).to.equal('location');
      expect(mobilePanel?.id).to.equal('layout-toc-panel-toc-source-test');
      expect(mobilePanel?.hasAttribute('data-layout-toc-mobile-panel')).to.equal(true);
      expect(
        currentRoot.querySelector('[data-layout-toc-nav]')?.getAttribute('data-density-tier'),
      ).to.equal('expanded');
      expect(mobilePanel?.getAttribute('data-density-tier')).to.equal('expanded');
      expect(
        mobilePanel
          ?.querySelector('[data-layout-toc-mobile-nav]')
          ?.getAttribute('data-density-tier'),
      ).to.equal('expanded');

      const snapshot = layoutTocRuntimeStore.getSnapshot('toc-source-test');
      expect(snapshot.ready).to.equal(true);
      expect(snapshot.hasVisibleHeadings).to.equal(true);
      expect(snapshot.activeId).to.equal('section-2');
      expect(snapshot.hydrationState).to.equal('hydrated');
    } finally {
      root?.remove();
      restoreHash();
      cleanup();
    }
  });

  it('desktop nav sync helper が stale current state を削除し diagnostic snapshot を返すこと', async () => {
    const nav = await fixture<HTMLElement>(html`
      <nav>
        <ol>
          <li class="layout-toc__item" data-heading-id="section-1">
            <a
              class="is-active"
              href="#section-1"
              data-toc-link
              data-heading-id="section-1"
              data-active="true"
              aria-current="location"
              >Section 1</a
            >
          </li>
          <li class="layout-toc__item" data-heading-id="section-2">
            <a href="#section-2" data-toc-link data-heading-id="section-2">Section 2</a>
          </li>
        </ol>
      </nav>
    `);

    syncTocHeadingVisibility(nav, new Set(['section-2']));
    const snapshot = syncTocActiveLinks({
      nav,
      ownerId: 'toc-source-test',
      activeHeadingId: 'missing-heading',
      visibleHeadingIds: new Set(['section-2']),
    });

    expect(
      nav.querySelector<HTMLElement>('.layout-toc__item[data-heading-id="section-1"]')?.hidden,
    ).to.equal(true);
    expect(nav.querySelector('[aria-current]')).to.equal(null);
    expect(nav.querySelector('[data-active]')).to.equal(null);
    expect(nav.querySelector('.is-active')).to.equal(null);
    expect(snapshot.activeHeadingId).to.equal('missing-heading');
    expect(snapshot.diagnostics).to.deep.equal([
      {
        reason: 'missing-active-heading',
        ownerId: 'toc-source-test',
      },
    ]);
  });

  it('visible headings が空になったとき stale current state を desktop / mobile から削除すること', async () => {
    const cleanup = appendContentFixture();
    const restoreHash = withLocationHash('section-2');
    let root: HTMLElement | null = null;

    try {
      const currentRoot = await fixture<HTMLElement>(html`
        <aside data-layout-toc-root>
          <nav class="layout-toc" aria-label="目次" data-layout-toc-nav>
            <ol class="layout-toc__list">
              <li class="layout-toc__item" data-heading-id="section-1">
                <a
                  class="layout-toc__link"
                  href="#section-1"
                  data-toc-link
                  data-heading-id="section-1"
                >
                  <span class="layout-toc__link-label">Section 1</span>
                </a>
              </li>
              <li class="layout-toc__item" data-heading-id="section-2">
                <a
                  class="layout-toc__link"
                  href="#section-2"
                  data-toc-link
                  data-heading-id="section-2"
                >
                  <span class="layout-toc__link-label">Section 2</span>
                </a>
              </li>
            </ol>
          </nav>
          <layout-toc-controller
            source-id="toc-source-test"
            toc-runtime-id="toc-source-test"
            content-root-id="note-content-test"
            capabilities-json='{"activeTracking":true,"dynamicScopes":false,"mobilePanel":true}'
          ></layout-toc-controller>
        </aside>
      `);
      root = currentRoot;

      const controller = currentRoot.querySelector<LayoutTocController>('layout-toc-controller');
      if (!(controller instanceof HTMLElement)) {
        throw new Error('layout-toc-controller が見つかりません');
      }

      activateLayoutTocController(controller);

      await waitUntil(
        () => currentRoot.querySelector('[data-toc-link][aria-current="location"]') !== null,
        '事前に current state が同期されること',
      );

      document.querySelector('#section-1')?.remove();
      document.querySelector('#section-2')?.remove();

      await waitUntil(() => {
        const snapshot = layoutTocRuntimeStore.getSnapshot('toc-source-test');
        return snapshot.ready && !snapshot.hasVisibleHeadings && snapshot.activeId === null;
      }, 'visible headings 空状態が snapshot に反映されること');

      const mobilePanel = document.querySelector<HTMLElement>(TOC_MOBILE_PANEL_SELECTOR);
      expect(currentRoot.querySelector('.is-active')).to.equal(null);
      expect(currentRoot.querySelector('[data-active]')).to.equal(null);
      expect(currentRoot.querySelector('[aria-current]')).to.equal(null);
      expect(mobilePanel?.querySelector('.is-active')).to.equal(null);
      expect(mobilePanel?.querySelector('[data-active]')).to.equal(null);
      expect(mobilePanel?.querySelector('[aria-current]')).to.equal(null);
    } finally {
      root?.remove();
      restoreHash();
      cleanup();
    }
  });

  it('active id 対応 link がない nav では seeded stale current state を削除すること', async () => {
    const cleanup = appendContentFixture();
    const restoreHash = withLocationHash('section-2');
    let root: HTMLElement | null = null;

    try {
      const currentRoot = await fixture<HTMLElement>(html`
        <aside data-layout-toc-root>
          <nav class="layout-toc" aria-label="目次" data-layout-toc-nav>
            <ol class="layout-toc__list">
              <li class="layout-toc__item" data-heading-id="section-1">
                <a
                  class="layout-toc__link"
                  href="#section-1"
                  data-toc-link
                  data-heading-id="section-1"
                >
                  <span class="layout-toc__link-label">Section 1</span>
                </a>
              </li>
              <li class="layout-toc__item" data-heading-id="section-2">
                <a
                  class="layout-toc__link"
                  href="#section-2"
                  data-toc-link
                  data-heading-id="section-2"
                >
                  <span class="layout-toc__link-label">Section 2</span>
                </a>
              </li>
            </ol>
          </nav>
          <layout-toc-controller
            source-id="toc-source-test"
            toc-runtime-id="toc-source-test"
            content-root-id="note-content-test"
            capabilities-json='{"activeTracking":true,"dynamicScopes":false,"mobilePanel":true}'
          ></layout-toc-controller>
        </aside>
      `);
      root = currentRoot;

      const controller = currentRoot.querySelector<LayoutTocController>('layout-toc-controller');
      if (!(controller instanceof HTMLElement)) {
        throw new Error('layout-toc-controller が見つかりません');
      }

      activateLayoutTocController(controller);

      await waitUntil(
        () =>
          currentRoot.querySelector('[data-toc-link][data-heading-id="section-2"].is-active') !==
          null,
        'desktop nav の current state が同期されること',
      );

      const mobilePanel = document.querySelector<HTMLElement>(TOC_MOBILE_PANEL_SELECTOR);
      const mobileNav = mobilePanel?.querySelector<HTMLElement>('[data-layout-toc-mobile-nav]');
      const mobileSection2Item = mobileNav
        ?.querySelector<HTMLAnchorElement>('[data-toc-link][data-heading-id="section-2"]')
        ?.closest('.layout-toc__item');
      const staleLink = mobileNav?.querySelector<HTMLAnchorElement>(
        '[data-toc-link][data-heading-id="section-1"]',
      );
      if (!(mobileNav instanceof HTMLElement) || !(staleLink instanceof HTMLAnchorElement)) {
        throw new Error('mobile nav の stale seed 対象が見つかりません');
      }

      mobileSection2Item?.remove();
      staleLink.classList.add('is-active');
      staleLink.setAttribute('data-active', 'true');
      staleLink.setAttribute('aria-current', 'location');

      currentRoot
        .querySelector<HTMLAnchorElement>('[data-toc-link][data-heading-id="section-2"]')
        ?.dispatchEvent(
          new MouseEvent('click', { bubbles: true, composed: true, cancelable: true }),
        );

      expect(mobileNav.querySelector('.is-active')).to.equal(null);
      expect(mobileNav.querySelector('[data-active]')).to.equal(null);
      expect(mobileNav.querySelector('[aria-current]')).to.equal(null);
      expect(
        currentRoot
          .querySelector('[data-toc-link][data-heading-id="section-2"]')
          ?.getAttribute('aria-current'),
      ).to.equal('location');
    } finally {
      root?.remove();
      restoreHash();
      cleanup();
    }
  });

  it('hash 対象が visible headings 外なら先頭 visible heading へ fallback すること', async () => {
    const cleanup = appendContentFixture();
    const restoreHash = withLocationHash('section-2');
    let root: HTMLElement | null = null;

    try {
      const hiddenPanel = document.createElement('section');
      hiddenPanel.setAttribute('role', 'tabpanel');
      hiddenPanel.setAttribute('hidden', '');
      const section2 = document.getElementById('section-2');
      if (!(section2 instanceof HTMLElement)) {
        throw new Error('section-2 heading が見つかりません');
      }
      section2.before(hiddenPanel);
      hiddenPanel.append(section2);

      const currentRoot = await fixture<HTMLElement>(html`
        <aside data-layout-toc-root>
          <nav class="layout-toc" aria-label="目次" data-layout-toc-nav>
            <ol class="layout-toc__list">
              <li class="layout-toc__item" data-heading-id="section-1">
                <a
                  class="layout-toc__link"
                  href="#section-1"
                  data-toc-link
                  data-heading-id="section-1"
                >
                  <span class="layout-toc__link-label">Section 1</span>
                </a>
              </li>
              <li class="layout-toc__item" data-heading-id="section-2">
                <a
                  class="layout-toc__link"
                  href="#section-2"
                  data-toc-link
                  data-heading-id="section-2"
                >
                  <span class="layout-toc__link-label">Section 2</span>
                </a>
              </li>
            </ol>
          </nav>
          <layout-toc-controller
            source-id="toc-source-test"
            toc-runtime-id="toc-source-test"
            content-root-id="note-content-test"
            capabilities-json='{"activeTracking":false,"dynamicScopes":false,"mobilePanel":false}'
          ></layout-toc-controller>
        </aside>
      `);
      root = currentRoot;

      const controller = currentRoot.querySelector<LayoutTocController>('layout-toc-controller');
      if (!(controller instanceof HTMLElement)) {
        throw new Error('layout-toc-controller が見つかりません');
      }

      activateLayoutTocController(controller);

      await waitUntil(() => {
        return (
          currentRoot
            .querySelector<HTMLAnchorElement>('[data-toc-link][data-heading-id="section-1"]')
            ?.getAttribute('aria-current') === 'location'
        );
      }, 'visible headings 外の hash が先頭 visible heading へ fallback すること');

      expect(layoutTocRuntimeStore.getSnapshot('toc-source-test').activeId).to.equal('section-1');
    } finally {
      root?.remove();
      restoreHash();
      cleanup();
    }
  });

  it('mobile panel 無効時も desktop SSR TOC click を navigation owner へ渡すこと', async () => {
    const cleanup = appendContentFixture();
    const previousUrl = window.location.href;
    let root: HTMLElement | null = null;

    try {
      const section2 = document.getElementById('section-2');
      if (!(section2 instanceof HTMLElement)) {
        throw new Error('section-2 heading が見つかりません');
      }

      document.documentElement.style.scrollPaddingTop = '0px';
      section2.style.scrollMarginTop = '0px';
      Object.defineProperty(section2, 'getBoundingClientRect', {
        configurable: true,
        value: () =>
          ({
            x: 0,
            y: 0,
            top: 0,
            left: 0,
            right: 800,
            bottom: 32,
            width: 800,
            height: 32,
            toJSON: () => undefined,
          }) satisfies DOMRect,
      });

      const currentRoot = await fixture<HTMLElement>(html`
        <aside data-layout-toc-root>
          <nav class="layout-toc" aria-label="目次" data-layout-toc-nav>
            <ol class="layout-toc__list">
              <li class="layout-toc__item" data-heading-id="section-1">
                <a
                  class="layout-toc__link"
                  href="#section-1"
                  data-toc-link
                  data-heading-id="section-1"
                >
                  <span class="layout-toc__link-label">Section 1</span>
                </a>
              </li>
              <li class="layout-toc__item" data-heading-id="section-2">
                <a
                  class="layout-toc__link"
                  href="#section-2"
                  data-toc-link
                  data-heading-id="section-2"
                >
                  <span class="layout-toc__link-label">Section 2</span>
                </a>
              </li>
            </ol>
          </nav>
          <layout-toc-controller
            source-id="toc-source-test"
            toc-runtime-id="toc-source-test"
            content-root-id="note-content-test"
            capabilities-json='{"activeTracking":false,"dynamicScopes":false,"mobilePanel":false}'
          ></layout-toc-controller>
        </aside>
      `);
      root = currentRoot;

      const controller = currentRoot.querySelector<LayoutTocController>('layout-toc-controller');
      const link = currentRoot.querySelector<HTMLAnchorElement>(
        '[data-toc-link][data-heading-id="section-2"]',
      );
      if (!(controller instanceof HTMLElement) || !(link instanceof HTMLAnchorElement)) {
        throw new Error('layout TOC fixture の構築に失敗しました');
      }

      activateLayoutTocController(controller);
      await waitUntil(
        () => layoutTocRuntimeStore.getSnapshot('toc-source-test').ready,
        'runtime snapshot が ready になること',
      );

      const clickEvent = new MouseEvent('click', {
        bubbles: true,
        composed: true,
        cancelable: true,
        button: 0,
      });
      link.dispatchEvent(clickEvent);

      expect(clickEvent.defaultPrevented).to.equal(true);
      expect(link.getAttribute('aria-current')).to.equal('location');
      expect(layoutTocRuntimeStore.getSnapshot('toc-source-test').activeId).to.equal('section-2');
      expect(window.location.hash).to.equal('#section-2');
      expect(document.querySelector(TOC_MOBILE_PANEL_SELECTOR)).to.equal(null);
    } finally {
      root?.remove();
      document.documentElement.style.scrollPaddingTop = '';
      window.history.replaceState({}, '', previousUrl);
      cleanup();
    }
  });

  it('mobile panel を body 直下へ生成し、リンク押下で閉じて focus を戻すこと', async () => {
    const cleanup = appendContentFixture();
    const originalFocus = HTMLElement.prototype.focus;
    const focusCalls: { element: HTMLElement; options: FocusOptions | undefined }[] = [];
    let root: HTMLElement | null = null;
    let trigger: HTMLButtonElement | null = null;

    HTMLElement.prototype.focus = function focusSpy(options?: FocusOptions): void {
      focusCalls.push({ element: this, options });
      originalFocus.call(this, options);
    };

    try {
      trigger = document.createElement('button');
      trigger.type = 'button';
      trigger.textContent = 'toc';
      document.body.append(trigger);

      const currentRoot = await fixture<HTMLElement>(html`
        <aside data-layout-toc-root>
          <nav class="layout-toc" aria-label="目次" data-layout-toc-nav>
            <ol class="layout-toc__list">
              <li class="layout-toc__item" data-heading-id="section-1">
                <a
                  class="layout-toc__link"
                  href="#section-1"
                  data-toc-link
                  data-heading-id="section-1"
                >
                  <span class="layout-toc__link-label">Section 1</span>
                </a>
              </li>
            </ol>
          </nav>
          <layout-toc-controller
            source-id="toc-source-test"
            toc-runtime-id="toc-source-test"
            content-root-id="note-content-test"
            capabilities-json='{"activeTracking":false,"dynamicScopes":false,"mobilePanel":true}'
          ></layout-toc-controller>
        </aside>
      `);
      root = currentRoot;

      const controller = currentRoot.querySelector<LayoutTocController>('layout-toc-controller');
      if (!(controller instanceof HTMLElement)) {
        throw new Error('layout-toc-controller が見つかりません');
      }

      activateLayoutTocController(controller);
      layoutTocMobileController.open('toc-source-test', trigger);

      const panel = document.querySelector<HTMLElement>(TOC_MOBILE_PANEL_SELECTOR);
      const link = panel?.querySelector<HTMLAnchorElement>(
        '[data-toc-link][data-heading-id="section-1"]',
      );
      if (!(panel instanceof HTMLElement) || !(link instanceof HTMLAnchorElement)) {
        throw new Error('mobile panel link が見つかりません');
      }

      expect(panel.hasAttribute('hidden')).to.equal(false);
      expect(panel.parentElement).to.equal(document.body);
      expect(panel.getAttribute('data-hydration-state')).to.equal('hydrated');
      expect(
        panel.querySelector('[data-layout-toc-mobile-nav]')?.getAttribute('aria-label'),
      ).to.equal('モバイル目次');

      link.addEventListener('click', (event) => event.preventDefault(), { once: true });
      link.dispatchEvent(
        new MouseEvent('click', { bubbles: true, composed: true, cancelable: true }),
      );

      expect(panel.hasAttribute('hidden')).to.equal(true);
      expect(document.activeElement).to.equal(trigger);
      expect(
        focusCalls.some(
          ({ element, options }) => element === trigger && options?.preventScroll === true,
        ),
      ).to.equal(true);
      const mobileSnapshot = layoutTocMobileController.getSnapshot('toc-source-test');
      expect(mobileSnapshot.cleanupDecision.directive).to.equal('refresh-panel-content');
      expect(mobileSnapshot.cleanupDecision.sourceId).to.equal('toc-source-test');
    } finally {
      HTMLElement.prototype.focus = originalFocus;
      root?.remove();
      trigger?.remove();
      cleanup();
    }
  });
});
