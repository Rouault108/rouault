import { expect, fixture, html } from '@open-wc/testing';
import type { LayoutToc } from '../../src/components/layout/layout-toc.js';
import { activateLayoutToc } from '../../src/components/layout/layout-toc.js';

interface MatchMediaController {
  restore(): void;
}

interface ScrollController {
  setY(nextY: number): void;
  restore(): void;
}

const headingsJson = JSON.stringify([
  { id: 'overview', text: 'Overview', level: 2 },
  { id: 'details', text: 'Details', level: 2 },
]);

const capabilitiesJson = JSON.stringify({
  activeTracking: false,
  dynamicScopes: false,
  mobileSummary: true,
});

const ensureLayoutTocDefined = async (): Promise<void> => {
  await import('../../src/components/layout/layout-toc.js');
  await customElements.whenDefined('layout-toc');
};

const mockMatchMedia = (): MatchMediaController => {
  const original = window.matchMedia.bind(window);

  window.matchMedia = ((query: string): MediaQueryList => {
    return {
      matches: query === '(max-width: 639px)',
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    } as MediaQueryList;
  }) as typeof window.matchMedia;

  return {
    restore(): void {
      window.matchMedia = original;
    },
  };
};

const mockScroll = (): ScrollController => {
  const originalDescriptor = Object.getOwnPropertyDescriptor(window, 'scrollY');
  const originalScrollTo = window.scrollTo.bind(window);
  let currentY = 0;

  Object.defineProperty(window, 'scrollY', {
    configurable: true,
    get: () => currentY,
  });

  window.scrollTo = (((options?: ScrollToOptions | number, y?: number): void => {
    if (typeof options === 'number') {
      currentY = typeof y === 'number' ? y : currentY;
    } else if (options && typeof options.top === 'number') {
      currentY = options.top;
    }
    window.dispatchEvent(new Event('scroll'));
  }) as unknown) as typeof window.scrollTo;

  return {
    setY(nextY: number): void {
      currentY = nextY;
      window.dispatchEvent(new Event('scroll'));
    },
    restore(): void {
      if (originalDescriptor) {
        Object.defineProperty(window, 'scrollY', originalDescriptor);
      } else {
        Reflect.deleteProperty(window, 'scrollY');
      }
      window.scrollTo = originalScrollTo;
    },
  };
};

const settle = async (host: LayoutToc): Promise<void> => {
  await host.updateComplete;
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });
  await host.updateComplete;
};

describe('layout-toc mobile summary contract', () => {
  beforeEach(() => {
    document.documentElement.style.setProperty('--header-height', '56px');
  });

  afterEach(() => {
    document.documentElement.style.removeProperty('--header-height');
  });

  it('mobile summary bar is fixed below the header after hydration and scroll', async () => {
    const media = mockMatchMedia();
    const scroll = mockScroll();

    try {
      await ensureLayoutTocDefined();

      const shell = await fixture<HTMLElement>(html`
        <div>
          <article id="content-root">
            <h2 id="overview">Overview</h2>
            <h2 id="details">Details</h2>
          </article>
          <layout-toc
            headings-json=${headingsJson}
            capabilities-json=${capabilitiesJson}
            content-root-id="content-root"
          ></layout-toc>
        </div>
      `);

      const host = shell.querySelector<LayoutToc>('layout-toc');
      expect(host).to.not.equal(null);

      if (!(host instanceof HTMLElement)) {
        throw new Error('layout-toc が見つかりません');
      }

      activateLayoutToc(host);
      await settle(host as LayoutToc);

      expect(host.shadowRoot?.querySelector('.mobile-bar')).to.equal(null);

      scroll.setY(120);
      await settle(host as LayoutToc);

      const bar = host.shadowRoot?.querySelector<HTMLElement>('.mobile-bar');
      const title = host.shadowRoot?.querySelector<HTMLElement>('.mobile-title');

      expect(bar).to.not.equal(null);
      expect(title?.textContent?.trim()).to.equal('Overview');

      const style = bar ? getComputedStyle(bar) : null;
      expect(style?.position).to.equal('fixed');
      expect(style?.top).to.equal('56px');
    } finally {
      media.restore();
      scroll.restore();
    }
  });
});