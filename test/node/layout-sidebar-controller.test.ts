import { afterEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_LAYOUT_SIDEBAR_ID,
  layoutSidebarController,
} from '../../src/components/layout/layout-sidebar-controller.js';

if (typeof globalThis.HTMLElement === 'undefined') {
  Object.defineProperty(globalThis, 'HTMLElement', {
    configurable: true,
    value: class MockHTMLElement {},
  });
}

class MockStorage implements Storage {
  private readonly _values = new Map<string, string>();

  get length(): number {
    return this._values.size;
  }

  clear(): void {
    this._values.clear();
  }

  getItem(key: string): string | null {
    return this._values.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this._values.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this._values.delete(key);
  }

  setItem(key: string, value: string): void {
    this._values.set(key, value);
  }
}

interface MatchMediaMockController {
  dispatch(matches: boolean): void;
  restore(): void;
}

const installMatchMediaMock = (initialMatches: boolean): MatchMediaMockController => {
  const originalWindow = globalThis.window;
  const originalHTMLElement = globalThis.HTMLElement;
  const listeners = new Set<(event: MediaQueryListEvent) => void>();

  const matchMedia = (_query: string): MediaQueryList =>
    ({
      matches: initialMatches,
      media: '',
      onchange: null,
      addEventListener: (_type: string, listener: EventListenerOrEventListenerObject) => {
        const callback =
          typeof listener === 'function'
            ? (listener as (event: MediaQueryListEvent) => void)
            : (event: MediaQueryListEvent) => listener.handleEvent(event);
        listeners.add(callback);
      },
      removeEventListener: (_type: string, listener: EventListenerOrEventListenerObject) => {
        const callback =
          typeof listener === 'function'
            ? (listener as (event: MediaQueryListEvent) => void)
            : (event: MediaQueryListEvent) => listener.handleEvent(event);
        listeners.delete(callback);
      },
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }) as MediaQueryList;

  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { matchMedia },
  });
  Object.defineProperty(globalThis, 'HTMLElement', {
    configurable: true,
    value: class MockHTMLElement {},
  });

  return {
    dispatch(matches: boolean): void {
      for (const listener of listeners) {
        listener({ matches } as MediaQueryListEvent);
      }
    },
    restore(): void {
      Object.defineProperty(globalThis, 'window', {
        configurable: true,
        value: originalWindow,
      });
      Object.defineProperty(globalThis, 'HTMLElement', {
        configurable: true,
        value: originalHTMLElement,
      });
    },
  };
};

describe('layout-sidebar-controller', () => {
  afterEach(() => {
    layoutSidebarController.reset();
  });

  it('presentation="auto" では breakpoint 変化で fixed / overlay を切り替えること', () => {
    const media = installMatchMediaMock(true);

    try {
      layoutSidebarController.initialize(DEFAULT_LAYOUT_SIDEBAR_ID, {
        presentation: 'auto',
        fixedBreakpoint: 1024,
        storage: null,
      });

      expect(layoutSidebarController.getSnapshot(DEFAULT_LAYOUT_SIDEBAR_ID)).toMatchObject({
        mode: 'fixed',
        state: 'expanded',
      });

      media.dispatch(false);

      expect(layoutSidebarController.getSnapshot(DEFAULT_LAYOUT_SIDEBAR_ID)).toMatchObject({
        mode: 'overlay',
        state: 'collapsed',
      });
    } finally {
      media.restore();
    }
  });

  it('overlay state を永続化し、再初期化で復元すること', () => {
    const storage = new MockStorage();

    layoutSidebarController.initialize(DEFAULT_LAYOUT_SIDEBAR_ID, {
      presentation: 'overlay',
      fixedBreakpoint: 1024,
      storage,
    });

    layoutSidebarController.open(DEFAULT_LAYOUT_SIDEBAR_ID);
    layoutSidebarController.reset();

    layoutSidebarController.initialize(DEFAULT_LAYOUT_SIDEBAR_ID, {
      presentation: 'overlay',
      fixedBreakpoint: 1024,
      storage,
    });

    expect(layoutSidebarController.getSnapshot(DEFAULT_LAYOUT_SIDEBAR_ID)).toMatchObject({
      mode: 'overlay',
      state: 'expanded',
    });
  });

  it('overlay で route select 相当の close を行うと collapse へ戻ること', () => {
    layoutSidebarController.initialize(DEFAULT_LAYOUT_SIDEBAR_ID, {
      presentation: 'overlay',
      fixedBreakpoint: 1024,
      storage: null,
    });

    layoutSidebarController.open(DEFAULT_LAYOUT_SIDEBAR_ID);
    layoutSidebarController.close(DEFAULT_LAYOUT_SIDEBAR_ID);

    expect(layoutSidebarController.getSnapshot(DEFAULT_LAYOUT_SIDEBAR_ID)).toMatchObject({
      mode: 'overlay',
      state: 'collapsed',
    });
  });
});
