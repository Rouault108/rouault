import { expect, waitUntil } from '@open-wc/testing';

import { enhanceLayoutHeaderTocBridge } from '../../src/client/post-hydrate/layout-header-toc-bridge.js';
import {
  commitShellGeneration,
  resetShellLifecycleForTest,
} from '../../src/components/app/shell/app-shell-lifecycle.js';
import { layoutTocMobileController } from '../../src/components/layout/layout-toc-mobile-controller.js';
import { layoutTocRuntimeStore } from '../../src/components/layout/layout-toc-runtime-store.js';
import type {
  AppContentHydrationReadyDetail,
  AppShellCommittedDetail,
  AppShellRollbackStartDetail,
  AppShellRestoredDetail,
  AppShellValidatedDetail,
  RuntimeDomLinkValidationContext,
} from '../../src/components/app/shell/app-shell-events.js';
import { TOC_MOBILE_PANEL_SELECTOR } from '../../src/toc/toc-mobile-panel-dom-css-contract.js';

const headings = [
  { id: 'section-1', text: 'Section 1', level: 2 },
  { id: 'section-2', text: 'Section 2', level: 2 },
] as const;

const routeManifestState = {
  status: 'loaded' as const,
  manifest: {
    version: 1 as const,
    buildId: 'build-test',
    buildLabel: 'test',
    generatedAt: '2026-06-01T00:00:00.000Z',
    siteOrigin: window.location.origin,
    basePath: '',
    routes: ['/notes/current'],
  },
  routeSet: {
    routes: ['/notes/current'],
    has: (pathname: string) => pathname === '/notes/current',
  },
};

const linkValidationContext: RuntimeDomLinkValidationContext = {
  siteUrlContext: { siteOrigin: window.location.origin, basePath: '' },
  currentAbsoluteUrl: `${window.location.origin}/notes/current`,
  normalizedNavigationUrl: '/notes/current',
  routeManifestState,
};

const appendBridgeFixture = (): HTMLElement => {
  const root = document.createElement('div');
  root.innerHTML = `
    <header
      class="layout-header"
      data-layout-header="true"
      data-toc-presence="present"
      data-toc-runtime-id="toc-source-test"
      data-toc-owner-id="toc-owner-test"
      data-toc-trigger-reserved="true"
    >
      <a
        href="#layout-toc-toc-source-test"
        data-toc-trigger="true"
        data-toc-runtime-id="toc-source-test"
        data-toc-trigger-interactive="false"
        data-link-kind="internal-fragment"
        data-link-surface="header"
        aria-controls="layout-toc-toc-source-test"
        aria-expanded="false"
      >目次</a>
    </header>
    <main id="main-content">
      <article id="note-content-test">
        <h2 id="section-1">Section 1</h2>
        <p>first</p>
        <h2 id="section-2">Section 2</h2>
        <p>second</p>
      </article>
      <aside id="layout-toc-toc-source-test" data-layout-toc-root>
        <nav class="layout-toc" aria-label="目次" data-layout-toc-nav>
          <ol>
            <li data-heading-id="section-1">
              <a
                href="#section-1"
                data-toc-link
                data-heading-id="section-1"
                data-link-kind="internal-fragment"
                data-link-surface="navigation"
              >Section 1</a>
            </li>
            <li data-heading-id="section-2">
              <a
                href="#section-2"
                data-toc-link
                data-heading-id="section-2"
                data-link-kind="internal-fragment"
                data-link-surface="navigation"
              >Section 2</a>
            </li>
          </ol>
        </nav>
        <layout-toc-controller
          source-id="toc-source-test"
          toc-runtime-id="toc-source-test"
          toc-owner-id="toc-owner-test"
          content-root-id="note-content-test"
          capabilities-json='{"activeTracking":true,"dynamicScopes":false,"mobilePanel":true}'
          data-toc-trigger-reserved="true"
        ></layout-toc-controller>
      </aside>
      <script id="toc-source-test" type="application/json">${JSON.stringify(headings)}</script>
    </main>
  `;
  document.body.append(root);
  return root;
};

