import { expect, fixture, html } from '@open-wc/testing';
import '../../src/components/layout/layout-sidebar.js';
import type { LayoutSidebar } from '../../src/components/layout/layout-sidebar.js';
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

describe('layout-sidebar hydration activation contract', () => {
  it('activateHydration() を複数回呼んでも再描画が破綻しないこと', async () => {
    const media = mockMatchMedia(true);

    try {
      const host = await fixture<LayoutSidebar>(html`
        <layout-sidebar
          .itemsJson=${sampleItemsJson}
          selected-id="music/classical/beethoven/symphony-9"
          data-hydration-trigger="manual"
        ></layout-sidebar>
      `);

      await flush(host);

      host.activateHydration();
      await flush(host);

      host.activateHydration();
      await flush(host);

      expect(getSidebar(host)).to.not.equal(null);
    } finally {
      media.restore();
    }
  });
});
