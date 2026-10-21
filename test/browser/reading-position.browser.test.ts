import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { fixture, fixtureAbortController } from './harness/browser-fixture.js';
import { activateTabs } from '../../src/client/post-hydrate/tabs-enhancer.js';
import { activateLayoutTocController } from '../../src/components/layout/layout-toc-controller.js';
import { layoutTocMobileController } from '../../src/components/layout/layout-toc-mobile-controller.js';
import { layoutTocRuntimeStore } from '../../src/components/layout/layout-toc-runtime-store.js';
import {
  adoptHistoryEntry,
  observeHistoryEntries,
  readAddress,
  readHistoryEntry,
  writeHistoryEntry,
} from '../../src/navigation/history-entry.js';
import {
  adoptContentBinding,
  beginContentMutation,
  beginFeatureNavigation,
  beginNativeNavigation,
  adoptNativeNavigationIntent,
  beginNavigationIntent,
  captureFeatureSource,
  initializeContentContext,
  markContentRecoveryRequired,
  isFeatureSourceCurrent,
  releaseContentContext,
  readContentContext,
  subscribeContentContext,
} from '../../src/navigation/content-navigation-context.js';
import {
  readContentReadiness,
  setContentReadiness,
  waitForContentReadiness,
} from '../../src/client/hydration/content-readiness.js';
import { HydrationScheduler } from '../../src/client/hydration/scheduler.js';
import { HYDRATION_REGISTRY_BY_TAG } from '../../src/client/hydration/registry.js';
import { TabsUrlSyncController } from '../../src/components/ui/tabs/tabs-url-sync-controller.js';
import {
  clearTabsUrlSyncStrategy,
  registerTabsUrlSyncStrategy,
} from '../../src/components/ui/tabs/tabs-url-sync-strategy.js';
import { primaryTabTabsUrlSyncStrategy } from '../../src/components/app/navigation/primary-tab-url-state.js';
import { TocNavigationController } from '../../src/toc/toc-navigation-controller.js';
import { resolveTocScrollMetrics } from '../../src/toc/toc-scroll-contract.js';
import type { TocActiveTracker } from '../../src/toc/toc-active-tracker.js';
import { Router } from '../../src/router/router.js';
import { RouterDocumentHostPostRenderController } from '../../src/components/app/controllers/router-document-host-post-render-controller.js';
import { ReadingPositionController } from '../../src/components/app/controllers/reading-position-controller.js';
import { RouterDocumentHost } from '../../src/components/app/router-document-host.js';
import {
  readCurrentShellCommitId,
  resetShellLifecycleForTest,
} from '../../src/components/app/shell/app-shell-lifecycle.js';
import { STATIC_HEADER_CONTRACT_ACCEPTED_TOC_ABSENT_HTML } from '../fixtures/static-header-contract-cases.js';
import { NAVIGATION_ENVELOPE_SCHEMA_VERSION } from '../../shared/navigation/navigation-envelope.js';
import { ReadingPositionStore } from '../../src/components/app/navigation/reading-position-store.js';
import type { AppShellValidatedDetail } from '../../src/components/app/shell/app-shell-events.js';

const originalUrl = readAddress();
const originalState: unknown = history.state;
let baselineState: unknown;
beforeAll(() => {
  // reader/store/epochは各testで新規生成する。fixture用entryだけは再利用し、
  // cleanupのnull化→次setupのID補記という無関係な二重書込を作らない。
  writeHistoryEntry({ mode: 'replace', owner: 'router', url: originalUrl, state: {} });
  baselineState = history.state;
});
afterAll(async () => {
  history.replaceState(originalState, '', originalUrl);
  // WebKitの履歴quotaはtop-level sessionを共有する後続suiteにも及ぶ。
  // 各caseの独立したentryを維持し、最後の書込からquota期間を空けて返す。
  await new Promise<void>((resolve) => window.setTimeout(resolve, 10_000));
}, 15_000);
let root: HTMLElement | null = null;
let reader: ReadingPositionController | null = null;
let stop: (() => void) | null = null;
let host: RouterDocumentHost | null = null;
afterEach(() => {
  layoutTocMobileController.reset();
  layoutTocRuntimeStore.reset();
  clearTabsUrlSyncStrategy();
  reader?.dispose();
  reader = null;
  host?.remove();
  host = null;
  stop?.();
  stop = null;
  releaseContentContext(root);
  root = null;
  if (
    readAddress() !== originalUrl ||
    JSON.stringify(history.state) !== JSON.stringify(baselineState)
  )
    history.replaceState(baselineState, '', originalUrl);
  vi.restoreAllMocks();
  document.querySelectorAll('[data-reading-test-meta]').forEach((meta) => meta.remove());
  resetShellLifecycleForTest();
});
const frame = (): Promise<void> => new Promise((resolve) => requestAnimationFrame(() => resolve()));
const setup = async (): Promise<number> => {
  root = await fixture(
    '<main style="height:6000px;display:flow-root"><h2 id="reading-heading" style="margin-top:1200px">見出し</h2></main>',
  );
  const epoch = initializeContentContext(root);
  adoptHistoryEntry();
  adoptContentBinding(readAddress());
  setContentReadiness({
    contentEpoch: epoch,
    root,
    shellCommitId: 0,
    status: 'settled',
    started: true,
  });
  return epoch;
};

const setupNavigation = async (): Promise<RouterDocumentHost> => {
  const buildId = 'reading-first-frame';
  const generatedAt = '2026-10-12T00:00:00.000Z';
  const routes = ['/', '/search/', '/notes/reading-a', '/notes/reading-b', '/notes/reading-c'];
  history.replaceState(baselineState, '', '/notes/reading-a');
  for (const [name, content] of [
    ['rouault-build-id', buildId],
    ['rouault-generated-at', generatedAt],
  ]) {
    const meta = document.createElement('meta');
    meta.name = name ?? '';
    meta.content = content ?? '';
    meta.setAttribute('data-reading-test-meta', '');
    document.head.append(meta);
  }
  const shell = await fixture(`<div data-reading-fixture>
    <style>[data-reading-fixture] header svg { width:20px; height:20px; }</style>
    ${STATIC_HEADER_CONTRACT_ACCEPTED_TOC_ABSENT_HTML}
    <div data-app-shell-sidebar-host hidden>
      <aside data-layout-sidebar-root hidden><div data-layout-sidebar-surface></div></aside>
    </div>
    <router-document-host><main id="main-content" style="display:flow-root">
      <article data-reading-page="a" style="height:6000px"><h1>長い本文 A</h1></article>
    </main></router-document-host>
    <a id="reading-link" href="/notes/reading-b" data-link-kind="internal-document"
      data-link-surface="prose" style="position:fixed;top:10px;right:10px">本文 B</a>
  </div>`);
  host = shell.querySelector('router-document-host');
  if (!(host instanceof RouterDocumentHost)) throw new Error('host');
  root = host.getContentRoot();
  if (!root) throw new Error('root');
  const settle = (): void => {
    const epoch = readContentContext()?.contentEpoch;
    if (!root || epoch === undefined) throw new Error('epoch');
    setContentReadiness({
      contentEpoch: epoch,
      root,
      shellCommitId: readCurrentShellCommitId(),
      status: 'settled',
      started: true,
    });
  };
  host.initializeRuntime({
    siteUrlContext: { siteOrigin: location.origin, basePath: '' },
    isInternalDocumentPathname: (path) => routes.includes(path.replace(/\/$/u, '')),
    routeManifestState: {
      status: 'loaded',
      manifest: {
        version: 1,
        buildId,
        buildLabel: buildId,
        generatedAt,
        siteOrigin: location.origin,
        basePath: '',
        routes,
      },
      routeSet: { routes, has: (path) => routes.includes(path) },
    },
  });
  settle();
  await expect.poll(() => root?.dataset['readingPositionStatus']).toBe('settled');
  vi.spyOn(window, 'fetch').mockImplementation(async (input) => {
    const next = String(input).includes('reading-c') ? 'c' : 'b';
    return new Response(
      JSON.stringify({
        schemaVersion: NAVIGATION_ENVELOPE_SCHEMA_VERSION,
        buildId,
        generatedAt,
        document: {
          html: `<article data-reading-page="${next}" style="height:6000px"><h1>長い本文 ${next.toUpperCase()}</h1>${Array.from({ length: 18 }, (_, i) => `<p style="margin-top:260px">本文 ${next.toUpperCase()} の段落 ${i + 1}</p>`).join('')}</article>`,
          title: next,
          description: null,
          renderedKind: 'page',
        },
        shell: {
          headerHtml: STATIC_HEADER_CONTRACT_ACCEPTED_TOC_ABSENT_HTML,
          sidebarProjection: null,
        },
        hydrationPlan: null,
      }),
      { headers: { 'content-type': 'application/json' } },
    );
  });
  return host;
};

