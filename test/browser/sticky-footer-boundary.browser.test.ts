import { expect } from '@open-wc/testing';

import { attachStickyFooterBoundary } from '../../src/layout/sticky-footer-boundary.js';
import { nextAnimationFrame } from './helpers/wait-for-lit.js';

interface MatchMediaMockController {
  setMatches(nextMatches: boolean): void;
  restore(): void;
}

const noop = (): void => undefined;
const returnFalse = (): boolean => false;

const mockMatchMedia = (initialMatches: boolean): MatchMediaMockController => {
  const original = window.matchMedia.bind(window);
  let matches = initialMatches;
  const listeners = new Set<(event: MediaQueryListEvent) => void>();

  window.matchMedia = ((query: string): MediaQueryList => {
    return {
      get matches() {
        return matches;
      },
      media: query,
      onchange: null,
      addEventListener: (_type: string, listener: EventListenerOrEventListenerObject) => {
        if (typeof listener === 'function') {
          listeners.add(listener as (event: MediaQueryListEvent) => void);
        }
      },
      removeEventListener: (_type: string, listener: EventListenerOrEventListenerObject) => {
        if (typeof listener === 'function') {
          listeners.delete(listener as (event: MediaQueryListEvent) => void);
        }
      },
      addListener: noop,
      removeListener: noop,
      dispatchEvent: returnFalse,
    } as MediaQueryList;
  }) as typeof window.matchMedia;

  return {
    setMatches(nextMatches: boolean): void {
      if (matches === nextMatches) {
        return;
      }

      matches = nextMatches;
      const event = { matches, media: '(min-width: 640px)' } as MediaQueryListEvent;
      for (const listener of listeners) {
        listener(event);
      }
    },
    restore(): void {
      window.matchMedia = original;
    },
  };
};

describe('attachStickyFooterBoundary', () => {
  let originalInnerHeightDescriptor: PropertyDescriptor | undefined;

  beforeEach(() => {
    originalInnerHeightDescriptor = Object.getOwnPropertyDescriptor(window, 'innerHeight');
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 900,
    });
  });

  afterEach(() => {
    document.body.innerHTML = '';

    if (originalInnerHeightDescriptor) {
      Object.defineProperty(window, 'innerHeight', originalInnerHeightDescriptor);
    } else {
      Reflect.deleteProperty(window, 'innerHeight');
    }
  });

  it('mobile 幅では sticky 補助面の style 更新を行わないこと', async () => {
    const media = mockMatchMedia(false);

    try {
      const target = document.createElement('aside');
      target.style.setProperty('--header-height', '48px');
      document.body.append(target);

      const footer = document.createElement('footer');
      footer.setAttribute('data-layout-footer', '');
      Object.defineProperty(footer, 'getBoundingClientRect', {
        configurable: true,
        value: () =>
          ({
            top: 1200,
            left: 0,
            right: 0,
            bottom: 0,
            width: 0,
            height: 0,
            x: 0,
            y: 1200,
            toJSON: () => undefined,
          }) satisfies DOMRect,
      });
      document.body.append(footer);

      const detach = attachStickyFooterBoundary(target, { minWidth: 640 });
      await nextAnimationFrame();

      expect(target.style.getPropertyValue('--layout-sticky-max-block-size')).to.equal('');
      expect(target.style.getPropertyValue('--layout-sticky-footer-offset')).to.equal('');

      window.dispatchEvent(new Event('scroll'));
      await nextAnimationFrame();

      expect(target.style.getPropertyValue('--layout-sticky-max-block-size')).to.equal('');
      expect(target.style.getPropertyValue('--layout-sticky-footer-offset')).to.equal('');

      detach();
    } finally {
      media.restore();
    }
  });

  it('desktop 幅へ戻ったら sticky 補助面の style 更新を再開すること', async () => {
    const media = mockMatchMedia(false);

    try {
      const target = document.createElement('aside');
      target.style.setProperty('--header-height', '48px');
      document.body.append(target);

      const footer = document.createElement('footer');
      footer.setAttribute('data-layout-footer', '');
      Object.defineProperty(footer, 'getBoundingClientRect', {
        configurable: true,
        value: () =>
          ({
            top: 1200,
            left: 0,
            right: 0,
            bottom: 0,
            width: 0,
            height: 0,
            x: 0,
            y: 1200,
            toJSON: () => undefined,
          }) satisfies DOMRect,
      });
      document.body.append(footer);

      const detach = attachStickyFooterBoundary(target, { minWidth: 640 });
      await nextAnimationFrame();

      expect(target.style.getPropertyValue('--layout-sticky-max-block-size')).to.equal('');

      media.setMatches(true);
      await nextAnimationFrame();

      expect(target.style.getPropertyValue('--layout-sticky-max-block-size')).to.equal('852px');
      expect(target.style.getPropertyValue('--layout-sticky-footer-offset')).to.equal('0px');

      media.setMatches(false);
      await nextAnimationFrame();

      expect(target.style.getPropertyValue('--layout-sticky-max-block-size')).to.equal('');
      expect(target.style.getPropertyValue('--layout-sticky-footer-offset')).to.equal('');

      detach();
    } finally {
      media.restore();
    }
  });
});
