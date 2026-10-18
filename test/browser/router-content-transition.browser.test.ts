import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import {
  NAVIGATION_ENVELOPE_SCHEMA_VERSION,
  type NavigationEnvelope,
} from '../../shared/navigation/navigation-envelope.js';
import { setContentReadiness } from '../../src/client/hydration/content-readiness.js';
import { ReadingPositionStore } from '../../src/components/app/navigation/reading-position-store.js';
import { RouterDocumentHostPostRenderController } from '../../src/components/app/controllers/router-document-host-post-render-controller.js';
import type {
  AppShellRestoredDetail,
  AppShellValidatedDetail,
} from '../../src/components/app/shell/app-shell-events.js';
import {
  readCurrentShellCommitId,
  resetShellLifecycleForTest,
} from '../../src/components/app/shell/app-shell-lifecycle.js';
import {
  beginContentMutation,
  beginNavigationIntent,
  adoptContentBinding,
  subscribeContentContext,
  initializeContentContext,
  readContentContext,
  releaseContentContext,
} from '../../src/navigation/content-navigation-context.js';
import {
  observeHistoryEntries,
  readAddress,
  readHistoryEntry,
  writeHistoryEntry,
} from '../../src/navigation/history-entry.js';
import {
  Router,
  type NavigationCommitReceipt,
  type NavigationResult,
  type PreparedContentUpdate,
  type PreparedShellUpdate,
  type RouterRuntimeUrlDependencies,
} from '../../src/router/router.js';
import { STATIC_HEADER_CONTRACT_ACCEPTED_TOC_ABSENT_HTML } from '../fixtures/static-header-contract-cases.js';
import { fixture, requireFixtureValue } from './harness/browser-fixture.js';

const deferred = () => {
  let resolve!: () => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<void>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
};

class ControlledTransition {
  readonly readyState = deferred();
  readonly finishedState = deferred();
  readonly updateState = deferred();
  readonly ready = this.readyState.promise;
  readonly finished = this.finishedState.promise;
  readonly updateCallbackDone = this.updateState.promise;
  readonly skipTransition = vi.fn<() => void>();

  constructor(readonly callback: () => Promise<void>) {}

  async update(): Promise<void> {
    try {
      await this.callback();
      this.updateState.resolve();
    } catch (error) {
      this.updateState.reject(error);
    }
  }
}

const BUILD_ID = 'router-transition-integration';
const GENERATED_AT = '2026-10-17T00:00:00.000Z';
const routes = ['/', '/search/', '/notes/a', '/notes/b', '/notes/c'];
// sidebarのないnote shellでも配置検証済みであることを必須にする。
const headerHtml = STATIC_HEADER_CONTRACT_ACCEPTED_TOC_ABSENT_HTML.replace(
  'data-note-layout="false"',
  'data-note-layout="true"',
);
const shell: NavigationEnvelope['shell'] = { headerHtml, sidebarProjection: null };
const envelope = (): NavigationEnvelope => ({
  schemaVersion: NAVIGATION_ENVELOPE_SCHEMA_VERSION,
  buildId: BUILD_ID,
  generatedAt: GENERATED_AT,
  document: {
    html: '<article style="height:6000px"><h1>本文 B</h1></article>',
    title: '本文 B',
    description: null,
    renderedKind: 'page',
  },
  shell,
  hydrationPlan: null,
});
const dependencies = (unknownPath?: string): RouterRuntimeUrlDependencies => ({
  siteUrlContext: { siteOrigin: location.origin, basePath: '' },
  isInternalDocumentPathname: (path) => routes.includes(path.replace(/\/$/u, '')),
  routeManifestState: {
    status: 'loaded',
    manifest: {
      version: 1,
      buildId: BUILD_ID,
      buildLabel: BUILD_ID,
      generatedAt: GENERATED_AT,
      siteOrigin: location.origin,
      basePath: '',
      routes,
    },
    routeSet: {
      routes: routes.filter((path) => path !== unknownPath),
      has: (path) => path !== unknownPath && routes.includes(path),
    },
  },
});

const originalStart = Object.getOwnPropertyDescriptor(document, 'startViewTransition');
const originalUrl = readAddress();
const originalState: unknown = history.state;
const originalTitle = document.title;
let router: Router | null = null;
let main: HTMLElement | null = null;
let postRender: RouterDocumentHostPostRenderController | null = null;
let stopHistory: (() => void) | null = null;
let lifetime: AbortController | null = null;

const settleHistoryQuota = (): Promise<void> =>
  new Promise((resolve) => window.setTimeout(resolve, 10_000));
beforeAll(settleHistoryQuota, 15_000);
afterAll(settleHistoryQuota, 15_000);

afterEach(() => {
  stopHistory?.();
  stopHistory = null;
  router?.destroy();
  router = null;
  postRender?.dispose();
  postRender = null;
  lifetime?.abort();
  lifetime = null;
  releaseContentContext(main);
  main = null;
  vi.restoreAllMocks();
  if (originalStart) Object.defineProperty(document, 'startViewTransition', originalStart);
  else Reflect.deleteProperty(document, 'startViewTransition');
  document.querySelectorAll('[data-router-transition-test-meta]').forEach((meta) => meta.remove());
  document.documentElement.removeAttribute('data-content-transition');
  history.replaceState(originalState, '', originalUrl);
  document.title = originalTitle;
  resetShellLifecycleForTest();
});