describe('通常 full navigation の初回適用と安定化', () => {
  it.each(['readiness', 'font', 'image'] as const)(
    '%s 遅延中も最初の B frame から settled 後 2rAF まで先頭を保つ（H/V1/V2）',
    async (delay) => {
      const currentHost = await setupNavigation();
      const content = currentHost.getContentRoot();
      if (!content) throw new Error('root');
      window.scrollTo({ left: 0, top: 2200, behavior: 'instant' });
      await frame();
      expect(Math.abs(window.scrollY - 2200)).toBeLessThanOrEqual(2);
      expect(window.scrollX).toBe(0);
      const samples: {
        page: string | undefined;
        x: number;
        y: number;
        status: string | undefined;
      }[] = [];
      const apply: { x: number; y: number; readiness: string | undefined; at: number }[] = [];
      const scroll = window.scrollTo.bind(window);
      vi.spyOn(window, 'scrollTo').mockImplementation(
        (options: ScrollToOptions | number, top?: number) => {
          apply.push({
            x: window.scrollX,
            y: window.scrollY,
            at: performance.now(),
            readiness: readContentReadiness(readContentContext()?.contentEpoch ?? -1)?.status,
          });
          if (typeof options === 'number') scroll(options, top ?? 0);
          else scroll(options);
        },
      );
      let tail = -1;
      let raf = 0;
      const sample = (): void => {
        const name =
          content.querySelector<HTMLElement>('[data-reading-page]')?.dataset['readingPage'];
        samples.push({
          page: name,
          x: scrollX,
          y: scrollY,
          status: content.dataset['readingPositionStatus'],
        });
        if (name === 'b' && content.dataset['readingPositionStatus'] === 'settled') tail++;
        if (tail < 2) raf = requestAnimationFrame(sample);
      };
      raf = requestAnimationFrame(sample);
      try {
        document.querySelector<HTMLAnchorElement>('#reading-link')?.click();
        await expect
          .poll(() => samples.filter((value) => value.page === 'b').length)
          .toBeGreaterThanOrEqual(6);
        expect(content.dataset['readingPositionStatus']).toBe('pending');
        const viewport = await fixture(
          '<div style="position:fixed;inset:0;pointer-events:none"></div>',
        );
        await page.screenshot({
          element: viewport,
          path: `__screenshots__/reading-h-${delay}-pending.png`,
        });
        const epoch = readContentContext()?.contentEpoch;
        if (epoch === undefined) throw new Error('epoch');
        let pendingResource = true;
        let image: HTMLImageElement | null = null;
        if (delay === 'font')
          vi.spyOn(document.fonts, 'status', 'get').mockImplementation(() =>
            pendingResource ? 'loading' : 'loaded',
          );
        if (delay === 'image') {
          image = document.createElement('img');
          image.alt = '寸法未確定画像';
          image.style.cssText = 'display:block';
          Object.defineProperty(image, 'complete', { get: () => !pendingResource });
          content.prepend(image);
          // 先頭目標より上の画像だけが既存待機条件。寸法確定時にはflowも変化させる。
          image.style.position = 'relative';
          image.style.top = `${-image.getBoundingClientRect().top}px`;
        }
        setContentReadiness({
          contentEpoch: epoch,
          root: content,
          shellCommitId: readCurrentShellCommitId(),
          status: 'settled',
          started: true,
        });
        if (delay !== 'readiness') {
          for (let i = 0; i < 6; i++) await frame();
          expect(content.dataset['readingPositionStatus']).toBe('pending');
          if (image) image.style.height = '300px';
          pendingResource = false;
        }
        await expect.poll(() => tail).toBe(2);
        const displayed = samples.filter((value) => value.page === 'b');
        console.log('reading-H-evidence', JSON.stringify({ delay, apply, displayed }));
        // 最終先頭だけの試験へ退行しないよう、baselineでも先に最終位置を確認する。
        expect(Math.abs(scrollY)).toBeLessThanOrEqual(2);
        expect.soft(apply[0]?.readiness).toBe('pending');
        expect(displayed[0]?.status).toBe('pending');
        expect(Math.abs(displayed[0]?.x ?? Infinity)).toBeLessThanOrEqual(2);
        expect(Math.abs(displayed[0]?.y ?? Infinity)).toBeLessThanOrEqual(2);
        expect(displayed.every((value) => Math.abs(value.x) <= 2 && Math.abs(value.y) <= 2)).toBe(
          true,
        );
      } finally {
        cancelAnimationFrame(raf);
      }
    },
  );

  it.each(['wheel', 'Tab', 'pointerdown', 'new-intent', 'mutation', 'dispose'] as const)(
    '先行適用後の%sは旧jobの追加scroll/focusを止める（V3）',
    async (action) => {
      const currentHost = await setupNavigation();
      await currentHost.navigate('/notes/reading-b');
      const content = currentHost.getContentRoot();
      const epoch = readContentContext()?.contentEpoch;
      if (!content || epoch === undefined) throw new Error('root/epoch');
      expect(scrollY).toBe(0);
      expect(content.dataset['readingPositionStatus']).toBe('pending');
      const scroll = vi.spyOn(window, 'scrollTo');
      const focus = vi.spyOn(HTMLElement.prototype, 'focus');
      if (action === 'Tab') window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));
      else if (action === 'wheel') window.dispatchEvent(new WheelEvent('wheel'));
      else if (action === 'pointerdown') window.dispatchEvent(new PointerEvent('pointerdown'));
      else if (action === 'new-intent') beginNavigationIntent('navigation', '/notes/reading-c');
      else if (action === 'mutation') beginContentMutation(content);
      else currentHost.remove();
      // 失効後の本人位置に対して先頭維持を要求しない。
      window.scrollTo({ top: 700, behavior: 'instant' });
      scroll.mockClear();
      setContentReadiness({
        contentEpoch: epoch,
        root: content,
        shellCommitId: readCurrentShellCommitId(),
        status: 'settled',
        started: true,
      });
      for (let i = 0; i < 4; i++) await frame();
      expect(scroll).not.toHaveBeenCalled();
      expect(focus).not.toHaveBeenCalled();
    },
  );

  it.each(['focus', 'history-after'] as const)(
    '%s同期再入で失効したjobは先行適用しない（V3/V4）',
    async (phase) => {
      const currentHost = await setupNavigation();
      const content = currentHost.getContentRoot();
      if (!content) throw new Error('root');
      window.scrollTo({ top: 2200, behavior: 'instant' });
      await frame();
      const reenter = (): void => {
        beginNavigationIntent('navigation', '/notes/reading-c');
      };
      if (phase === 'focus') content.addEventListener('focus', reenter, { once: true });
      else stop = observeHistoryEntries(() => undefined, reenter);
      const scroll = vi.spyOn(window, 'scrollTo');
      const result = await currentHost.navigate('/notes/reading-b');
      expect(result.committed).toBe(true);
      expect(readAddress()).toBe('/notes/reading-b');
      for (let i = 0; i < 3; i++) await frame();
      expect(scroll).not.toHaveBeenCalled();
    },
  );

  it('連続 A→B→C は B の安定化を破棄し C の job だけを完了する（V3）', async () => {
    const currentHost = await setupNavigation();
    await currentHost.navigate('/notes/reading-b');
    const content = currentHost.getContentRoot();
    const oldEpoch = readContentContext()?.contentEpoch;
    if (!content || oldEpoch === undefined) throw new Error('root/epoch');
    const scroll = vi.spyOn(window, 'scrollTo');
    const focus = vi.spyOn(HTMLElement.prototype, 'focus');
    await currentHost.navigate('/notes/reading-c');
    const epoch = readContentContext()?.contentEpoch;
    if (epoch === undefined) throw new Error('epoch');
    expect(epoch).toBeGreaterThan(oldEpoch);
    for (let i = 0; i < 3; i++) await frame();
    expect(content.dataset['readingPositionStatus']).toBe('pending');
    expect(content.querySelector('[data-reading-page="c"]')).not.toBeNull();
    setContentReadiness({
      contentEpoch: epoch,
      root: content,
      shellCommitId: readCurrentShellCommitId(),
      status: 'settled',
      started: true,
    });
    await expect.poll(() => content.dataset['readingPositionStatus']).toBe('settled');
    expect(scroll).toHaveBeenCalledOnce();
    expect(focus).toHaveBeenCalledOnce();
    expect(scrollY).toBe(0);
  });

  it('履歴失敗による本文rollbackは先行scroll/focusを実行しない（V4）', async () => {
    const currentHost = await setupNavigation();
    const before = readHistoryEntry();
    const epoch = readContentContext()?.contentEpoch;
    window.scrollTo({ top: 2200, behavior: 'instant' });
    await frame();
    vi.spyOn(history, 'pushState').mockImplementation(() => {
      throw new DOMException('fixture', 'SecurityError');
    });
    const scroll = vi.spyOn(window, 'scrollTo');
    const focus = vi.spyOn(HTMLElement.prototype, 'focus');
    const result = await currentHost.navigate('/notes/reading-b');
    expect(result.committed).toBe(false);
    expect(readAddress()).toBe('/notes/reading-a');
    expect(readHistoryEntry()).toEqual(before);
    expect(currentHost.querySelector('[data-reading-page="a"]')).not.toBeNull();
    expect(readContentContext()?.contentEpoch).toBeGreaterThan(epoch ?? Infinity);
    for (let i = 0; i < 3; i++) await frame();
    expect(scroll).not.toHaveBeenCalled();
    expect(focus).not.toHaveBeenCalled();
  });

  it.each(['push', 'replace'] as const)(
    '%sの先行適用中は保存値を書き換えずtraverse候補を保持する（V4）',
    async (mode) => {
      await setup();
      if (!root) throw new Error('root');
      const content = root;
      reader = new ReadingPositionController((error) => {
        throw error;
      });
      reader.start(content);
      await expect.poll(() => content.dataset['readingPositionStatus']).toBe('settled');
      window.scrollTo({ top: 2200, behavior: 'instant' });
      await frame();
      const oldState: unknown = history.state;
      const oldUrl = readAddress();
      const intent = beginNavigationIntent('navigation', '/notes/reading-b');
      const epoch = beginContentMutation(content);
      writeHistoryEntry({ mode, owner: 'router', url: '/notes/reading-b' });
      adoptContentBinding(readAddress());
      setContentReadiness({
        contentEpoch: epoch,
        root: content,
        shellCommitId: 0,
        status: 'pending',
        started: true,
      });
      const write = vi.spyOn(ReadingPositionStore.prototype, 'write');
      reader.schedule({
        intent,
        root: content,
        url: readAddress(),
        stateOnly: false,
        error: false,
        shellCommitId: 0,
      });
      expect(scrollY).toBe(0);
      await frame();
      expect(write).not.toHaveBeenCalled();
      // replaceでもexact URLの異なる旧成功recordを先頭sampleで消さない。
      history.replaceState(oldState, '', oldUrl);
      const traverse = beginNavigationIntent('traverse', oldUrl);
      adoptContentBinding(oldUrl);
      reader.schedule({
        intent: traverse,
        root: content,
        url: oldUrl,
        stateOnly: false,
        error: false,
        shellCommitId: 0,
      });
      expect(scrollY).toBe(0);
      setContentReadiness({
        contentEpoch: epoch,
        root: content,
        shellCommitId: 0,
        status: 'settled',
        started: true,
      });
      await expect.poll(() => content.dataset['readingPositionStatus']).toBe('settled');
      expect(Math.abs(scrollY - 2200)).toBeLessThanOrEqual(2);
    },
  );

  it.each([
    'initial',
    'native-navigation',
    'traverse',
    'state-only',
    'error',
    'missing-hash',
    'opaque',
    'unadopted',
  ] as const)('%sは準備前に先頭を適用しない（V5）', async (kind) => {
    await setup();
    if (!root) throw new Error('root');
    const content = root;
    reader = new ReadingPositionController((error) => {
      throw error;
    });
    reader.start(content);
    await expect.poll(() => content.dataset['readingPositionStatus']).toBe('settled');
    window.scrollTo({ top: 2200, behavior: 'instant' });
    await frame();
    const url = originalUrl + (kind === 'missing-hash' ? '#does-not-exist' : '');
    const cause =
      kind === 'initial' || kind === 'native-navigation' || kind === 'traverse'
        ? kind
        : 'navigation';
    const intent = beginNavigationIntent(cause, url);
    const epoch = beginContentMutation(content);
    writeHistoryEntry({
      mode: 'replace',
      owner: 'router',
      url,
      ...(kind === 'opaque' ? { state: 7 } : {}),
    });
    if (kind !== 'unadopted') adoptContentBinding(url);
    setContentReadiness({
      contentEpoch: epoch,
      root: content,
      shellCommitId: 0,
      status: 'pending',
      started: true,
    });
    const scroll = vi.spyOn(window, 'scrollTo');
    reader.schedule({
      intent,
      root: content,
      url,
      stateOnly: kind === 'state-only',
      error: kind === 'error',
      shellCommitId: 0,
    });
    await frame();
    await frame();
    expect(scroll).not.toHaveBeenCalled();
    expect(Math.abs(scrollY - 2200)).toBeLessThanOrEqual(2);
  });
});

