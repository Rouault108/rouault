import { describe, expect, it } from 'vitest';

import {
  buildHashHrefFromId,
  decodeHashFragment,
  updateHashInCurrentUrl,
  updateHashInCurrentUrlFromId,
} from '../../src/router/url-hash.js';

describe('url-hash', () => {
  it('hash 更新時に既存の history.state をそのまま保持すること', () => {
    const originalPushState = history.pushState.bind(history);
    const originalReplaceState = history.replaceState.bind(history);
    const originalStateDescriptor = Object.getOwnPropertyDescriptor(history, 'state');

    const currentState = { customData: 'value', nested: { ok: true } };
    let capturedState: unknown = null;

    Object.defineProperty(history, 'state', {
      configurable: true,
      get: () => currentState,
    });

    history.pushState = ((data: unknown, _unused: string, url?: string | URL | null) => {
      capturedState = data;
      void url;
    }) as typeof history.pushState;

    try {
      const nextUrl = updateHashInCurrentUrl('intro', 'push');

      expect(nextUrl).to.equal(`${window.location.pathname}${window.location.search}#intro`);
      expect(capturedState).to.deep.equal(currentState);
    } finally {
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;

      if (originalStateDescriptor) {
        Object.defineProperty(history, 'state', originalStateDescriptor);
      } else {
        Reflect.deleteProperty(history, 'state');
      }
    }
  });

  it('現在URLに hash を追加する際も既存 state を再利用すること', () => {
    const originalPushState = history.pushState.bind(history);
    const originalUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    const originalStateDescriptor = Object.getOwnPropertyDescriptor(history, 'state');
    const currentState = { customData: 'value' };

    Object.defineProperty(history, 'state', {
      configurable: true,
      get: () => currentState,
    });

    let capturedUrl = '';
    let capturedState: unknown = null;

    history.pushState = ((data: unknown, _unused: string, url?: string | URL | null) => {
      capturedState = data;
      capturedUrl = typeof url === 'string' ? url : String(url ?? '');
    }) as typeof history.pushState;

    try {
      const nextUrl = updateHashInCurrentUrl('intro', 'push');

      expect(nextUrl).to.equal(`${window.location.pathname}${window.location.search}#intro`);
      expect(capturedUrl).to.equal(`${window.location.pathname}${window.location.search}#intro`);
      expect(capturedState).to.deep.equal(currentState);
    } finally {
      history.pushState = originalPushState;
      history.replaceState({}, '', originalUrl);

      if (originalStateDescriptor) {
        Object.defineProperty(history, 'state', originalStateDescriptor);
      } else {
        Reflect.deleteProperty(history, 'state');
      }
    }
  });

  it('raw heading id から href 用 hash を生成し、decode では trim しないこと', () => {
    const rawId = ' section 2 / 日本語 ';
    const href = buildHashHrefFromId(rawId);

    expect(href).to.equal('#%20section%202%20%2F%20%E6%97%A5%E6%9C%AC%E8%AA%9E%20');
    expect(decodeHashFragment(href)).to.equal(rawId);
    expect(decodeHashFragment('#%')).to.equal(null);
  });

  it('raw id API は等価 hash では history entry を追加しないこと', () => {
    const originalPushState = history.pushState.bind(history);
    const originalUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    let pushCalls = 0;

    history.pushState = ((data: unknown, unused: string, url?: string | URL | null) => {
      pushCalls += 1;
      originalPushState(data, unused, url);
    }) as typeof history.pushState;

    try {
      window.history.replaceState(
        {},
        '',
        `${window.location.pathname}${window.location.search}#a%20b`,
      );
      const nextUrl = updateHashInCurrentUrlFromId('a b', 'push');

      expect(nextUrl).to.equal(`${window.location.pathname}${window.location.search}#a%20b`);
      expect(pushCalls).to.equal(0);
    } finally {
      history.pushState = originalPushState;
      history.replaceState({}, '', originalUrl);
    }
  });
});
