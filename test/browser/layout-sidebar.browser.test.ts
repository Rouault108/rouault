import { expect, fixture, html } from '@open-wc/testing';
import '../../src/components/ui/sidebar/sidebar.js';
import type { LayoutSidebar } from '../../src/components/layout/layout-sidebar.js';
import { getLayoutSidebarTreeStateStorageKey } from '../../src/components/layout/layout-sidebar-tree-state.js';
import type {
  UiSidebar,
  UiSidebarSelectDetail,
  UiSidebarToggleDetail,
} from '../../src/components/ui/sidebar/sidebar.js';
import { nextAnimationFrame, waitForLitUpdate } from './helpers/wait-for-lit.js';

interface MatchMediaController {
  restore(): void;
}

interface PersistedLayoutSidebarState {
  expandedIds?: string[];
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

const mockMatchMedia = (breakpointMatches: boolean): MatchMediaController => {
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

const getFloatingToggle = (host: LayoutSidebar): HTMLButtonElement | null =>
  host.shadowRoot?.querySelector<HTMLButtonElement>('button.floating-toggle') ?? null;

const flush = async (host: LayoutSidebar): Promise<void> => {
  await waitForLitUpdate(host);
  await nextAnimationFrame();

  const sidebar = getSidebar(host);
  if (sidebar) {
    await waitForLitUpdate(sidebar);
  }

  await nextAnimationFrame();
  await waitForLitUpdate(host);
};

describe('layout-sidebar browser contract', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('expandedIds を selectedId scope の localStorage へ永続化すること', async () => {
    const media = mockMatchMedia(true);

    try {
      await ensureLayoutSidebarDefined();

      const selectedId = 'music/classical/beethoven/symphony-9';
      const storageKey = getLayoutSidebarTreeStateStorageKey(selectedId);

      localStorage.removeItem(storageKey);

      const host = await fixture<LayoutSidebar>(html`
        <layout-sidebar
          .itemsJson=${sampleItemsJson}
          selected-id="${selectedId}"
          heading="ナビゲーション"
        ></layout-sidebar>
      `);

      await flush(host);

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

      await flush(host);

      const storedRaw = localStorage.getItem(storageKey);
      expect(storedRaw).to.not.equal(null);

      const stored = JSON.parse(storedRaw ?? '{}') as PersistedLayoutSidebarState;
      expect(stored.expandedIds ?? []).to.include('music/classical');
    } finally {
      media.restore();
    }
  });

  it('overlay では selection 後に sidebar を collapse すること', async () => {
    const media = mockMatchMedia(false);

    try {
      await ensureLayoutSidebarDefined();

      const host = await fixture<LayoutSidebar>(html`
        <layout-sidebar
          .itemsJson=${sampleItemsJson}
          selected-id="music/classical/beethoven/symphony-9"
          fixed-breakpoint="99999"
        ></layout-sidebar>
      `);

      await flush(host);

      const sidebar = expectPresent(getSidebar(host), 'ui-sidebar');
      const toggle = expectPresent(getFloatingToggle(host), 'floating toggle');

      expect(sidebar.mode).to.equal('overlay');

      sidebar.expand();
      await flush(host);

      expect(sidebar.state).to.equal('expanded');
      expect(toggle.getAttribute('aria-expanded')).to.equal('true');

      sidebar.dispatchEvent(
        new CustomEvent<UiSidebarSelectDetail>('ui-sidebar-select', {
          bubbles: true,
          composed: true,
          detail: {
            id: 'music/classical/tchaikovsky/the-nutcracker',
          },
        }),
      );

      await flush(host);

      expect(sidebar.mode).to.equal('overlay');
      expect(sidebar.state).to.equal('collapsed');
      expect(toggle.getAttribute('aria-expanded')).to.equal('false');
    } finally {
      media.restore();
    }
  });
});