describe('検証済み履歴経路の表示状態', () => {
  const historyQuotaBoundary = (): Promise<void> =>
    new Promise((resolve) => window.setTimeout(resolve, 10_000));

  // この統合試験の実履歴書込みを、前後の既存52ケースのquota期間から分離する。
  // 履歴APIをmockせず、既存geometry suiteと同じ実時間の境界待機を使う。
  beforeAll(historyQuotaBoundary, 15_000);
  afterAll(historyQuotaBoundary, 15_000);

  it.each(['before-reader', 'after-reader'] as const)(
    '%sのenhancer後始末でrangeが縮んでも離脱前の114pxを保存する',
    async (order) => {
      const epoch = await setup();
      if (!root) throw new Error('root');
      const content = root;
      content.id = 'main-content';
      const oldUrl = readAddress();
      const oldEntryId = readHistoryEntry()?.id;
      if (!oldEntryId) throw new Error('managed source entry missing');
      const writes = vi.spyOn(ReadingPositionStore.prototype, 'write');
      const phases: {
        reason: string;
        epoch: number | undefined;
        mutation: boolean | undefined;
        restoring: unknown;
        y: number;
        writes: number;
      }[] = [];
      // clientの先登録順と逆順の両方で、実際のDOM縮小によるUA clampから旧座標を保護する。
      const subscribeCleanup = (): (() => void) =>
        subscribeContentContext((reason) => {
          if (reason !== 'before-mutation' && reason !== 'mutation') return;
          const context = readContentContext();
          phases.push({
            reason,
            epoch: context?.contentEpoch,
            mutation: context?.mutation,
            restoring: Reflect.get(reader ?? {}, 'restoring'),
            y: scrollY,
            writes: writes.mock.calls.length,
          });
          if (reason === 'mutation') {
            content.replaceChildren(document.createTextNode('後始末後の短い本文'));
            content.style.height = 'calc(100vh + 20px)';
            content.getBoundingClientRect();
          }
        });
      if (order === 'before-reader') stop = subscribeCleanup();
      const errors = vi.fn();
      reader = new ReadingPositionController(errors);
      reader.start(content);
      if (order === 'after-reader') stop = subscribeCleanup();
      await expect.poll(() => content.dataset['readingPositionStatus']).toBe('settled');
      window.scrollTo({ top: 114, behavior: 'instant' });
      await frame();
      window.dispatchEvent(new Event('scroll'));
      const store: unknown = writes.mock.contexts[0];
      if (!(store instanceof ReadingPositionStore)) throw new Error('reader store missing');
      expect(store.read(oldEntryId, oldUrl)?.y).toBe(114);
      beginNavigationIntent('navigation', '/notes/history-after-cleanup');
      writes.mockClear();
      const scroll = vi.spyOn(window, 'scrollTo');
      const focus = vi.spyOn(HTMLElement.prototype, 'focus');
      const nextEpoch = beginContentMutation(content);
      expect(phases).toEqual([
        {
          reason: 'before-mutation',
          epoch,
          mutation: false,
          restoring: order === 'after-reader',
          y: 114,
          writes: expect.any(Number),
        },
        {
          reason: 'mutation',
          epoch: nextEpoch,
          mutation: true,
          restoring: true,
          y: 114,
          writes: expect.any(Number),
        },
      ]);
      if (order === 'before-reader') expect(phases[0]?.writes).toBe(0);
      else expect(phases[0]?.writes).toBeGreaterThan(0);
      expect(nextEpoch).toBeGreaterThan(epoch);
      expect(phases[1]?.writes).toBeGreaterThan(0);
      expect(scrollY).toBeLessThan(114);
      expect(readContentContext()).toMatchObject({
        contentEpoch: nextEpoch,
        mutation: true,
        displayedBinding: { entryId: oldEntryId, url: oldUrl },
      });
      const nextEntryId = 'cleanup-next-entry';
      const nextUrl = '/notes/history-after-cleanup';
      history.replaceState({ __rouaultHistoryEntry: { version: 1, id: nextEntryId } }, '', nextUrl);
      window.dispatchEvent(new Event('scroll'));
      await frame();
      expect(writes.mock.calls.length).toBe(phases[1]?.writes);
      expect(
        writes.mock.calls.every(
          ([entryId, position]) =>
            entryId === oldEntryId && position.url === oldUrl && position.y === 114,
        ),
      ).toBe(true);
      expect(store.read(oldEntryId, oldUrl)?.y).toBe(114);
      expect(store.read(nextEntryId, nextUrl)).toBeNull();
      expect(scroll).not.toHaveBeenCalled();
      expect(focus).not.toHaveBeenCalled();
      expect(errors).not.toHaveBeenCalled();
    },
  );

  it.each([
    ['manual', 'verified', 'different-url'],
    ['manual', 'unknown', 'different-url'],
    ['auto', 'verified', 'different-url'],
    ['manual', 'verified', 'same-url'],
    ['manual', 'unknown', 'same-url'],
    ['manual', 'wrong-binding', 'different-url'],
    ['manual', 'mutation', 'different-url'],
    ['manual', 'recovery', 'different-url'],
    ['manual', 'detached', 'different-url'],
    ['manual', 'replaced', 'different-url'],
  ] as const)(
    'scroll通知前のaddress先行でも%s/%s/%sの旧entry座標を混在させない',
    async (mode, proof, addressKind) => {
      const epoch = await setup();
      if (!root) throw new Error('root');
      const content = root;
      content.id = 'main-content';
      const writes = vi.spyOn(ReadingPositionStore.prototype, 'write');
      const errors = vi.fn();
      reader = new ReadingPositionController(errors);
      reader.start(content);
      await expect.poll(() => content.dataset['readingPositionStatus']).toBe('settled');
      const oldUrl = readAddress();
      const oldEntryId = readHistoryEntry()?.id;
      if (!oldEntryId) throw new Error('managed old entry missing');
      if (proof === 'verified') {
        const routes = [location.pathname];
        document.dispatchEvent(
          new CustomEvent<AppShellValidatedDetail>('app-shell:validated', {
            detail: {
              header: document.createElement('header'),
              navigationUrl: oldUrl,
              shellCommitId: 0,
              shell: {
                headerHtml: STATIC_HEADER_CONTRACT_ACCEPTED_TOC_ABSENT_HTML,
                sidebarProjection: null,
              },
              linkValidationContext: {
                siteUrlContext: { siteOrigin: location.origin, basePath: '' },
                currentAbsoluteUrl: location.href,
                normalizedNavigationUrl: oldUrl,
                routeManifestState: {
                  status: 'loaded',
                  manifest: {
                    version: 1,
                    buildId: 'fast-scroll',
                    buildLabel: 'fast-scroll',
                    generatedAt: '2026-10-18T00:00:00.000Z',
                    siteOrigin: location.origin,
                    basePath: '',
                    routes,
                  },
                  routeSet: { routes, has: (pathname) => routes.includes(pathname) },
                },
              },
            },
          }),
        );
        expect(reader).toMatchObject({ verifiedLayout: expect.any(String) });
      } else expect(reader).toMatchObject({ verifiedLayout: null });
      window.scrollTo({ top: 228, behavior: 'instant' });
      await frame();
      window.dispatchEvent(new Event('scroll'));
      const store: unknown = writes.mock.contexts[0];
      if (!(store instanceof ReadingPositionStore)) throw new Error('reader store missing');
      expect(store.read(oldEntryId, oldUrl)?.y).toBe(228);

      if (proof === 'wrong-binding') adoptContentBinding('/wrong-rendered', 'wrong-entry');
      else if (proof === 'mutation') beginContentMutation(content);
      else if (proof === 'recovery') markContentRecoveryRequired(content, epoch);
      else if (proof === 'detached') {
        await fixture('<div style="height:6000px">範囲を維持する別surface</div>');
        content.remove();
      } else if (proof === 'replaced') {
        const replacement = await fixture(
          '<main id="main-content" style="height:6000px">別世代の本文</main>',
        );
        const container = content.parentElement;
        const replacementContainer = replacement.parentElement;
        if (!container || !replacementContainer) throw new Error('replacement container missing');
        container.before(replacementContainer);
        expect(document.getElementById('main-content')).toBe(replacement);
        expect(content.isConnected).toBe(true);
      }
      history.scrollRestoration = mode;
      writes.mockClear();
      let scrollEvents = 0;
      const observeScroll = (): void => {
        scrollEvents++;
      };
      window.addEventListener('scroll', observeScroll);
      const nextEntryId = 'fast-scroll-next-entry';
      const nextUrl = addressKind === 'same-url' ? oldUrl : '/notes/history-fast-destination';
      try {
        // awaitや共通writerのbefore observerを挟まず、browser addressが先行する時点を再現する。
        window.scrollTo({ top: 567, behavior: 'instant' });
        history.replaceState(
          { __rouaultHistoryEntry: { version: 1, id: nextEntryId } },
          '',
          nextUrl,
        );
        beginNavigationIntent('traverse', readAddress());
        expect(scrollEvents).toBe(0);
        expect(Math.abs(scrollY - 567)).toBeLessThanOrEqual(2);
        const actualSourceOwned = proof === 'verified' || proof === 'unknown';
        const expected = mode === 'manual' && actualSourceOwned ? 567 : 228;
        expect(store.read(oldEntryId, oldUrl)).toEqual({
          version: 1,
          url: oldUrl,
          x: 0,
          y: expected,
        });
        expect(store.read(nextEntryId, readAddress())).toBeNull();
        expect(
          writes.mock.calls.every(
            ([entryId, position]) =>
              entryId === oldEntryId && position.url === oldUrl && position.y === expected,
          ),
        ).toBe(true);
        if (proof === 'recovery') expect(writes).not.toHaveBeenCalled();
        expect(errors).not.toHaveBeenCalled();
      } finally {
        window.removeEventListener('scroll', observeScroll);
      }
    },
  );

  it.each(['visible', 'verified-only', 'hidden', 'missing-receipt', 'wrong-receipt'] as const)(
    '%s完了時の先行復元を区別し、不適格でも候補を保全して通常settledへ渡す',
    async (condition) => {
      const visibility = condition === 'hidden' ? 'hidden' : 'visible';
      const early = condition === 'visible' || condition === 'verified-only';
      const target = '/notes/testing/toc-readable-long-heading';
      const previous = '/notes/testing/reader-basic';
      history.replaceState(baselineState, '', target);
      root =
        await fixture(`<main id="main-content" style="display:flow-root;width:720px;font-family:serif">
        <section class="note-shell" data-hydration-scope="note-shell" style="--note-toc-track:240px;display:grid;grid-template-columns:minmax(0,1fr) var(--note-toc-track);gap:32px;align-items:start">
          <article data-hydration-scope="note-content" style="grid-column:1;min-width:0">
            <header data-article-header><h1>履歴復元の本文</h1></header>
            <div class="prose" id="note-content-testing-toc-readable-long-heading">
              <p>静的な日本語本文を保存位置へ戻します。</p>
              ${Array.from({ length: 12 }, (_, index) => `<h2 id="history-visibility-heading-${index}" style="margin-top:110px"><span>第${index + 1}章の見出し</span></h2><p>本文とアンカーの実座標を確認します。</p>`).join('')}
            </div>
          </article>
          <div data-layout-toc-root style="position:sticky;top:64px;align-self:start;height:calc(100vh - 64px);max-height:calc(100vh - 64px);grid-column:2;min-width:0;overflow:hidden">
            ${Array.from({ length: 12 }, (_, index) => `<a href="#history-visibility-heading-${index}" style="font-weight:400;display:block"><span>第${index + 1}章の目次</span></a>`).join('')}
          </div>
        </section>
      </main>`);
      const content = root;
      initializeContentContext(content);
      adoptContentBinding(target);
      await document.fonts.ready;
      const ready = (epoch: number, status: 'pending' | 'settled'): void => {
        setContentReadiness({
          contentEpoch: epoch,
          root: content,
          shellCommitId: 0,
          status,
          started: true,
        });
      };
      const validated = (url: string): void => {
        const routes = [target, previous];
        document.dispatchEvent(
          new CustomEvent<AppShellValidatedDetail>('app-shell:validated', {
            detail: {
              header: document.createElement('header'),
              shellCommitId: 0,
              navigationUrl: url,
              shell: {
                headerHtml: STATIC_HEADER_CONTRACT_ACCEPTED_TOC_ABSENT_HTML,
                sidebarProjection: null,
              },
              linkValidationContext: {
                siteUrlContext: { siteOrigin: location.origin, basePath: '' },
                currentAbsoluteUrl: `${location.origin}${url}`,
                normalizedNavigationUrl: url,
                routeManifestState: {
                  status: 'loaded',
                  manifest: {
                    version: 1,
                    buildId: 'history-visible',
                    buildLabel: 'history-visible',
                    generatedAt: '2026-10-17T00:00:00.000Z',
                    siteOrigin: location.origin,
                    basePath: '',
                    routes,
                  },
                  routeSet: { routes, has: (pathname) => routes.includes(pathname) },
                },
              },
            },
          }),
        );
      };
      ready(readContentContext()?.contentEpoch ?? -1, 'settled');
      const errors = vi.fn();
      const notifications = vi.fn();
      reader = new ReadingPositionController(errors, notifications);
      reader.start(content);
      await expect.poll(() => content.dataset['readingPositionStatus']).toBe('settled');
      validated(target);
      window.scrollTo({ left: 0, top: 650, behavior: 'instant' });
      await frame();
      window.dispatchEvent(new Event('scroll'));
      const savedState: unknown = history.state;
      const savedEntryId = readHistoryEntry()?.id;
      expect(savedEntryId).toBeTruthy();
      const savedHtml = content.innerHTML;

      const leaving = beginNavigationIntent('navigation', previous);
      const sourceEpoch = beginContentMutation(content);
      writeHistoryEntry({ mode: 'push', owner: 'router', url: previous });
      content.innerHTML = '<article style="height:3000px"><h1>移動先の本文</h1></article>';
      adoptContentBinding(previous);
      validated(previous);
      ready(sourceEpoch, 'settled');
      reader.schedule({
        intent: leaving,
        root: content,
        url: previous,
        stateOnly: false,
        error: false,
        shellCommitId: 0,
      });
      await expect.poll(() => content.dataset['readingPositionStatus']).toBe('settled');

      history.replaceState(savedState, '', target);
      const popped = new PopStateEvent('popstate', { state: history.state });
      Object.defineProperty(popped, 'hasUAVisualTransition', { value: false });
      window.dispatchEvent(popped);
      const intent = beginNavigationIntent('traverse', target);
      const restoredEpoch = beginContentMutation(content);
      content.innerHTML = savedHtml;
      adoptContentBinding(target);
      validated(target);
      ready(restoredEpoch, 'pending');
      window.scrollTo({ left: 0, top: 200, behavior: 'instant' });
      await frame();
      expect(Math.abs(scrollY - 200)).toBeLessThanOrEqual(2);
      let state: DocumentVisibilityState = visibility;
      vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => state);
      const scroll = vi.spyOn(window, 'scrollTo');
      const animate = vi.spyOn(content, 'animate');
      const writes = vi.spyOn(ReadingPositionStore.prototype, 'write');
      const fontCheck = vi.spyOn(document.fonts, 'check');
      const receipt = Object.freeze({
        commitId: 1,
        intentId: intent.intentId,
        entryId: condition === 'wrong-receipt' ? 'different-receipt-entry' : (savedEntryId ?? null),
        url: target,
        contentEpoch: restoredEpoch,
        root: content,
        shellCommitId: 0,
        stateOnly: false,
        commitTiming: 'synchronous',
      });
      notifications.mockClear();
      reader.schedule({
        intent,
        root: content,
        url: target,
        previousUrl: previous,
        stateOnly: false,
        error: false,
        shellCommitId: 0,
        prepaintGeometryReady: condition !== 'verified-only',
        ...(condition === 'missing-receipt' ? {} : { receipt }),
      });

      expect(content.dataset['readingPositionPrepaint']).toBe(condition === 'visible' ? 'applied' : 'unavailable');
      expect(notifications).toHaveBeenCalledTimes(early ? 1 : 0);
      expect(scroll).toHaveBeenCalledTimes(early ? 1 : 0);
      expect(animate).toHaveBeenCalledTimes(early ? 1 : 0);
      expect(Math.abs(scrollY - (early ? 650 : 200))).toBeLessThanOrEqual(2);
      expect(reader).toMatchObject({ candidate: { url: target, x: 0, y: 650 }, restoring: true });
      await frame();
      await frame();
      expect(content.dataset['readingPositionStatus']).toBe('pending');
      expect(writes).not.toHaveBeenCalled();
      expect(readHistoryEntry()?.id).toBe(savedEntryId);
      expect(intent.signal.aborted).toBe(false);
      if (!early) {
        expect(scroll).not.toHaveBeenCalled();
        expect(animate).not.toHaveBeenCalled();
        expect(
          content.getAnimations().filter((effect) => effect.id === 'rouault-history-content'),
        ).toHaveLength(0);
      }

      // hidden中は新しい同期経路だけを検証する。既存rAF復元はvisibleへ戻してから解放する。
      state = 'visible';
      document.dispatchEvent(new Event('visibilitychange'));
      ready(restoredEpoch, 'settled');
      await expect.poll(() => content.dataset['readingPositionStatus']).toBe('settled');
      expect(reader).toMatchObject({ candidate: null, restoring: false });
      expect(Math.abs(scrollY - 650)).toBeLessThanOrEqual(2);
      expect(
        writes.mock.calls.some(
          ([entryId, position]) =>
            entryId === savedEntryId && position.url === target && Math.abs(position.y - 650) <= 2,
        ),
      ).toBe(true);
      expect(errors).not.toHaveBeenCalled();
      // 幾何照合は各要素のtextを検査する。準備処理だけが同fontの異なるtextを連結する。
      // 検証済み復元ではこの重複を省き、証明のない復元では従来の準備を保つ。
      expect(
        fontCheck.mock.calls.some(
          ([, text]) =>
            text?.includes('静的な日本語本文を保存位置へ戻します。') &&
            text.includes('本文とアンカーの実座標を確認します。'),
        ),
      ).toBe(!early);
    },
  );

  it('recovery中のpersisted pageshow/native-address/terminalは旧contextを採用せず候補を保全する', async () => {
    await setup();
    if (!root) throw new Error('root');
    const content = root;
    const errors = vi.fn();
    reader = new ReadingPositionController(errors);
    reader.start(content);
    await expect.poll(() => content.dataset['readingPositionStatus']).toBe('settled');
    window.scrollTo({ top: 650, behavior: 'instant' });
    await frame();
    window.dispatchEvent(new Event('scroll'));
    const intent = beginNavigationIntent('traverse', readAddress());
    expect(reader).toMatchObject({ candidate: { url: readAddress(), y: 650 }, restoring: true });
    const epoch = beginContentMutation(content);
    markContentRecoveryRequired(content, epoch);
    const failedContext = readContentContext();
    expect(failedContext).toMatchObject({
      root: content,
      contentEpoch: epoch,
      mutation: true,
      recoveryRequired: true,
    });
    const displayedBinding = failedContext?.displayedBinding;
    const writes = vi.spyOn(ReadingPositionStore.prototype, 'write');
    const scroll = vi.spyOn(window, 'scrollTo');
    const animate = vi.spyOn(content, 'animate');
    const entryId = readHistoryEntry()?.id;
    for (const action of [
      () => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })),
      () => document.dispatchEvent(new Event('reading-position:native-address')),
      () => reader?.terminal(false, intent.intentId),
      () => reader?.terminal(true, intent.intentId),
    ]) {
      action();
      window.dispatchEvent(new Event('scroll'));
      await frame();
      expect(readContentContext()).toBe(failedContext);
      expect(readContentContext()?.displayedBinding).toBe(displayedBinding);
      expect(readContentContext()?.mutation).toBe(true);
      expect(readHistoryEntry()?.id).toBe(entryId);
      expect(reader).toMatchObject({ candidate: { url: readAddress(), y: 650 }, restoring: true });
      expect(writes).not.toHaveBeenCalled();
      expect(scroll).not.toHaveBeenCalled();
      expect(animate).not.toHaveBeenCalled();
    }
    expect(Math.abs(scrollY - 650)).toBeLessThanOrEqual(2);
    expect(errors).not.toHaveBeenCalled();
  });
});

