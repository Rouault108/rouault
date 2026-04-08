import { expect, fixture, html } from '@open-wc/testing';
import '../../src/components/ui/sidebar/sidebar.js';
import type { LayoutSidebar } from '../../src/components/layout/layout-sidebar.js';
import { getLayoutSidebarTreeStateStorageKey } from '../../src/components/layout/layout-sidebar-tree-state.js';
import type {
  UiSidebar,
  UiSidebarSelectDetail,
  UiSidebarToggleDetail,
} from '../../src/components/ui/sidebar/sidebar.js';
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
    icon: 'folder',
    children: [
      {
        kind: 'branch',
        id: 'music/classical',
        label: 'Classical',
        icon: 'folder',
        children: [
          {
            kind: 'leaf',
            id: 'music/classical/beethoven/symphony-9',
            label: '交響曲第9番 ニ短調',
            href: '/notes/music/classical/beethoven/symphony-9',
            icon: 'file-text',
          },
          {
            kind: 'leaf',
            id: 'music/classical/tchaikovsky/the-nutcracker',
            label: 'くるみ割り人形',
            href: '/notes/music/classical/tchaikovsky/the-nutcracker',
            icon: 'file-text',
          },
        ],
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

const getSidebar = (host: LayoutSidebar): UiSidebar | null =>
  host.shadowRoot?.querySelector<UiSidebar>('ui-sidebar') ?? null;

const getSidebarShell = (host: LayoutSidebar): LitLikeElement | null =>
  getSidebar(host)?.shadowRoot?.querySelector<LitLikeElement>('ui-sidebar-shell') ?? null;

const getFileTree = (host: LayoutSidebar): LitLikeElement | null =>
  getSidebar(host)?.shadowRoot?.querySelector<LitLikeElement>('ui-file-tree') ?? null;

const getTreeItemHost = (fileTree: LitLikeElement, id: string): LitLikeElement | null =>
  fileTree.shadowRoot?.querySelector<LitLikeElement>(`ui-tree-item[data-id="${id}"]`) ?? null;

const getTreeItemChildrenPanel = (fileTree: LitLikeElement, id: string): HTMLElement | null =>
  getTreeItemHost(fileTree, id)?.shadowRoot?.querySelector<HTMLElement>('.children') ?? null;

const settle = async (host: LayoutSidebar): Promise<void> => {
  await waitForLitUpdate(host);

  const sidebar = getSidebar(host);
  if (sidebar) {
    await waitForLitUpdate(sidebar);
  }

  const shell = getSidebarShell(host);
  if (shell) {
    await waitForLitUpdate(shell);
  }

  const fileTree = getFileTree(host);
  if (fileTree) {
    await waitForLitUpdate(fileTree);
  }

  await Promise.resolve();
  await Promise.resolve();
};

const onceCustomEvent = <T>(
  target: EventTarget,
  type: string,
): Promise<CustomEvent<T>> =>
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
  const sidebar = expectPresent(getSidebar(host), 'ui-sidebar');
  const stateChangePromise = onceCustomEvent<SidebarStateChangeDetail>(
    sidebar,
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
  });

  it('初回表示では現在位置の祖先を開き、その後は手動で閉じられること', async () => {
    const media = mockMatchMedia();

    try {
      await ensureLayoutSidebarDefined();

      const selectedId = 'music/classical/beethoven/symphony-9';
      const storageKey = getLayoutSidebarTreeStateStorageKey(selectedId);

      localStorage.removeItem(storageKey);

      const host = await fixture<LayoutSidebar>(html`
        <layout-sidebar
          presentation="overlay"
          .itemsJson=${sampleItemsJson}
          selected-id="${selectedId}"
          heading="ナビゲーション"
        ></layout-sidebar>
      `);

      await settle(host);

      const initialFileTree = expectPresent(getFileTree(host), 'ui-file-tree');
      await waitForLitUpdate(initialFileTree);

      expect(
        initialFileTree.shadowRoot?.querySelector(
          'ui-tree-item[data-id="music/classical/beethoven/symphony-9"]',
        ),
      ).to.not.equal(null);

      const sidebar = expectPresent(getSidebar(host), 'ui-sidebar');
      sidebar.dispatchEvent(
        new CustomEvent<UiSidebarToggleDetail>('ui-sidebar-toggle', {
          bubbles: true,
          composed: true,
          detail: {
            id: 'music/classical',
            expanded: false,
          },
        }),
      );

      await settle(host);

      const collapsedFileTree = expectPresent(getFileTree(host), 'ui-file-tree');
      await waitForLitUpdate(collapsedFileTree);
      const collapsedBranchPanel = expectPresent(
        getTreeItemChildrenPanel(collapsedFileTree, 'music/classical'),
        'music/classical children panel',
      );

      expect(collapsedBranchPanel.getAttribute('aria-hidden')).to.equal('true');
      expect(collapsedBranchPanel.hasAttribute('inert')).to.equal(true);

      const storedRaw = localStorage.getItem(storageKey);
      expect(storedRaw).to.not.equal(null);

      const stored = JSON.parse(storedRaw ?? '{}') as PersistedLayoutSidebarState;
      expect(stored.expandedIds ?? []).to.not.include('music/classical');
    } finally {
      media.restore();
    }
  });

  it('expandedIds を selectedId scope の localStorage へ永続化すること', async () => {
    const media = mockMatchMedia();

    try {
      await ensureLayoutSidebarDefined();

      const selectedId = 'music/classical/beethoven/symphony-9';
      const storageKey = getLayoutSidebarTreeStateStorageKey(selectedId);

      localStorage.removeItem(storageKey);

      const host = await fixture<LayoutSidebar>(html`
        <layout-sidebar
          presentation="overlay"
          .itemsJson=${sampleItemsJson}
          selected-id="${selectedId}"
          heading="ナビゲーション"
        ></layout-sidebar>
      `);

      await settle(host);

      const sidebar = expectPresent(getSidebar(host), 'ui-sidebar');

      sidebar.dispatchEvent(
        new CustomEvent<UiSidebarToggleDetail>('ui-sidebar-toggle', {
          bubbles: true,
          composed: true,
          detail: {
            id: 'music/classical',
            expanded: true,
          },
        }),
      );

      await settle(host);

      const storedRaw = localStorage.getItem(storageKey);
      expect(storedRaw).to.not.equal(null);

      const stored = JSON.parse(storedRaw ?? '{}') as PersistedLayoutSidebarState;
      expect(stored.expandedIds ?? []).to.include('music/classical');
    } finally {
      media.restore();
    }
  });

  it('presentation を分離した場合、fixed 面は toggle request を無視し overlay 面だけが応答すること', async () => {
    const media = mockMatchMedia();

    try {
      await ensureLayoutSidebarDefined();

      const fixedHost = await fixture<LayoutSidebar>(html`
        <layout-sidebar
          presentation="fixed"
          .itemsJson=${sampleItemsJson}
          selected-id="music/classical/beethoven/symphony-9"
        ></layout-sidebar>
      `);

      await settle(fixedHost);

      const fixedSidebar = expectPresent(getSidebar(fixedHost), 'fixed ui-sidebar');
      expect(fixedSidebar.mode).to.equal('fixed');
      expect(fixedSidebar.state).to.equal('expanded');

      window.dispatchEvent(new CustomEvent('layout-sidebar-toggle-request'));
      await settle(fixedHost);

      expect(fixedSidebar.state).to.equal('expanded');

      const overlayHost = await fixture<LayoutSidebar>(html`
        <layout-sidebar
          presentation="overlay"
          .itemsJson=${sampleItemsJson}
          selected-id="music/classical/beethoven/symphony-9"
        ></layout-sidebar>
      `);

      await settle(overlayHost);

      const overlaySidebar = expectPresent(getSidebar(overlayHost), 'overlay ui-sidebar');
      expect(overlaySidebar.mode).to.equal('overlay');
      expect(overlaySidebar.state).to.equal('collapsed');

      await waitForSidebarStateChange(overlayHost, 'expanded', () => {
        window.dispatchEvent(new CustomEvent('layout-sidebar-toggle-request'));
      });

      expect(overlaySidebar.state).to.equal('expanded');
    } finally {
      media.restore();
    }
  });

  it('fixed / overlay の二重 host でも branch toggle が即時同期されること', async () => {
    const media = mockMatchMedia();

    try {
      await ensureLayoutSidebarDefined();

      const selectedId = 'music/classical/beethoven/symphony-9';

      const fixedHost = await fixture<LayoutSidebar>(html`
        <layout-sidebar
          presentation="fixed"
          .itemsJson=${sampleItemsJson}
          selected-id="${selectedId}"
        ></layout-sidebar>
      `);

      const overlayHost = await fixture<LayoutSidebar>(html`
        <layout-sidebar
          presentation="overlay"
          .itemsJson=${sampleItemsJson}
          selected-id="${selectedId}"
        ></layout-sidebar>
      `);

      await settle(fixedHost);
      await settle(overlayHost);

      const fixedSidebar = expectPresent(getSidebar(fixedHost), 'fixed ui-sidebar');

      fixedSidebar.dispatchEvent(
        new CustomEvent<UiSidebarToggleDetail>('ui-sidebar-toggle', {
          bubbles: true,
          composed: true,
          detail: {
            id: 'music/classical',
            expanded: false,
          },
        }),
      );

      await settle(fixedHost);
      await settle(overlayHost);

      const fixedFileTree = expectPresent(getFileTree(fixedHost), 'fixed ui-file-tree');
      const overlayFileTree = expectPresent(getFileTree(overlayHost), 'overlay ui-file-tree');

      await waitForLitUpdate(fixedFileTree);
      await waitForLitUpdate(overlayFileTree);
      const fixedCollapsedBranchPanel = expectPresent(
        getTreeItemChildrenPanel(fixedFileTree, 'music/classical'),
        'fixed music/classical children panel',
      );
      const overlayCollapsedBranchPanel = expectPresent(
        getTreeItemChildrenPanel(overlayFileTree, 'music/classical'),
        'overlay music/classical children panel',
      );

      expect(fixedCollapsedBranchPanel.getAttribute('aria-hidden')).to.equal('true');
      expect(fixedCollapsedBranchPanel.hasAttribute('inert')).to.equal(true);
      expect(overlayCollapsedBranchPanel.getAttribute('aria-hidden')).to.equal('true');
      expect(overlayCollapsedBranchPanel.hasAttribute('inert')).to.equal(true);
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

      const sidebar = expectPresent(getSidebar(host), 'ui-sidebar');

      expect(sidebar.mode).to.equal('overlay');
      expect(sidebar.state).to.equal('collapsed');

      await waitForSidebarStateChange(host, 'expanded', () => {
        sidebar.expand();
      });

      expect(sidebar.mode).to.equal('overlay');
      expect(sidebar.state).to.equal('expanded');

      await waitForSidebarStateChange(host, 'collapsed', () => {
        sidebar.dispatchEvent(
          new CustomEvent<UiSidebarSelectDetail>('ui-sidebar-select', {
            bubbles: true,
            composed: true,
            detail: {
              id: 'music/classical/tchaikovsky/the-nutcracker',
            },
          }),
        );
      });

      expect(sidebar.mode).to.equal('overlay');
      expect(sidebar.state).to.equal('collapsed');
    } finally {
      media.restore();
    }
  });
});
