import { expect } from '@open-wc/testing';

import { buildThemeDocumentBootstrapScript } from '../../src/theme/theme-document-bootstrap.js';
import {
  RESOLVED_THEME_ATTRIBUTE,
  THEME_ATTRIBUTE,
  THEME_CHANGE_EVENT,
  THEME_STORAGE_KEY,
  applyThemePreference,
  readStoredThemePreference,
} from '../../src/theme/theme-manager.js';

interface ThemeRootSnapshot {
  readonly preference: string | null;
  readonly resolvedTheme: string | null;
  readonly colorScheme: string;
}

const snapshotThemeRoot = (root: HTMLElement): ThemeRootSnapshot => ({
  preference: root.getAttribute(THEME_ATTRIBUTE),
  resolvedTheme: root.getAttribute(RESOLVED_THEME_ATTRIBUTE),
  colorScheme: root.style.colorScheme,
});

const createMediaQueryList = (query: string, matches: boolean): MediaQueryList =>
  ({
    media: query,
    matches,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  }) as MediaQueryList;

const installMatchMediaStub = (frameWindow: Window, prefersDark: boolean): void => {
  Object.defineProperty(frameWindow, 'matchMedia', {
    configurable: true,
    value: (query: string): MediaQueryList => createMediaQueryList(query, prefersDark),
  });
};

const appendExecutableScript = (frameDocument: Document, body: string): void => {
  const script = frameDocument.createElement('script');
  script.textContent = body;
  frameDocument.head.append(script);
};

describe('theme document bootstrap', () => {
  it('生成 bootstrap は theme-manager と同じ root 適用結果になること', () => {
    const cases: readonly {
      readonly name: string;
      readonly storedValue: string | null;
      readonly prefersDark: boolean;
    }[] = [
      { name: 'missing storage / light system', storedValue: null, prefersDark: false },
      { name: 'missing storage / dark system', storedValue: null, prefersDark: true },
      { name: 'stored light', storedValue: 'light', prefersDark: true },
      { name: 'stored dark', storedValue: 'dark', prefersDark: false },
      { name: 'stored system / dark system', storedValue: 'system', prefersDark: true },
      { name: 'invalid storage / light system', storedValue: 'unknown', prefersDark: false },
    ];

    for (const testCase of cases) {
      const originalValue = window.localStorage.getItem(THEME_STORAGE_KEY);
      const iframe = document.createElement('iframe');
      document.body.append(iframe);

      try {
        if (testCase.storedValue === null) {
          window.localStorage.removeItem(THEME_STORAGE_KEY);
        } else {
          window.localStorage.setItem(THEME_STORAGE_KEY, testCase.storedValue);
        }

        const frameWindow = iframe.contentWindow;
        const frameDocument = iframe.contentDocument;
        if (frameWindow === null || frameDocument === null) {
          throw new Error(`iframe unavailable for ${testCase.name}`);
        }

        installMatchMediaStub(frameWindow, testCase.prefersDark);

        const expectedRoot = document.createElement('html');
        applyThemePreference(readStoredThemePreference(window.localStorage), {
          root: expectedRoot,
          mediaQueryList: createMediaQueryList('(prefers-color-scheme: dark)', testCase.prefersDark),
          storage: window.localStorage,
          persist: false,
          emit: false,
        });

        appendExecutableScript(frameDocument, buildThemeDocumentBootstrapScript());

        expect(snapshotThemeRoot(frameDocument.documentElement), testCase.name).to.deep.equal(
          snapshotThemeRoot(expectedRoot),
        );
      } finally {
        iframe.remove();
        if (originalValue === null) {
          window.localStorage.removeItem(THEME_STORAGE_KEY);
        } else {
          window.localStorage.setItem(THEME_STORAGE_KEY, originalValue);
        }
      }
    }
  });

  it('生成 bootstrap は storage 書き込みと theme change event 発火を行わないこと', () => {
    const originalValue = window.localStorage.getItem(THEME_STORAGE_KEY);
    const iframe = document.createElement('iframe');
    document.body.append(iframe);
    let eventCount = 0;
    const handleThemeChange = (): void => {
      eventCount += 1;
    };

    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, 'dark');

      const frameWindow = iframe.contentWindow;
      const frameDocument = iframe.contentDocument;
      if (frameWindow === null || frameDocument === null) {
        throw new Error('iframe unavailable for storage read-only contract');
      }

      installMatchMediaStub(frameWindow, false);
      frameWindow.addEventListener(THEME_CHANGE_EVENT, handleThemeChange);

      const storagePrototype = Object.getPrototypeOf(frameWindow.localStorage) as Storage;
      let setItemCount = 0;
      const originalSetItem = storagePrototype.setItem;
      storagePrototype.setItem = function setItem(
        this: Storage,
        key: string,
        value: string,
      ): void {
        setItemCount += 1;
        return originalSetItem.call(this, key, value);
      };

      try {
        appendExecutableScript(frameDocument, buildThemeDocumentBootstrapScript());
      } finally {
        storagePrototype.setItem = originalSetItem;
        frameWindow.removeEventListener(THEME_CHANGE_EVENT, handleThemeChange);
      }

      expect(setItemCount).to.equal(0);
      expect(eventCount).to.equal(0);
      expect(window.localStorage.getItem(THEME_STORAGE_KEY)).to.equal('dark');
    } finally {
      iframe.remove();
      if (originalValue === null) {
        window.localStorage.removeItem(THEME_STORAGE_KEY);
      } else {
        window.localStorage.setItem(THEME_STORAGE_KEY, originalValue);
      }
    }
  });
});
