import { expect, fixture, html } from '@open-wc/testing';
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

const sampleItemsJson = JSON.stringify([
  {
    kind: 'branch',
    id: 'music',
    label: 'Music',
    children: [
      {
        kind: 'branch',
        id: 'music/classical',
        label: 'Classical',
        children: [
          {
            kind: 'leaf',
            id: 'music/classical/beethoven/symphony-9',
            label: '交響曲第9番 ニ短調',
            href: '/notes/music/classical/beethoven/symphony-9',
          },
          {
            kind: 'leaf',
            id: 'music/classical/tchaikovsky/the-nutcracker',
            label: 'くるみ割り人形',
            href: '/notes/music/classical/tchaikovsky/the-nutcracker',
          },
        ],
      },
    ],
  },
  {
    kind: 'branch',
    id: 'essay',
    label: 'Essay',
    children: [
      {
        kind: 'leaf',
        id: 'essay/reading-notes',
        label: 'Reading Notes',
        href: '/notes/essay/reading-notes',
      },
    ],
  },
]);

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

const noop = (): void => {
  return undefined;
};

const returnFalse = (): boolean => {
  return false;
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

const getSidebarShell = (host: LayoutSidebar): (LitLikeElement & UiSidebarShell) | null =>
  host.querySelector<LitLikeElement & UiSidebarShell>('ui-sidebar-shell');

const getNav = (host: LayoutSidebar): HTMLElement | null =>
  host.querySelector<HTMLElement>('nav[data-sidebar-nav]');

const getControl = (
  host: LayoutSidebar,
  id: string,
): HTMLButtonElement | HTMLAnchorElement | null => {
  const row = host.querySelector<HTMLElement>(`li[data-node-id="${id}"]`);
  const control = row?.querySelector(':scope > button, :scope > a');
  return control instanceof HTMLButtonElement || control instanceof HTMLAnchorElement ? control : null;
};

const getBranchGroup = (host: LayoutSidebar, id: string): HTMLUListElement | null => {
  const row = host.querySelector<HTMLElement>(`li[data-node-id="${id}"]`);
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

describe('layout-sidebar browser contract', () => {
  afterEach(() => {
    localStorage.clear();
    layoutSidebarController.reset();
  });

  it('初回表示では現在位置の祖先を開き、その後の閉じ要求は persisted state にだけ反映すること', async () => {
    const media = mockMatchMedia();

    try {
      await ensureLayoutSidebarDefined();

      const selectedId = 'music/classical/beethoven/symphony-9';
      const storageKey = getLayoutSidebarTreeStateStorageKey({
        sidebarId: DEFAULT_LAYOUT_SIDEBAR_ID,
        stateScopeId: 'note-navigation',
      });

      localStorage.removeItem(storageKey);

      const host = await fixture<LayoutSidebar>(html`
        <layout-sidebar
          presentation="overlay"
          state-scope-id="note-navigation"
          .itemsJson=${sampleItemsJson}
          selected-id="${selectedId}"
          heading="ナビゲーション"
        ></layout-sidebar>
      `);

      await settle(host);

      const group = expectPresent(
        getBranchGroup(host, 'music/classical'),
        'music/classical children group',
      );
      expect(group.hidden).to.equal(false);

      const button = expectPresent(
        getControl(host, 'music/classical'),
        'music/classical toggle',
      ) as HTMLButtonElement;
      button.click();
      await settle(host);

      expect(group.hidden).to.equal(false);

      const stored = JSON.parse(
        localStorage.getItem(storageKey) ?? '{}',
      ) as PersistedLayoutSidebarState;
      expect(stored.expandedIds ?? []).to.not.include('music/classical');
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

      const host = await fixture<LayoutSidebar>(html`
        <layout-sidebar
          presentation="overlay"
          state-scope-id="note-navigation"
          .itemsJson=${sampleItemsJson}
          selected-id="essay/reading-notes"
          heading="ナビゲーション"
        ></layout-sidebar>
      `);

      await settle(host);

      const button = expectPresent(getControl(host, 'music'), 'music toggle') as HTMLButtonElement;
      button.click();
      await settle(host);

      const stored = JSON.parse(
        localStorage.getItem(storageKey) ?? '{}',
      ) as PersistedLayoutSidebarState;
      expect(stored.expandedIds ?? []).to.include('music');
    } finally {
      media.restore();
    }
  });

  it('selectedId だけが変わっても persisted state を再読込しないこと', async () => {
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

      const host = await fixture<LayoutSidebar>(html`
        <layout-sidebar
          presentation="overlay"
          state-scope-id="note-navigation"
          .itemsJson=${sampleItemsJson}
          selected-id="music/classical/tchaikovsky/the-nutcracker"
          heading="ナビゲーション"
        ></layout-sidebar>
      `);

      await settle(host);

      const essayGroup = expectPresent(getBranchGroup(host, 'essay'), 'essay group');
      expect(essayGroup.hidden).to.equal(false);

      localStorage.setItem(
        storageKey,
        JSON.stringify({
          expandedIds: [],
        } satisfies PersistedLayoutSidebarState),
      );

      host.selectedId = 'music/classical/beethoven/symphony-9';
      await settle(host);

      expect(essayGroup.hidden).to.equal(false);
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

      const host = await fixture<LayoutSidebar>(html`
        <layout-sidebar
          presentation="overlay"
          state-scope-id="reference-navigation"
          .itemsJson=${sampleItemsJson}
          selected-id="essay/reading-notes"
          heading="ナビゲーション"
        ></layout-sidebar>
      `);

      await settle(host);

      const musicGroup = expectPresent(getBranchGroup(host, 'music'), 'music group');
      expect(musicGroup.hidden).to.equal(true);

      host.stateScopeId = 'note-navigation';
      await settle(host);

      expect(expectPresent(getBranchGroup(host, 'music'), 'music group after scope change').hidden).to.equal(
        false,
      );
    } finally {
      media.restore();
    }
  });

  it('itemsJson が差し替わっても共通 branch id の展開状態を維持すること', async () => {
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

      const host = await fixture<LayoutSidebar>(html`
        <layout-sidebar
          presentation="overlay"
          state-scope-id="note-navigation"
          .itemsJson=${sampleItemsJson}
          selected-id="music/classical/tchaikovsky/the-nutcracker"
          heading="ナビゲーション"
        ></layout-sidebar>
      `);

      await settle(host);

      host.itemsJson = JSON.stringify([
        {
          kind: 'branch',
          id: 'music',
          label: 'Music',
          children: [
            {
              kind: 'branch',
              id: 'music/classical',
              label: 'Classical',
              children: [
                {
                  kind: 'leaf',
                  id: 'music/classical/mozart/requiem',
                  label: 'Requiem',
                  href: '/notes/music/classical/mozart/requiem',
                },
              ],
            },
          ],
        },
      ]);
      host.selectedId = 'music/classical/mozart/requiem';
      await settle(host);

      const branchGroup = expectPresent(
        getBranchGroup(host, 'music/classical'),
        'music/classical group after itemsJson swap',
      );
      expect(branchGroup.hidden).to.equal(false);
    } finally {
      media.restore();
    }
  });

  it('presentation="auto" では広幅で fixed / expanded を解決すること', async () => {
    const media = mockMatchMedia(true);

    try {
      await ensureLayoutSidebarDefined();

      const host = await fixture<LayoutSidebar>(html`
        <layout-sidebar
          presentation="auto"
          .itemsJson=${sampleItemsJson}
          selected-id="music/classical/beethoven/symphony-9"
        ></layout-sidebar>
      `);

      await settle(host);

      const shell = expectPresent(getSidebarShell(host), 'ui-sidebar-shell');
      expect(shell.mode).to.equal('fixed');
      expect(shell.state).to.equal('expanded');
    } finally {
      media.restore();
    }
  });

  it('host 接続前の toggle request が失われず、overlay 初期状態へ反映されること', async () => {
    const media = mockMatchMedia(false);

    try {
      await ensureLayoutSidebarDefined();

      layoutSidebarController.toggle(DEFAULT_LAYOUT_SIDEBAR_ID);

      const host = await fixture<LayoutSidebar>(html`
        <layout-sidebar
          presentation="auto"
          .itemsJson=${sampleItemsJson}
          selected-id="music/classical/beethoven/symphony-9"
        ></layout-sidebar>
      `);

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

      const host = await fixture<LayoutSidebar>(html`
        <layout-sidebar
          presentation="overlay"
          .itemsJson=${sampleItemsJson}
          selected-id="music/classical/beethoven/symphony-9"
        ></layout-sidebar>
      `);

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

  it('Arrow key と typeahead が light DOM nav 上で成立すること', async () => {
    const media = mockMatchMedia(true);

    try {
      await ensureLayoutSidebarDefined();

      const host = await fixture<LayoutSidebar>(html`
        <layout-sidebar
          presentation="fixed"
          .itemsJson=${sampleItemsJson}
          selected-id="music/classical/beethoven/symphony-9"
        ></layout-sidebar>
      `);

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

  it('server nav がある場合は itemsJson fallback へ戻らず、そのまま正規経路として扱うこと', async () => {
    const media = mockMatchMedia(true);

    try {
      await ensureLayoutSidebarDefined();

      const host = await fixture<LayoutSidebar>(html`
        <layout-sidebar selected-id="notes/example">
          <nav data-sidebar-nav aria-label="ノートナビゲーション" data-topology-revision="topology:example">
            <ul>
              <li data-node-id="notes/example" data-node-kind="leaf" data-node-depth="0">
                <a href="/notes/example" aria-current="page">Example</a>
              </li>
            </ul>
          </nav>
        </layout-sidebar>
      `);

      await settle(host);

      expect(getNav(host)?.getAttribute('data-topology-revision')).to.equal('topology:example');
      expect(host.querySelectorAll('nav[data-sidebar-nav]').length).to.equal(1);
      expect(host.innerHTML).to.contain('ui-sidebar-shell');
      expect(host.innerHTML).to.contain('Example');
    } finally {
      media.restore();
    }
  });
});
