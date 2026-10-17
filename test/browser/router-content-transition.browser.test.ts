import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  NAVIGATION_ENVELOPE_SCHEMA_VERSION,
  type NavigationEnvelope,
} from '../../shared/navigation/navigation-envelope.js';
import { setContentReadiness } from '../../src/client/hydration/content-readiness.js';
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
  type NavigationResult,
  type RouterRuntimeUrlDependencies,
} from '../../src/router/router.js';
import { STATIC_HEADER_CONTRACT_ACCEPTED_TOC_ABSENT_HTML } from '../fixtures/static-header-contract-cases.js';
import { fixture } from './harness/browser-fixture.js';

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
    contentAdapter: {
      prepare({ html }) {
        if (options.contentPrepareFailure) throw options.contentPrepareFailure;
        const previousHtml = content.innerHTML;
        return {
          async commit() {
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
            await options.afterContentCommit?.();
          },
          rollback() {
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
          },
        };
      },
    },
    shellAdapter: {
      prepare() {
        if (options.shellPrepareFailure) throw options.shellPrepareFailure;
        return {
          commit() {
            if (options.shellFailure) throw options.shellFailure;
          },
          rollback: shellRollback,
        };
      },
    },
  });
  router = currentRouter;
  currentRouter.addDocumentRoute('/notes/b', async () => {
    await options.beforeLoad?.();
    return envelope();
  });
  // 後続intentはpublic navigateから発行し、本文を変更する前に止めて旧transactionを観測する。
  currentRouter.addBeforeNavigateHook((context) => context.normalizedUrl !== '/notes/c');
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
