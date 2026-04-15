import { describe, expect, it } from 'vitest';
import { LocationAdapter } from '../../src/router/location-adapter.js';
import type { UrlPolicy } from '../../src/router/url-policy.js';

const withStubbedWindow = (run: () => void): void => {
  const originalWindow = globalThis.window;

  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      location: new URL('https://example.com/') as unknown as Location,
    } satisfies Pick<Window, 'location'>,
  });

  try {
    run();
  } finally {
    if (originalWindow === undefined) {
      Reflect.deleteProperty(globalThis, 'window');
    } else {
      Object.defineProperty(globalThis, 'window', {
        configurable: true,
        value: originalWindow,
      });
    }
  }
};

const withStubbedHistory = (state: unknown, run: () => void): void => {
  const originalHistory = globalThis.history;

  Object.defineProperty(globalThis, 'history', {
    configurable: true,
    value: {
      state,
    } satisfies Pick<History, 'state'>,
  });

  try {
    run();
  } finally {
    if (originalHistory === undefined) {
      Reflect.deleteProperty(globalThis, 'history');
    } else {
      Object.defineProperty(globalThis, 'history', {
        configurable: true,
        value: originalHistory,
      });
    }
  }
};

describe('LocationAdapter', () => {
  it('pathname 正規化を UrlPolicy に委譲すること', () => {
    let receivedPathname: string | null = null;
    const policy: UrlPolicy = {
      normalizePathname(pathname) {
        receivedPathname = pathname;
        return '/normalized';
      },
      sanitizeSearchParams() {
        // no-op
      },
      resolveContentPath(pathname) {
        return pathname;
      },
    };

    const adapter = new LocationAdapter(policy);

    expect(adapter.normalizePathname('/notes/example/')).to.equal('/normalized');
    expect(receivedPathname).to.equal('/notes/example/');
  });

  it('normalizeUrl() では search param sanitization と pathname 正規化を UrlPolicy に委譲すること', () => {
    let sanitizeCalled = false;
    let receivedPathname: string | null = null;
    const policy: UrlPolicy = {
      normalizePathname(pathname) {
        receivedPathname = pathname;
        return '/normalized';
      },
      sanitizeSearchParams(url) {
        sanitizeCalled = true;
        url.searchParams.delete('debug');
      },
      resolveContentPath(pathname) {
        return pathname;
      },
    };

    const adapter = new LocationAdapter(policy);

    withStubbedWindow(() => {
      expect(adapter.normalizeUrl('/notes/example/?debug=1&tab=overview')).to.equal(
        '/normalized?tab=overview',
      );
      expect(sanitizeCalled).to.equal(true);
      expect(receivedPathname).to.equal('/notes/example/');
    });
  });

  it('fetch 用 pathname 解決を UrlPolicy に委譲すること', () => {
    let receivedPathname: string | null = null;
    const policy: UrlPolicy = {
      normalizePathname(pathname) {
        return pathname;
      },
      sanitizeSearchParams() {
        // no-op
      },
      resolveContentPath(pathname) {
        receivedPathname = pathname;
        return `${pathname}/`;
      },
    };

    const adapter = new LocationAdapter(policy);

    withStubbedWindow(() => {
      expect(adapter.resolveContentUrl('/notes/example?tab=overview')).to.equal(
        '/notes/example/?tab=overview',
      );
      expect(receivedPathname).to.equal('/notes/example');
    });
  });

  it('router artifact URL は content URL から index.router.json を解決すること', () => {
    const policy: UrlPolicy = {
      normalizePathname(pathname) {
        return pathname;
      },
      sanitizeSearchParams() {
        // no-op
      },
      resolveContentPath(pathname) {
        return pathname.endsWith('/') ? pathname : `${pathname}/`;
      },
    };

    const adapter = new LocationAdapter(policy);

    withStubbedWindow(() => {
      expect(adapter.resolveSnapshotUrl('/notes/example?tab=overview')).to.equal(
        '/__router/notes/example/index.router.json?tab=overview',
      );
      expect(adapter.resolveSnapshotUrl('/')).to.equal('/__router/index.router.json');
    });
  });

  it('createHistoryState() は __routerUrl だけを書き込むこと', () => {
    const policy: UrlPolicy = {
      normalizePathname(pathname) {
        return pathname;
      },
      sanitizeSearchParams() {
        // no-op
      },
      resolveContentPath(pathname) {
        return pathname;
      },
    };

    const adapter = new LocationAdapter(policy);

    withStubbedWindow(() => {
      expect(
        adapter.createHistoryState({ custom: 'value' }, '/notes/example?tab=overview#heading'),
      ).to.deep.equal({
        custom: 'value',
        __routerUrl: '/notes/example?tab=overview#heading',
      });
    });
  });

  it('readCurrentUrl() は __routerPath のみの旧 state も暫定互換として読めること', () => {
    const policy: UrlPolicy = {
      normalizePathname(pathname) {
        return pathname;
      },
      sanitizeSearchParams() {
        // no-op
      },
      resolveContentPath(pathname) {
        return pathname;
      },
    };

    const adapter = new LocationAdapter(policy);

    withStubbedWindow(() => {
      Object.defineProperty(globalThis, 'window', {
        configurable: true,
        value: {
          location: new URL(
            'https://example.com/current?tab=overview#details',
          ) as unknown as Location,
        } satisfies Pick<Window, 'location'>,
      });

      withStubbedHistory({ __routerPath: '/notes/example' }, () => {
        expect(adapter.readCurrentUrl()).to.equal('/notes/example?tab=overview#details');
      });
    });
  });
});
