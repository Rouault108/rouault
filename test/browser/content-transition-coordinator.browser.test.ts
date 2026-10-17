import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { NavigationShellSnapshot } from '../../shared/navigation/navigation-shell-snapshot.js';
import type { AppShellValidatedDetail } from '../../src/components/app/shell/app-shell-events.js';
import {
  beginNavigationIntent,
  initializeContentContext,
  releaseContentContext,
} from '../../src/navigation/content-navigation-context.js';
import { parseAndValidateStaticHeaderHtml } from '../../src/components/app/shell/static-header-shell-mutation.js';
import { ContentTransitionCoordinator } from '../../src/router/content-transition-coordinator.js';
import { STATIC_HEADER_CONTRACT_ACCEPTED_HTML } from '../fixtures/static-header-contract-cases.js';
import { fixture } from './harness/browser-fixture.js';

const deferred = <T>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
};

class ControlledTransition {
  readonly readyState = deferred<undefined>();
  readonly finishedState = deferred<undefined>();
  readonly updateState = deferred<undefined>();
  readonly ready = this.readyState.promise;
  readonly finished = this.finishedState.promise;
  readonly updateCallbackDone = this.updateState.promise;
  readonly skipTransition = vi.fn<() => void>();

  constructor(readonly callback: () => Promise<void>) {}

  async update(): Promise<void> {
    try {
      await this.callback();
      this.updateState.resolve(undefined);
    } catch (error) {
      this.updateState.reject(error);
    }
  }
}

const shell = (): NavigationShellSnapshot => ({
  headerHtml: STATIC_HEADER_CONTRACT_ACCEPTED_HTML,
  sidebarProjection: {
    present: true,
    sidebarId: 'note-primary',
    stateScopeId: 'note-navigation',
    selectedId: 'first',
    initialExpandedIds: ['branch'],
    topologyRevision: 'tree-v1',
    navHtml: '<nav>Notes</nav>',
    heading: 'Notes',
    fixedBreakpoint: 1024,
    presentation: 'auto',
  },
  footerCopyrightText: '© Rouault',
});

const validate = (snapshot: NavigationShellSnapshot): void => {
  const header = document.createElement('header');
  document.dispatchEvent(
    new CustomEvent<AppShellValidatedDetail>('app-shell:validated', {
      detail: {
        shell: snapshot,
        header,
        navigationUrl: '/notes/current',
        shellCommitId: 1,
        linkValidationContext: {
          siteUrlContext: { siteOrigin: window.location.origin, basePath: '' },
          currentAbsoluteUrl: `${window.location.origin}/notes/current`,
          normalizedNavigationUrl: '/notes/current',
          routeManifestState: {
            status: 'loaded',
            manifest: {
              version: 1,
              buildId: 'test',
              buildLabel: 'test',
              generatedAt: '2026-01-01T00:00:00.000Z',
              siteOrigin: window.location.origin,
              basePath: '',
              routes: ['/notes/current'],
            },
            routeSet: { routes: ['/notes/current'], has: () => true },
          },
        },
      },
    }),
  );
};

const flush = async (): Promise<void> => {
  await Promise.resolve(undefined);
  await Promise.resolve(undefined);
  await Promise.resolve(undefined);
};

const marker = (): boolean => document.documentElement.hasAttribute('data-content-transition');