describe('履歴entryと本文生存期間', () => {
  it('pushはfresh ID、replaceはcurrent IDでforeign state採用元を保持する', async () => {
    await setup();
    writeHistoryEntry({
      mode: 'replace',
      url: originalUrl,
      owner: 'router',
      state: { sentinel: 'current' },
    });
    const first = readHistoryEntry()?.id;
    writeHistoryEntry({ mode: 'push', url: originalUrl, owner: 'feature', state: history.state });
    const second = readHistoryEntry()?.id;
    expect(second).not.toBe(first);
    expect(history.state.sentinel).toBe('current');
    writeHistoryEntry({
      mode: 'replace',
      url: originalUrl,
      owner: 'router',
      state: { sentinel: 'explicit', __rouaultHistoryEntry: { version: 1, id: 'foreign-id' } },
    });
    expect(readHistoryEntry()?.id).toBe(second);
    expect(history.state.sentinel).toBe('explicit');
    writeHistoryEntry({ mode: 'push', url: originalUrl, owner: 'router' });
    expect(history.state.sentinel).toBeUndefined();
  });
  it('opaque/未知schemaは保全し、observer例外は成功History APIを失敗へ戻さない', async () => {
    await setup();
    stop = observeHistoryEntries(
      () => {
        throw new Error('before');
      },
      () => {
        throw new Error('after');
      },
    );
    for (const state of [7, ['opaque'], { __rouaultHistoryEntry: { version: 99 } }]) {
      expect(() =>
        writeHistoryEntry({ mode: 'replace', url: originalUrl, owner: 'feature', state }),
      ).not.toThrow();
      expect(history.state).toEqual(state);
      expect(readHistoryEntry()).toBeNull();
    }
    const before = history.state;
    expect(() =>
      writeHistoryEntry({ mode: 'push', url: 'https://invalid.example/', owner: 'router' }),
    ).toThrow();
    expect(history.state).toEqual(before);
  });
  it('same-root rollbackも新epochで、旧controllerと旧readyを採用しない', async () => {
    const epoch = await setup();
    if (!root) throw new Error('root');
    const source = captureFeatureSource(root);
    const pending = new AbortController();
    setContentReadiness({
      contentEpoch: epoch,
      root,
      shellCommitId: 5,
      status: 'pending',
      started: true,
    });
    const waiting = waitForContentReadiness(epoch, pending.signal);
    const replacementEpoch = beginContentMutation(root);
    root.innerHTML = '<h2>rollback</h2>';
    adoptContentBinding(readAddress());
    setContentReadiness({
      contentEpoch: replacementEpoch,
      root,
      shellCommitId: 5,
      status: 'pending',
      started: false,
    });
    expect(await waiting).toBe('invalidated');
    expect(replacementEpoch).toBeGreaterThan(epoch);
    expect(readContentReadiness(epoch)).toBeNull();
    expect(isFeatureSourceCurrent(source)).toBe(false);
    expect(beginFeatureNavigation(source)).toBeNull();
  });
  it('URL no-opの本人feature操作も旧requestを失効し、自動同期は取消さない', async () => {
    await setup();
    if (!root) throw new Error('root');
    const source = captureFeatureSource(root);
    const old = beginNavigationIntent('navigation', '/later');
    expect(beginFeatureNavigation(source, 'normalization')).not.toBeNull();
    expect(old.signal.aborted).toBe(false);
    expect(beginFeatureNavigation(source)).not.toBeNull();
    expect(old.signal.aborted).toBe(true);
  });
  it('TOC wrapper内側import awaitの後で失効を確認してactivationしない（B3-R）', async () => {
    await setup();
    if (!root) throw new Error('root');
    const toc = document.createElement('layout-toc-controller');
    root.append(toc);
    const entry = HYDRATION_REGISTRY_BY_TAG.get('layout-toc-controller');
    if (!entry?.activate) throw new Error('TOC activation');
    const session = new AbortController();
    let current = true;
    const result = entry.activate({
      element: toc,
      root,
      signal: session.signal,
      isCurrent: () => current,
    });
    current = false;
    session.abort();
    expect(await result).toEqual({ status: 'aborted' });
    expect(toc.querySelector('[data-layout-toc-nav]')).toBeNull();
  });
  it.each(['load', 'new-intent'] as const)(
    '管理ID付きreloadはnative採用までauto、新intentならownerを移す（%s）',
    async (completion) => {
      await setup();
      if (!root) throw new Error('root');
      const navigation = performance.getEntriesByType('navigation')[0];
      if (!(navigation instanceof PerformanceNavigationTiming))
        throw new Error('navigation timing');
      const nativeNavigation = new Proxy(navigation, {
        get: (target, key) => (key === 'type' ? 'reload' : Reflect.get(target, key, target)),
      });
      const readEntries = performance.getEntriesByType.bind(performance);
      vi.spyOn(performance, 'getEntriesByType').mockImplementation((name) =>
        name === 'navigation' ? [nativeNavigation] : readEntries(name),
      );
      vi.spyOn(document, 'readyState', 'get').mockReturnValue('loading');
      history.scrollRestoration = 'manual';
      reader = new ReadingPositionController((error) => {
        throw error;
      });
      reader.start(root);
      expect(readHistoryEntry()).not.toBeNull();
      expect(history.scrollRestoration).toBe('auto');
      await frame();
      expect(history.scrollRestoration).toBe('auto');
      if (completion === 'new-intent') {
        beginNavigationIntent('navigation', readAddress());
        expect(history.scrollRestoration).toBe('manual');
      }
      window.dispatchEvent(new Event('load'));
      await frame();
      expect(history.scrollRestoration).toBe('manual');
    },
  );
  it('artifact未commit待機中の本人操作も後続topとfocusを取り消す（A6）', async () => {
    await setup();
    if (!root) throw new Error('root');
    reader = new ReadingPositionController((error) => {
      throw error;
    });
    reader.start(root);
    await expect.poll(() => root?.dataset['readingPositionStatus']).toBe('settled');
    const intent = beginNavigationIntent('navigation', readAddress());
    window.dispatchEvent(new WheelEvent('wheel', { deltaY: 100 }));
    window.scrollTo({ top: 650, behavior: 'instant' });
    expect(reader.shouldFocus(intent)).toBe(false);
    reader.schedule({
      intent,
      root,
      url: readAddress(),
      stateOnly: false,
      error: false,
      shellCommitId: 0,
    });
    await frame();
    await frame();
    expect(root.dataset['readingPositionStatus']).toBe('cancelled');
    expect(Math.abs(window.scrollY - 650)).toBeLessThanOrEqual(2);
  });
  it('復元待機中の本人操作後にreadyを解放してもtop/hashへ戻さない', async () => {
    const epoch = await setup();
    if (!root) throw new Error('root');
    setContentReadiness({
      contentEpoch: epoch,
      root,
      shellCommitId: 0,
      status: 'pending',
      started: true,
    });
    reader = new ReadingPositionController((error) => {
      throw error;
    });
    reader.start(root);
    window.scrollTo({ top: 800, behavior: 'instant' });
    const intent = beginNavigationIntent('traverse', readAddress());
    reader.schedule({
      intent,
      root,
      url: readAddress(),
      stateOnly: true,
      error: false,
      shellCommitId: 0,
    });
    window.dispatchEvent(new WheelEvent('wheel', { deltaY: 100 }));
    window.scrollTo({ top: 950, behavior: 'instant' });
    setContentReadiness({
      contentEpoch: epoch,
      root,
      shellCommitId: 0,
      status: 'settled',
      started: true,
    });
    await frame();
    await frame();
    await frame();
    expect(Math.abs(window.scrollY - 950)).toBeLessThanOrEqual(2);
  });
});

