import { expect, fixture, html } from '@open-wc/testing';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import type { LayoutSidebar } from '../../src/components/layout/layout-sidebar.js';
import {
  DEFAULT_LAYOUT_SIDEBAR_ID,
  layoutSidebarController,
} from '../../src/components/layout/layout-sidebar-controller.js';
import { getLayoutSidebarTreeStateStorageKey } from '../../src/components/layout/layout-sidebar-tree-state.js';
import type { UiSidebarShell } from '../../src/components/ui/sidebar-shell/sidebar-shell.js';
import { type LitLikeElement, waitForLitUpdate } from './helpers/wait-for-lit.js';

interface MatchMediaController {
  restore(): void;
}

interface PersistedLayoutSidebarState {
  expandedIds?: string[];
}

interface SidebarStateChangeDetail {
  state: 'expanded' | 'collapsed';
  mode: 'fixed' | 'overlay';
}

const sampleNavMarkup = `
  <nav data-sidebar-nav aria-label="ノートナビゲーション" data-topology-revision="topology:sample">
    <ul>
      <li data-node-id="music" data-node-kind="branch" data-node-depth="0" data-current-branch="true">
        <button type="button" data-sidebar-nav-control data-sidebar-nav-branch-control aria-expanded="true" aria-controls="sidebar-group-music">
          <span data-sidebar-nav-label>Music</span>
          <span data-sidebar-nav-disclosure aria-hidden="true"></span>
        </button>
        <ul id="sidebar-group-music">
          <li data-node-id="music/classical" data-node-kind="branch" data-node-depth="1" data-current-branch="true">
            <button type="button" data-sidebar-nav-control data-sidebar-nav-branch-control aria-expanded="true" aria-controls="sidebar-group-classical">
              <span data-sidebar-nav-label>Classical</span>
              <span data-sidebar-nav-disclosure aria-hidden="true"></span>
            </button>
            <ul id="sidebar-group-classical">
              <li data-node-id="music/classical/beethoven/symphony-9" data-node-kind="leaf" data-node-depth="2">
                <a data-sidebar-nav-control data-sidebar-nav-link href="/notes/music/classical/beethoven/symphony-9" aria-current="page"><span data-sidebar-nav-label>交響曲第9番 ニ短調</span></a>
              </li>
              <li data-node-id="music/classical/tchaikovsky/the-nutcracker" data-node-kind="leaf" data-node-depth="2">
                <a data-sidebar-nav-control data-sidebar-nav-link href="/notes/music/classical/tchaikovsky/the-nutcracker"><span data-sidebar-nav-label>くるみ割り人形</span></a>
              </li>
            </ul>
          </li>
        </ul>
      </li>
      <li data-node-id="essay" data-node-kind="branch" data-node-depth="0">
        <button type="button" data-sidebar-nav-control data-sidebar-nav-branch-control aria-expanded="false" aria-controls="sidebar-group-essay">
          <span data-sidebar-nav-label>Essay</span>
          <span data-sidebar-nav-disclosure aria-hidden="true"></span>
        </button>
        <ul id="sidebar-group-essay" hidden>
          <li data-node-id="essay/reading-notes" data-node-kind="leaf" data-node-depth="1">
            <a data-sidebar-nav-control data-sidebar-nav-link href="/notes/essay/reading-notes"><span data-sidebar-nav-label>Reading Notes</span></a>
          </li>
        </ul>
      </li>
    </ul>
  </nav>
`.trim();

const sampleNavMarkupWithoutClassical = `
  <nav data-sidebar-nav aria-label="ノートナビゲーション" data-topology-revision="topology:sample-v2">
    <ul>
      <li data-node-id="music" data-node-kind="branch" data-node-depth="0" data-current-branch="true">
        <button type="button" data-sidebar-nav-control data-sidebar-nav-branch-control aria-expanded="true" aria-controls="sidebar-group-music-v2">
          <span data-sidebar-nav-label>Music</span>
          <span data-sidebar-nav-disclosure aria-hidden="true"></span>
        </button>
        <ul id="sidebar-group-music-v2">
          <li data-node-id="music/classical" data-node-kind="branch" data-node-depth="1" data-current-branch="true">
            <button type="button" data-sidebar-nav-control data-sidebar-nav-branch-control aria-expanded="true" aria-controls="sidebar-group-classical-v2">
              <span data-sidebar-nav-label>Classical</span>
              <span data-sidebar-nav-disclosure aria-hidden="true"></span>
            </button>
            <ul id="sidebar-group-classical-v2">
              <li data-node-id="music/classical/mozart/requiem" data-node-kind="leaf" data-node-depth="2">
                <a data-sidebar-nav-control data-sidebar-nav-link href="/notes/music/classical/mozart/requiem" aria-current="page"><span data-sidebar-nav-label>Requiem</span></a>
              </li>
            </ul>
          </li>
        </ul>
      </li>
    </ul>
  </nav>
`.trim();

