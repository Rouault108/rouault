import { expect, fixture, html } from '@open-wc/testing';
import '../../src/components/ui/sidebar-shell/sidebar-shell.js';
import type {
  UiSidebarShell,
  UiSidebarStateChangeDetail,
} from '../../src/components/ui/sidebar-shell/sidebar-shell.js';
import { dispatchKey, nextAnimationFrame, waitForLitUpdate } from './helpers/wait-for-lit.js';

const STORAGE_KEY = 'rouault.sidebar.state';

const getNav = (host: UiSidebarShell): HTMLElement | null =>
  host.shadowRoot?.querySelector<HTMLElement>('nav') ?? null;

const getScrim = (host: UiSidebarShell): HTMLElement | null =>
  host.shadowRoot?.querySelector<HTMLElement>('.scrim') ?? null;

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

interface MatchMediaController {
  setOverlayMatches(nextValue: boolean): void;
  restore(): void;
}

const mockMatchMedia = (
  reducedMotion = true,
  overlayMatches = false,
): MatchMediaController => {
  const original = window.matchMedia.bind(window);
  let currentOverlayMatches = overlayMatches;
  const overlayListeners = new Set<(event: MediaQueryListEvent) => void>();

  window.matchMedia = ((query: string): MediaQueryList => {
    const isReducedMotionQuery = query === '(prefers-reduced-motion: reduce)';
    const isBreakpointQuery = query.startsWith('(min-width:');

    return {
      matches: isReducedMotionQuery ? reducedMotion : isBreakpointQuery ? currentOverlayMatches : false,
      media: query,
      onchange: null,
      addEventListener: (_type: string, listener: EventListenerOrEventListenerObject) => {
        if (!isBreakpointQuery) return;
        const callback =
          typeof listener === 'function'
            ? (listener as (event: MediaQueryListEvent) => void)
            : (event: MediaQueryListEvent) => listener.handleEvent(event);
        overlayListeners.add(callback);
      },
      removeEventListener: (_type: string, listener: EventListenerOrEventListenerObject) => {
        if (!isBreakpointQuery) return;
        const callback =
          typeof listener === 'function'
            ? (listener as (event: MediaQueryListEvent) => void)
            : (event: MediaQueryListEvent) => listener.handleEvent(event);
        overlayListeners.delete(callback);
      },
      addListener: noop,
      removeListener: noop,
      dispatchEvent: returnFalse,
    } as MediaQueryList;
  }) as typeof window.matchMedia;

  return {
    setOverlayMatches(nextValue: boolean): void {
      currentOverlayMatches = nextValue;
      const event = { matches: currentOverlayMatches } as MediaQueryListEvent;
      for (const listener of overlayListeners) {
        listener(event);
      }
    },
    restore(): void {
      window.matchMedia = original;
    },
  };
};

const waitForStateChange = (host: UiSidebarShell): Promise<UiSidebarStateChangeDetail> =>
  new Promise((resolve) => {
    host.addEventListener(
      'ui-sidebar-state-change',
      ((event: Event) => {
        if (event instanceof CustomEvent) {
          resolve(event.detail as UiSidebarStateChangeDetail);
        }
      }) as EventListener,
      { once: true },
    );
  });