describe('復元の待機とdurable境界', () => {
  it('実routerのstate-only writerもdurable直前を再照合し、直後はcommittedを保つ（R2）', async () => {
    await setup();
    if (!root) throw new Error('root');
    const routes = ['/notes/current', '/notes/next'];
    let focused = 0;
    const router = new Router(
      root,
      {
        siteUrlContext: { siteOrigin: location.origin, basePath: '' },
        isInternalDocumentPathname: (path) => routes.includes(path.replace(/\/$/u, '')),
        routeManifestState: {
          status: 'loaded',
          manifest: {
            version: 1,
            buildId: 'reading-test',
            buildLabel: 'reading-test',
            generatedAt: '2026-01-01T00:00:00.000Z',
            siteOrigin: location.origin,
            basePath: '',
            routes,
          },
          routeSet: { routes, has: (path) => routes.includes(path) },
        },
      },
      {
        skipInitialNavigation: true,
        urlStateNavigationPolicy: { evaluate: () => ({ kind: 'state-only' }) },
        postCommitController: {
          run: () => {
            focused++;
          },
        },
      },
    );
    try {
      await router.start();
      const length = history.length;
      const url = readAddress();
      stop = observeHistoryEntries(
        () => {
          beginNavigationIntent('navigation', readAddress(), 'feature');
        },
        () => {
          /* この観測点ではintentを変更しない。 */
        },
      );
      const cancelled = await router.navigate({ url: '/notes/next', historyMode: 'push' });
      expect(cancelled.committed).toBe(false);
      expect(cancelled.outcome).toBe('superseded');
      expect(history.length).toBe(length);
      expect(readAddress()).toBe(url);
      stop();
      stop = observeHistoryEntries(
        () => {
          /* この観測点ではintentを変更しない。 */
        },
        () => {
          beginNavigationIntent('navigation', readAddress(), 'feature');
        },
      );
      const committed = await router.navigate({ url: '/notes/next', historyMode: 'push' });
      expect(committed.committed).toBe(true);
      expect(committed.outcome).toBe('completed');
      expect(history.length).toBe(length + 1);
      expect(readAddress()).toBe('/notes/next');
      expect(focused).toBe(0);
    } finally {
      router.destroy();
    }
  });
  it('History API直前の取消は書き込まず、直後の再入は成功entryを保持する（R2）', async () => {
    await setup();
    const old = beginNavigationIntent('navigation', originalUrl);
    const before = history.length;
    stop = observeHistoryEntries(
      () => {
        beginNavigationIntent('navigation', originalUrl);
      },
      () => {
        /* この観測点では追加処理を行わない。 */
      },
    );
    expect(() =>
      writeHistoryEntry({
        mode: 'push',
        url: originalUrl,
        owner: 'router',
        beforeWrite: () => {
          if (old.signal.aborted) throw new DOMException('cancelled', 'AbortError');
        },
      }),
    ).toThrow();
    expect(history.length).toBe(before);
    stop();
    stop = observeHistoryEntries(
      () => {
        /* この観測点では追加処理を行わない。 */
      },
      () => {
        beginNavigationIntent('navigation', originalUrl);
        throw new Error('observer');
      },
    );
    let durable = false;
    const entry = writeHistoryEntry({
      mode: 'push',
      url: originalUrl,
      owner: 'router',
      onDurable: () => {
        durable = true;
      },
    });
    expect(durable).toBe(true);
    expect(readHistoryEntry()).toEqual(entry);
    expect(history.length).toBe(before + 1);
  });
  it('目標到達可能でも上方の既知未確定画像を待ってから保存CSS座標へ戻る（R1）', async () => {
    const epoch = await setup();
    if (!root) throw new Error('root');
    const content = root;
    reader = new ReadingPositionController((error) => {
      throw error;
    });
    reader.start(content);
    await expect.poll(() => content.dataset['readingPositionStatus']).toBe('settled');
    window.scrollTo({ top: 800, behavior: 'instant' });
    await frame();
    const image = document.createElement('img');
    let pending = true;
    // resource状態だけを制御し、range・scroll位置は実DOMで観測する。
    Object.defineProperty(image, 'complete', { get: () => !pending });
    const intent = beginNavigationIntent('traverse', readAddress());
    content.prepend(image);
    reader.schedule({
      intent,
      root: content,
      url: readAddress(),
      stateOnly: true,
      error: false,
      shellCommitId: 0,
    });
    await frame();
    await frame();
    await frame();
    await frame();
    expect(content.dataset['readingPositionStatus']).toBe('pending');
    image.style.height = '300px';
    pending = false;
    await expect.poll(() => content.dataset['readingPositionStatus']).toBe('settled');
    expect(Math.abs(window.scrollY - 800)).toBeLessThanOrEqual(2);
    expect(readContentReadiness(epoch)?.status).toBe('settled');
  });
  it('同epochのstate-only intentはpending hydrationを取消さず、rollback後は旧activateを破棄する（B3）', async () => {
    const epoch = await setup();
    if (!root) throw new Error('root');
    const content = root;
    const tag = 'x-reading-delayed';
    if (!customElements.get(tag)) customElements.define(tag, class extends HTMLElement {});
    const html = `<${tag} data-hydration-scope="${tag}" data-hydration-capability="interactive" data-hydration-trigger="initial"></${tag}>`;
    content.innerHTML = html;
    let release!: () => void;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    let activated = 0;
    let loaded = 0;
    const scheduler = new HydrationScheduler(
      new Map([
        [
          tag,
          {
            tag,
            kind: 'custom-element',
            profiles: ['note'],
            loader: () => {
              loaded++;
              return pending;
            },
            activate: ({ element }) => {
              activated++;
              element.setAttribute('data-activated', 'true');
            },
          },
        ],
      ]),
    );
    setContentReadiness({
      contentEpoch: epoch,
      root: content,
      shellCommitId: 0,
      status: 'pending',
      started: true,
    });
    const current = (): boolean => readContentContext()?.contentEpoch === epoch;
    const first = scheduler.hydrateContent(content, { isCurrent: current });
    await expect.poll(() => loaded).toBe(1);
    beginNavigationIntent('traverse', readAddress());
    expect(readContentReadiness(epoch)?.status).toBe('pending');
    beginContentMutation(content);
    scheduler.cancelContent();
    content.innerHTML = html;
    const restoredEpoch = beginContentMutation(content);
    content.innerHTML = html;
    adoptContentBinding(readAddress());
    const restored = scheduler.hydrateContent(content, {
      isCurrent: () => readContentContext()?.contentEpoch === restoredEpoch,
    });
    release();
    await Promise.all([first, restored]);
    expect(activated).toBe(1);
    expect(content.querySelector('[data-activated="true"]')).not.toBeNull();
  });
});

describe('feature writerのtoken再入', () => {
  it.each(['before', 'after'] as const)(
    'TOCの%s observer再入は旧scroll/projectionを続けない',
    async (phase) => {
      await setup();
      if (!root) throw new Error('root');
      const content = root;
      const link = document.createElement('a');
      link.href = '#reading-heading';
      link.dataset['tocLink'] = '';
      link.dataset['headingId'] = 'reading-heading';
      content.append(link);
      const tracker = {
        beginProgrammaticNavigation: vi.fn(),
        finishProgrammaticNavigation: vi.fn(),
        beginPostSettlementHold: vi.fn(),
        cancelProgrammaticNavigation: vi.fn(),
        canHoldProgrammaticTarget: () => true,
      } as unknown as TocActiveTracker;
      const project = vi.fn();
      const length = history.length;
      const url = readAddress();
      const reenter = (): void => {
        beginNavigationIntent('navigation', readAddress(), 'feature');
      };
      stop = observeHistoryEntries(
        () => {
          if (phase === 'before') reenter();
        },
        () => {
          if (phase === 'after') reenter();
        },
      );
      const controller = new TocNavigationController(content);
      const event = new MouseEvent('click', { button: 0, cancelable: true });
      Object.defineProperty(event, 'composedPath', { value: () => [link, content, document.body] });
      const scroll = vi.spyOn(window, 'scrollTo');
      try {
        expect(
          controller.handleTocLinkClick(event, {
            tocRuntimeId: 'reading-token',
            contentRoot: content,
            tracker,
            getActiveId: () => '',
            applyActiveId: project,
          }).owned,
        ).toBe(false);
        expect(history.length).toBe(length + (phase === 'after' ? 1 : 0));
        expect(readAddress()).toBe(
          phase === 'after' ? url.split('#')[0] + '#reading-heading' : url,
        );
        await frame();
        await frame();
        expect(scroll).not.toHaveBeenCalled();
        expect(project).not.toHaveBeenCalled();
        expect(tracker.beginProgrammaticNavigation).not.toHaveBeenCalled();
        expect(tracker.finishProgrammaticNavigation).not.toHaveBeenCalled();
      } finally {
        controller.destroy();
      }
    },
  );
  it.each(['before', 'after'] as const)(
    'tabsの%s observer再入は旧writer/changeを続けない',
    async (phase) => {
      history.replaceState({}, '', '/notes/reading-token?tab=javascript');
      await setup();
      if (!root) throw new Error('root');
      const content = root;
      const change = vi.fn();
      registerTabsUrlSyncStrategy({ ...primaryTabTabsUrlSyncStrategy, dispatchChange: change });
      const tabs = new TabsUrlSyncController({
        getHostElement: () => content,
        isUrlSyncEnabled: () => true,
        getActiveValue: () => 'javascript',
        resolveTabValueForHash: () => null,
        clearControlledSelection: () => {
          /* このfixtureではprojection不要。 */
        },
        onUrlStateChanged: () => {
          /* このfixtureではprojection不要。 */
        },
      });
      const length = history.length;
      const url = readAddress();
      const reenter = (): void => {
        beginNavigationIntent('navigation', readAddress(), 'feature');
      };
      stop = observeHistoryEntries(
        () => {
          if (phase === 'before') reenter();
        },
        () => {
          if (phase === 'after') reenter();
        },
      );
      expect(tabs.beginSelection('push')).toBe(true);
      tabs.writeSelectedValue('rust', 'push');
      expect(history.length).toBe(length + (phase === 'after' ? 1 : 0));
      expect(readAddress()).toBe(phase === 'after' ? '/notes/reading-token?tab=rust' : url);
      expect(change).not.toHaveBeenCalled();
      tabs.hostDisconnected();
    },
  );
  it('同epochの新intent後はTOCの旧settle callbackを採用しない', async () => {
    await setup();
    if (!root) throw new Error('root');
    const content = root;
    const target = content.querySelector<HTMLElement>('#reading-heading');
    if (!target) throw new Error('heading');
    const link = document.createElement('a');
    link.href = '#reading-heading';
    link.dataset['tocLink'] = '';
    link.dataset['headingId'] = 'reading-heading';
    content.append(link);
    const finish = vi.fn();
    const tracker = {
      beginProgrammaticNavigation: vi.fn(),
      finishProgrammaticNavigation: finish,
      beginPostSettlementHold: finish,
      cancelProgrammaticNavigation: vi.fn(),
      canHoldProgrammaticTarget: () => true,
    } as unknown as TocActiveTracker;
    const scroll = window.scrollTo.bind(window);
    scroll({ top: 0, behavior: 'instant' });
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {
      /* 到達を後で実DOMへ適用する。 */
    });
    const metrics = resolveTocScrollMetrics(target);
    const controller = new TocNavigationController(content);
    const event = new MouseEvent('click', { button: 0, cancelable: true });
    Object.defineProperty(event, 'composedPath', { value: () => [link, content] });
    try {
      expect(
        controller.handleTocLinkClick(event, {
          tocRuntimeId: 'reading-stale-settle',
          contentRoot: content,
          tracker,
          getActiveId: () => '',
          applyActiveId: () => {
            /* runtime projectionはこの検証の対象外。 */
          },
        }).owned,
      ).toBe(true);
      beginNavigationIntent('navigation', '/later');
      scroll({ top: metrics.targetY, behavior: 'instant' });
      await frame();
      await frame();
      await frame();
      await frame();
      expect(finish).not.toHaveBeenCalled();
    } finally {
      controller.destroy();
    }
  });
});