const dispatchValidated = (header: HTMLElement, shellCommitId: number): void => {
  document.dispatchEvent(
    new CustomEvent<AppShellValidatedDetail>('app-shell:validated', {
      detail: {
        header,
        navigationUrl: '/notes/current',
        shellCommitId,
        shell: { headerHtml: header.outerHTML, sidebarProjection: null },
        linkValidationContext,
      },
    }),
  );
};

const dispatchRollbackStart = (
  failedShellCommitId: number,
  previousShellCommitId: number,
): void => {
  document.dispatchEvent(
    new CustomEvent<AppShellRollbackStartDetail>('app-shell:rollback-start', {
      detail: {
        failedNavigationUrl: '/about/',
        failedShellCommitId,
        previousShellCommitId,
        reason: 'rollback',
      },
    }),
  );
};

describe('layout-header-toc-bridge', () => {
  let controller: AbortController | null = null;

  afterEach(() => {
    controller?.abort();
    controller = null;
    layoutTocMobileController.reset();
    layoutTocRuntimeStore.reset();
    resetShellLifecycleForTest();
    document.body.replaceChildren();
  });

  it('app-shell:committed では状態同期だけを行い、validated 後に TOC controller と mobile panel を起動すること', async () => {
    const root = appendBridgeFixture();
    const header = root.querySelector<HTMLElement>('header[data-layout-header]');
    if (!(header instanceof HTMLElement)) throw new Error('header fixture is missing');

    controller = new AbortController();
    enhanceLayoutHeaderTocBridge(controller.signal);

    commitShellGeneration(1);
    document.dispatchEvent(
      new CustomEvent<AppShellCommittedDetail>('app-shell:committed', {
        detail: {
          header,
          navigationUrl: '/notes/current',
          shellCommitId: 1,
          shell: { headerHtml: header.outerHTML, sidebarProjection: null },
        },
      }),
    );

    await Promise.resolve();
    expect(document.querySelector(TOC_MOBILE_PANEL_SELECTOR)).to.equal(null);
    expect(
      root.querySelector('layout-toc-controller')?.getAttribute('data-toc-trigger-reserved'),
    ).to.equal('true');

    dispatchValidated(header, 1);

    await waitUntil(
      () => document.querySelector(TOC_MOBILE_PANEL_SELECTOR) instanceof HTMLElement,
      'TOC mobile panel is created after app-shell:validated',
      { timeout: 4000, interval: 50 },
    );

    const panel = document.querySelector<HTMLElement>(TOC_MOBILE_PANEL_SELECTOR);
    const trigger = root.querySelector<HTMLElement>('[data-toc-trigger]');
    expect(panel?.querySelectorAll('a[href]').length).to.equal(2);
    expect(trigger?.getAttribute('data-toc-trigger-interactive')).to.equal('true');
    expect(trigger?.getAttribute('aria-controls')).to.equal(panel?.id);
    expect(
      root.querySelector('layout-toc-controller')?.hasAttribute('data-toc-trigger-reserved'),
    ).to.equal(false);
  });

  it('app-shell:validated 前の app-content:hydration-ready では TOC controller と mobile panel を起動しないこと', async () => {
    const root = appendBridgeFixture();
    const header = root.querySelector<HTMLElement>('header[data-layout-header]');
    const contentRoot = root.querySelector<HTMLElement>('#note-content-test');
    const tocController = root.querySelector<HTMLElement>('layout-toc-controller');
    if (
      !(header instanceof HTMLElement) ||
      !(contentRoot instanceof HTMLElement) ||
      !(tocController instanceof HTMLElement)
    ) {
      throw new Error('TOC bridge fixture is missing');
    }

    controller = new AbortController();
    enhanceLayoutHeaderTocBridge(controller.signal);

    commitShellGeneration(1);
    document.dispatchEvent(
      new CustomEvent<AppShellCommittedDetail>('app-shell:committed', {
        detail: {
          header,
          navigationUrl: '/notes/current',
          shellCommitId: 1,
          shell: { headerHtml: header.outerHTML, sidebarProjection: null },
        },
      }),
    );
    document.dispatchEvent(
      new CustomEvent<AppContentHydrationReadyDetail>('app-content:hydration-ready', {
        detail: {
          contentRoot,
          initial: false,
        },
      }),
    );
    await Promise.resolve();
    await Promise.resolve();

    expect(document.querySelector(TOC_MOBILE_PANEL_SELECTOR)).to.equal(null);
    expect(tocController.getAttribute('data-toc-trigger-reserved')).to.equal('true');
  });

  it('TOC controller 定義待ち中に shell 世代が進んだ場合は旧 controller を起動しないこと', async () => {
    const root = appendBridgeFixture();
    const header = root.querySelector<HTMLElement>('header[data-layout-header]');
    const tocController = root.querySelector<HTMLElement>('layout-toc-controller');
    if (!(header instanceof HTMLElement) || !(tocController instanceof HTMLElement)) {
      throw new Error('TOC bridge fixture is missing');
    }

    controller = new AbortController();
    enhanceLayoutHeaderTocBridge(controller.signal);

    const originalWhenDefined = customElements.whenDefined.bind(customElements);
    let releaseWhenDefined = (): void => {
      throw new Error('whenDefined gate is not initialized');
    };
    let whenDefinedRequested = false;
    const delayedWhenDefined = new Promise<CustomElementConstructor>((resolve) => {
      releaseWhenDefined = () => {
        void originalWhenDefined('layout-toc-controller').then(resolve);
      };
    });
    const registry = customElements as CustomElementRegistry & {
      whenDefined: CustomElementRegistry['whenDefined'];
    };
    registry.whenDefined = ((name: string) => {
      if (name === 'layout-toc-controller') {
        whenDefinedRequested = true;
        return delayedWhenDefined;
      }
      return originalWhenDefined(name);
    }) as CustomElementRegistry['whenDefined'];

    try {
      commitShellGeneration(1);
      dispatchValidated(header, 1);

      await waitUntil(
        () => whenDefinedRequested,
        'layout-toc-controller definition wait is requested',
      );
      dispatchRollbackStart(1, 0);
      commitShellGeneration(0);
      releaseWhenDefined();
      await delayedWhenDefined;
      await Promise.resolve();
      await Promise.resolve();

      expect(document.querySelector(TOC_MOBILE_PANEL_SELECTOR)).to.equal(null);
      expect(tocController.getAttribute('data-toc-trigger-reserved')).to.equal('true');
    } finally {
      registry.whenDefined = originalWhenDefined;
    }
  });

  it('rollback 開始時に validated 後の activation を破棄し、failed shell の mobile panel を除去すること', async () => {
    const root = appendBridgeFixture();
    const header = root.querySelector<HTMLElement>('header[data-layout-header]');
    if (!(header instanceof HTMLElement)) throw new Error('header fixture is missing');

    controller = new AbortController();
    enhanceLayoutHeaderTocBridge(controller.signal);

    commitShellGeneration(1);
    dispatchValidated(header, 1);
    await waitUntil(
      () => document.querySelector(TOC_MOBILE_PANEL_SELECTOR) instanceof HTMLElement,
      'TOC mobile panel is created before rollback',
      { timeout: 4000, interval: 50 },
    );

    dispatchRollbackStart(1, 0);

    expect(document.querySelector(TOC_MOBILE_PANEL_SELECTOR)).to.equal(null);
    expect(document.getElementById('layout-toc-panel-toc-source-test')).to.equal(null);
  });

  it('app-shell:restored は保存済み validation context がない shell で DOM 追加しないこと', async () => {
    const root = appendBridgeFixture();
    const header = root.querySelector<HTMLElement>('header[data-layout-header]');
    const tocController = root.querySelector<HTMLElement>('layout-toc-controller');
    if (!(header instanceof HTMLElement) || !(tocController instanceof HTMLElement)) {
      throw new Error('TOC bridge fixture is missing');
    }

    controller = new AbortController();
    enhanceLayoutHeaderTocBridge(controller.signal);

    commitShellGeneration(3);
    document.dispatchEvent(
      new CustomEvent<AppShellRestoredDetail>('app-shell:restored', {
        detail: {
          header,
          restoredUrl: '/notes/current',
          failedNavigationUrl: '/about/',
          restoredShellCommitId: 3,
          failedShellCommitId: 4,
          reason: 'rollback',
        },
      }),
    );
    await Promise.resolve();
    await Promise.resolve();

    expect(document.querySelector(TOC_MOBILE_PANEL_SELECTOR)).to.equal(null);
    expect(tocController.getAttribute('data-toc-trigger-reserved')).to.equal('true');
  });
});