const setup = async (
  options: {
    afterContentCommit?: () => void | Promise<void>;
    shellFailure?: Error;
    contentPrepareFailure?: Error;
    shellPrepareFailure?: Error;
    navigationTimeoutMs?: number;
    beforeLoad?: () => void | Promise<void>;
    unknownPath?: string;
    stateOnly?: boolean;
    allowNextCommit?: boolean;
    synchronousContent?: boolean;
    synchronousShell?: boolean;
    afterSynchronousContentCommit?: () => void;
    prepareContent?: (
      prepared: PreparedContentUpdate,
    ) => PreparedContentUpdate | Promise<PreparedContentUpdate>;
    prepareShell?: (prepared: PreparedShellUpdate) => PreparedShellUpdate;
  } = {},
) => {
  writeHistoryEntry({ mode: 'replace', owner: 'router', url: '/notes/a', state: {} });
  for (const [name, content] of [
    ['rouault-build-id', BUILD_ID],
    ['rouault-generated-at', GENERATED_AT],
  ]) {
    const meta = document.createElement('meta');
    meta.name = name ?? '';
    meta.content = content ?? '';
    meta.setAttribute('data-router-transition-test-meta', '');
    document.head.append(meta);
  }
  const host = await fixture(`<div>${headerHtml}<main id="main-content" tabindex="-1"
    style="display:flow-root"><article style="height:6000px"><h1>本文 A</h1></article></main>
    <div aria-live="polite" data-announcement></div></div>`);
  const content = host.querySelector<HTMLElement>('#main-content');
  const header = host.querySelector<HTMLElement>('header');
  const announcement = host.querySelector<HTMLElement>('[data-announcement]');
  if (!content || !header || !announcement) throw new Error('fixture incomplete');
  main = content;
  const initialEpoch = initializeContentContext(content);
  setContentReadiness({
    contentEpoch: initialEpoch,
    root: content,
    shellCommitId: 0,
    status: 'settled',
    started: true,
  });
  const announcements: string[] = [];
  postRender = new RouterDocumentHostPostRenderController((text) => {
    announcements.push(text);
    announcement.textContent = text;
  });
  postRender.initialize(host);
  const postCommit = vi.fn(postRender.createPostCommitController(host).run);
  const contentCommit = vi.fn();
  const contentRollback = vi.fn();
  const shellRollback = vi.fn();
  const restored: AppShellRestoredDetail[] = [];
  lifetime = new AbortController();
  document.addEventListener(
    'app-shell:restored',
    (event) => {
      restored.push((event as CustomEvent<AppShellRestoredDetail>).detail);
    },
    { signal: lifetime.signal },
  );
  const transitions: ControlledTransition[] = [];
  const start = vi.fn((callback: () => Promise<void>) => {
    const transition = new ControlledTransition(callback);
    transitions.push(transition);
    return transition;
  });
  Object.defineProperty(document, 'startViewTransition', { configurable: true, value: start });
  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  vi.spyOn(window, 'matchMedia').mockReturnValue(media);
  vi.spyOn(media, 'matches', 'get').mockReturnValue(false);
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
  const runtimeDependencies = dependencies(options.unknownPath);
  const currentRouter = new Router(content, runtimeDependencies, {
    skipInitialNavigation: true,
    ...(options.navigationTimeoutMs === undefined
      ? {}
      : { navigationTimeoutMs: options.navigationTimeoutMs }),
    postCommitController: { run: postCommit },
    ...(options.stateOnly
      ? { urlStateNavigationPolicy: { evaluate: () => ({ kind: 'state-only' as const }) } }
      : {}),
    contentAdapter: {
      prepare({ html }) {
        if (options.contentPrepareFailure) throw options.contentPrepareFailure;
        const previousHtml = content.innerHTML;
        const commit = (): void => {
          contentCommit();
          const epoch = beginContentMutation(content);
          setContentReadiness({
            contentEpoch: epoch,
            root: content,
            shellCommitId: readCurrentShellCommitId(),
            status: 'pending',
            started: false,
          });
          content.innerHTML = html;
        };
        const rollback = (): void => {
          contentRollback();
          const epoch = beginContentMutation(content);
          setContentReadiness({
            contentEpoch: epoch,
            root: content,
            shellCommitId: readCurrentShellCommitId(),
            status: 'pending',
            started: false,
          });
          content.innerHTML = previousHtml;
        };
        const prepared: PreparedContentUpdate = options.synchronousContent
          ? {
              commitTiming: 'synchronous',
              commit(): undefined {
                commit();
                options.afterSynchronousContentCommit?.();
              },
              rollback,
            }
          : {
              async commit() {
                commit();
                await options.afterContentCommit?.();
              },
              rollback,
            };
        return options.prepareContent?.(prepared) ?? prepared;
      },
    },
    shellAdapter: {
      prepare() {
        if (options.shellPrepareFailure) throw options.shellPrepareFailure;
        const commit = (): undefined => {
          if (options.shellFailure) throw options.shellFailure;
        };
        const prepared: PreparedShellUpdate = options.synchronousShell
          ? { commitTiming: 'synchronous', commit, rollback: shellRollback }
          : { commit, rollback: shellRollback };
        return options.prepareShell?.(prepared) ?? prepared;
      },
    },
  });
  router = currentRouter;
  currentRouter.addDocumentRoute('/notes/b', async () => {
    await options.beforeLoad?.();
    return envelope();
  });
  // 後続intentはpublic navigateから発行し、本文を変更する前に止めて旧transactionを観測する。
  currentRouter.addBeforeNavigateHook(
    (context) => options.allowNextCommit === true || context.normalizedUrl !== '/notes/c',
  );
  const contentLoad = vi.fn();
  currentRouter.on('content:load', contentLoad);
  await currentRouter.start();
  document.dispatchEvent(
    new CustomEvent<AppShellValidatedDetail>('app-shell:validated', {
      detail: {
        header,
        shell,
        shellCommitId: 0,
        navigationUrl: '/notes/a',
        linkValidationContext: {
          siteUrlContext: runtimeDependencies.siteUrlContext,
          currentAbsoluteUrl: `${location.origin}/notes/a`,
          normalizedNavigationUrl: '/notes/a',
          routeManifestState: runtimeDependencies.routeManifestState,
        },
      },
    }),
  );
  await expect.poll(() => content.dataset['readingPositionStatus']).toBe('settled');
  const begin = async () => {
    const result = currentRouter.navigate({ url: '/notes/b', historyMode: 'push' });
    await expect.poll(() => transitions.length).toBe(1);
    const transition = transitions[0];
    if (!transition) throw new Error('transition not started');
    return { result, transition };
  };
  return {
    router: currentRouter,
    content,
    header,
    start,
    transitions,
    begin,
    contentCommit,
    contentRollback,
    shellRollback,
    restored,
    postCommit,
    contentLoad,
    announcements,
    announcement,
  };
};

