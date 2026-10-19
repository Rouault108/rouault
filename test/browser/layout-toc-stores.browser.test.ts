import { afterEach, describe, expect, it, vi } from 'vitest';
import { layoutTocRuntimeStore as runtime } from '../../src/components/layout/layout-toc-runtime-store.js';
import { layoutTocMobileController as mobile } from '../../src/components/layout/layout-toc-mobile-controller.js';
import { TocHydrationSessionController } from '../../src/toc/toc-hydration-session.js';
import { syncLayoutTocControllersForSession } from '../../src/toc/sync-layout-toc-controllers.js';

const publish = (activeId: string): void => {
  runtime.publish('toc', { ready: true, hasVisibleHeadings: true, activeId });
};

afterEach(() => {
  runtime.reset();
  mobile.reset();
  vi.restoreAllMocks();
});

describe('TOC runtime notifications', () => {
  it('診断出力も失敗したとき解除を返し他の購読者への通知を続ける', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {
      throw new Error('diagnostic');
    });
    const listener = vi.fn(() => {
      throw new Error('subscriber');
    });
    const unsubscribe = runtime.subscribe('toc', listener);
    const received: (string | null)[] = [];
    runtime.subscribe('toc', (snapshot) => received.push(snapshot.activeId));
    publish('a');
    unsubscribe();
    publish('b');
    expect(listener).toHaveBeenCalledTimes(2);
    expect(received).toEqual([null, 'a', 'b']);
  });

  it('即時購読と通常通知の例外を隔離し、解除を返す', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    let failures = 0;
    const unsubscribe = runtime.subscribe('toc', () => {
      failures += 1;
      throw new Error('subscriber');
    });
    const received: (string | null)[] = [];
    runtime.subscribe('toc', (snapshot) => received.push(snapshot.activeId));
    publish('a');
    unsubscribe();
    publish('b');
    expect(failures).toBe(2);
    expect(received).toEqual([null, 'a', 'b']);
  });

  it('再入publish後に外側の古いsnapshotを配信しない', () => {
    runtime.subscribe('toc', (snapshot) => {
      if (snapshot.activeId === 'a') publish('b');
    });
    const received: (string | null)[] = [];
    runtime.subscribe('toc', (snapshot) => received.push(snapshot.activeId));
    publish('a');
    expect(received).toEqual([null, 'b']);
    expect(runtime.getSnapshot('toc').activeId).toBe('b');
  });

  it('同一stateの再入通知を止め、新購読者には即時replayする', () => {
    let calls = 0;
    runtime.subscribe('toc', (snapshot) => {
      calls += 1;
      if (snapshot.activeId === 'a') publish('a');
    });
    publish('a');
    publish('a');
    const received: (string | null)[] = [];
    runtime.subscribe('toc', (snapshot) => received.push(snapshot.activeId));
    expect(calls).toBe(2);
    expect(received).toEqual(['a']);
  });

  it('同じlistenerの各登録とreset後の登録を独立して解除する', () => {
    const listener = vi.fn();
    const first = runtime.subscribe('toc', listener);
    runtime.subscribe('toc', listener);
    first();
    listener.mockClear();
    publish('a');
    expect(listener).toHaveBeenCalledTimes(1);
    runtime.reset('toc');
    runtime.subscribe('toc', listener);
    first();
    listener.mockClear();
    publish('b');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('公開意味が同じpanel signatureは抑止しreadyとcontent変更は通知する', () => {
    const listener = vi.fn();
    runtime.subscribe('toc', listener);
    runtime.publishPanelContent('toc', { ownerId: 'owner', headingCount: 2 });
    runtime.publishPanelContent('toc', { ownerId: 'owner', headingCount: 2 });
    runtime.publishPanelContent('toc', { ownerId: 'owner', headingCount: 3 });
    runtime.publish('toc', {
      ready: true,
      hasVisibleHeadings: false,
      activeId: null,
      panelContentSignature: { ownerId: 'owner', headingCount: 3, sourceVersion: 'current' },
    });
    expect(listener).toHaveBeenCalledTimes(4);
  });

  it('通知中reset後に古いentryの通知を継続しない', () => {
    runtime.subscribe('toc', (snapshot) => {
      if (snapshot.activeId === 'a') {
        runtime.reset('toc');
        publish('b');
      }
    });
    const received: (string | null)[] = [];
    runtime.subscribe('toc', (snapshot) => received.push(snapshot.activeId));
    publish('a');
    expect(received).toEqual([null]);
    expect(runtime.getSnapshot('toc').activeId).toBe('b');
  });
});