const noop = (): void => {
  return undefined;
};

const returnFalse = (): boolean => {
  return false;
};

const ensureLayoutSidebarDefined = async (): Promise<void> => {
  await import('../../src/components/layout/layout-sidebar.js');
  await customElements.whenDefined('layout-sidebar');
};

const expectPresent = <T>(value: T | null | undefined, name: string): T => {
  expect(value, `${name} should exist`).to.not.equal(null);
  expect(value, `${name} should exist`).to.not.equal(undefined);

  if (value === null || value === undefined) {
    throw new Error(`${name} が見つかりません`);
  }

  return value;
};

const mockMatchMedia = (breakpointMatches = false): MatchMediaController => {
  const original = window.matchMedia.bind(window);

  window.matchMedia = ((query: string): MediaQueryList => {
    const isReducedMotionQuery = query === '(prefers-reduced-motion: reduce)';
    const isBreakpointQuery = query.startsWith('(min-width:');

    return {
      matches: isReducedMotionQuery ? true : isBreakpointQuery ? breakpointMatches : false,
      media: query,
      onchange: null,
      addEventListener: noop,
      removeEventListener: noop,
      addListener: noop,
      removeListener: noop,
      dispatchEvent: returnFalse,
    } as MediaQueryList;
  }) as typeof window.matchMedia;

  return {
    restore(): void {
      window.matchMedia = original;
    },
  };
};

const OVERLAY_LAYER_SELECTOR = '[data-app-shell-sidebar-overlay-layer]';

const getSidebarDomRoot = (host: LayoutSidebar): ParentNode => {
  const hostShell = host.querySelector('ui-sidebar-shell');
  if (hostShell instanceof HTMLElement) {
    return host;
  }

  return document.querySelector<HTMLElement>(OVERLAY_LAYER_SELECTOR) ?? host;
};

const getSidebarShell = (host: LayoutSidebar): (LitLikeElement & UiSidebarShell) | null =>
  getSidebarDomRoot(host).querySelector<LitLikeElement & UiSidebarShell>('ui-sidebar-shell');

const getNav = (host: LayoutSidebar): HTMLElement | null =>
  getSidebarDomRoot(host).querySelector<HTMLElement>('nav[data-sidebar-nav]');

const getRow = (host: LayoutSidebar, id: string): HTMLLIElement | null =>
  getSidebarDomRoot(host).querySelector<HTMLLIElement>(`li[data-node-id="${id}"]`);

const getControl = (
  host: LayoutSidebar,
  id: string,
): HTMLButtonElement | HTMLAnchorElement | null => {
  const row = getSidebarDomRoot(host).querySelector<HTMLElement>(`li[data-node-id="${id}"]`);
  const control = row?.querySelector(':scope > [data-sidebar-nav-control]');
  return control instanceof HTMLButtonElement || control instanceof HTMLAnchorElement
    ? control
    : null;
};

const getBranchGroup = (host: LayoutSidebar, id: string): HTMLUListElement | null => {
  const row = getSidebarDomRoot(host).querySelector<HTMLElement>(`li[data-node-id="${id}"]`);
  const group = row?.querySelector(':scope > ul');
  return group instanceof HTMLUListElement ? group : null;
};

const settle = async (host: LayoutSidebar): Promise<void> => {
  await waitForLitUpdate(host);

  const shell = getSidebarShell(host);
  if (shell) {
    await waitForLitUpdate(shell);
  }

  await Promise.resolve();
  await Promise.resolve();
};