describe('Router content transition transaction integration', () => {
  it.each(['/notes/a', '/notes/b'])(
    'manifest未掲載の%sを含む正常結果は通常commitへ縮退する',
    async (unknownPath) => {
      const state = await setup({ unknownPath });
      const result = await state.router.navigate({ url: '/notes/b' });
      expect(result.committed).toBe(true);
      expect(result.renderedKind).toBe('page');
      expect(state.start).not.toHaveBeenCalled();
      expect(state.contentCommit).toHaveBeenCalledTimes(1);
      expect(state.contentLoad).toHaveBeenCalledTimes(1);
    },
  );

  it('callback開始前の新navigateは古いcallbackをcommitせず履歴とbindingを維持する', async () => {
    const state = await setup();
    const before = readContentContext();
    const historyLength = history.length;
    const { result, transition } = await state.begin();
    const newer = state.router.navigate({ url: '/notes/c', historyMode: 'push' });
    await transition.update();
    expect((await result).kind).toBe('superseded');
    expect((await newer).kind).toBe('cancelled');
    expect(state.contentCommit).not.toHaveBeenCalled();
    expect(state.contentLoad).not.toHaveBeenCalled();
    expect(state.postCommit).not.toHaveBeenCalled();
    expect(state.content.textContent).toContain('本文 A');
    expect(readContentContext()?.contentEpoch).toBe(before?.contentEpoch);
    expect(readContentContext()?.displayedBinding).toEqual(before?.displayedBinding);
    expect(readAddress()).toBe('/notes/a');
    expect(history.length).toBe(historyLength);
    expect(transition.skipTransition).toHaveBeenCalledTimes(1);
  });

  it('callback内の本文更新後に新navigateが入ると既存rollbackがDOM・epoch・shell・履歴を復元する', async () => {
    const committed = deferred();
    const release = deferred();
    const state = await setup({
      afterContentCommit: () => {
        committed.resolve();
        return release.promise;
      },
    });
    const before = readContentContext();
    const entry = readHistoryEntry();
    const historyLength = history.length;
    const { result, transition } = await state.begin();
    const update = transition.update();
    await committed.promise;
    const mutatedEpoch = readContentContext()?.contentEpoch ?? 0;
    expect(state.content.textContent).toContain('本文 B');
    const newer = state.router.navigate({ url: '/notes/c', historyMode: 'push' });
    release.resolve();
    await update;
    expect((await result).kind).toBe('superseded');
    expect((await newer).kind).toBe('cancelled');
    expect(state.contentCommit).toHaveBeenCalledTimes(1);
    expect(state.contentRollback).toHaveBeenCalledTimes(1);
    expect(state.shellRollback).toHaveBeenCalledTimes(1);
    expect(state.content.textContent).toContain('本文 A');
    expect(readContentContext()?.contentEpoch).toBeGreaterThan(mutatedEpoch);
    expect(readContentContext()?.displayedBinding).toEqual(before?.displayedBinding);
    expect(state.restored).toHaveLength(1);
    expect(state.restored[0]?.contentBinding).toEqual(before?.displayedBinding);
    expect(state.restored[0]?.contentEpoch).toBe(readContentContext()?.contentEpoch);
    expect(readCurrentShellCommitId()).toBe(0);
    expect(readHistoryEntry()).toEqual(entry);
    expect(readAddress()).toBe('/notes/a');
    expect(history.length).toBe(historyLength);
    expect(state.contentLoad).not.toHaveBeenCalled();
    expect(state.postCommit).not.toHaveBeenCalled();
  });

  it.each([false, true])(
    'before-mutationで新navigateを開始しobserver throw=%sでも旧受理を止め一度rollbackする',
    async (throwObserver) => {
      const current = await setup({ allowNextCommit: true });
      const before = requireFixtureValue(readContentContext());
      const initialEntry = readHistoryEntry();
      const historyLength = history.length;
      const push = vi.spyOn(history, 'pushState');
      const replace = vi.spyOn(history, 'replaceState');
      const nextLoaded = deferred();
      const releaseNext = deferred();
      current.router.addDocumentRoute('/notes/c', async () => {
        nextLoaded.resolve();
        await releaseNext.promise;
        const next = envelope();
        return {
          ...next,
          document: {
            ...next.document,
            title: '本文 C',
            html: '<article style="height:6000px"><h1>本文 C</h1></article>',
          },
        };
      });
      let newer: Promise<NavigationResult> | null = null;
      let injected = false;
      const phases: { reason: string; epoch: number; mutation: boolean; text: string }[] = [];
      const stop = subscribeContentContext((reason) => {
        const context = readContentContext();
        if ((reason === 'before-mutation' || reason === 'mutation') && context)
          phases.push({
            reason,
            epoch: context.contentEpoch,
            mutation: context.mutation,
            text: current.content.textContent,
          });
        if (reason !== 'before-mutation' || injected) return;
        injected = true;
        newer = current.router.navigate({ url: '/notes/c', historyMode: 'push' });
        if (throwObserver) throw new Error('before-mutation observer failed');
      });
      try {
        const { result, transition } = await current.begin();
        await transition.update();
        const old = await result;
        await nextLoaded.promise;
        expect(old).toMatchObject({ kind: 'superseded', committed: false });
        expect('receipt' in old ? old.receipt : undefined).toBeUndefined();
        expect(phases[0]).toMatchObject({
          reason: 'before-mutation',
          epoch: before.contentEpoch,
          mutation: false,
          text: expect.stringContaining('本文 A'),
        });
        const cleanup = requireFixtureValue(phases.find(({ reason }) => reason === 'mutation'));
        expect(cleanup.mutation).toBe(true);
        expect(cleanup.epoch).toBeGreaterThan(before.contentEpoch);
        expect(current.contentCommit).toHaveBeenCalledOnce();
        expect(current.contentRollback).toHaveBeenCalledOnce();
        expect(current.shellRollback).toHaveBeenCalledOnce();
        expect(current.restored).toHaveLength(1);
        expect(current.contentLoad).not.toHaveBeenCalled();
        expect(current.postCommit).not.toHaveBeenCalled();
        expect(current.content.textContent).toContain('本文 A');
        expect(readContentContext()?.displayedBinding).toEqual(before.displayedBinding);
        expect(readAddress()).toBe('/notes/a');
        expect(readHistoryEntry()).toEqual(initialEntry);
        expect(history.length).toBe(historyLength);
        expect(push).not.toHaveBeenCalled();
        expect(replace).not.toHaveBeenCalled();
        releaseNext.resolve();
        const next = await requireFixtureValue(newer);
        expect(next).toMatchObject({ committed: true, receipt: { url: '/notes/c' } });
        expect(current.content.textContent).toContain('本文 C');
        expect(push).toHaveBeenCalledOnce();
        expect(replace).not.toHaveBeenCalled();
        expect(current.contentCommit).toHaveBeenCalledTimes(2);
        expect(current.contentRollback).toHaveBeenCalledOnce();
        expect(current.shellRollback).toHaveBeenCalledOnce();
        expect(current.contentLoad).toHaveBeenCalledOnce();
        expect(current.postCommit).toHaveBeenCalledOnce();
        const acceptedBinding = readContentContext()?.displayedBinding;
        expect(acceptedBinding).toEqual({ url: '/notes/c', entryId: readHistoryEntry()?.id });
        transition.finishedState.resolve();
        await Promise.resolve();
        expect(readContentContext()?.displayedBinding).toBe(acceptedBinding);
      } finally {
        releaseNext.resolve();
        stop();
      }
    },
  );

  it('取得中timeoutを無視して遅れて返る正常envelopeは演出もcommitも開始しない', async () => {
    const loading = deferred();
    const release = deferred();
    const state = await setup({
      navigationTimeoutMs: 600,
      beforeLoad: () => {
        loading.resolve();
        return release.promise;
      },
    });
    const before = readContentContext();
    const entry = readHistoryEntry();
    const historyLength = history.length;
    const result = state.router.navigate({ url: '/notes/b', historyMode: 'push' });
    await loading.promise;
    // abortを採用しないloaderでも、返却後のguardが演出開始を防ぐ。
    await new Promise<void>((resolve) => window.setTimeout(resolve, 700));
    release.resolve();
    const cancelled = await result;
    expect(cancelled.kind).toBe('superseded');
    expect(cancelled.committed).toBe(false);
    expect(state.start).not.toHaveBeenCalled();
    expect(state.contentCommit).not.toHaveBeenCalled();
    expect(state.contentRollback).not.toHaveBeenCalled();
    expect(state.shellRollback).not.toHaveBeenCalled();
    expect(state.content.textContent).toContain('本文 A');
    expect(readContentContext()?.contentEpoch).toBe(before?.contentEpoch);
    expect(readContentContext()?.displayedBinding).toEqual(before?.displayedBinding);
    expect(readHistoryEntry()).toEqual(entry);
    expect(readAddress()).toBe('/notes/a');
    expect(history.length).toBe(historyLength);
    expect(state.contentLoad).not.toHaveBeenCalled();
    expect(state.postCommit).not.toHaveBeenCalled();
    expect(state.announcements).toEqual([]);
    expect(document.documentElement.hasAttribute('data-content-transition')).toBe(false);
  });

  it('callback開始前のtimeoutは演出を止め遅延callbackもcommitしない', async () => {
    const state = await setup({ navigationTimeoutMs: 600 });
    const before = readContentContext();
    const entry = readHistoryEntry();
    const historyLength = history.length;
    const { result, transition } = await state.begin();
    // native callbackを開始せずexecution signalによる演出停止を観測する。
    await expect.poll(() => transition.skipTransition.mock.calls.length).toBe(1);
    expect(document.documentElement.hasAttribute('data-content-transition')).toBe(false);
    expect(state.contentCommit).not.toHaveBeenCalled();
    await transition.update();
    const cancelled = await result;
    expect(cancelled.kind).toBe('superseded');
    expect(cancelled.committed).toBe(false);
    expect(state.contentCommit).not.toHaveBeenCalled();
    expect(state.contentRollback).not.toHaveBeenCalled();
    expect(state.shellRollback).not.toHaveBeenCalled();
    expect(state.content.textContent).toContain('本文 A');
    expect(readContentContext()?.contentEpoch).toBe(before?.contentEpoch);
    expect(readContentContext()?.displayedBinding).toEqual(before?.displayedBinding);
    expect(readHistoryEntry()).toEqual(entry);
    expect(readAddress()).toBe('/notes/a');
    expect(history.length).toBe(historyLength);
    expect(state.contentLoad).not.toHaveBeenCalled();
    expect(state.postCommit).not.toHaveBeenCalled();
    expect(state.announcements).toEqual([]);
    expect(state.start).toHaveBeenCalledTimes(1);
    expect(transition.skipTransition).toHaveBeenCalledTimes(1);
    expect(document.documentElement.hasAttribute('data-content-transition')).toBe(false);
  });

  it.each(['destroy', 'timeout'] as const)(
    'callback内の本文更新中の%sはrollbackしてsupersededを返し履歴とbindingを保つ',
    async (interruption) => {
      const committed = deferred();
      const release = deferred();
      const state = await setup({
        ...(interruption === 'timeout' ? { navigationTimeoutMs: 600 } : {}),
        afterContentCommit: () => {
          committed.resolve();
          return release.promise;
        },
      });
      const before = readContentContext();
      const entry = readHistoryEntry();
      const historyLength = history.length;
      const focus = vi.spyOn(state.content, 'focus');
      const scroll = vi.spyOn(window, 'scrollTo');
      const { result, transition } = await state.begin();
      const update = transition.update();
      await committed.promise;
      const mutatedEpoch = readContentContext()?.contentEpoch ?? 0;
      expect(state.content.textContent).toContain('本文 B');
      if (interruption === 'destroy') {
        state.router.destroy();
        expect(document.documentElement.hasAttribute('data-content-transition')).toBe(false);
      } else {
        // callbackを保留したままnavigationの実timerを満了させる。
        await new Promise<void>((resolve) => window.setTimeout(resolve, 700));
      }
      release.resolve();
      await update;
      const cancelled = await result;
      expect(cancelled.kind).toBe('superseded');
      expect(cancelled.committed).toBe(false);
      expect(state.contentCommit).toHaveBeenCalledTimes(1);
      expect(state.contentRollback).toHaveBeenCalledTimes(1);
      expect(state.shellRollback).toHaveBeenCalledTimes(1);
      expect(state.content.textContent).toContain('本文 A');
      expect(readContentContext()?.contentEpoch).toBeGreaterThan(mutatedEpoch);
      expect(readContentContext()?.displayedBinding).toEqual(before?.displayedBinding);
      expect(state.restored).toHaveLength(1);
      expect(state.restored[0]?.contentBinding).toEqual(before?.displayedBinding);
      expect(readCurrentShellCommitId()).toBe(0);
      expect(readHistoryEntry()).toEqual(entry);
      expect(readAddress()).toBe('/notes/a');
      expect(history.length).toBe(historyLength);
      expect(state.contentLoad).not.toHaveBeenCalled();
      expect(state.postCommit).not.toHaveBeenCalled();
      expect(focus).not.toHaveBeenCalled();
      expect(scroll).not.toHaveBeenCalled();
      expect(state.announcements).toEqual([]);
      expect(state.start).toHaveBeenCalledTimes(1);
      expect(transition.skipTransition).toHaveBeenCalledTimes(1);
      expect(document.documentElement.hasAttribute('data-content-transition')).toBe(false);
    },
  );

  it('history durable直後の新navigateは成功commitを保ちstaleなfocus・scroll・announcementを開始しない', async () => {
    const state = await setup();
    const focus = vi.spyOn(state.content, 'focus');
    const scroll = vi.spyOn(window, 'scrollTo');
    const historyLength = history.length;
    let newer: Promise<NavigationResult> | undefined;
    stopHistory = observeHistoryEntries(
      () => {
        /* durable後の観測だけで割り込む。 */
      },
      (change) => {
        if (change.url === '/notes/b') newer = state.router.navigate({ url: '/notes/c' });
      },
    );
    const { result, transition } = await state.begin();
    await transition.update();
    expect((await result).committed).toBe(true);
    expect((await newer)?.kind).toBe('cancelled');
    expect(state.content.textContent).toContain('本文 B');
    expect(readAddress()).toBe('/notes/b');
    expect(history.length).toBe(historyLength + 1);
    expect(readContentContext()?.displayedBinding).toEqual({
      entryId: readHistoryEntry()?.id,
      url: '/notes/b',
    });
    expect(state.contentRollback).not.toHaveBeenCalled();
    expect(state.contentLoad).toHaveBeenCalledTimes(1);
    expect(state.postCommit).not.toHaveBeenCalled();
    expect(focus).not.toHaveBeenCalled();
    expect(scroll).not.toHaveBeenCalled();
    expect(state.announcements).toEqual([]);
  });

  it('ready拒否後も本文・history・通常先頭・focus・announcementを一度だけ適用しfinishedを待たない', async () => {
    const state = await setup();
    window.scrollTo({ top: 700, behavior: 'instant' });
    const focus = vi.spyOn(state.content, 'focus');
    const scroll = vi.spyOn(window, 'scrollTo');
    const historyLength = history.length;
    const { result, transition } = await state.begin();
    transition.readyState.reject(new Error('animation unavailable'));
    await expect.poll(() => transition.skipTransition.mock.calls.length).toBe(1);
    await transition.update();
    const completed = await result;
    expect(completed.kind).toBe('completed');
    expect(completed.source).toBe('document-route');
    expect(completed.committed).toBe(true);
    expect(state.contentCommit).toHaveBeenCalledTimes(1);
    expect(history.length).toBe(historyLength + 1);
    expect(state.contentLoad).toHaveBeenCalledTimes(1);
    expect(state.postCommit).toHaveBeenCalledTimes(1);
    expect(focus).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(state.content);
    expect(scroll).toHaveBeenCalledTimes(1);
    expect(window.scrollY).toBeLessThanOrEqual(2);
    expect(state.announcements).toEqual(['ページが読み込まれました']);
    expect(state.announcement.textContent).toBe('ページが読み込まれました');
    // hydration完了はcallbackの外で進み、安定化による不要な二重scrollも起きない。
    const epoch = readContentContext()?.contentEpoch;
    if (epoch === undefined) throw new Error('epoch missing');
    setContentReadiness({
      contentEpoch: epoch,
      root: state.content,
      shellCommitId: readCurrentShellCommitId(),
      status: 'settled',
      started: true,
    });
    await expect.poll(() => state.content.dataset['readingPositionStatus']).toBe('settled');
    transition.finishedState.reject(new Error('animation interrupted'));
    await Promise.resolve();
    expect(state.start).toHaveBeenCalledTimes(1);
    expect(state.contentCommit).toHaveBeenCalledTimes(1);
    expect(scroll).toHaveBeenCalledTimes(1);
    expect(focus).toHaveBeenCalledTimes(1);
    expect(state.announcements).toEqual(['ページが読み込まれました']);
    expect(state.header).toBe(document.querySelector('[data-layout-header]'));
  });

  it.each(['content', 'shell'] as const)(
    '%s prepare失敗は未変更本文の演出を止め同じerrorの失敗結果を一度だけ返す',
    async (stage) => {
      const error = new Error(`${stage} prepare failed`);
      const state = await setup(
        stage === 'content' ? { contentPrepareFailure: error } : { shellPrepareFailure: error },
      );
      const before = readContentContext();
      const entry = readHistoryEntry();
      const historyLength = history.length;
      const { result, transition } = await state.begin();
      await transition.update();
      const failed = await result;
      expect(failed.kind).toBe('load-failure');
      expect(failed.outcome).toBe('failed');
      expect(failed.committed).toBe(false);
      expect(failed.error).toBe(error);
      expect(state.start).toHaveBeenCalledTimes(1);
      expect(transition.skipTransition).toHaveBeenCalledTimes(1);
      expect(state.contentCommit).not.toHaveBeenCalled();
      expect(state.contentRollback).not.toHaveBeenCalled();
      expect(state.shellRollback).not.toHaveBeenCalled();
      expect(state.restored).toHaveLength(0);
      expect(state.content.textContent).toContain('本文 A');
      expect(readContentContext()?.contentEpoch).toBe(before?.contentEpoch);
      expect(readContentContext()?.displayedBinding).toEqual(before?.displayedBinding);
      expect(readCurrentShellCommitId()).toBe(0);
      expect(readHistoryEntry()).toEqual(entry);
      expect(readAddress()).toBe('/notes/a');
      expect(history.length).toBe(historyLength);
      expect(state.contentLoad).not.toHaveBeenCalled();
      expect(state.postCommit).not.toHaveBeenCalled();
      expect(state.announcements).toEqual([]);
      expect(document.documentElement.hasAttribute('data-content-transition')).toBe(false);
    },
  );

  it('callback内の実commit失敗は一回rollbackして失敗結果を返し再commitしない', async () => {
    const error = new Error('shell mutation failed');
    const state = await setup({ shellFailure: error });
    const entry = readHistoryEntry();
    const historyLength = history.length;
    const { result, transition } = await state.begin();
    await transition.update();
    const failed = await result;
    expect(failed.kind).toBe('load-failure');
    expect(failed.committed).toBe(false);
    expect(failed.error).toBe(error);
    expect(state.contentCommit).toHaveBeenCalledTimes(1);
    expect(state.contentRollback).toHaveBeenCalledTimes(1);
    expect(state.shellRollback).toHaveBeenCalledTimes(1);
    expect(state.content.textContent).toContain('本文 A');
    expect(readAddress()).toBe('/notes/a');
    expect(readHistoryEntry()).toEqual(entry);
    expect(history.length).toBe(historyLength);
    expect(readCurrentShellCommitId()).toBe(0);
    expect(state.contentLoad).not.toHaveBeenCalled();
    expect(state.postCommit).not.toHaveBeenCalled();
    transition.readyState.reject(error);
    await Promise.resolve();
    expect(state.start).toHaveBeenCalledTimes(1);
    expect(state.contentCommit).toHaveBeenCalledTimes(1);
  });
});