describe('ui-sidebar-shell browser contract', () => {
  afterEach(() => {
    localStorage.removeItem(STORAGE_KEY);
  });

  it('overlay では expand / collapse に伴って focus を移し、trigger へ返すこと', async () => {
    const media = mockMatchMedia(true, false);

    try {
      const wrapper = await fixture<HTMLDivElement>(html`
        <div>
          <button id="trigger">開く</button>
          <ui-sidebar-shell id="shell" mode="overlay" data-state="collapsed">
            <button id="inside-header" slot="header">現在のジャンル</button>
            <a href="#note-a">ノート A</a>
            <a href="#note-b">ノート B</a>
          </ui-sidebar-shell>
        </div>
      `);

      const trigger = expectPresent(
        wrapper.querySelector<HTMLButtonElement>('#trigger'),
        'trigger',
      );
      const shell = expectPresent(wrapper.querySelector<UiSidebarShell>('#shell'), 'shell');
      const headerButton = expectPresent(
        wrapper.querySelector<HTMLButtonElement>('#inside-header'),
        'headerButton',
      );

      await waitForLitUpdate(shell);

      const nav = expectPresent(getNav(shell), 'nav');
      expect(nav.inert).to.equal(true);
      expect(nav.style.visibility).to.equal('hidden');

      trigger.focus();

      const expandPromise = waitForStateChange(shell);
      shell.expand(trigger);
      const expandDetail = await expandPromise;
      await waitForLitUpdate(shell);

      expect(expandDetail.state).to.equal('expanded');
      expect(expandDetail.mode).to.equal('overlay');
      expect(nav.inert).to.equal(false);
      expect(nav.style.visibility).to.equal('visible');
      expect(document.activeElement).to.equal(headerButton);

      const collapsePromise = waitForStateChange(shell);
      shell.collapse();
      const collapseDetail = await collapsePromise;
      await waitForLitUpdate(shell);

      expect(collapseDetail.state).to.equal('collapsed');
      expect(collapseDetail.mode).to.equal('overlay');
      expect(nav.inert).to.equal(true);
      expect(nav.style.visibility).to.equal('hidden');
      expect(document.activeElement).to.equal(trigger);
    } finally {
      media.restore();
    }
  });

  it('scrim click で閉じ、状態を localStorage に永続化すること', async () => {
    const media = mockMatchMedia(true, false);

    try {
      const shell = await fixture<UiSidebarShell>(html`
        <ui-sidebar-shell mode="overlay" data-state="expanded">
          <a href="#note-a">ノート A</a>
        </ui-sidebar-shell>
      `);

      await waitForLitUpdate(shell);

      const scrim = expectPresent(getScrim(shell), 'scrim');

      const collapsePromise = waitForStateChange(shell);
      scrim.click();
      const collapseDetail = await collapsePromise;
      await waitForLitUpdate(shell);

      expect(collapseDetail.state).to.equal('collapsed');
      expect(shell.state).to.equal('collapsed');
      expect(localStorage.getItem(STORAGE_KEY)).to.equal('collapsed');

      const expandPromise = waitForStateChange(shell);
      shell.expand();
      const expandDetail = await expandPromise;
      await waitForLitUpdate(shell);

      expect(expandDetail.state).to.equal('expanded');
      expect(shell.state).to.equal('expanded');
      expect(localStorage.getItem(STORAGE_KEY)).to.equal('expanded');
    } finally {
      media.restore();
    }
  });

  it('state change event は bubble せず、属性とプロパティが双方向同期すること', async () => {
    const media = mockMatchMedia(true, true);

    try {
      const wrapper = await fixture<HTMLDivElement>(html`
        <div id="parent">
          <ui-sidebar-shell id="shell" mode="fixed" data-state="expanded">
            <a href="#note-a">ノート A</a>
          </ui-sidebar-shell>
        </div>
      `);

      const shell = expectPresent(wrapper.querySelector<UiSidebarShell>('#shell'), 'shell');

      await waitForLitUpdate(shell);

      let bubbledCount = 0;
      wrapper.addEventListener('ui-sidebar-state-change', () => {
        bubbledCount += 1;
      });

      const collapsePromise = waitForStateChange(shell);
      shell.setAttribute('data-state', 'collapsed');
      const collapseDetail = await collapsePromise;
      await waitForLitUpdate(shell);

      expect(collapseDetail.state).to.equal('collapsed');
      expect(collapseDetail.mode).to.equal('fixed');
      expect(shell.state).to.equal('collapsed');
      expect(bubbledCount).to.equal(0);

      const expandPromise = waitForStateChange(shell);
      shell.state = 'expanded';
      await expandPromise;
      await waitForLitUpdate(shell);

      expect(shell.getAttribute('data-state')).to.equal('expanded');
    } finally {
      media.restore();
    }
  });

  it('overlay では Escape で閉じるが、fixed では Escape を無視すること', async () => {
    const media = mockMatchMedia(true, false);

    try {
      const overlay = await fixture<UiSidebarShell>(html`
        <ui-sidebar-shell mode="overlay" data-state="expanded">
          <button slot="header">Header</button>
          <a href="#note-a">ノート A</a>
        </ui-sidebar-shell>
      `);

      await waitForLitUpdate(overlay);

      const overlayNav = expectPresent(getNav(overlay), 'overlayNav');
      const overlayClosed = waitForStateChange(overlay);
      dispatchKey(overlayNav, 'Escape');
      const overlayDetail = await overlayClosed;
      await waitForLitUpdate(overlay);

      expect(overlayDetail.state).to.equal('collapsed');
      expect(overlayDetail.mode).to.equal('overlay');

      const fixed = await fixture<UiSidebarShell>(html`
        <ui-sidebar-shell mode="fixed" data-state="expanded">
          <button slot="header">Header</button>
          <a href="#note-a">ノート A</a>
        </ui-sidebar-shell>
      `);

      await waitForLitUpdate(fixed);

      const fixedNav = expectPresent(getNav(fixed), 'fixedNav');
      dispatchKey(fixedNav, 'Escape');
      await nextAnimationFrame();

      expect(fixed.state).to.equal('expanded');
    } finally {
      media.restore();
    }
  });

  it('mode 未指定時は matchMedia に追従し、fixedBreakpoint の更新でも再評価すること', async () => {
    const media = mockMatchMedia(true, true);

    try {
      const shell = await fixture<UiSidebarShell>(html`
        <ui-sidebar-shell data-state="expanded">
          <button slot="header">Header</button>
          <a href="#note-a">ノート A</a>
        </ui-sidebar-shell>
      `);

      await waitForLitUpdate(shell);

      expect(shell.mode).to.equal('fixed');

      media.setOverlayMatches(false);
      await nextAnimationFrame();
      expect(shell.mode).to.equal('overlay');

      shell.fixedBreakpoint = 100;
      await waitForLitUpdate(shell);
      expect(shell.fixedBreakpoint).to.equal(100);

      media.setOverlayMatches(true);
      await nextAnimationFrame();
      expect(shell.mode).to.equal('fixed');
    } finally {
      media.restore();
    }
  });
});