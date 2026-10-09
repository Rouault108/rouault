import { afterEach, describe, expect, it } from 'vitest';
import { fixture } from './harness/browser-fixture.js';
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
  isFeatureSourceCurrent,
  releaseContentContext,
  readContentContext,
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
import { Router } from '../../src/router/router.js';
import { ReadingPositionController } from '../../src/components/app/controllers/reading-position-controller.js';

const originalUrl = readAddress();
let root: HTMLElement | null = null;
let reader: ReadingPositionController | null = null;
let stop: (() => void) | null = null;
afterEach(() => {
  clearTabsUrlSyncStrategy();
  reader?.dispose();
  reader = null;
  stop?.();
  stop = null;
  releaseContentContext(root);
  root = null;
  history.replaceState(null, '', originalUrl);
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