const onceCustomEvent = <T>(target: EventTarget, type: string): Promise<CustomEvent<T>> =>
  new Promise((resolve) => {
    const listener: EventListener = (event) => {
      resolve(event as CustomEvent<T>);
    };

    target.addEventListener(type, listener, { once: true });
  });

const waitForSidebarStateChange = async (
  host: LayoutSidebar,
  expectedState: SidebarStateChangeDetail['state'],
  action: () => void | Promise<void>,
): Promise<void> => {
  const shell = expectPresent(getSidebarShell(host), 'ui-sidebar-shell');
  const stateChangePromise = onceCustomEvent<SidebarStateChangeDetail>(
    shell,
    'ui-sidebar-state-change',
  );

  await action();

  const event = await stateChangePromise;
  expect(event.detail.state).to.equal(expectedState);

  await settle(host);
};

const getSidebarHeader = (host: LayoutSidebar): HTMLElement | null =>
  getSidebarDomRoot(host).querySelector<HTMLElement>('.sidebar-head');

const renderSidebarFixture = (options: {
  presentation?: 'auto' | 'fixed' | 'overlay';
  stateScopeId?: string;
  selectedId?: string;
  initialExpandedIds?: string;
  markup?: string;
  heading?: string | null;
}) => {
  const heading = options.heading ?? undefined;

  return html`
    <layout-sidebar
      presentation="${options.presentation ?? 'overlay'}"
      state-scope-id="${options.stateScopeId ?? 'note-navigation'}"
      selected-id="${options.selectedId ?? 'music/classical/beethoven/symphony-9'}"
      initial-expanded-ids="${options.initialExpandedIds ?? '["music","music/classical"]'}"
      heading=${ifDefined(heading)}
    >
      ${unsafeHTML(options.markup ?? sampleNavMarkup)}
    </layout-sidebar>
  `;
};