describe('ContentTransitionCoordinator', () => {
  let coordinator: ContentTransitionCoordinator;
  let main: HTMLElement;
  let transitions: ControlledTransition[];
  let reduced: boolean;
  let media: EventTarget;
  let visibility: DocumentVisibilityState;
  let originalStart: PropertyDescriptor | undefined;
  let originalVisibility: PropertyDescriptor | undefined;
  let start: ReturnType<typeof vi.fn<(callback: () => Promise<void>) => ControlledTransition>>;

  beforeEach(async () => {
    main = await fixture('<main id="main-content"><p>Current</p></main>');
    initializeContentContext(main);
    reduced = false;
    visibility = 'visible';
    media = new EventTarget();
    transitions = [];
    originalStart = Object.getOwnPropertyDescriptor(document, 'startViewTransition');
    originalVisibility = Object.getOwnPropertyDescriptor(document, 'visibilityState');
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => visibility,
    });
    vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
      media: query,
      get matches() {
        return reduced;
      },
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: media.addEventListener.bind(media),
      removeEventListener: media.removeEventListener.bind(media),
      dispatchEvent: media.dispatchEvent.bind(media),
    }));
    start = vi.fn((callback: () => Promise<void>) => {
      const transition = new ControlledTransition(callback);
      transitions.push(transition);
      return transition;
    });
    Object.defineProperty(document, 'startViewTransition', { configurable: true, value: start });
    coordinator = new ContentTransitionCoordinator(main);
  });

  afterEach(() => {
    coordinator.dispose();
    releaseContentContext(main);
    if (originalStart) Object.defineProperty(document, 'startViewTransition', originalStart);
    else Reflect.deleteProperty(document, 'startViewTransition');
    if (originalVisibility) Object.defineProperty(document, 'visibilityState', originalVisibility);
    else Reflect.deleteProperty(document, 'visibilityState');
    vi.restoreAllMocks();
  });

  const currentTransition = (): ControlledTransition => {
    const transition = transitions.at(-1);
    if (!transition) throw new Error('Expected a content transition');
    return transition;
  };

  const run = (update = vi.fn(async () => 'committed'), snapshot = shell()) => {
    const intent = beginNavigationIntent('navigation', '/notes/next');
    return { result: coordinator.run(snapshot, intent, true, update), update, intent };
  };

  it('検証済み同配置shellの本文更新だけを包み、finishedより前に更新結果を返すこと', async () => {
    validate(shell());
    const { result, update } = run();
    const transition = currentTransition();
    expect(marker()).toBe(true);
    expect(update).not.toHaveBeenCalled();
    await transition.update();
    expect(await result).toBe('committed');
    expect(update).toHaveBeenCalledTimes(1);
    expect(marker()).toBe(true);
    transition.readyState.resolve(undefined);
    transition.finishedState.resolve(undefined);
    await flush();
    expect(marker()).toBe(false);
  });

  it.each([
    '未検証',
    'API非対応',
    'reduced motion',
    '非表示',
    '非対象',
    'intentなし',
    'abort済み',
    '破棄済み',
    'main切断',
  ])('%sでは通常更新へ一度だけ縮退すること', async (condition) => {
    if (condition !== '未検証') validate(shell());
    const intent = beginNavigationIntent('navigation', '/notes/next');
    if (condition === 'API非対応')
      Object.defineProperty(document, 'startViewTransition', {
        configurable: true,
        value: undefined,
      });
    if (condition === 'reduced motion') reduced = true;
    if (condition === '非表示') visibility = 'hidden';
    if (condition === 'abort済み') beginNavigationIntent('navigation', '/notes/latest');
    if (condition === '破棄済み') coordinator.dispose();
    if (condition === 'main切断') main.remove();
    const update = vi.fn(async () => 'fallback');
    const result = await coordinator.run(
      shell(),
      condition === 'intentなし' ? undefined : intent,
      condition !== '非対象',
      update,
    );
    expect(result).toBe('fallback');
    expect(update).toHaveBeenCalledTimes(1);
    expect(start).not.toHaveBeenCalled();
    expect(marker()).toBe(false);
  });

  it.each([
    'root class',
    'note layout',
    'sidebar enabled',
    'toc reservation',
    'toc presence',
    'sidebar presence',
    'sidebar id',
    'state scope',
    'presentation',
    'breakpoint',
    'topology',
    'footer',
  ])('%sの配置差を検証済みsnapshotから検出すること', async (field) => {
    const next = shell();
    const sidebar = next.sidebarProjection;
    if (!sidebar) throw new Error('Expected sidebar fixture');
    if (field === 'root class')
      next.headerHtml = next.headerHtml.replace(
        'class="layout-header"',
        'class="layout-header changed"',
      );
    if (field === 'note layout')
      next.headerHtml = next.headerHtml.replace(
        'data-note-layout="true"',
        'data-note-layout="false"',
      );
    if (field === 'sidebar enabled')
      next.headerHtml = next.headerHtml
        .replace('data-sidebar-enabled="true"', 'data-sidebar-enabled="false"')
        .replace(/<button[\s\S]*?<\/button>/, '');
    if (field === 'toc reservation')
      next.headerHtml = next.headerHtml.replaceAll(
        'data-toc-trigger-reserved="true"',
        'data-toc-trigger-reserved="false"',
      );
    if (field === 'toc presence') {
      next.headerHtml = next.headerHtml
        .replace('data-toc-presence="present"', 'data-toc-presence="absent"')
        .replace(/\sdata-toc-(?:runtime|owner)-id="[^"]*"/gu, '');
      expect(() => parseAndValidateStaticHeaderHtml(next.headerHtml, document)).not.toThrow();
    }
    if (field === 'sidebar presence') next.sidebarProjection = null;
    if (field === 'sidebar id') sidebar.sidebarId = 'other';
    if (field === 'state scope') sidebar.stateScopeId = 'other';
    if (field === 'presentation') sidebar.presentation = 'fixed';
    if (field === 'breakpoint') sidebar.fixedBreakpoint = 1200;
    if (field === 'topology') sidebar.topologyRevision = 'tree-v2';
    if (field === 'footer') next.footerCopyrightText = 'Other footer';
    validate(shell());
    const { result, update } = run(undefined, next);
    expect(await result).toBe('committed');
    expect(update).toHaveBeenCalledTimes(1);
    expect(start).not.toHaveBeenCalled();
  });

  it('選択項目と展開枝だけの違いは配置変更にしないこと', async () => {
    validate(shell());
    const next = shell();
    if (!next.sidebarProjection) throw new Error('Expected sidebar fixture');
    next.sidebarProjection.selectedId = 'second';
    next.sidebarProjection.initialExpandedIds = ['other-branch'];
    const { result } = run(undefined, next);
    await currentTransition().update();
    expect(await result).toBe('committed');
    expect(start).toHaveBeenCalledTimes(1);
  });

  it('両方ともnote以外のshellではheaderが同じでも配置を推測して演出しないこと', async () => {
    const nonNote = shell();
    nonNote.headerHtml = nonNote.headerHtml.replace(
      'data-note-layout="true"',
      'data-note-layout="false"',
    );
    validate(nonNote);
    const { result } = run(undefined, nonNote);
    expect(await result).toBe('committed');
    expect(start).not.toHaveBeenCalled();
  });

  it('不正なshell検証通知を受けた後は推測して演出しないこと', async () => {
    validate(shell());
    validate({ ...shell(), headerHtml: '<header>invalid</header>' });
    const { result } = run();
    expect(await result).toBe('committed');
    expect(start).not.toHaveBeenCalled();
  });

  it('rollback開始後は次の検証完了まで通常更新すること', async () => {
    validate(shell());
    const first = run();
    const transition = currentTransition();
    document.dispatchEvent(new CustomEvent('app-shell:rollback-start'));
    expect(transition.skipTransition).toHaveBeenCalledTimes(1);
    await transition.update();
    await first.result;
    const next = run();
    await next.result;
    expect(start).toHaveBeenCalledTimes(1);
    validate(shell());
    const last = run();
    await currentTransition().update();
    await last.result;
    expect(start).toHaveBeenCalledTimes(2);
  });

  it.each(['before', 'during', 'after'])(
    'callback %sのskipで更新callbackを取消・重複しないこと',
    async (timing) => {
      validate(shell());
      const gate = deferred<string>();
      const update = vi.fn(() => gate.promise);
      const { result } = run(update);
      const transition = currentTransition();
      if (timing === 'before') coordinator.skip();
      const updating = transition.update();
      await flush();
      if (timing === 'during') coordinator.skip();
      gate.resolve('committed');
      await updating;
      expect(await result).toBe('committed');
      if (timing === 'after') coordinator.skip();
      expect(update).toHaveBeenCalledTimes(1);
      expect(transition.skipTransition).toHaveBeenCalledTimes(1);
      expect(marker()).toBe(false);
    },
  );

  it.each(['before', 'during', 'after'])(
    'callback %sの次intentで古い効果を止め、新しいmarkerを古いfinishedから守ること',
    async (timing) => {
      validate(shell());
      const gate = deferred<string>();
      const first = run(vi.fn(() => gate.promise));
      const oldTransition = currentTransition();
      let oldUpdate: Promise<void> | undefined;
      if (timing !== 'before') oldUpdate = oldTransition.update();
      await flush();
      if (timing === 'after') {
        gate.resolve('old');
        await oldUpdate;
        await first.result;
      }
      const second = run();
      const newTransition = currentTransition();
      expect(oldTransition.skipTransition).toHaveBeenCalledTimes(1);
      expect(marker()).toBe(true);
      oldTransition.finishedState.resolve(undefined);
      await flush();
      expect(marker()).toBe(true);
      if (!oldUpdate) oldUpdate = oldTransition.update();
      gate.resolve('old');
      await oldUpdate;
      await first.result;
      await newTransition.update();
      expect(await second.result).toBe('committed');
      expect(first.update).toHaveBeenCalledTimes(1);
      expect(second.update).toHaveBeenCalledTimes(1);
      newTransition.finishedState.resolve(undefined);
      await flush();
      expect(marker()).toBe(false);
    },
  );

  it('ready拒否は更新完了を待ち、更新callbackを再実行しないこと', async () => {
    validate(shell());
    const { result, update } = run();
    const transition = currentTransition();
    transition.readyState.reject(new Error('animation unavailable'));
    await flush();
    expect(update).not.toHaveBeenCalled();
    expect(marker()).toBe(false);
    await transition.update();
    expect(await result).toBe('committed');
    expect(update).toHaveBeenCalledTimes(1);
  });

  it('updateCallbackDoneがcallback開始前に拒否されても別の更新を開始しないこと', async () => {
    validate(shell());
    const { result, update } = run();
    const error = new Error('callback unavailable');
    const assertion = expect(result).rejects.toBe(error);
    currentTransition().updateState.reject(error);
    await assertion;
    expect(update).not.toHaveBeenCalled();
    expect(marker()).toBe(false);
  });

  it('updateCallbackDone成功時にcallback未実行なら更新成功を捏造しないこと', async () => {
    validate(shell());
    const { result, update } = run();
    const assertion = expect(result).rejects.toThrow('callback was not invoked');
    currentTransition().updateState.resolve(undefined);
    await assertion;
    expect(update).not.toHaveBeenCalled();
  });

  it('finished拒否で成功済み更新を再commitしないこと', async () => {
    validate(shell());
    const { result, update } = run();
    const transition = currentTransition();
    await transition.update();
    expect(await result).toBe('committed');
    transition.finishedState.reject(new Error('animation interrupted'));
    await flush();
    expect(update).toHaveBeenCalledTimes(1);
    expect(marker()).toBe(false);
  });

  it('callback拒否の実エラーを一度だけ返し、rollbackの所有権を呼出元に残すこと', async () => {
    validate(shell());
    const error = new Error('commit failed');
    const update = vi.fn(async () => {
      throw error;
    });
    const { result } = run(update);
    const assertion = expect(result).rejects.toBe(error);
    await currentTransition().update();
    await assertion;
    expect(update).toHaveBeenCalledTimes(1);
    expect(main.textContent).toBe('Current');
    expect(marker()).toBe(false);
  });

  it.each([false, true])(
    'start同期例外(callback呼出=%s)でも更新は一度だけであること',
    async (callFirst) => {
      validate(shell());
      start.mockImplementation((callback) => {
        if (callFirst) void callback();
        throw new Error('start failed');
      });
      const { result, update } = run();
      expect(await result).toBe('committed');
      expect(update).toHaveBeenCalledTimes(1);
      expect(marker()).toBe(false);
    },
  );

  it('遅れて重複して呼ばれるnative callbackでも更新は一度だけであること', async () => {
    validate(shell());
    const { result, update } = run();
    const transition = currentTransition();
    coordinator.skip();
    await Promise.all([transition.update(), transition.callback()]);
    await result;
    expect(update).toHaveBeenCalledTimes(1);
  });

  it.each([
    'wheel',
    'touchmove',
    'pointerdown',
    'keydown',
    'visibilitychange',
    'pagehide',
    'resize',
    'motion',
    'dispose',
  ])('%sで効果を止めても遅延callbackの更新を失わないこと', async (intervention) => {
    validate(shell());
    const { result, update } = run();
    const transition = currentTransition();
    if (intervention === 'keydown')
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));
    else if (intervention === 'visibilitychange') {
      visibility = 'hidden';
      document.dispatchEvent(new Event('visibilitychange'));
    } else if (intervention === 'motion') {
      reduced = true;
      media.dispatchEvent(new Event('change'));
    } else if (intervention === 'dispose') coordinator.dispose();
    else window.dispatchEvent(new Event(intervention));
    expect(transition.skipTransition).toHaveBeenCalledTimes(1);
    expect(marker()).toBe(false);
    await transition.update();
    expect(await result).toBe('committed');
    expect(update).toHaveBeenCalledTimes(1);
  });

  it('fetch待ち中のユーザー介入が同じintentの遅い演出開始を抑制すること', async () => {
    validate(shell());
    const intent = beginNavigationIntent('navigation', '/notes/next');
    window.dispatchEvent(new Event('wheel'));
    const update = vi.fn(async () => 'committed');
    expect(await coordinator.run(shell(), intent, true, update)).toBe('committed');
    expect(start).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledTimes(1);
  });
});
