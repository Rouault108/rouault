import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';

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
  markContentRecoveryRequired,
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

const restoreHistoryState = (state: unknown, url: string): void => {
  // 参照の差だけで履歴を書き直さず、保存したstateの内容を比較する。
  if (readAddress() !== url || JSON.stringify(history.state) !== JSON.stringify(state))
    history.replaceState(state, '', url);
};

afterAll(async () => {
  restoreHistoryState(originalState, originalUrl);
  // navigation-state shardはtop-level sessionを共有する。既存reading suiteと同じ境界待機を設ける。
  await new Promise<void>((resolve) => window.setTimeout(resolve, 10_000));
}, 15_000);

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
    restoreHistoryState(baselineState, originalUrl);
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

  it.each(['/notes/testing/reader-basic', '/tags/reading', '/discovery', '/about'])(
    '%sのcurrent managed traverse ownerでも同じmainだけを演出すること',
    (url) => {
      history.replaceState(history.state, '', url);
      initializeContentContext(root);
      beginNavigationIntent('traverse', url);
      adoptContentBinding(url);
      const currentOwner = snapshotOwner();
      const scroll = vi.spyOn(window, 'scrollTo');
      expect(coordinator.start(currentOwner)).toBe(true);
      expect(animation().effect).toBeInstanceOf(KeyframeEffect);
      expect(readHistoryEntry()?.id).toBe(currentOwner.entryId);
      expect(readAddress()).toBe(url);
      expect(scroll).not.toHaveBeenCalled();
    },
  );

  it.each(['initial', 'navigation', 'native-navigation'] as const)(
    '%sの正当ownerでも履歴用効果を作らないこと',
    (cause) => {
      beginNavigationIntent(cause, readAddress());
      adoptContentBinding(readAddress());
      const animate = vi.spyOn(root, 'animate');
      expect(coordinator.start(snapshotOwner())).toBe(false);
      expect(animate).not.toHaveBeenCalled();
    },
  );

  it('binding回復が必要になった時は効果を取消し同ownerで再開始しないこと', () => {
    const animate = vi.spyOn(root, 'animate');
    const scroll = vi.spyOn(window, 'scrollTo');
    expect(coordinator.start(owner)).toBe(true);
    const current = animation();
    current.pause();
    markContentRecoveryRequired(root, owner.contentEpoch);
    expect(current.playState).toBe('idle');
    expect(coordinator.start(owner)).toBe(false);
    expect(animate).toHaveBeenCalledTimes(1);
    expect(scroll).not.toHaveBeenCalled();
  });

  it.each(['hidden', 'inert', 'visibility'])(
    'main自体が%sの間は正当ownerでも開始しないこと',
    (state) => {
      if (state === 'hidden') root.hidden = true;
      else if (state === 'inert') root.inert = true;
      else root.style.visibility = 'hidden';
      const animate = vi.spyOn(root, 'animate');
      expect(coordinator.start(owner)).toBe(false);
      expect(animate).not.toHaveBeenCalled();
    },
  );

  it('実trusted clickを遮らず一度届け、入力時に履歴効果を解除すること', async () => {
    expect(coordinator.start(owner)).toBe(true);
    const current = animation();
    current.pause();
    current.currentTime = 90;
    const button = root.querySelector('button');
    if (!button) throw new Error('Expected live button');
    const clicks: boolean[] = [];
    const pointers: { trusted: boolean; prevented: boolean }[] = [];
    button.addEventListener('click', (event) => clicks.push(event.isTrusted));
    button.addEventListener('pointerdown', (event) =>
      pointers.push({ trusted: event.isTrusted, prevented: event.defaultPrevented }),
    );
    await page.getByRole('button', { name: '操作', exact: true }).click();
    expect(clicks).toEqual([true]);
    expect(pointers).toEqual([{ trusted: true, prevented: false }]);
    expect(current.playState).toBe('idle');
    expect(owned()).toHaveLength(0);
  });

  it('ResizeObserver初回と幾何を変えないTOC active投影で演出を取消さないこと', async () => {
    root.style.height = '140px';
    const link = document.createElement('a');
    link.textContent = '目次の現在項目';
    link.style.cssText = 'display:block;height:24px;overflow:hidden;font-weight:400';
    root.append(link);
    expect(coordinator.start(owner)).toBe(true);
    const current = animation();
    current.pause();
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
    expect(current.playState).toBe('paused');
    link.setAttribute('aria-current', 'true');
    link.classList.add('active');
    link.style.fontWeight = '500';
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
    expect(current.playState).toBe('paused');
    expect(owned()).toEqual([current]);
  });

  it.each(['width', 'height', 'position', 'overflow', 'hidden', 'inert', 'visibility'])(
    'active mainの%s変化は演出だけを取消しscroll/focusを追加しないこと',
    async (change) => {
      root.style.cssText = 'width:400px;height:100px';
      expect(coordinator.start(owner)).toBe(true);
      const current = animation();
      current.pause();
      const scroll = vi.spyOn(window, 'scrollTo');
      const focus = vi.spyOn(root, 'focus');
      if (change === 'width') root.style.width = '420px';
      else if (change === 'height') root.style.height = '120px';
      else if (change === 'position') root.style.marginTop = '20px';
      else if (change === 'overflow') {
        const content = document.createElement('div');
        content.style.height = '250px';
        root.append(content);
      } else if (change === 'hidden') root.hidden = true;
      else if (change === 'inert') root.inert = true;
      else root.style.visibility = 'hidden';
      await waitForCondition(
        () => current.playState === 'idle',
        'Changed main must release opacity',
      );
      expect(owned()).toHaveLength(0);
      expect(scroll).not.toHaveBeenCalled();
      expect(focus).not.toHaveBeenCalled();
    },
  );

  it('DOM mutationを伴わないmain寸法変更もResizeObserverで取消すこと', async () => {
    const style = await fixture('<style>main:has(input:checked){width:420px}</style>');
    root.style.height = '100px';
    const input = document.createElement('input');
    input.type = 'checkbox';
    root.append(input);
    const width = root.getBoundingClientRect().width;
    expect(coordinator.start(owner)).toBe(true);
    const current = animation();
    current.pause();
    // checked propertyはattribute mutationを出さない。入力eventも送らず純粋な寸法検出を確認する。
    input.checked = true;
    expect(root.getBoundingClientRect().width).not.toBe(width);
    await waitForCondition(() => current.playState === 'idle', 'Resize must release opacity');
    style.remove();
  });

  it.each(['disconnected', 'outside-main'])(
    '%sのanchorを持つownerは開始せず現在の表示を変更しないこと',
    async (state) => {
      const anchor = document.createElement('p');
      anchor.textContent = '読書anchor';
      if (state === 'outside-main') {
        const outside = await fixture('<section>本文外</section>');
        outside.append(anchor);
      }
      const animate = vi.spyOn(root, 'animate');
      expect(coordinator.start({ ...owner, anchor })).toBe(false);
      expect(animate).not.toHaveBeenCalled();
    },
  );

  it('mainの総寸法が同じでも読書anchorが移動したら演出だけを取消すこと', async () => {
    root.style.cssText = 'width:400px;height:400px';
    root.innerHTML =
      '<div style="height:80px"></div><p style="height:24px;margin:0">読書anchor</p><div style="height:200px"></div>';
    const anchor = root.querySelector('p');
    const before = root.firstElementChild;
    const after = root.lastElementChild;
    if (!anchor || !(before instanceof HTMLElement) || !(after instanceof HTMLElement))
      throw new Error('anchor fixture missing');
    const rootHeight = root.getBoundingClientRect().height;
    const scrollHeight = root.scrollHeight;
    const anchorTop = anchor.getBoundingClientRect().top;
    expect(coordinator.start({ ...owner, anchor })).toBe(true);
    const current = animation();
    current.pause();
    const scroll = vi.spyOn(window, 'scrollTo');
    const focus = vi.spyOn(root, 'focus');
    before.style.height = '100px';
    after.style.height = '180px';
    expect(root.getBoundingClientRect().height).toBe(rootHeight);
    expect(root.scrollHeight).toBe(scrollHeight);
    expect(anchor.getBoundingClientRect().top - anchorTop).toBe(20);
    await waitForCondition(() => current.playState === 'idle', 'Moved anchor must release opacity');
    expect(scroll).not.toHaveBeenCalled();
    expect(focus).not.toHaveBeenCalled();
  });

  it('初回通知後のanchorだけのresizeをDOM mutationなしでも検出すること', async () => {
    const style = await fixture(
      '<style>[data-reader-anchor]{display:block;width:200px;height:24px;margin:0}main:has(input:checked) [data-reader-anchor]{width:220px;height:44px;margin-top:20px}</style>',
    );
    root.style.cssText = 'width:400px;height:200px';
    root.innerHTML = '<input type="checkbox"><p data-reader-anchor>読書anchor</p>';
    const input = root.querySelector('input');
    const anchor = root.querySelector('p');
    if (!input || !anchor) throw new Error('anchor resize fixture missing');
    const rootHeight = root.getBoundingClientRect().height;
    const scrollHeight = root.scrollHeight;
    const anchorTop = anchor.getBoundingClientRect().top;
    expect(coordinator.start({ ...owner, anchor })).toBe(true);
    const current = animation();
    current.pause();
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
    expect(current.playState).toBe('paused');
    input.checked = true;
    expect(root.getBoundingClientRect().height).toBe(rootHeight);
    expect(root.scrollHeight).toBe(scrollHeight);
    expect(anchor.getBoundingClientRect().top - anchorTop).toBe(20);
    await waitForCondition(
      () => current.playState === 'idle',
      'Resized anchor must release opacity',
    );
    style.remove();
  });

  it('anchorが同taskで取り外され再接続されても旧寿命の効果を残さないこと', async () => {
    const anchor = root.querySelector('p');
    if (!anchor) throw new Error('anchor missing');
    expect(coordinator.start({ ...owner, anchor })).toBe(true);
    const current = animation();
    current.pause();
    anchor.remove();
    root.append(anchor);
    await waitForCondition(
      () => current.playState === 'idle',
      'Detached anchor must release opacity',
    );
  });

  it('late font loading通知では演出だけを取消し位置とbindingを変更しないこと', () => {
    vi.spyOn(document.fonts, 'status', 'get').mockReturnValue('loading');
    const scroll = vi.spyOn(window, 'scrollTo');
    const focus = vi.spyOn(root, 'focus');
    const entryId = readHistoryEntry()?.id;
    const binding = readContentContext()?.displayedBinding;
    expect(coordinator.start(owner)).toBe(true);
    const current = animation();
    current.pause();
    document.fonts.dispatchEvent(new Event('loading'));
    expect(current.playState).toBe('idle');
    expect(scroll).not.toHaveBeenCalled();
    expect(focus).not.toHaveBeenCalled();
    expect(readHistoryEntry()?.id).toBe(entryId);
    expect(readContentContext()?.displayedBinding).toBe(binding);
  });

  it('読込完了後の遅配loading通知は現在の効果を消さず実際の再読込だけを取消すこと', async () => {
    const status = vi.spyOn(document.fonts, 'status', 'get').mockReturnValue('loaded');
    const scroll = vi.spyOn(window, 'scrollTo');
    const focus = vi.spyOn(root, 'focus');
    const binding = readContentContext()?.displayedBinding;
    expect(coordinator.start(owner)).toBe(true);
    const current = animation();
    current.pause();
    current.currentTime = 90;
    await current.ready;
    for (let index = 0; index < 20; index++) document.fonts.dispatchEvent(new Event('loading'));
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    expect(current.playState).toBe('paused');
    expect(current.currentTime).toBe(90);
    expect(Number(getComputedStyle(root).opacity)).toBeGreaterThanOrEqual(0.82);
    expect(Number(getComputedStyle(root).opacity)).toBeLessThan(1);
    status.mockReturnValue('loading');
    document.fonts.dispatchEvent(new Event('loading'));
    expect(current.playState).toBe('idle');
    expect(scroll).not.toHaveBeenCalled();
    expect(focus).not.toHaveBeenCalled();
    expect(readContentContext()?.displayedBinding).toBe(binding);
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

  it.each(['observer', 'resize observer', 'abort listener'])(
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
      } else if (failure === 'resize observer') {
        const disconnect = ResizeObserver.prototype.disconnect;
        vi.spyOn(ResizeObserver.prototype, 'disconnect').mockImplementationOnce(function (
          this: ResizeObserver,
        ) {
          disconnect.call(this);
          throw new Error('resize observer release failed');
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

  it('実Backと新session後のForwardで各旧Animationを解除しURLとentryを保つこと', async () => {
    const traverse = async (direction: 'back' | 'forward'): Promise<PopStateEvent> => {
      const observed: { event: PopStateEvent | null } = { event: null };
      const record = (event: PopStateEvent): void => {
        observed.event = event;
      };
      window.addEventListener('popstate', record);
      try {
        history[direction]();
        await waitForCondition(
          () => observed.event !== null,
          `Expected native ${direction} popstate`,
          { timeout: 2_000, interval: 10 },
        );
        if (!observed.event) throw new Error(`Missing native ${direction} event`);
        return observed.event;
      } finally {
        window.removeEventListener('popstate', record);
      }
    };
    // iframeの初期entryへのreplaceに依存せず、戻り先も明示的なmanaged entryとして作る。
    writeHistoryEntry({ mode: 'push', owner: 'router', url: originalUrl });
    const previousEntryId = readHistoryEntry()?.id;
    expect(previousEntryId).toBeTruthy();
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
    try {
      const popped = await traverse('back');
      expect(readAddress()).toBe(originalUrl);
      expect(readHistoryEntry(popped.state)?.id).toBe(previousEntryId);
      await expect.poll(() => readHistoryEntry()?.id).toBe(previousEntryId);
      expect(current.playState).toBe('idle');
      expect(owned()).toHaveLength(0);
      expect(getComputedStyle(root).opacity).toBe('1');
      beginNavigationIntent('traverse', readAddress());
      adoptContentBinding(readAddress());
      expect(coordinator.start(snapshotOwner())).toBe(true);
      const backAnimation = animation();
      backAnimation.pause();
      backAnimation.currentTime = 90;
      const forwarded = await traverse('forward');
      expect(readHistoryEntry(forwarded.state)?.id).toBe(nextOwner.entryId);
      await expect.poll(() => readHistoryEntry()?.id).toBe(nextOwner.entryId);
      expect(readAddress()).toBe(nextUrl);
      expect(backAnimation.playState).toBe('idle');
      expect(owned()).toHaveLength(0);
    } finally {
      // forward entryを残したまま次suiteへ渡すと、後続pushが履歴を切り詰めてlength契約を壊す。
      try {
        if (readAddress() !== nextUrl) {
          const forwarded = await traverse('forward');
          expect(readHistoryEntry(forwarded.state)?.id).toBe(nextOwner.entryId);
          await expect.poll(() => readHistoryEntry()?.id).toBe(nextOwner.entryId);
        }
      } finally {
        restoreHistoryState(baselineState, originalUrl);
      }
    }
  });
});