describe('TOC mobile notifications', () => {
  it('診断出力も失敗したとき解除を返し他の購読者への通知を続ける', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {
      throw new Error('diagnostic');
    });
    const listener = vi.fn(() => {
      throw new Error('subscriber');
    });
    const unsubscribe = mobile.subscribe('toc', listener);
    const received: boolean[] = [];
    mobile.subscribe('toc', (snapshot) => received.push(snapshot.panelOpen));
    mobile.open('toc');
    unsubscribe();
    mobile.close('toc');
    expect(listener).toHaveBeenCalledTimes(2);
    expect(received).toEqual([false, true, false]);
  });

  it('即時購読と通常通知の例外を隔離する', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const unsubscribe = mobile.subscribe('toc', () => {
      throw new Error('subscriber');
    });
    const received: boolean[] = [];
    mobile.subscribe('toc', (snapshot) => received.push(snapshot.panelOpen));
    mobile.open('toc');
    unsubscribe();
    mobile.close('toc');
    expect(received).toEqual([false, true, false]);
  });

  it('再入close後に古いopenを配信せず同一stateの通知を繰り返さない', () => {
    mobile.subscribe('toc', (snapshot) => {
      if (snapshot.panelOpen) mobile.close('toc');
      else if (snapshot.cleanupDecision.directive === 'refresh-panel-content') mobile.close('toc');
    });
    const received: boolean[] = [];
    mobile.subscribe('toc', (snapshot) => received.push(snapshot.panelOpen));
    mobile.open('toc');
    mobile.close('toc');
    expect(received).toEqual([false, false]);
    const replay: boolean[] = [];
    mobile.subscribe('toc', (snapshot) => replay.push(snapshot.panelOpen));
    expect(replay).toEqual([false]);
  });

  it('focus target消費だけでは後続のstate通知を止めない', () => {
    const trigger = document.createElement('button');
    mobile.subscribe('toc', (snapshot) => {
      if (snapshot.panelOpen) mobile.consumeReturnFocusTarget('toc');
    });
    const received: boolean[] = [];
    mobile.subscribe('toc', (snapshot) => received.push(snapshot.panelOpen));
    mobile.open('toc', trigger);
    expect(received).toEqual([false, true]);
  });

  it('同じlistenerの各登録とreset後の登録を独立して解除する', () => {
    const listener = vi.fn();
    const first = mobile.subscribe('toc', listener);
    mobile.subscribe('toc', listener);
    first();
    listener.mockClear();
    mobile.open('toc');
    expect(listener).toHaveBeenCalledTimes(1);
    mobile.reset('toc');
    mobile.subscribe('toc', listener);
    first();
    listener.mockClear();
    mobile.open('toc');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('cleanup通知中の新openを古いcleanup通知で上書きしない', () => {
    mobile.open('toc');
    mobile.subscribe('toc', (snapshot) => {
      if (snapshot.cleanupDecision.directive === 'cleanup-stale-source') mobile.open('toc');
    });
    const received: boolean[] = [];
    mobile.subscribe('toc', (snapshot) => received.push(snapshot.panelOpen));
    mobile.cleanup('toc');
    expect(received).toEqual([true, true]);
    expect(mobile.getSnapshot('toc').panelOpen).toBe(true);
  });
});

describe('disposed runtime handoff', () => {
  it.each(['runtime', 'mobile', 'reset-mobile'] as const)(
    'disposed通知中の新owner (%s) を古いmobile cleanupで閉じない',
    (replacement) => {
      const controller = new TocHydrationSessionController();
      controller.start({ runtimeId: 'toc' });
      const disposed = controller.dispose();
      if (!disposed) throw new Error('missing disposed session');
      mobile.open('toc');
      runtime.subscribe('toc', (snapshot) => {
        if (snapshot.hydrationState !== 'disposed') return;
        if (replacement === 'runtime') publish('new-owner');
        if (replacement === 'reset-mobile') mobile.reset('toc');
        if (replacement !== 'runtime') {
          mobile.close('toc');
          mobile.open('toc');
        }
      });
      syncLayoutTocControllersForSession(disposed, {
        ready: false,
        hasVisibleHeadings: false,
        activeId: null,
      });
      expect(mobile.getSnapshot('toc').panelOpen).toBe(true);
    },
  );
});
