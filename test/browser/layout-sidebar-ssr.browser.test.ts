import { expect, fixture, html } from '@open-wc/testing';
import '../../src/components/layout/layout-sidebar.js';
import type { LayoutSidebar } from '../../src/components/layout/layout-sidebar.js';
import { nextAnimationFrame, waitForLitUpdate } from './helpers/wait-for-lit.js';

interface MatchMediaController {
  restore(): void;
}

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

const flush = async (host: LayoutSidebar): Promise<void> => {
  await waitForLitUpdate(host);
  await nextAnimationFrame();

  const shell = host.querySelector('ui-sidebar-shell') as
    | (HTMLElement & { updateComplete?: Promise<unknown> })
    | null;
  if (shell?.updateComplete) {
    await shell.updateComplete;
  }

  await nextAnimationFrame();
  await waitForLitUpdate(host);
};

describe('layout-sidebar hydration contract', () => {
  it('manual activation なしでも server nav を保持したまま shell を接続できること', async () => {
    const media = mockMatchMedia(true);

    try {
      const host = await fixture<LayoutSidebar>(html`
        <layout-sidebar
          selected-id="music/classical/beethoven/symphony-9"
          data-hydration-trigger="manual"
        >
          <nav
            data-sidebar-nav
            aria-label="ノートナビゲーション"
            data-topology-revision="topology:manual"
          >
            <ul>
              <li data-node-id="music" data-node-kind="branch" data-node-depth="0">
                <button
                  type="button"
                  data-sidebar-nav-control
                  data-sidebar-nav-branch-control
                  aria-expanded="true"
                  aria-controls="sidebar-group-music"
                >
                  <span data-sidebar-nav-label>Music</span>
                </button>
                <ul id="sidebar-group-music">
                  <li
                    data-node-id="music/classical/beethoven/symphony-9"
                    data-node-kind="leaf"
                    data-node-depth="1"
                  >
                    <a
                      data-sidebar-nav-control
                      data-sidebar-nav-link
                      href="/notes/music/classical/beethoven/symphony-9"
                      data-link-kind="internal-document"
                      data-link-surface="navigation"
                      aria-current="page"
                      ><span data-sidebar-nav-label>交響曲第9番 ニ短調</span></a
                    >
                  </li>
                </ul>
              </li>
            </ul>
          </nav>
        </layout-sidebar>
      `);

      await flush(host);

      expect(host.querySelector('ui-sidebar-shell')).to.not.equal(null);
      expect(host.querySelector('nav[data-sidebar-nav]')).to.not.equal(null);
      expect(host.querySelector('a[aria-current="page"]')?.textContent).to.equal(
        '交響曲第9番 ニ短調',
      );
    } finally {
      media.restore();
    }
  });
});
