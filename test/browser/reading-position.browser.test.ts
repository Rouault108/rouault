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
import { ReadingPositionController } from '../../src/components/app/controllers/reading-position-controller.js';

const originalUrl = readAddress();
let root: HTMLElement | null = null;
let reader: ReadingPositionController | null = null;
let stop: (() => void) | null = null;
afterEach(() => {
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
    content.prepend(image);
    const intent = beginNavigationIntent('traverse', readAddress());
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