describe('featureの呼出し元までの失効', () => {
  it.each(['before', 'after', 'change', 'current'] as const)(
    'tabsの%s通知境界では現操作だけがenhancerのscroll/changeを続行する',
    async (phase) => {
      await setup();
      if (!root) throw new Error('root');
      const tabs = await fixture<HTMLElement>(`
        <section data-tabs-root data-tabs-url-sync>
          <nav data-tabs-static-nav style="width:80px;overflow:auto;white-space:nowrap">
            <a data-tab data-tab-value="javascript" href="#js" style="display:inline-block;width:160px">JS</a>
            <a data-tab data-tab-value="rust" href="#rs" style="display:inline-block;width:160px">Rust</a>
          </nav>
          <section id="js" data-tab-panel data-tab-value="javascript">JS</section>
          <section id="rs" data-tab-panel data-tab-value="rust">Rust</section>
        </section>
      `);
      const outside = await fixture<HTMLButtonElement>('<button>新操作のfocus</button>');
      let notifications = 0;
      const reenter = (): void => {
        notifications += 1;
        beginNavigationIntent('navigation', readAddress(), 'feature');
        outside.focus({ preventScroll: true });
      };
      registerTabsUrlSyncStrategy({
        ...primaryTabTabsUrlSyncStrategy,
        dispatchChange: phase === 'change' ? reenter : () => undefined,
      });
      activateTabs(tabs, fixtureAbortController(tabs).signal);
      await frame();
      await frame();
      const nav = tabs.querySelector<HTMLElement>('[data-tabs-static-nav]');
      const tab = tabs.querySelector<HTMLAnchorElement>('[data-tab-value="rust"]');
      if (!nav || !tab) throw new Error('tabs fixture');
      expect(nav.scrollWidth).toBeGreaterThan(nav.clientWidth);
      const position = nav.scrollLeft;
      const change = vi.fn();
      tabs.addEventListener('ui-tab-change', change);
      const length = history.length;
      const url = readAddress();
      stop = observeHistoryEntries(
        () => {
          if (phase === 'before') reenter();
        },
        () => {
          if (phase === 'after') reenter();
        },
      );
      tab.click();
      await frame();
      expect(notifications).toBe(phase === 'current' ? 0 : 1);
      expect(history.length).toBe(length + (phase === 'before' ? 0 : 1));
      expect(readAddress()).toBe(
        phase === 'before' ? url : primaryTabTabsUrlSyncStrategy.writeValue(url, 'rust'),
      );
      if (phase === 'current') {
        expect(nav.scrollLeft).toBeGreaterThan(position);
        expect(change).toHaveBeenCalledOnce();
      } else {
        expect(nav.scrollLeft).toBe(position);
        expect(change).not.toHaveBeenCalled();
        expect(document.activeElement).toBe(outside);
      }
    },
  );
  it.each(['before', 'after', 'current'] as const)(
    'mobile TOCの%s通知境界では現操作だけがpanel close/focusを続行する',
    async (phase) => {
      await setup();
      if (!root) throw new Error('root');
      root.id = 'reading-mobile-content';
      const toc = await fixture<HTMLElement>(`
        <div data-layout-toc-root data-hydration-owner-id="reading-mobile-owner">
          <script id="reading-mobile" type="application/json" data-toc-owner-id="reading-mobile-owner"
            data-hydration-owner-id="reading-mobile-owner" data-hydration-marker="toc-source" data-hydration-scope="note-toc">[{"id":"reading-heading","text":"見出し","level":2}]</script>
          <nav data-layout-toc-nav aria-label="目次"><ol><li data-heading-id="reading-heading">
            <a href="#reading-heading" data-toc-link data-heading-id="reading-heading">見出し</a>
          </li></ol></nav>
          <layout-toc-controller source-id="reading-mobile" toc-runtime-id="reading-mobile" toc-owner-id="reading-mobile-owner"
            content-root-id="reading-mobile-content"
            capabilities-json='{"activeTracking":false,"dynamicScopes":false,"mobilePanel":true}'></layout-toc-controller>
        </div>
      `);
      root.append(toc);
      const controller = toc.querySelector<HTMLElement>('layout-toc-controller');
      if (!controller) throw new Error('TOC controller');
      activateLayoutTocController(controller);
      const trigger = await fixture<HTMLButtonElement>('<button>目次</button>');
      const outside = await fixture<HTMLButtonElement>('<button>新操作のfocus</button>');
      layoutTocMobileController.open('reading-mobile', trigger);
      const panel = document.querySelector<HTMLElement>('[data-layout-toc-mobile-panel]');
      const link = panel?.querySelector<HTMLAnchorElement>('[data-toc-link]');
      if (!panel || !link) throw new Error('mobile TOC fixture');
      expect(panel.hidden).toBe(false);
      let notifications = 0;
      const reenter = (): void => {
        notifications += 1;
        beginNavigationIntent('navigation', readAddress(), 'feature');
        outside.focus({ preventScroll: true });
      };
      stop = observeHistoryEntries(
        () => {
          if (phase === 'before') reenter();
        },
        () => {
          if (phase === 'after') reenter();
        },
      );
      const scroll = vi.spyOn(window, 'scrollTo');
      const length = history.length;
      const url = readAddress();
      link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }));
      await frame();
      expect(notifications).toBe(phase === 'current' ? 0 : 1);
      expect(history.length).toBe(length + (phase === 'before' ? 0 : 1));
      expect(readAddress()).toBe(phase === 'before' ? url : url.split('#')[0] + '#reading-heading');
      expect(panel.hidden).toBe(phase === 'current');
      expect(layoutTocMobileController.getSnapshot('reading-mobile').panelOpen).toBe(
        phase !== 'current',
      );
      expect(document.activeElement).toBe(phase === 'current' ? trigger : outside);
      if (phase !== 'current') expect(scroll).not.toHaveBeenCalled();
    },
  );
});

describe('tabsと凍結したtraverse候補', () => {
  it('旧本文の即時/microtask/frame同期は宛先のURL/stateを正規化しない（B2）', async () => {
    await setup();
    if (!root) throw new Error('root');
    const content = root;
    let projections = 0;
    registerTabsUrlSyncStrategy(primaryTabTabsUrlSyncStrategy);
    const tabs = new TabsUrlSyncController({
      getHostElement: () => content,
      isUrlSyncEnabled: () => true,
      getActiveValue: () => 'javascript',
      resolveTabValueForHash: () => 'rust',
      clearControlledSelection: () => {
        projections++;
      },
      onUrlStateChanged: () => {
        projections++;
      },
    });
    tabs.hostConnected();
    try {
      const target = new URL(readAddress(), location.origin);
      target.searchParams.set('tab', 'javascript');
      target.hash = 'foreign-heading';
      writeHistoryEntry({
        mode: 'push',
        owner: 'router',
        url: target.pathname + target.search + target.hash,
      });
      const expected = readAddress();
      const id = readHistoryEntry()?.id;
      window.dispatchEvent(new PopStateEvent('popstate', { state: history.state }));
      tabs.normalizeActiveValue('hash', 'rust');
      expect(tabs.beginSelection('push')).toBe(false);
      await Promise.resolve();
      await frame();
      expect(projections).toBe(0);
      expect(readAddress()).toBe(expected);
      expect(readHistoryEntry()?.id).toBe(id);
    } finally {
      tabs.hostDisconnected();
    }
  });
  it('同entryのautomatic replaceと一時range=0は候補のCSS座標を捨てない（B2）', async () => {
    const epoch = await setup();
    if (!root) throw new Error('root');
    const content = root;
    registerTabsUrlSyncStrategy(primaryTabTabsUrlSyncStrategy);
    const target = new URL(readAddress(), location.origin);
    target.searchParams.set('tab', 'javascript');
    target.hash = 'foreign-heading';
    writeHistoryEntry({
      mode: 'replace',
      owner: 'feature',
      url: target.pathname + target.search + target.hash,
    });
    adoptContentBinding(readAddress());
    const tabs = new TabsUrlSyncController({
      getHostElement: () => content,
      isUrlSyncEnabled: () => true,
      getActiveValue: () => 'rust',
      resolveTabValueForHash: () => 'rust',
      clearControlledSelection: () => {
        /* 同期操作を検証しない。 */
      },
      onUrlStateChanged: () => {
        /* 同期操作を検証しない。 */
      },
    });
    reader = new ReadingPositionController((error) => {
      throw error;
    });
    reader.start(content);
    await expect.poll(() => content.dataset['readingPositionStatus']).toBe('settled');
    window.scrollTo({ top: 800, behavior: 'instant' });
    await frame();
    setContentReadiness({
      contentEpoch: epoch,
      root: content,
      shellCommitId: 0,
      status: 'pending',
      started: true,
    });
    const id = readHistoryEntry()?.id;
    const intent = beginNavigationIntent('traverse', readAddress());
    reader.schedule({
      intent,
      root: content,
      url: readAddress(),
      stateOnly: true,
      error: false,
      shellCommitId: 0,
    });
    content.style.display = 'none';
    tabs.normalizeActiveValue('hash', 'rust');
    await frame();
    await frame();
    expect(window.scrollY).toBe(0);
    expect(readHistoryEntry()?.id).toBe(id);
    expect(intent.signal.aborted).toBe(false);
    expect(new URL(location.href).searchParams.get('tab')).toBe('rust');
    content.style.display = 'flow-root';
    setContentReadiness({
      contentEpoch: epoch,
      root: content,
      shellCommitId: 0,
      status: 'settled',
      started: true,
    });
    await expect.poll(() => content.dataset['readingPositionStatus']).toBe('settled');
    expect(Math.abs(window.scrollY - 800)).toBeLessThanOrEqual(2);
  });
});