// 公開navigateの結果と実History API/DOMを使い、受理後の例外で再commitしないことを検証する。
describe('history noneとbinding採用の受理境界', () => {
  const failAdoption = (currentRouter: Router, error: Error) =>
    vi
      .spyOn(
        currentRouter as unknown as {
          adoptAcceptedBinding(receipt: NavigationCommitReceipt): void;
        },
        'adoptAcceptedBinding',
      )
      .mockImplementationOnce(() => {
        throw error;
      });

  it('noneの受理はHistory APIを書かずimmutableな対象entry・URL・epochを返す', async () => {
    const current = await setup();
    writeHistoryEntry({ mode: 'push', owner: 'router', url: '/notes/b' });
    const expectedEntry = readHistoryEntry()?.id;
    const push = vi.spyOn(history, 'pushState');
    const replace = vi.spyOn(history, 'replaceState');
    const result = await requireFixtureValue(router).navigate({
      url: '/notes/b',
      historyMode: 'none',
      cause: 'traverse',
    });
    expect(result.committed).toBe(true);
    expect('receipt' in result && result.receipt).toMatchObject({
      entryId: expectedEntry,
      url: '/notes/b',
      root: main,
      stateOnly: false,
      contentEpoch: readContentContext()?.contentEpoch,
      shellCommitId: readCurrentShellCommitId(),
    });
    const receipt = 'receipt' in result ? result.receipt : undefined;
    expect(Object.isFrozen(receipt)).toBe(true);
    expect(push).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
    expect(current.contentCommit).toHaveBeenCalledOnce();
    expect(current.contentRollback).not.toHaveBeenCalled();
    expect(current.contentLoad).toHaveBeenCalledOnce();
    expect(current.postCommit).toHaveBeenCalledOnce();
    writeHistoryEntry({ mode: 'replace', owner: 'router', url: '/notes/c' });
    expect(receipt?.url).toBe('/notes/b');
    expect(receipt?.entryId).toBe(expectedEntry);
  });

  it('明示noneでもcanonical routeとentryのexact末尾slashを区別して受理する', async () => {
    const current = await setup();
    writeHistoryEntry({ mode: 'push', owner: 'router', url: '/notes/b/' });
    const expectedEntry = readHistoryEntry()?.id;
    const push = vi.spyOn(history, 'pushState');
    const replace = vi.spyOn(history, 'replaceState');
    const pending = current.router.navigate({ url: '/notes/b', historyMode: 'none' });
    await expect.poll(() => current.start.mock.calls.length).toBe(1);
    await requireFixtureValue(current.transitions[0]).update();
    const result = await pending;
    expect(result).toMatchObject({
      committed: true,
      normalizedUrl: '/notes/b',
      receipt: { url: '/notes/b/', entryId: expectedEntry },
    });
    expect(readAddress()).toBe('/notes/b/');
    expect(push).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
    expect(current.contentCommit).toHaveBeenCalledOnce();
    expect(current.contentRollback).not.toHaveBeenCalled();
  });

  it('none受理後のbinding失敗はdegradedと回復状態を返し、次の新entryへdocument委譲する', async () => {
    const current = await setup();
    writeHistoryEntry({ mode: 'push', owner: 'router', url: '/notes/b' });
    const expectedEntry = readHistoryEntry()?.id;
    const store = (postRender as unknown as { reading: { store: ReadingPositionStore } }).reading
      .store;
    const previousEntry = readContentContext()?.displayedBinding.entryId ?? null;
    store.write(expectedEntry ?? null, { version: 1, url: '/notes/b', x: 0, y: 520 });
    const previousCandidate = store.read(previousEntry, '/notes/a');
    const targetCandidate = store.read(expectedEntry ?? null, '/notes/b');
    const writes = vi.spyOn(ReadingPositionStore.prototype, 'write');
    const failure = new Error('binding adoption failed');
    failAdoption(requireFixtureValue(router), failure);
    const push = vi.spyOn(history, 'pushState');
    const replace = vi.spyOn(history, 'replaceState');
    const result = await requireFixtureValue(router).navigate({
      url: '/notes/b',
      historyMode: 'none',
      cause: 'traverse',
    });
    expect(result).toMatchObject({
      committed: true,
      degraded: true,
      recoveryRequired: true,
      receipt: { entryId: expectedEntry, url: '/notes/b', root: main },
      issues: [{ code: 'binding-adoption-failed', error: failure }],
    });
    expect(readContentContext()).toMatchObject({
      mutation: true,
      recoveryRequired: true,
      displayedBinding: { url: '/notes/a' },
    });
    expect(current.contentCommit).toHaveBeenCalledOnce();
    expect(current.contentRollback).not.toHaveBeenCalled();
    expect(current.shellRollback).not.toHaveBeenCalled();
    expect(current.contentLoad).not.toHaveBeenCalled();
    expect(current.postCommit).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
    writes.mockClear();
    // 新entryは旧receiptで採用せず、新しいrequestの宛先だけを既存document fallbackへ渡す。
    writeHistoryEntry({ mode: 'push', owner: 'router', url: '/notes/a' });
    const locationAdapter = (
      router as unknown as { location: { navigateDocument(url: string, mode: string): void } }
    ).location;
    const fallback = vi.spyOn(locationAdapter, 'navigateDocument').mockImplementation(() => {
      /* document委譲だけを観測しtest documentを離れない。 */
    });
    push.mockClear();
    replace.mockClear();
    const next = await requireFixtureValue(router).navigate({
      url: '/notes/a',
      historyMode: 'none',
      cause: 'traverse',
    });
    expect(next.kind).toBe('document-navigation-fallback');
    expect(fallback).toHaveBeenCalledExactlyOnceWith('/notes/a', 'none');
    expect(current.contentCommit).toHaveBeenCalledOnce();
    expect(push).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
    expect(readContentContext()?.recoveryRequired).toBe(true);
    expect(writes).not.toHaveBeenCalled();
    expect(store.read(previousEntry, '/notes/a')).toEqual(previousCandidate);
    expect(store.read(expectedEntry ?? null, '/notes/b')).toEqual(targetCandidate);
    expect('receipt' in result && result.receipt?.entryId).toBe(expectedEntry);
  });

  it.each(['new-root', 'new-epoch', 'new-entry'])(
    'none受理直後の%sへ旧bindingを採用せず、新contextを変更しない',
    async (change) => {
      const current = await setup();
      writeHistoryEntry({ mode: 'push', owner: 'router', url: '/notes/b' });
      const acceptedEntryId = readHistoryEntry()?.id;
      let changedContext: ReturnType<typeof readContentContext> = null;
      let oldBindingAdoptions = 0;
      const stop = subscribeContentContext((reason) => {
        if (reason === 'adopt' && readContentContext()?.displayedBinding.url === '/notes/b')
          oldBindingAdoptions += 1;
      });
      const mutateAfterAcceptance = (): void => {
        if (change === 'new-root') {
          const root = document.createElement('main');
          root.id = 'main-content';
          root.innerHTML = '<h1>新しい世代の本文</h1>';
          current.content.replaceWith(root);
          main = root;
          initializeContentContext(root);
        } else if (change === 'new-epoch') beginContentMutation(current.content);
        else {
          writeHistoryEntry({ mode: 'push', owner: 'router', url: '/notes/c' });
          beginNavigationIntent('navigation', '/notes/c');
          adoptContentBinding('/notes/c', readHistoryEntry()?.id ?? null);
        }
        changedContext = readContentContext();
      };
      document.addEventListener('app-shell:validated', mutateAfterAcceptance, { once: true });
      try {
        const result = await current.router.navigate({
          url: '/notes/b',
          historyMode: 'none',
          cause: 'traverse',
        });
        expect(result).toMatchObject({
          committed: true,
          degraded: true,
          recoveryRequired: true,
          receipt: { url: '/notes/b', entryId: acceptedEntryId, root: current.content },
        });
        expect(readContentContext()).toBe(changedContext);
        expect(oldBindingAdoptions).toBe(0);
        expect(current.contentCommit).toHaveBeenCalledOnce();
        expect(current.contentRollback).not.toHaveBeenCalled();
        expect(current.shellRollback).not.toHaveBeenCalled();
        expect(current.contentLoad).not.toHaveBeenCalled();
        expect(current.postCommit).not.toHaveBeenCalled();
      } finally {
        stop();
        document.removeEventListener('app-shell:validated', mutateAfterAcceptance);
      }
    },
  );

  it('content:load observer例外後も位置jobを一度進めて保存を再開し次navigationを受け付ける', async () => {
    const current = await setup();
    writeHistoryEntry({ mode: 'push', owner: 'router', url: '/notes/b' });
    const targetEntry = readHistoryEntry()?.id ?? null;
    const store = (postRender as unknown as { reading: { store: ReadingPositionStore } }).reading
      .store;
    store.write(targetEntry, { version: 1, url: '/notes/b', x: 0, y: 520 });
    const failure = new Error('accepted notification failed');
    requireFixtureValue(router).on('content:load', () => {
      throw failure;
    });
    const result = await requireFixtureValue(router).navigate({
      url: '/notes/b',
      historyMode: 'none',
      cause: 'traverse',
    });
    expect(result).toMatchObject({
      committed: true,
      degraded: true,
      issues: [{ code: 'post-commit-failed', error: failure }],
    });
    expect(current.contentCommit).toHaveBeenCalledOnce();
    expect(current.contentRollback).not.toHaveBeenCalled();
    expect(current.postCommit).toHaveBeenCalledOnce();
    setContentReadiness({
      contentEpoch: readContentContext()?.contentEpoch ?? 0,
      root: current.content,
      shellCommitId: readCurrentShellCommitId(),
      status: 'settled',
      started: true,
    });
    await expect.poll(() => current.content.dataset['readingPositionStatus']).toBe('settled');
    expect(Math.abs(window.scrollY - 520)).toBeLessThanOrEqual(2);
    window.scrollTo({ top: 700, behavior: 'instant' });
    window.dispatchEvent(new Event('scroll'));
    expect(store.read(targetEntry, '/notes/b')?.y).toBe(window.scrollY);
    current.router.addDocumentRoute('/notes/a', () => envelope());
    writeHistoryEntry({ mode: 'push', owner: 'router', url: '/notes/a' });
    const next = await current.router.navigate({
      url: '/notes/a',
      historyMode: 'none',
      cause: 'traverse',
    });
    expect(next.committed).toBe(true);
    expect(current.contentCommit).toHaveBeenCalledTimes(2);
    expect(current.postCommit).toHaveBeenCalledTimes(2);
    expect(main?.textContent).toContain('本文 B');
  });

  it.each(['after:navigate', 'navigation:terminal'] as const)(
    '受理後の%s例外でも成功receiptを返し、queueを停止しない',
    async (eventName) => {
      const current = await setup();
      writeHistoryEntry({ mode: 'push', owner: 'router', url: '/notes/b' });
      const failure = new Error('terminal observer failed');
      current.router.on(eventName, (event) => {
        if ('committed' in event ? event.committed : event.result.committed) throw failure;
      });
      const result = await current.router.navigate({
        url: '/notes/b',
        historyMode: 'none',
        cause: 'traverse',
      });
      expect(result).toMatchObject({
        committed: true,
        degraded: true,
        receipt: { url: '/notes/b' },
      });
      expect(current.contentCommit).toHaveBeenCalledOnce();
      expect(current.contentRollback).not.toHaveBeenCalled();
      const cancelled = await current.router.navigate({ url: '/notes/c' });
      expect(cancelled.kind).toBe('cancelled');
    },
  );

  it('push耐久点のbinding失敗もentryを保ち、historyも本文も再適用しない', async () => {
    const current = await setup();
    const failure = new Error('push binding failed');
    failAdoption(current.router, failure);
    const push = vi.spyOn(history, 'pushState');
    const replace = vi.spyOn(history, 'replaceState');
    const { result: pending, transition } = await current.begin();
    await transition.update();
    const result = await pending;
    expect(result).toMatchObject({
      committed: true,
      degraded: true,
      recoveryRequired: true,
      receipt: { url: '/notes/b', entryId: readHistoryEntry()?.id },
    });
    expect(readAddress()).toBe('/notes/b');
    expect(push).toHaveBeenCalledOnce();
    expect(replace).not.toHaveBeenCalled();
    expect(current.contentCommit).toHaveBeenCalledOnce();
    expect(current.contentRollback).not.toHaveBeenCalled();
    expect(current.contentLoad).not.toHaveBeenCalled();
    expect(current.postCommit).not.toHaveBeenCalled();
  });

  it.each([false, true])(
    '同entryのdocument回復でも保存を再開せず、委譲throw=%sを局所化する',
    async (failDocument) => {
      const current = await setup();
      writeHistoryEntry({ mode: 'push', owner: 'router', url: '/notes/b' });
      failAdoption(current.router, new Error('binding failed'));
      const accepted = await current.router.navigate({
        url: '/notes/b',
        historyMode: 'none',
        cause: 'traverse',
      });
      let notifications = 0;
      let terminals = 0;
      current.router.on('after:navigate', () => {
        notifications += 1;
        throw new Error('fallback observer failed');
      });
      current.router.on('navigation:terminal', () => {
        terminals += 1;
        throw new Error('fallback terminal failed');
      });
      const locationAdapter = (
        current.router as unknown as {
          location: { navigateDocument(url: string, mode: string): void };
        }
      ).location;
      const failure = new Error('document delegation failed');
      const fallback = vi.spyOn(locationAdapter, 'navigateDocument').mockImplementation(() => {
        if (failDocument) throw failure;
      });
      const push = vi.spyOn(history, 'pushState');
      const replace = vi.spyOn(history, 'replaceState');
      const result = await current.router.navigate({
        url: '/notes/b',
        historyMode: 'none',
        cause: 'traverse',
      });
      expect(result.kind).toBe(failDocument ? 'load-failure' : 'document-navigation-fallback');
      expect(fallback).toHaveBeenCalledExactlyOnceWith('/notes/b', 'none');
      expect(readContentContext()?.recoveryRequired).toBe(true);
      expect(current.contentCommit).toHaveBeenCalledOnce();
      expect(current.contentRollback).not.toHaveBeenCalled();
      expect(push).not.toHaveBeenCalled();
      expect(replace).not.toHaveBeenCalled();
      expect('receipt' in accepted && accepted.receipt?.url).toBe('/notes/b');
      if (failDocument) expect(result.error).toBe(failure);
      expect(result.degraded).toBe(true);
      expect(notifications).toBe(1);
      expect(terminals).toBe(1);
      const next = await current.router.navigate({ url: '/notes/a', historyMode: 'push' });
      expect(next.kind).toBe(failDocument ? 'load-failure' : 'document-navigation-fallback');
      expect(next.degraded).toBe(true);
      expect(fallback).toHaveBeenCalledTimes(2);
      expect(notifications).toBe(2);
      expect(terminals).toBe(2);
      expect(current.contentCommit).toHaveBeenCalledOnce();
    },
  );

  it('document回復委譲の通知中にintentが失効すれば旧targetへ移動しない', async () => {
    const current = await setup();
    writeHistoryEntry({ mode: 'push', owner: 'router', url: '/notes/b' });
    failAdoption(current.router, new Error('binding failed'));
    await current.router.navigate({ url: '/notes/b', historyMode: 'none', cause: 'traverse' });
    const locationAdapter = (
      current.router as unknown as {
        location: { navigateDocument(url: string, mode: string): void };
      }
    ).location;
    const fallback = vi.spyOn(locationAdapter, 'navigateDocument').mockImplementation(() => {
      /* documentを離れない。 */
    });
    const supersede = (): void => {
      void current.router.navigate({ url: '/notes/c' });
    };
    document.addEventListener('reading-position:document-fallback', supersede, { once: true });
    const result = await current.router.navigate({
      url: '/notes/b',
      historyMode: 'none',
      cause: 'traverse',
    });
    expect(result.kind).toBe('superseded');
    expect(fallback).not.toHaveBeenCalled();
    expect(current.contentCommit).toHaveBeenCalledOnce();
    expect(readContentContext()?.recoveryRequired).toBe(true);
  });

  it('回復中のnative fragment通知はmutationと旧bindingを通常採用で解除しない', async () => {
    const current = await setup();
    writeHistoryEntry({ mode: 'push', owner: 'router', url: '/notes/b' });
    failAdoption(current.router, new Error('binding failed'));
    await current.router.navigate({ url: '/notes/b', historyMode: 'none', cause: 'traverse' });
    // 旧displayed pathのunidentified fragmentを実address observerへ通す。
    history.replaceState(null, '', '/notes/a#native');
    const before = readContentContext();
    const nativeAdopted = vi.fn();
    document.addEventListener('reading-position:native-address', nativeAdopted);
    try {
      window.dispatchEvent(new HashChangeEvent('hashchange'));
      expect(readContentContext()).toBe(before);
      expect(readContentContext()).toMatchObject({
        mutation: true,
        recoveryRequired: true,
        displayedBinding: { url: '/notes/a' },
      });
      expect(nativeAdopted).not.toHaveBeenCalled();
      expect(current.contentCommit).toHaveBeenCalledOnce();
    } finally {
      document.removeEventListener('reading-position:native-address', nativeAdopted);
    }
  });

  it('同一文書のURL通知observer例外後も既存位置jobを一回開始する', async () => {
    const current = await setup({ stateOnly: true });
    writeHistoryEntry({ mode: 'push', owner: 'router', url: '/notes/a#section' });
    current.router.on('ui-url-state-change', () => {
      throw new Error('state-only observer failed');
    });
    const result = await current.router.navigate({
      url: '/notes/a#section',
      historyMode: 'none',
      cause: 'traverse',
    });
    expect(result).toMatchObject({ committed: true, degraded: true, stateOnly: true });
    expect(current.postCommit).toHaveBeenCalledOnce();
    await expect.poll(() => current.content.dataset['readingPositionStatus']).toBe('settled');
    expect(current.contentCommit).not.toHaveBeenCalled();
    expect(current.contentLoad).not.toHaveBeenCalled();
  });

  it('同一文書none受理はepoch/root/shellを進めずfull文書成功通知を出さない', async () => {
    const current = await setup({ stateOnly: true });
    const epoch = readContentContext()?.contentEpoch;
    const shellCommitId = readCurrentShellCommitId();
    writeHistoryEntry({ mode: 'push', owner: 'router', url: '/notes/a#section' });
    const push = vi.spyOn(history, 'pushState');
    const replace = vi.spyOn(history, 'replaceState');
    const result = await requireFixtureValue(router).navigate({
      url: '/notes/a#section',
      historyMode: 'none',
      cause: 'traverse',
    });
    expect(result).toMatchObject({
      committed: true,
      stateOnly: true,
      receipt: {
        stateOnly: true,
        contentEpoch: epoch,
        shellCommitId,
        root: main,
        url: '/notes/a#section',
      },
    });
    expect(current.contentCommit).not.toHaveBeenCalled();
    expect(current.contentLoad).not.toHaveBeenCalled();
    expect(current.postCommit).toHaveBeenCalledOnce();
    expect(push).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
    expect(readContentContext()?.contentEpoch).toBe(epoch);
  });
});