describe('layout-sidebar browser contract', () => {
  afterEach(() => {
    localStorage.clear();
    layoutSidebarController.reset();
    document.querySelectorAll(OVERLAY_LAYER_SELECTOR).forEach((element) => element.remove());
  });

  it('初回表示では initialExpandedIds と現在位置を元に server nav を開くこと', async () => {
    const media = mockMatchMedia();

    try {
      await ensureLayoutSidebarDefined();

      const host = await fixture<LayoutSidebar>(renderSidebarFixture({}));
      await settle(host);

      expect(expectPresent(getBranchGroup(host, 'music'), 'music group').hidden).to.equal(false);
      expect(
        expectPresent(getBranchGroup(host, 'music/classical'), 'music/classical group').hidden,
      ).to.equal(false);
      expect(
        getControl(host, 'music/classical/beethoven/symphony-9')?.getAttribute('aria-current'),
      ).to.equal('page');
    } finally {
      media.restore();
    }
  });

  it('heading 未指定では header slot を描画せず、projection でも null を返すこと', async () => {
    const media = mockMatchMedia(true);

    try {
      await ensureLayoutSidebarDefined();

      const host = await fixture<LayoutSidebar>(
        renderSidebarFixture({ presentation: 'fixed', heading: null }),
      );
      await settle(host);

      expect(host.hasAttribute('heading')).to.equal(false);
      expect(host.readShellProjection().heading).to.equal(null);
      expect(getSidebarHeader(host)).to.equal(null);
    } finally {
      media.restore();
    }
  });

  it('expandedIds を sidebarId + stateScopeId scope の localStorage へ永続化すること', async () => {
    const media = mockMatchMedia();

    try {
      await ensureLayoutSidebarDefined();

      const storageKey = getLayoutSidebarTreeStateStorageKey({
        sidebarId: DEFAULT_LAYOUT_SIDEBAR_ID,
        stateScopeId: 'note-navigation',
      });

      localStorage.removeItem(storageKey);

      const host = await fixture<LayoutSidebar>(
        renderSidebarFixture({
          initialExpandedIds: '["music"]',
          selectedId: 'essay/reading-notes',
        }),
      );

      await settle(host);

      const button = expectPresent(getControl(host, 'essay'), 'essay toggle') as HTMLButtonElement;
      button.click();
      await settle(host);

      const stored = JSON.parse(
        localStorage.getItem(storageKey) ?? '{}',
      ) as PersistedLayoutSidebarState;
      expect(stored.expandedIds ?? []).to.include('essay');
    } finally {
      media.restore();
    }
  });

  it('selectedId だけが変わってもユーザーが閉じた branch を再展開しないこと', async () => {
    const media = mockMatchMedia();

    try {
      await ensureLayoutSidebarDefined();

      const storageKey = getLayoutSidebarTreeStateStorageKey({
        sidebarId: DEFAULT_LAYOUT_SIDEBAR_ID,
        stateScopeId: 'note-navigation',
      });

      localStorage.setItem(
        storageKey,
        JSON.stringify({
          expandedIds: ['essay'],
        } satisfies PersistedLayoutSidebarState),
      );

      const host = await fixture<LayoutSidebar>(
        renderSidebarFixture({
          initialExpandedIds: '["music","music/classical"]',
          selectedId: 'music/classical/tchaikovsky/the-nutcracker',
        }),
      );

      await settle(host);

      const classicalButton = expectPresent(
        getControl(host, 'music/classical'),
        'music/classical toggle',
      ) as HTMLButtonElement;
      classicalButton.click();
      await settle(host);

      const classicalGroup = expectPresent(
        getBranchGroup(host, 'music/classical'),
        'classical group',
      );
      expect(classicalGroup.hidden).to.equal(true);

      localStorage.setItem(
        storageKey,
        JSON.stringify({
          expandedIds: [],
        } satisfies PersistedLayoutSidebarState),
      );

      host.selectedId = 'music/classical/beethoven/symphony-9';
      await settle(host);

      expect(classicalGroup.hidden).to.equal(true);
      expect(
        expectPresent(getRow(host, 'music/classical'), 'music/classical row').getAttribute(
          'data-current-branch',
        ),
      ).to.equal('true');
    } finally {
      media.restore();
    }
  });

  it('stateScopeId が変わると別 scope の展開状態を読むこと', async () => {
    const media = mockMatchMedia();

    try {
      await ensureLayoutSidebarDefined();

      localStorage.setItem(
        getLayoutSidebarTreeStateStorageKey({
          sidebarId: DEFAULT_LAYOUT_SIDEBAR_ID,
          stateScopeId: 'note-navigation',
        }),
        JSON.stringify({
          expandedIds: ['music'],
        } satisfies PersistedLayoutSidebarState),
      );
      localStorage.setItem(
        getLayoutSidebarTreeStateStorageKey({
          sidebarId: DEFAULT_LAYOUT_SIDEBAR_ID,
          stateScopeId: 'reference-navigation',
        }),
        JSON.stringify({
          expandedIds: [],
        } satisfies PersistedLayoutSidebarState),
      );

      const host = await fixture<LayoutSidebar>(
        renderSidebarFixture({
          stateScopeId: 'reference-navigation',
          initialExpandedIds: '[]',
          selectedId: 'essay/reading-notes',
        }),
      );

      await settle(host);

      const musicGroup = expectPresent(getBranchGroup(host, 'music'), 'music group');
      expect(musicGroup.hidden).to.equal(true);

      host.stateScopeId = 'note-navigation';
      await settle(host);

      expect(
        expectPresent(getBranchGroup(host, 'music'), 'music group after scope change').hidden,
      ).to.equal(false);
    } finally {
      media.restore();
    }
  });

  it('selected leaf を含む parent branch でも閉じられ、current branch marker が残ること', async () => {
    const media = mockMatchMedia();

    try {
      await ensureLayoutSidebarDefined();

      const host = await fixture<LayoutSidebar>(renderSidebarFixture({}));
      await settle(host);

      const classicalButton = expectPresent(
        getControl(host, 'music/classical'),
        'music/classical toggle',
      ) as HTMLButtonElement;
      classicalButton.click();
      await settle(host);

      expect(
        expectPresent(getBranchGroup(host, 'music/classical'), 'music/classical group').hidden,
      ).to.equal(true);
      expect(
        expectPresent(getRow(host, 'music/classical'), 'music/classical row').getAttribute(
          'data-current-branch',
        ),
      ).to.equal('true');
    } finally {
      media.restore();
    }
  });

  it('server nav markup が差し替わっても共通 branch id の展開状態を維持すること', async () => {
    const media = mockMatchMedia();

    try {
      await ensureLayoutSidebarDefined();

      localStorage.setItem(
        getLayoutSidebarTreeStateStorageKey({
          sidebarId: DEFAULT_LAYOUT_SIDEBAR_ID,
          stateScopeId: 'note-navigation',
        }),
        JSON.stringify({
          expandedIds: ['music', 'music/classical'],
        } satisfies PersistedLayoutSidebarState),
      );

      const host = await fixture<LayoutSidebar>(renderSidebarFixture({}));
      await settle(host);

      host.applyShellProjection?.({
        present: true,
        stateScopeId: 'note-navigation',
        selectedId: 'music/classical/mozart/requiem',
        initialExpandedIds: ['music', 'music/classical'],
        topologyRevision: 'topology:sample-v2',
        navHtml: sampleNavMarkupWithoutClassical,
        heading: null,
        fixedBreakpoint: 1024,
        sidebarId: 'note-primary',
        presentation: 'overlay',
      });
      await settle(host);

      const branchGroup = expectPresent(
        getBranchGroup(host, 'music/classical'),
        'music/classical group after nav swap',
      );
      expect(branchGroup.hidden).to.equal(false);
      expect(host.hasAttribute('heading')).to.equal(false);
      expect(host.readShellProjection().heading).to.equal(null);
      expect(getSidebarHeader(host)).to.equal(null);
    } finally {
      media.restore();
    }
  });

  it('applyShellProjection で heading:null を受けると heading attribute と header DOM を除去すること', async () => {
    const media = mockMatchMedia(true);

    try {
      await ensureLayoutSidebarDefined();

      const host = await fixture<LayoutSidebar>(
        renderSidebarFixture({ presentation: 'fixed', heading: '既存見出し' }),
      );
      await settle(host);

      expect(host.getAttribute('heading')).to.equal('既存見出し');
      expect(host.readShellProjection().heading).to.equal('既存見出し');
      expect(getSidebarHeader(host)?.textContent).to.contain('既存見出し');

      host.applyShellProjection?.({
        present: true,
        stateScopeId: 'note-navigation',
        selectedId: 'music/classical/beethoven/symphony-9',
        initialExpandedIds: ['music', 'music/classical'],
        topologyRevision: 'topology:sample',
        navHtml: sampleNavMarkup,
        heading: null,
        fixedBreakpoint: 1024,
        sidebarId: 'note-primary',
        presentation: 'fixed',
      });
      await settle(host);

      expect(host.hasAttribute('heading')).to.equal(false);
      expect(host.readShellProjection().heading).to.equal(null);
      expect(getSidebarHeader(host)).to.equal(null);
    } finally {
      media.restore();
    }
  });

  it('presentation="auto" では広幅で fixed / expanded を解決すること', async () => {
    const media = mockMatchMedia(true);

    try {
      await ensureLayoutSidebarDefined();

      const host = await fixture<LayoutSidebar>(renderSidebarFixture({ presentation: 'auto' }));
      await settle(host);

      const shell = expectPresent(getSidebarShell(host), 'ui-sidebar-shell');
      expect(shell.mode).to.equal('fixed');
      expect(shell.state).to.equal('expanded');
    } finally {
      media.restore();
    }
  });

  it('overlay surface を app shell overlay layer へ portal すること', async () => {
    const media = mockMatchMedia(false);

    try {
      await ensureLayoutSidebarDefined();

      const shell = await fixture<HTMLElement>(html`
        <div id="app">
          <div class="layout-sidebar-overlay-layer" data-app-shell-sidebar-overlay-layer></div>
          ${renderSidebarFixture({ presentation: 'overlay' })}
        </div>
      `);

      const host = expectPresent(
        shell.querySelector<LayoutSidebar>('layout-sidebar'),
        'layout-sidebar',
      );
      await settle(host);

      const overlayLayer = expectPresent(
        document.querySelector<HTMLElement>(OVERLAY_LAYER_SELECTOR),
        'overlay layer',
      );

      expect(overlayLayer.querySelector('ui-sidebar-shell')).to.not.equal(null);
      expect(host.querySelector('ui-sidebar-shell')).to.equal(null);
    } finally {
      media.restore();
    }
  });

  it('snapshot null では overlay surface を portal layer から退避させること', async () => {
    const media = mockMatchMedia(false);

    try {
      await ensureLayoutSidebarDefined();

      const shell = await fixture<HTMLElement>(html`
        <div id="app">
          <div class="layout-sidebar-overlay-layer" data-app-shell-sidebar-overlay-layer></div>
          ${renderSidebarFixture({ presentation: 'overlay' })}
        </div>
      `);

      const host = expectPresent(
        shell.querySelector<LayoutSidebar>('layout-sidebar'),
        'layout-sidebar',
      );
      await settle(host);

      const overlayLayer = expectPresent(
        document.querySelector<HTMLElement>(OVERLAY_LAYER_SELECTOR),
        'overlay layer',
      );

      expect(overlayLayer.querySelector('ui-sidebar-shell')).to.not.equal(null);

      host.applyShellProjection?.(null);
      await settle(host);

      expect(host.hidden).to.equal(true);
      expect(overlayLayer.querySelector('ui-sidebar-shell')).to.equal(null);
      expect(host.querySelector('ui-sidebar-shell')).to.not.equal(null);
    } finally {
      media.restore();
    }
  });

  it('host 接続前の toggle request が失われず、overlay 初期状態へ反映されること', async () => {
    const media = mockMatchMedia(false);

    try {
      await ensureLayoutSidebarDefined();

      layoutSidebarController.toggle(DEFAULT_LAYOUT_SIDEBAR_ID);

      const host = await fixture<LayoutSidebar>(renderSidebarFixture({ presentation: 'auto' }));
      await settle(host);

      const shell = expectPresent(getSidebarShell(host), 'ui-sidebar-shell');
      expect(shell.mode).to.equal('overlay');
      expect(shell.state).to.equal('expanded');
    } finally {
      media.restore();
    }
  });

  it('overlay では selection 後に sidebar を collapse すること', async () => {
    const media = mockMatchMedia();

    try {
      await ensureLayoutSidebarDefined();

      const host = await fixture<LayoutSidebar>(renderSidebarFixture({ presentation: 'overlay' }));
      await settle(host);

      const shell = expectPresent(getSidebarShell(host), 'ui-sidebar-shell');
      expect(shell.mode).to.equal('overlay');
      expect(shell.state).to.equal('collapsed');

      await waitForSidebarStateChange(host, 'expanded', () => {
        host.expand();
      });

      const link = expectPresent(
        getControl(host, 'music/classical/tchaikovsky/the-nutcracker'),
        'selected link',
      ) as HTMLAnchorElement;
      link.addEventListener('click', (event) => {
        event.preventDefault();
      });
      link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      await settle(host);

      expect(shell.state).to.equal('collapsed');
    } finally {
      media.restore();
    }
  });

  it('Arrow key と typeahead が server nav 上で成立すること', async () => {
    const media = mockMatchMedia(true);

    try {
      await ensureLayoutSidebarDefined();

      const host = await fixture<LayoutSidebar>(renderSidebarFixture({ presentation: 'fixed' }));
      await settle(host);

      const selected = expectPresent(
        getControl(host, 'music/classical/beethoven/symphony-9'),
        'selected control',
      );
      selected.focus();
      await settle(host);

      selected.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      await settle(host);
      expect(document.activeElement).to.equal(
        getControl(host, 'music/classical/tchaikovsky/the-nutcracker'),
      );

      const active = expectPresent(
        getControl(host, 'music/classical/tchaikovsky/the-nutcracker'),
        'active control',
      );
      active.dispatchEvent(new KeyboardEvent('keydown', { key: 'E', bubbles: true }));
      await settle(host);
      expect(document.activeElement).to.equal(getControl(host, 'essay'));
    } finally {
      media.restore();
    }
  });

  it('server nav を唯一の正規経路として扱うこと', async () => {
    const media = mockMatchMedia(true);

    try {
      await ensureLayoutSidebarDefined();

      const host = await fixture<LayoutSidebar>(renderSidebarFixture({}));
      await settle(host);

      expect(getNav(host)?.getAttribute('data-topology-revision')).to.equal('topology:sample');
      expect(document.querySelectorAll('nav[data-sidebar-nav]').length).to.equal(1);
      expect(document.querySelectorAll('ui-sidebar-shell').length).to.equal(1);
      expect(getNav(host)?.textContent).to.contain('交響曲第9番');
      expect(host.hasAttribute('items-json')).to.equal(false);
    } finally {
      media.restore();
    }
  });
});