it('遅延した位置受理callbackがXYを動かしてもcandidateを保持し、補正してからsettledにする', async () => {
  await setup();
  if (!root) throw new Error('root');
  const content = root;
  let inject = false;
  let moved = false;
  const accepted: number[] = [];
  const errors = vi.fn();
  reader = new ReadingPositionController(errors, () => {
    if (!inject) return;
    accepted.push(scrollY);
    if (!moved) {
      moved = true;
      window.scrollTo({ top: 1100, behavior: 'instant' });
      expect(content.dataset['readingPositionStatus']).toBe('pending');
      expect(reader).toMatchObject({ candidate: { y: 800 }, restoring: true });
    }
  });
  reader.start(content);
  await expect.poll(() => content.dataset['readingPositionStatus']).toBe('settled');
  window.scrollTo({ top: 800, behavior: 'instant' });
  await frame();
  window.dispatchEvent(new Event('scroll'));
  const intent = beginNavigationIntent('traverse', readAddress());
  const epoch = beginContentMutation(content);
  adoptContentBinding(readAddress());
  setContentReadiness({
    contentEpoch: epoch,
    root: content,
    shellCommitId: 0,
    status: 'settled',
    started: true,
  });
  window.scrollTo({ top: 0, behavior: 'instant' });
  inject = true;
  reader.schedule({
    intent,
    root: content,
    url: readAddress(),
    stateOnly: false,
    error: false,
    shellCommitId: 0,
  });
  const settledPositions: number[] = [];
  const sample = (): void => {
    if (content.dataset['readingPositionStatus'] === 'settled') settledPositions.push(scrollY);
    else requestAnimationFrame(sample);
  };
  requestAnimationFrame(sample);
  await expect.poll(() => content.dataset['readingPositionStatus']).toBe('settled');
  await frame();
  expect(errors).not.toHaveBeenCalled();
  expect(moved).toBe(true);
  expect(accepted.length).toBeGreaterThanOrEqual(2);
  expect(accepted.every((y) => Math.abs(y - 800) <= 2)).toBe(true);
  expect(settledPositions.length).toBeGreaterThan(0);
  expect(settledPositions.every((y) => Math.abs(y - 800) <= 2)).toBe(true);
  expect(Math.abs(scrollY - 800)).toBeLessThanOrEqual(2);
});

it('error文書のscroll/checkpointで同entryの成功文書recordを消さない（A8）', async () => {
  await setup();
  if (!root) throw new Error('root');
  const content = root;
  reader = new ReadingPositionController((error) => {
    throw error;
  });
  reader.start(content);
  await expect.poll(() => content.dataset['readingPositionStatus']).toBe('settled');
  window.scrollTo({ top: 800, behavior: 'instant' });
  await frame();
  const show = async (error: boolean): Promise<void> => {
    const intent = beginNavigationIntent('traverse', readAddress());
    const epoch = beginContentMutation(content);
    adoptContentBinding(readAddress());
    setContentReadiness({
      contentEpoch: epoch,
      root: content,
      shellCommitId: 0,
      status: 'settled',
      started: true,
    });
    if (!reader) throw new Error('reader');
    reader.schedule({
      intent,
      root: content,
      url: readAddress(),
      stateOnly: false,
      error,
      shellCommitId: 0,
    });
    await expect.poll(() => content.dataset['readingPositionStatus']).toBe('settled');
  };
  await show(true);
  expect(window.scrollY).toBe(0);
  window.scrollTo({ top: 500, behavior: 'instant' });
  await frame();
  await show(false);
  expect(Math.abs(window.scrollY - 800)).toBeLessThanOrEqual(2);
});

it('native clickと後続address採用は同じintentを使い二度取消さない（B1）', async () => {
  await setup();
  if (!root) throw new Error('root');
  const source = captureFeatureSource(root);
  const target = new URL(readAddress(), location.origin);
  target.hash = 'reading-heading';
  const url = target.pathname + target.search + target.hash;
  const clickIntent = beginNativeNavigation(source, url);
  if (!clickIntent) throw new Error('intent');
  writeHistoryEntry({ mode: 'push', owner: 'router', url });
  const adoption = adoptNativeNavigationIntent(url);
  expect(adoption.intentId).toBe(clickIntent.intentId);
  expect(adoption.signal).toBe(clickIntent.signal);
  expect(clickIntent.signal.aborted).toBe(false);
  expect(adoption.target.entryId).toBe(readHistoryEntry()?.id);
});

describe('同期受理した履歴本文のraw XY先行適用', () => {
  const quotaBoundary = (): Promise<void> =>
    new Promise((resolve) => window.setTimeout(resolve, 10_000));
  beforeAll(quotaBoundary, 15_000);
  afterAll(quotaBoundary, 15_000);

  it.each([
    'table',
    'unknown-surface',
    'missing-receipt',
    'mutable-receipt',
    'async-commit',
    'wrong-entry',
    'wrong-url',
    'wrong-epoch',
    'wrong-shell',
    'wrong-intent',
    'wrong-root',
    'geometry-not-prepared',
    'hidden',
    'clamp',
    'hash',
    'hash-existing',
    'already-aligned',
    'notify-shift',
    'notify-range',
    'notify-owner-loss',
    'notify-throw',
    'state-only',
    'error',
    'interrupted',
    'aborted',
    'recovery',
    'mutation',
    'wrong-binding',
  ] as const)('%sはraw XYとfade・候補の所有権を分離する', async (condition) => {
    await setup();
    if (!root) throw new Error('root');
    const content = root;
    content.id = 'main-content';
    content.style.width = '2000px';
    const rows = condition === 'table' ? 733 : 20;
    const savedHtml =
      condition === 'unknown-surface'
        ? '<section data-hydration-key="unknown"><p>字体・幾何の演出証明を持たない本文</p></section>'
        : `<div data-table-root><table><tbody>${Array.from({ length: rows }, (_, row) => `<tr><td>行${row}</td><td>全文を維持</td></tr>`).join('')}</tbody></table></div>`;
    content.innerHTML = savedHtml;
    if (condition === 'hash' || condition === 'hash-existing') {
      history.replaceState(history.state, '', readAddress() + '#saved-heading');
      initializeContentContext(content);
      adoptContentBinding(readAddress());
    }
    if (condition === 'hash-existing') content.insertAdjacentHTML('afterbegin', '<h2 id="saved-heading">stale hash at top</h2>');
    const savedUrl = readAddress();
    const errors = vi.fn();
    let observe = false;
    const notifications = vi.fn(() => {
      if (!observe || notifications.mock.calls.length > 1) return;
      if (condition === 'notify-shift') window.scrollTo({ left: 80, top: 500, behavior: 'instant' });
      if (condition === 'notify-range') content.style.height = '7000px';
      if (condition === 'notify-owner-loss') {
        beginNavigationIntent('navigation', savedUrl);
        content.dataset['readingPositionStatus'] = 'new-owner';
        content.dataset['readingPositionPrepaint'] = 'new-owner';
      }
      if (condition === 'notify-throw') throw new Error('TOC observer failure');
    });
    reader = new ReadingPositionController(errors, notifications);
    reader.start(content);
    await expect.poll(() => content.dataset['readingPositionStatus']).toBe('settled');
    window.scrollTo({ left: 80, top: 650, behavior: 'instant' });
    await frame();
    window.dispatchEvent(new Event('scroll'));
    const savedState: unknown = history.state;
    const savedEntryId = readHistoryEntry()?.id;
    if (!savedEntryId) throw new Error('managed saved entry missing');
    const previous = '/notes/history-raw-previous';
    const leaving = beginNavigationIntent('navigation', previous);
    beginContentMutation(content);
    writeHistoryEntry({ mode: 'push', owner: 'router', url: previous });
    content.innerHTML = '<p>移動先の本文</p>';
    adoptContentBinding(previous);
    reader.schedule({
      intent: leaving,
      root: content,
      url: previous,
      stateOnly: false,
      error: false,
      shellCommitId: 0,
    });
    await expect.poll(() => content.dataset['readingPositionStatus']).toBe('settled');
    history.replaceState(savedState, '', savedUrl);
    const intent = beginNavigationIntent('traverse', savedUrl);
    const epoch = beginContentMutation(content);
    content.innerHTML = savedHtml;
    if (condition === 'hash-existing') content.insertAdjacentHTML('afterbegin', '<h2 id="saved-heading">stale hash at top</h2>');
    adoptContentBinding(savedUrl);
    setContentReadiness({
      contentEpoch: epoch,
      root: content,
      shellCommitId: 0,
      status: 'pending',
      started: true,
    });
    window.scrollTo({ left: 20, top: 200, behavior: 'instant' });
    await frame();
    if (condition === 'clamp') {
      content.innerHTML = '<p>短い本文</p>';
      content.style.height = '10px';
    }
    if (condition === 'hidden')
      vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    if (condition === 'interrupted') window.dispatchEvent(new PointerEvent('pointerdown'));
    if (condition === 'aborted') beginNavigationIntent('navigation', savedUrl);
    if (condition === 'recovery') markContentRecoveryRequired(content, epoch);
    if (condition === 'mutation') beginContentMutation(content);
    if (condition === 'wrong-binding') adoptContentBinding('/wrong-binding', 'wrong-binding');
    const receiptValue = {
      commitId: 1,
      intentId: condition === 'wrong-intent' ? intent.intentId + 1 : intent.intentId,
      entryId: condition === 'wrong-entry' ? 'other-entry' : savedEntryId,
      url: condition === 'wrong-url' ? '/wrong-url' : savedUrl,
      contentEpoch: condition === 'wrong-epoch' ? epoch + 1 : epoch,
      root: condition === 'wrong-root' ? document.createElement('main') : content,
      shellCommitId: condition === 'wrong-shell' ? 1 : 0,
      stateOnly: false,
      ...(condition === 'async-commit' ? {} : { commitTiming: 'synchronous' as const }),
    };
    const receipt = condition === 'mutable-receipt' ? receiptValue : Object.freeze(receiptValue);
    if (condition === 'already-aligned') window.scrollTo({ left: 80, top: 650, behavior: 'instant' });
    notifications.mockClear();
    observe = true;
    const reads = vi.spyOn(ReadingPositionStore.prototype, 'read');
    const qualified = reader.qualifyPrepaintHistoryCandidate(content, intent, receipt);
    expect(reads).not.toHaveBeenCalled();
    const scroll = vi.spyOn(window, 'scrollTo');
    const focus = vi.spyOn(HTMLElement.prototype, 'focus');
    const animate = vi.spyOn(content, 'animate');
    const writes = vi.spyOn(ReadingPositionStore.prototype, 'write');
    reader.schedule({
      intent,
      root: content,
      url: savedUrl,
      stateOnly: condition === 'state-only',
      error: condition === 'error',
      shellCommitId: 0,
      prepaintGeometryReady: condition !== 'geometry-not-prepared',
      ...(condition === 'missing-receipt' ? {} : { receipt }),
      ...(qualified ? { prepaintCandidate: qualified } : {}),
    });
    const arrived = ['table', 'unknown-surface', 'hash', 'hash-existing', 'already-aligned', 'notify-shift', 'notify-range', 'notify-owner-loss', 'notify-throw'].includes(condition);
    const early = arrived && !condition.startsWith('notify-');
    expect(reads).not.toHaveBeenCalled();
    expect(scroll).toHaveBeenCalledTimes(condition === 'already-aligned' ? 0 : condition === 'notify-shift' ? 2 : arrived ? 1 : 0);
    expect(content.dataset['readingPositionPrepaint'] === 'applied').toBe(early);
    if (condition === 'notify-owner-loss') {
      expect(content.dataset['readingPositionStatus']).toBe('new-owner');
      expect(content.dataset['readingPositionPrepaint']).toBe('new-owner');
      await frame();
      expect(content.dataset['readingPositionStatus']).toBe('new-owner');
      return;
    }
    expect(animate).not.toHaveBeenCalled();
    expect(focus).not.toHaveBeenCalled();
    if (early) {
      expect(Math.abs(scrollX - 80)).toBeLessThanOrEqual(2);
      expect(Math.abs(scrollY - 650)).toBeLessThanOrEqual(2);
      expect(content.dataset['historyPresentationEligibility']).toBe('unavailable');
    }
    if (arrived || condition === 'missing-receipt' || condition === 'async-commit') {
      expect(reader).toMatchObject({
        candidate: { url: savedUrl, x: 80, y: 650 },
        restoring: true,
      });
      expect(writes).not.toHaveBeenCalled();
      await frame();
      await frame();
      expect(content.dataset['readingPositionStatus']).toBe('pending');
      expect(writes).not.toHaveBeenCalled();
      setContentReadiness({
        contentEpoch: epoch,
        root: content,
        shellCommitId: 0,
        status: 'settled',
        started: true,
      });
      await expect.poll(() => content.dataset['readingPositionStatus']).toBe('settled');
      expect(Math.abs(scrollX - 80)).toBeLessThanOrEqual(2);
      expect(Math.abs(scrollY - 650)).toBeLessThanOrEqual(2);
      expect(reader).toMatchObject({ candidate: null, restoring: false });
      if (condition.startsWith('notify-')) expect(notifications.mock.calls.length).toBeGreaterThanOrEqual(2);
      else expect(scroll).toHaveBeenCalledTimes(condition === 'already-aligned' ? 0 : 1);
    }
    expect(errors).toHaveBeenCalledTimes(condition === 'notify-throw' ? 1 : 0);
  });
});

