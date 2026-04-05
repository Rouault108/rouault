import { expect } from '@open-wc/testing';
import type { LayoutSidebar } from '../../src/components/layout/layout-sidebar.js';
import { promoteDeclarativeShadowRoots } from '../../src/router/declarative-shadow-dom.js';
import { nextAnimationFrame, waitForLitUpdate } from './helpers/wait-for-lit.js';

interface MatchMediaController {
  restore(): void;
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

const getSidebar = (host: LayoutSidebar): HTMLElement | null =>
  host.shadowRoot?.querySelector('ui-sidebar') ?? null;

const flush = async (host: LayoutSidebar): Promise<void> => {
  await waitForLitUpdate(host);
  await nextAnimationFrame();

  const sidebar = getSidebar(host) as (HTMLElement & { updateComplete?: Promise<unknown> }) | null;
  if (sidebar?.updateComplete) {
    await sidebar.updateComplete;
  }

  await nextAnimationFrame();
  await waitForLitUpdate(host);
};

describe('layout-sidebar SSR hydration contract', () => {
  it('SSR 済み shadow root を hydration 前に空へ戻して再描画すること', async () => {
    const media = mockMatchMedia(true);
    const wrapper = document.createElement('div');

    try {
      const host = document.createElement('layout-sidebar');
      host.setAttribute('defer-hydration', '');
      host.setAttribute('data-hydration-trigger', 'initial');
      host.setAttribute('selected-id', 'music/classical/beethoven/symphony-9');
      host.setAttribute('items-json', sampleItemsJson);
      host.innerHTML = `
        <template shadowrootmode="open">
          <div data-ssr-stale="true"></div>
        </template>
      `;

      wrapper.appendChild(host);
      document.body.appendChild(wrapper);

      promoteDeclarativeShadowRoots(wrapper);

      await import('../../src/components/layout/layout-sidebar.js');
      await customElements.whenDefined('layout-sidebar');
      customElements.upgrade(wrapper);

      const upgradedHost = wrapper.querySelector('layout-sidebar') as LayoutSidebar | null;
      expect(upgradedHost).to.not.equal(null);
      if (!upgradedHost) {
        throw new Error('layout-sidebar の upgrade に失敗しました');
      }

      await flush(upgradedHost);

      upgradedHost.activateHydration();
      await flush(upgradedHost);

      expect(upgradedHost.hasAttribute('defer-hydration')).to.equal(false);
      expect(upgradedHost.shadowRoot?.querySelector('[data-ssr-stale="true"]')).to.equal(null);
      expect(getSidebar(upgradedHost)).to.not.equal(null);
    } finally {
      wrapper.remove();
      media.restore();
    }
  });
});