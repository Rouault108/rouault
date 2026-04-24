import { expect, fixture, html, waitUntil } from '@open-wc/testing';
import {
  activateLayoutTocController,
  type LayoutTocController,
} from '../../src/components/layout/layout-toc-controller.js';
import { layoutTocMobileController } from '../../src/components/layout/layout-toc-mobile-controller.js';
import { layoutTocRuntimeStore } from '../../src/components/layout/layout-toc-runtime-store.js';

const headings = [
  { id: 'section-1', text: 'Section 1', level: 2 },
  { id: 'section-2', text: 'Section 2', level: 3 },
] as const;

const appendContentFixture = (): (() => void) => {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = `
    <article id="note-content-test">
      <h2 id="section-1">Section 1</h2>
      <p>first</p>
      <h3 id="section-2">Section 2</h3>
      <p>second</p>
    </article>
    <script id="toc-source-test" type="application/json">${JSON.stringify(headings)}</script>
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
    document.querySelectorAll('.layout-toc-mobile-panel').forEach((element) => element.remove());
  });

  it('hydrate 後に SSR nav の active state と runtime snapshot を同期すること', async () => {
    const cleanup = appendContentFixture();
    const restoreHash = withLocationHash('section-2');

    try {
      const root = await fixture<HTMLElement>(html`
        <aside data-layout-toc-root>
          <nav class="layout-toc" aria-label="目次" data-layout-toc-nav>
            <ol class="layout-toc__list">
              <li class="layout-toc__item" data-heading-id="section-1">
                <a class="layout-toc__link" href="#section-1" data-toc-link data-heading-id="section-1">
                  <span class="layout-toc__link-label">Section 1</span>
                </a>
              </li>
              <li class="layout-toc__item" data-heading-id="section-2">
                <a class="layout-toc__link" href="#section-2" data-toc-link data-heading-id="section-2">
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

      const controller = root.querySelector<LayoutTocController>('layout-toc-controller');
      if (!(controller instanceof HTMLElement)) {
        throw new Error('layout-toc-controller が見つかりません');
      }

      activateLayoutTocController(controller);

      await waitUntil(() => {
        return (
          root.querySelector<HTMLAnchorElement>('[data-toc-link][data-heading-id="section-2"]')?.getAttribute(
            'aria-current',
          ) === 'location'
        );
      }, 'active link が hash と同期すること');

      const snapshot = layoutTocRuntimeStore.getSnapshot('toc-source-test');
      expect(snapshot.ready).to.equal(true);
      expect(snapshot.hasVisibleHeadings).to.equal(true);
      expect(snapshot.activeId).to.equal('section-2');
    } finally {
      restoreHash();
      cleanup();
    }
  });

  it('mobile panel を body 直下へ生成し、リンク押下で閉じて focus を戻すこと', async () => {
    const cleanup = appendContentFixture();

    try {
      const trigger = document.createElement('button');
      trigger.type = 'button';
      trigger.textContent = 'toc';
      document.body.append(trigger);

      const root = await fixture<HTMLElement>(html`
        <aside data-layout-toc-root>
          <nav class="layout-toc" aria-label="目次" data-layout-toc-nav>
            <ol class="layout-toc__list">
              <li class="layout-toc__item" data-heading-id="section-1">
                <a class="layout-toc__link" href="#section-1" data-toc-link data-heading-id="section-1">
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

      const controller = root.querySelector<LayoutTocController>('layout-toc-controller');
      if (!(controller instanceof HTMLElement)) {
        throw new Error('layout-toc-controller が見つかりません');
      }

      activateLayoutTocController(controller);
      layoutTocMobileController.open('toc-source-test', trigger);

      await waitUntil(() => {
        return !document
          .querySelector<HTMLElement>('#layout-toc-panel-toc-source-test')
          ?.hasAttribute('hidden');
      }, 'mobile panel が開くこと');

      const panel = document.querySelector<HTMLElement>('#layout-toc-panel-toc-source-test');
      const link = panel?.querySelector<HTMLAnchorElement>('[data-toc-link][data-heading-id="section-1"]');
      if (!(panel instanceof HTMLElement) || !(link instanceof HTMLAnchorElement)) {
        throw new Error('mobile panel link が見つかりません');
      }

      expect(panel.parentElement).to.equal(document.body);
      expect(panel.querySelector('[data-layout-toc-mobile-nav]')?.getAttribute('aria-label')).to.equal(
        'モバイル目次',
      );

      link.click();

      await waitUntil(() => panel.hasAttribute('hidden'), 'link click 後に panel が閉じること');
      expect(document.activeElement).to.equal(trigger);

      trigger.remove();
    } finally {
      cleanup();
    }
  });
});
