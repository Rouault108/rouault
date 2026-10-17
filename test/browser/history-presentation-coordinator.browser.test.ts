import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  HistoryPresentationCoordinator,
  type HistoryPresentationOwner,
} from '../../src/components/app/controllers/history-presentation-coordinator.js';
import {
  commitShellGeneration,
  resetShellLifecycleForTest,
} from '../../src/components/app/shell/app-shell-lifecycle.js';
import {
  adoptContentBinding,
  adoptFeatureAddress,
  beginContentMutation,
  beginNavigationIntent,
  initializeContentContext,
  readContentContext,
  releaseContentContext,
} from '../../src/navigation/content-navigation-context.js';
import {
  adoptHistoryEntry,
  readAddress,
  readHistoryEntry,
  writeHistoryEntry,
} from '../../src/navigation/history-entry.js';
import { fixture } from './harness/browser-fixture.js';
import { waitForCondition } from './harness/browser-test-utilities.js';

const deferred = <T>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
};

const flush = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
};

const originalUrl = readAddress();
const originalState: unknown = history.state;
let baselineState: unknown;

beforeAll(() => {
  adoptHistoryEntry();
  baselineState = history.state;
});

afterAll(() => {
  history.replaceState(originalState, '', originalUrl);
});

describe('HistoryPresentationCoordinator', () => {
  let coordinator: HistoryPresentationCoordinator;
  let root: HTMLElement;
  let owner: HistoryPresentationOwner;
  let media: EventTarget;
  let reduced: boolean;
  let visibility: DocumentVisibilityState;
  let originalVisibility: PropertyDescriptor | undefined;

  const owned = (): Animation[] =>
    root.getAnimations().filter((animation) => animation.id === 'rouault-history-content');
  const animation = (): Animation => {
    const current = owned()[0];
    if (!current) throw new Error('Expected owned history animation');
    return current;
  };
  const snapshotOwner = (): HistoryPresentationOwner => {
    const context = readContentContext();
    const entry = readHistoryEntry();
    if (!context?.intent || !entry) throw new Error('Expected managed history owner');
    return {
      root,
      contentEpoch: context.contentEpoch,
      shellCommitId: 0,
      intent: context.intent,
      entryId: entry.id,
      url: readAddress(),
    };
  };

  beforeEach(async () => {
    root = await fixture(
      '<main id="main-content" tabindex="-1"><button>操作</button><p>本文</p></main>',
    );
    initializeContentContext(root);
    beginNavigationIntent('traverse', readAddress());
    adoptContentBinding(readAddress());
    owner = snapshotOwner();
    reduced = false;
    visibility = 'visible';
    media = new EventTarget();
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
    coordinator = new HistoryPresentationCoordinator();
  });

  afterEach(() => {
    coordinator.dispose();
    releaseContentContext(readContentContext()?.root ?? null);
    resetShellLifecycleForTest();
    if (originalVisibility) Object.defineProperty(document, 'visibilityState', originalVisibility);
    else Reflect.deleteProperty(document, 'visibilityState');
    if (readAddress() !== originalUrl || history.state !== baselineState)
      history.replaceState(baselineState, '', originalUrl);
    vi.restoreAllMocks();
  });

  it('実native WAAPIでmainだけを0.82→1/180ms演出し、自然終了後は効果を残さないこと', async () => {
    const scroll = vi.spyOn(window, 'scrollTo');
    const focus = vi.spyOn(root, 'focus');
    const animate = vi.spyOn(root, 'animate');
    const style = root.getAttribute('style');
    const address = readAddress();
    const entryId = readHistoryEntry()?.id;
    expect(coordinator.start(owner)).toBe(true);
    const current = animation();
    expect(animate).toHaveBeenCalledWith([{ opacity: 0.82 }, { opacity: 1 }], {
      id: 'rouault-history-content',
      duration: 180,
      easing: 'ease-out',
      fill: 'none',
    });
    expect(current.effect).toBeInstanceOf(KeyframeEffect);
    expect(document.documentElement.getAnimations()).toHaveLength(0);
    expect(document.body.getAnimations()).toHaveLength(0);
    await current.finished;
    await waitForCondition(
      () => owned().length === 0,
      'History effect must be released after native completion',
    );
    expect(root.getAttribute('style')).toBe(style);
    expect(getComputedStyle(root).opacity).toBe('1');
    expect(scroll).not.toHaveBeenCalled();
    expect(focus).not.toHaveBeenCalled();
    expect(readAddress()).toBe(address);
    expect(readHistoryEntry()?.id).toBe(entryId);
  });

  it('90ms pause中もlive controlを操作でき、入力を妨げず自分の効果だけを解除すること', async () => {
    root.style.opacity = '0.91';
    const decoration = root.animate([{ transform: 'none' }, { transform: 'none' }], {
      duration: 10000,
    });
    decoration.id = 'unrelated-decoration';
    try {
      expect(coordinator.start(owner)).toBe(true);
      const current = animation();
      current.pause();
      current.currentTime = 90;
      await current.ready;
      expect(Number(getComputedStyle(root).opacity)).toBeGreaterThan(0.82);
      expect(Number(getComputedStyle(root).opacity)).toBeLessThan(1);
      const button = root.querySelector('button');
      if (!button) throw new Error('Expected live button');
      const clicked = vi.fn();
      button.addEventListener('click', clicked);
      const input = new Event('pointerdown', { bubbles: true, cancelable: true });
      button.dispatchEvent(input);
      button.click();
      expect(input.defaultPrevented).toBe(false);
      expect(clicked).toHaveBeenCalledTimes(1);
      expect(current.playState).toBe('idle');
      expect(owned()).toHaveLength(0);
      expect(root.getAnimations()).toContain(decoration);
      expect(root.style.opacity).toBe('0.91');
      expect(getComputedStyle(root).opacity).toBe('0.91');
    } finally {
      decoration.cancel();
    }
  });

  it.each([
    'root',
    'epoch',
    'shell',
    'intent',
    'entry',
    'url',
    'binding',
    'mutation',
    'disconnected',
    'non-main',
  ])('%sが所有者と一致しなければAnimationを作らないこと', async (mismatch) => {
    const animate = vi.spyOn(root, 'animate');
    let candidate = owner;
    if (mismatch === 'root') {
      const other = await fixture('<main id="main-content"></main>');
      candidate = { ...owner, root: other };
    }
    if (mismatch === 'epoch') candidate = { ...owner, contentEpoch: owner.contentEpoch + 1 };
    if (mismatch === 'shell') commitShellGeneration(1);
    if (mismatch === 'intent') beginNavigationIntent('traverse', readAddress());
    if (mismatch === 'entry') candidate = { ...owner, entryId: 'another-entry' };
    if (mismatch === 'url') candidate = { ...owner, url: `${owner.url}?different` };
    if (mismatch === 'binding') adoptContentBinding('/different-document');
    if (mismatch === 'mutation') beginContentMutation(root);
    if (mismatch === 'disconnected') root.remove();
    if (mismatch === 'non-main') root.id = 'other-content';
    expect(coordinator.start(candidate)).toBe(false);
    expect(animate).not.toHaveBeenCalled();
  });

  it('同じURLでも現在の管理entryが変わっていれば旧ownerでは開始しないこと', () => {
    history.replaceState(
      { __rouaultHistoryEntry: { version: 1, id: 'different-entry' } },
      '',
      readAddress(),
    );
    const animate = vi.spyOn(root, 'animate');
    expect(coordinator.start(owner)).toBe(false);
    expect(animate).not.toHaveBeenCalled();
  });

  it('bindingが同じでも実addressが変わっていれば開始しないこと', () => {
    history.replaceState(history.state, '', `${location.pathname}?history-presentation=changed`);
    const animate = vi.spyOn(root, 'animate');
    expect(coordinator.start(owner)).toBe(false);
    expect(animate).not.toHaveBeenCalled();
  });

  it.each(['reduced motion', 'hidden', 'unsupported', 'disposed'])(
    '%sでは通常表示を維持すること',
    (condition) => {
      const animate = vi.spyOn(root, 'animate');
      if (condition === 'reduced motion') reduced = true;
      if (condition === 'hidden') visibility = 'hidden';
      if (condition === 'unsupported')
        Object.defineProperty(root, 'animate', { configurable: true, value: undefined });
      if (condition === 'disposed') coordinator.dispose();
      expect(coordinator.start(owner)).toBe(false);
      expect(animate).not.toHaveBeenCalled();
      expect(getComputedStyle(root).opacity).toBe('1');
    },
  );

  it.each([
    'intent',
    'feature',
    'mutation',
    'binding',
    'popstate',
    'pagehide',
    'persisted pageshow',
    'resize',
    'hidden',
    'motion',
    'wheel',
    'touchstart',
    'touchmove',
    'pointerdown',
    'keydown',
    'input',
    'dispose',
  ])('%sで停止中の実Animationを取消し、通常表示へ戻すこと', async (reason) => {
    expect(coordinator.start(owner)).toBe(true);
    const current = animation();
    current.pause();
    current.currentTime = 90;
    if (reason === 'intent') beginNavigationIntent('navigation', readAddress());
    else if (reason === 'feature') adoptFeatureAddress();
    else if (reason === 'mutation') beginContentMutation(root);
    else if (reason === 'binding') adoptContentBinding('/changed');
    else if (reason === 'persisted pageshow')
      window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
    else if (reason === 'hidden') {
      visibility = 'hidden';
      document.dispatchEvent(new Event('visibilitychange'));
    } else if (reason === 'motion') {
      reduced = true;
      media.dispatchEvent(new Event('change'));
    } else if (reason === 'dispose') coordinator.dispose();
    else window.dispatchEvent(new Event(reason));
    expect(current.playState).toBe('idle');
    expect(owned()).toHaveLength(0);
    expect(getComputedStyle(root).opacity).toBe('1');
    await flush();
  });

  it('shell世代が変われば検証通知で旧効果を取消すこと', () => {
    expect(coordinator.start(owner)).toBe(true);
    const current = animation();
    current.pause();
    commitShellGeneration(1);
    document.dispatchEvent(new Event('app-shell:validated'));
    expect(current.playState).toBe('idle');
  });

  it('root破棄を検出し、取り外したrootにも停止効果を残さないこと', async () => {
    expect(coordinator.start(owner)).toBe(true);
    const current = animation();
    current.pause();
    current.currentTime = 90;
    root.remove();
    await waitForCondition(
      () => current.playState === 'idle',
      'Detached main must release its animation',
    );
    expect(owned()).toHaveLength(0);
  });

  it('同task内でrootを外して再接続しても旧寿命のAnimationを再利用しないこと', async () => {
    expect(coordinator.start(owner)).toBe(true);
    const current = animation();
    current.pause();
    const parent = root.parentElement;
    if (!parent) throw new Error('Expected fixture parent');
    root.remove();
    parent.append(root);
    await waitForCondition(
      () => current.playState === 'idle',
      'Reattached main must release old animation',
    );
  });

  it('mainの識別が失われた場合は効果を取消すこと', async () => {
    expect(coordinator.start(owner)).toBe(true);
    const current = animation();
    current.pause();
    root.id = 'removed-main';
    await waitForCondition(
      () => current.playState === 'idle',
      'Invalid main must release its animation',
    );
  });

  it('rootの表示対象を差し替えた場合も旧Animationだけを取消すこと', async () => {
    expect(coordinator.start(owner)).toBe(true);
    const current = animation();
    current.pause();
    const next = await fixture('<main id="main-content">New</main>');
    beginContentMutation(next);
    adoptContentBinding(readAddress());
    expect(current.playState).toBe('idle');
    expect(next.getAnimations()).toHaveLength(0);
  });

  it('後続位置補正の取消を同期で完了し、位置writerを待たせないこと', () => {
    expect(coordinator.start(owner)).toBe(true);
    const current = animation();
    current.pause();
    current.currentTime = 90;
    const positionWriter = vi.fn(() => {
      expect(current.playState).toBe('idle');
      expect(getComputedStyle(root).opacity).toBe('1');
    });
    coordinator.cancel('position-correction');
    positionWriter();
    expect(positionWriter).toHaveBeenCalledTimes(1);
    coordinator.cancel('position-correction');
    expect(current.playState).toBe('idle');
  });

  it.each(['observer', 'abort listener'])(
    '%sの解放例外も位置補正と効果の取消へ漏らさないこと',
    (failure) => {
      expect(coordinator.start(owner)).toBe(true);
      const current = animation();
      current.pause();
      if (failure === 'observer') {
        const disconnect = MutationObserver.prototype.disconnect;
        vi.spyOn(MutationObserver.prototype, 'disconnect').mockImplementationOnce(function (
          this: MutationObserver,
        ) {
          disconnect.call(this);
          throw new Error('observer release failed');
        });
      } else {
        const remove = owner.intent.signal.removeEventListener.bind(owner.intent.signal);
        vi.spyOn(owner.intent.signal, 'removeEventListener').mockImplementationOnce(
          (type, listener, options) => {
            remove(type, listener, options);
            throw new Error('listener release failed');
          },
        );
      }
      expect(() => coordinator.cancel('position-correction')).not.toThrow();
      expect(current.playState).toBe('idle');
      expect(owned()).toHaveLength(0);
      expect(coordinator.start(owner)).toBe(true);
      expect(() => coordinator.dispose()).not.toThrow();
    },
  );

  it('自然終了時のobserver解放例外を未処理rejectにしないこと', async () => {
    expect(coordinator.start(owner)).toBe(true);
    const current = animation();
    const disconnect = MutationObserver.prototype.disconnect;
    vi.spyOn(MutationObserver.prototype, 'disconnect').mockImplementationOnce(function (
      this: MutationObserver,
    ) {
      disconnect.call(this);
      throw new Error('finished cleanup failed');
    });
    await current.finished;
    await flush();
    expect(current.playState).toBe('idle');
    expect(coordinator.start(owner)).toBe(true);
  });

  it('Animation生成例外を局所捕捉し、次の開始を妨げないこと', () => {
    const animate = vi.spyOn(root, 'animate').mockImplementationOnce(() => {
      throw new Error('WAAPI failed');
    });
    expect(coordinator.start(owner)).toBe(false);
    expect(root.getAttribute('style')).toBe(null);
    expect(coordinator.start(owner)).toBe(true);
    expect(animate).toHaveBeenCalledTimes(2);
  });

  it('finished取得例外も局所捕捉し、生成済み効果を残さないこと', () => {
    const nativeAnimate = root.animate.bind(root);
    vi.spyOn(root, 'animate').mockImplementationOnce((keyframes, options) => {
      const current = nativeAnimate(keyframes, options);
      Object.defineProperty(current, 'finished', {
        configurable: true,
        get: () => {
          throw new Error('finished unavailable');
        },
      });
      return current;
    });
    expect(coordinator.start(owner)).toBe(false);
    expect(owned()).toHaveLength(0);
    expect(coordinator.start(owner)).toBe(true);
  });

  it.each(['resolve', 'reject'])(
    '旧finishedの遅延%sが新Animationを取消さないこと',
    async (outcome) => {
      const oldFinished = deferred<Animation>();
      const nativeAnimate = root.animate.bind(root);
      let oldAnimation: Animation | null = null;
      vi.spyOn(root, 'animate').mockImplementationOnce((keyframes, options) => {
        const previous = nativeAnimate(keyframes, options);
        previous.pause();
        Object.defineProperty(previous, 'finished', {
          configurable: true,
          get: () => oldFinished.promise,
        });
        oldAnimation = previous;
        return previous;
      });
      expect(coordinator.start(owner)).toBe(true);
      const previous = animation();
      expect(oldAnimation).toBe(previous);
      coordinator.cancel('superseded');
      expect(coordinator.start(owner)).toBe(true);
      const next = animation();
      next.pause();
      next.currentTime = 90;
      if (outcome === 'resolve') oldFinished.resolve(previous);
      else oldFinished.reject(new DOMException('cancelled', 'AbortError'));
      await flush();
      expect(previous.playState).toBe('idle');
      expect(next.playState).toBe('paused');
      expect(owned()).toEqual([next]);
      coordinator.cancel('position-correction');
      expect(next.playState).toBe('idle');
    },
  );

  it('失効したstart要求が有効な新Animationを取り消さないこと', () => {
    expect(coordinator.start(owner)).toBe(true);
    const current = animation();
    current.pause();
    expect(coordinator.start({ ...owner, contentEpoch: owner.contentEpoch - 1 })).toBe(false);
    expect(current.playState).toBe('paused');
    expect(owned()).toEqual([current]);
  });

  it('Animation作成中にintentが失効したら生成効果を残さないこと', () => {
    const nativeAnimate = root.animate.bind(root);
    vi.spyOn(root, 'animate').mockImplementationOnce((keyframes, options) => {
      const current = nativeAnimate(keyframes, options);
      beginNavigationIntent('navigation', readAddress());
      return current;
    });
    expect(coordinator.start(owner)).toBe(false);
    expect(owned()).toHaveLength(0);
  });

  it('所有者payloadを後から書換えても固定sessionの整合判定を変更しないこと', async () => {
    const mutableOwner = { ...owner };
    expect(coordinator.start(mutableOwner)).toBe(true);
    const current = animation();
    current.pause();
    mutableOwner.contentEpoch += 1;
    root.append(document.createElement('span'));
    await flush();
    expect(current.playState).toBe('paused');
  });

  it('実Backで90ms pauseの旧Animationを解除しURLとentryを戻すこと', async () => {
    const previousEntryId = readHistoryEntry()?.id;
    const nextUrl = `${location.pathname}?history-presentation=next`;
    writeHistoryEntry({ mode: 'push', owner: 'router', url: nextUrl });
    initializeContentContext(root);
    beginNavigationIntent('traverse', nextUrl);
    adoptContentBinding(nextUrl);
    const nextOwner = snapshotOwner();
    expect(nextOwner.entryId).not.toBe(previousEntryId);
    expect(coordinator.start(nextOwner)).toBe(true);
    const current = animation();
    current.pause();
    current.currentTime = 90;
    const popped = new Promise<void>((resolve) =>
      window.addEventListener('popstate', () => resolve(), { once: true }),
    );
    history.back();
    await popped;
    expect(readAddress()).toBe(originalUrl);
    expect(readHistoryEntry()?.id).toBe(previousEntryId);
    expect(current.playState).toBe('idle');
    expect(owned()).toHaveLength(0);
    expect(getComputedStyle(root).opacity).toBe('1');
  });
});