describe('明示hashの停止位置とCSS offset', () => {
  let priorPadding = '';
  beforeEach(() => {
    priorPadding = document.documentElement.style.scrollPaddingTop;
    document.documentElement.style.scrollPaddingTop = '48px';
  });
  afterEach(() => {
    document.documentElement.style.scrollPaddingTop = priorPadding;
  });
  const startHash = async (position: 'middle' | 'start' | 'end', pending = false) => {
    const epoch = await setup();
    if (!root) throw new Error('root');
    const target = root.querySelector<HTMLElement>('#reading-heading');
    if (!target) throw new Error('heading');
    target.style.scrollMarginTop = '32px';
    target.style.marginTop =
      position === 'start' ? '0px' : position === 'end' ? '5900px' : '1200px';
    const url = `${originalUrl.split('#')[0]}#reading-heading`;
    history.replaceState(baselineState, '', url);
    adoptContentBinding(url);
    if (pending)
      setContentReadiness({
        contentEpoch: epoch,
        root,
        shellCommitId: 0,
        status: 'pending',
        started: true,
      });
    reader = new ReadingPositionController((error) => {
      throw error;
    });
    reader.start(root);
    return { content: root, target, epoch, url };
  };

  it.each(['middle', 'start', 'end'] as const)(
    '初期hashの%sはroot paddingとheading marginの和を使い到達範囲へclampする',
    async (position) => {
      const { content, target } = await startHash(position);
      await expect.poll(() => content.dataset['readingPositionStatus']).toBe('settled');
      const offset =
        Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) +
        Number.parseFloat(getComputedStyle(target).scrollMarginTop);
      const top = target.getBoundingClientRect().top;
      const ideal = scrollY + top - offset;
      const scrolling = document.scrollingElement;
      if (!scrolling) throw new Error('scrolling root');
      const max = Math.max(0, scrolling.scrollHeight - scrolling.clientHeight);
      expect(offset).toBe(80);
      expect(Math.abs(scrollY - Math.min(max, Math.max(0, ideal)))).toBeLessThanOrEqual(2);
      if (position === 'middle') expect(Math.abs(top - offset)).toBeLessThanOrEqual(2);
      if (position === 'start') expect(ideal).toBeLessThan(0);
      if (position === 'end') expect(ideal).toBeGreaterThan(max);
    },
  );

  it('hashの待機中に本人が介入したらoffset位置へ引き戻さない', async () => {
    const { content, epoch } = await startHash('middle', true);
    window.dispatchEvent(new WheelEvent('wheel', { deltaY: 100 }));
    window.scrollTo({ top: 650, behavior: 'instant' });
    setContentReadiness({
      contentEpoch: epoch,
      root: content,
      shellCommitId: 0,
      status: 'settled',
      started: true,
    });
    for (let i = 0; i < 4; i++) await frame();
    expect(content.dataset['readingPositionStatus']).toBe('cancelled');
    expect(Math.abs(scrollY - 650)).toBeLessThanOrEqual(2);
  });

  it('hashを持つ履歴entryの既知の保存XYはoffsetで置換しない', async () => {
    const { content, url } = await startHash('middle');
    if (!reader) throw new Error('reader');
    await expect.poll(() => content.dataset['readingPositionStatus']).toBe('settled');
    window.scrollTo({ top: 650, behavior: 'instant' });
    await frame();
    const state: unknown = history.state;
    const away = '/notes/heading-offset-away';
    const next = beginNavigationIntent('navigation', away);
    writeHistoryEntry({ mode: 'push', owner: 'router', url: away });
    adoptContentBinding(away);
    reader.schedule({
      intent: next,
      root: content,
      url: away,
      stateOnly: false,
      error: false,
      shellCommitId: 0,
    });
    await expect.poll(() => content.dataset['readingPositionStatus']).toBe('settled');
    expect(scrollY).toBe(0);
    history.replaceState(state, '', url);
    const back = beginNavigationIntent('traverse', url);
    adoptContentBinding(url);
    reader.schedule({
      intent: back,
      root: content,
      url,
      stateOnly: true,
      error: false,
      shellCommitId: 0,
    });
    await expect.poll(() => content.dataset['readingPositionStatus']).toBe('settled');
    expect(Math.abs(scrollY - 650)).toBeLessThanOrEqual(2);
  });
});


describe('post-commit geometry/focus ownership before schedule', () => {
  it.each(['hash', 'hashless-without-candidate', 'hash-without-candidate', 'geometry-failure', 'geometry-hidden', 'cleanup-hidden', 'cleanup-failure', 'focus-owner-loss', 'geometry-owner-loss', 'cleanup-owner-loss'] as const)('%s preserves the accepted body and the current job', async (condition) => {
    await setup();
    if (!root) throw new Error('root');
    const content = root;
    content.id = 'main-content';
    const hasHash = condition !== 'hashless-without-candidate';
    const savedUrl = originalUrl.split('#')[0] + (hasHash ? '#missing-heading' : '');
    history.replaceState(baselineState, '', savedUrl);
    adoptContentBinding(savedUrl);
    const html = '<div data-table-root="true" id="Static-ID" style="width:120px;overflow:auto"><table style="width:360px;min-width:360px"><tbody>' + Array.from({length:30}, () => '<tr><td>本文</td></tr>').join('') + '</tbody></table></div>';
    content.innerHTML = html;
    const controller = new RouterDocumentHostPostRenderController(() => { /* 通知文字列はこのowner検証の対象外。 */ });
    try {
      controller.initialize(content.parentElement ?? document.body);
      await expect.poll(() => content.dataset['readingPositionStatus']).toBe('settled');
      window.scrollTo({left:0,top:650,behavior:'instant'});
      await frame();
      window.dispatchEvent(new Event('scroll'));
      const savedState: unknown = history.state;
      const previous = '/notes/other-page';
      const leaving = beginNavigationIntent('navigation', previous);
      let epoch = beginContentMutation(content);
      writeHistoryEntry({mode:'push',owner:'router',url:previous});
      content.innerHTML = '<p>other page</p>';
      adoptContentBinding(previous);
      setContentReadiness({contentEpoch:epoch,root:content,shellCommitId:0,status:'settled',started:true});
      const post = controller.createPostCommitController(content.parentElement ?? document.body);
      post.run({outlet:content,previousUrl:savedUrl,url:previous,isInitial:false,stateOnly:false,renderedKind:'page',intent:leaving});
      await expect.poll(() => content.dataset['readingPositionStatus']).toBe('settled');
      history.replaceState(savedState, '', savedUrl);
      const reads = vi.spyOn(ReadingPositionStore.prototype,'read');
      if (condition.endsWith('without-candidate')) reads.mockReturnValue(null);
      const intent = beginNavigationIntent('traverse',savedUrl);
      expect(reads).toHaveBeenCalledOnce();
      reads.mockClear();
      epoch = beginContentMutation(content);
      content.innerHTML = html;
      adoptContentBinding(savedUrl);
      setContentReadiness({contentEpoch:epoch,root:content,shellCommitId:0,status:'pending',started:true});
      window.scrollTo({left:0,top:200,behavior:'instant'});
      const receipt = Object.freeze({commitId:1,intentId:intent.intentId,entryId:readHistoryEntry()?.id ?? null,url:savedUrl,root:content,contentEpoch:epoch,shellCommitId:0,stateOnly:false,commitTiming:'synchronous' as const});
      const context = {outlet:content,previousUrl:previous,url:savedUrl,isInitial:false,stateOnly:false,renderedKind:'page' as const,intent,receipt};
      if (condition.startsWith('cleanup-')) {
        post.run(context);
        window.scrollTo({left:0,top:200,behavior:'instant'});
        const abort = AbortController.prototype.abort;
        vi.spyOn(AbortController.prototype,'abort').mockImplementationOnce(function(this: AbortController) {
          abort.call(this);
          if (condition === 'cleanup-owner-loss') {
            beginNavigationIntent('navigation',savedUrl);
            content.dataset['readingPositionStatus'] = 'new-owner';
          }
          if (condition === 'cleanup-hidden') {
            vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
            return;
          }
          throw new Error('previous cleanup failed');
        });
      }
      const table = content.querySelector<HTMLElement>('[data-table-root]');
      if (!table) throw new Error('table');
      if (condition.startsWith('geometry-')) Object.defineProperty(table,'clientWidth',{configurable:true,get() {
        if (condition === 'geometry-owner-loss') {
          beginNavigationIntent('navigation',savedUrl);
          content.dataset['readingPositionStatus'] = 'new-owner';
          return 120;
        }
        if (condition === 'geometry-hidden') {
          vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
          return 120;
        }
        throw new Error('geometry unavailable');
      }});
      if (condition === 'focus-owner-loss') vi.spyOn(content,'focus').mockImplementation(() => {
        beginNavigationIntent('navigation',savedUrl);
        content.dataset['readingPositionStatus'] = 'new-owner';
      });
      const schedule = vi.spyOn(ReadingPositionController.prototype,'schedule');
      expect(() => post.run(context)).not.toThrow();
      expect(reads).not.toHaveBeenCalled();
      expect(content.querySelector('table')).not.toBeNull();
      if (condition.endsWith('owner-loss')) {
        expect(schedule).not.toHaveBeenCalled();
        expect(content.dataset['readingPositionStatus']).toBe('new-owner');
        return;
      }
      expect(schedule).toHaveBeenCalledOnce();
      expect(!!table.previousElementSibling?.matches('[data-table-scroll-rail]')).toBe(condition === 'hash' || condition === 'hashless-without-candidate');
      expect(content.dataset['readingPositionPrepaint']).toBe(condition === 'hash' ? 'applied' : 'unavailable');
      if (condition === 'hash') expect(Math.abs(scrollY-650)).toBeLessThanOrEqual(2);
      vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
      setContentReadiness({contentEpoch:epoch,root:content,shellCommitId:0,status:'settled',started:true});
      await expect.poll(() => content.dataset['readingPositionStatus']).toBe('settled');
      expect(Math.abs(scrollY-(condition.endsWith('without-candidate') ? 0 : 650))).toBeLessThanOrEqual(2);
    } finally {
      controller.dispose();
    }
  });
});