describe('描画前commitの事前同期契約', () => {
  // 実History APIのwriteを独立した検証群の頻度制限へ持ち越さない。
  beforeAll(settleHistoryQuota, 15_000);

  const traverse = (currentRouter: Router): Promise<NavigationResult> => {
    writeHistoryEntry({ mode: 'push', owner: 'router', url: '/notes/b' });
    return currentRouter.navigate({ url: '/notes/b', historyMode: 'none', cause: 'traverse' });
  };

  it.each([false, true])(
    '両preparedの同期宣言を固定receiptとpostcommitへ渡す（DOM前の非同期prepare=%s）',
    async (asynchronousPrepare) => {
      let contentBeforePrepared: string | null = null;
      const firstFrame = deferred();
      let readPostCommitCalls = (): number => 0;
      let postCommitCallsAtFirstFrame = -1;
      const current = await setup({
        synchronousContent: true,
        synchronousShell: true,
        afterSynchronousContentCommit: () => {
          requestAnimationFrame(() => {
            postCommitCallsAtFirstFrame = readPostCommitCalls();
            firstFrame.resolve();
          });
        },
        ...(asynchronousPrepare
          ? {
              prepareContent: (prepared: PreparedContentUpdate) =>
                new Promise<PreparedContentUpdate>((resolve) => {
                  window.setTimeout(() => {
                    contentBeforePrepared = main?.textContent ?? null;
                    resolve(prepared);
                  }, 0);
                }),
            }
          : {}),
      });
      readPostCommitCalls = () => current.postCommit.mock.calls.length;
      Object.defineProperty(document, 'startViewTransition', {
        configurable: true,
        value: undefined,
      });
      const result = await traverse(current.router);
      await firstFrame.promise;
      expect(result).toMatchObject({ committed: true, receipt: { commitTiming: 'synchronous' } });
      const receipt = 'receipt' in result ? result.receipt : undefined;
      expect(Object.isFrozen(receipt)).toBe(true);
      expect(current.postCommit).toHaveBeenCalledOnce();
      expect(postCommitCallsAtFirstFrame).toBe(1);
      expect(current.postCommit.mock.calls[0]?.[0].receipt).toBe(receipt);
      expect(current.contentCommit).toHaveBeenCalledOnce();
      expect(current.contentLoad).toHaveBeenCalledOnce();
      expect(current.start).not.toHaveBeenCalled();
      expect(current.contentRollback).not.toHaveBeenCalled();
      if (asynchronousPrepare) expect(contentBeforePrepared).toContain('本文 A');
      expect(receipt).toMatchObject({
        entryId: readHistoryEntry()?.id,
        url: readAddress(),
        root: current.content,
        contentEpoch: readContentContext()?.contentEpoch,
        shellCommitId: readCurrentShellCommitId(),
      });
    },
  );

  it.each([
    { synchronousContent: false, synchronousShell: false },
    { synchronousContent: true, synchronousShell: false },
    { synchronousContent: false, synchronousShell: true },
  ])('片側でも同期宣言がなければ通常commitに保つ %j', async (options) => {
    const current = await setup(options);
    const result = await traverse(current.router);
    expect(result.committed).toBe(true);
    expect('receipt' in result && result.receipt?.commitTiming).toBeUndefined();
    expect(current.postCommit).toHaveBeenCalledOnce();
    expect(current.contentRollback).not.toHaveBeenCalled();
  });

  it.each(['content', 'shell'] as const)(
    '同期宣言の%sが型外のPromiseを返せば保証だけ取り下げ通常awaitを続ける',
    async (stage) => {
      const wait = deferred();
      const violate = <T extends PreparedContentUpdate>(prepared: T): T => {
        const commit = prepared.commit.bind(prepared);
        // JavaScript利用者の契約違反も、実commitや既存待機を二重に実行せず隔離する。
        Object.defineProperty(prepared, 'commit', {
          value: () => {
            commit();
            return wait.promise;
          },
        });
        return prepared;
      };
      const current = await setup({
        synchronousContent: true,
        synchronousShell: true,
        ...(stage === 'content' ? { prepareContent: violate } : { prepareShell: violate }),
      });
      const pending = traverse(current.router);
      await expect.poll(() => current.contentCommit.mock.calls.length).toBe(1);
      expect(current.postCommit).not.toHaveBeenCalled();
      expect(current.contentLoad).not.toHaveBeenCalled();
      wait.resolve();
      const result = await pending;
      expect(result.committed).toBe(true);
      expect('receipt' in result && result.receipt?.commitTiming).toBeUndefined();
      expect(current.contentCommit).toHaveBeenCalledOnce();
      expect(current.postCommit).toHaveBeenCalledOnce();
      expect(current.contentRollback).not.toHaveBeenCalled();
    },
  );

  it.each([false, true])(
    'DOM変更中の宣言書換えで事前判定を組み直さない（初期同期=%s）',
    async (initiallySynchronous) => {
      let shellPrepared: PreparedShellUpdate | undefined;
      const current = await setup({
        synchronousContent: true,
        synchronousShell: initiallySynchronous,
        prepareShell: (prepared) => {
          shellPrepared = prepared;
          return prepared;
        },
        afterSynchronousContentCommit: () => {
          Object.defineProperty(requireFixtureValue(shellPrepared), 'commitTiming', {
            value: initiallySynchronous ? 'unspecified' : 'synchronous',
          });
        },
      });
      const result = await traverse(current.router);
      expect(result.committed).toBe(true);
      expect('receipt' in result && result.receipt?.commitTiming).toBe(
        initiallySynchronous ? 'synchronous' : undefined,
      );
      expect(current.postCommit).toHaveBeenCalledOnce();
    },
  );

  it('両同期宣言があっても受理前失敗は一回rollbackしreceiptを発行しない', async () => {
    const error = new Error('同期shell commit failure');
    const current = await setup({
      synchronousContent: true,
      synchronousShell: true,
      shellFailure: error,
    });
    const result = await traverse(current.router);
    expect(result).toMatchObject({ committed: false, error });
    expect('receipt' in result ? result.receipt : undefined).toBeUndefined();
    expect(current.contentCommit).toHaveBeenCalledOnce();
    expect(current.contentRollback).toHaveBeenCalledOnce();
    expect(current.shellRollback).toHaveBeenCalledOnce();
    expect(current.contentLoad).not.toHaveBeenCalled();
    expect(current.postCommit).not.toHaveBeenCalled();
    expect(current.content.textContent).toContain('本文 A');
  });

  it('同一文書none受理へfull文書の同期保証を流用しない', async () => {
    const current = await setup({
      synchronousContent: true,
      synchronousShell: true,
      stateOnly: true,
    });
    writeHistoryEntry({ mode: 'replace', owner: 'router', url: '/notes/a#section' });
    const result = await current.router.navigate({
      url: '/notes/a#section',
      historyMode: 'none',
      cause: 'traverse',
    });
    expect(result).toMatchObject({ committed: true, stateOnly: true });
    expect('receipt' in result && result.receipt?.commitTiming).toBeUndefined();
    expect(current.contentCommit).not.toHaveBeenCalled();
    expect(current.postCommit).toHaveBeenCalledOnce();
  });
});
