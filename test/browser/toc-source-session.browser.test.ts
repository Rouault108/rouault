import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { fixture, requireFixtureValue } from './harness/browser-fixture.js';
import {
  disposeTocSourceSession,
  getTocSourceSession,
  type TocSourceSession,
} from '../../src/toc/toc-source-session.js';
import {
  beginNavigationIntent,
  initializeContentContext,
  readContentContext,
  releaseContentContext,
} from '../../src/navigation/content-navigation-context.js';
import {
  readAddress,
  readHistoryEntry,
  writeHistoryEntry,
} from '../../src/navigation/history-entry.js';
import { readCurrentShellCommitId } from '../../src/components/app/shell/app-shell-lifecycle.js';
import type {
  AcceptedReadingPosition,
  NativeReadingPositionObservation,
} from '../../src/components/app/controllers/reading-position-controller.js';

const originalState: unknown = history.state;
const originalUrl = readAddress();
let baselineState: unknown;
let root: HTMLElement | null = null;
let controller: HTMLElement | null = null;

beforeAll(() => {
  writeHistoryEntry({ mode: 'replace', owner: 'router', url: originalUrl, state: {} });
  baselineState = history.state;
});
afterAll(() => history.replaceState(originalState, '', originalUrl));
afterEach(() => {
  if (controller) disposeTocSourceSession(controller);
  releaseContentContext(root);
  controller = null;
  root = null;
  vi.restoreAllMocks();
  if (
    readAddress() !== originalUrl ||
    JSON.stringify(history.state) !== JSON.stringify(baselineState)
  )
    history.replaceState(baselineState, '', originalUrl);
  window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
});

const headings = [
  { id: 'session-one', text: '最初の見出し', level: 2 },
  { id: 'session-two', text: '途中の見出し', level: 2 },
  { id: 'session-three', text: '最後の見出し', level: 2 },
];

const setup = async (): Promise<{
  session: TocSourceSession;
  position: AcceptedReadingPosition;
}> => {
  root = await fixture(`<main id="main-content" style="display:flow-root">
    <div class="note-shell" style="display:grid;grid-template-columns:minmax(0,1fr) 240px;--note-toc-track:240px">
      <article style="height:5000px;min-width:0">
        ${headings.map((heading, index) => `<h2 id="${heading.id}" style="margin:0;position:relative;top:${index * 1200}px">${heading.text}</h2>`).join('')}
      </article>
      <aside data-layout-toc-root data-hydration-owner-id="session-owner"
        style="position:sticky;top:0;grid-column:2;align-self:start;min-inline-size:0;overflow:hidden;block-size:600px;max-block-size:600px">
        <nav data-layout-toc-nav>${headings.map((heading) => `<div data-heading-id="${heading.id}"><a href="#${heading.id}" data-toc-link data-heading-id="${heading.id}">${heading.text}</a></div>`).join('')}</nav>
        <layout-toc-controller source-id="session-source" toc-owner-id="session-owner"
          content-root-id="main-content" toc-runtime-id="session-source"
          capabilities-json='{"activeTracking":true}'></layout-toc-controller>
        <script id="session-source" type="application/json" data-toc-owner-id="session-owner"
          data-hydration-owner-id="session-owner" data-hydration-scope="main-content"
          data-hydration-marker="toc-source">${JSON.stringify(headings)}</script>
      </aside>
    </div>
  </main>`);
  const contentEpoch = initializeContentContext(root);
  const intent = beginNavigationIntent('traverse', readAddress());
  const receipt = Object.freeze({
    commitId: 1,
    intentId: intent.intentId,
    entryId: readHistoryEntry()?.id ?? null,
    url: readAddress(),
    contentEpoch,
    root,
    shellCommitId: readCurrentShellCommitId(),
    stateOnly: false,
    commitTiming: 'synchronous' as const,
  });
  controller = requireFixtureValue(root.querySelector<HTMLElement>('layout-toc-controller'));
  const session = requireFixtureValue(getTocSourceSession(controller));
  window.scrollTo({ top: 1300, left: 0, behavior: 'instant' });
  return { session, position: { root, intent, receipt } };
};

const active = (nav: Element): string[] =>
  Array.from(
    nav.querySelectorAll<HTMLElement>('[data-toc-link][aria-current="location"]'),
    (link) => link.dataset['headingId'] ?? '',
  );
const assertCurrent = (nav: Element, id: string): void => {
  expect(active(nav)).toEqual([id]);
  for (const link of nav.querySelectorAll<HTMLElement>('[data-toc-link]')) {
    const current = link.dataset['headingId'] === id;
    expect(link.getAttribute('data-active')).toBe(current ? 'true' : null);
    expect(link.classList.contains('is-active')).toBe(current);
  }
};

// 自動時間進行に頼らず、通知再入で予約された処理だけを明示的に進める。
const captureScheduling = (): {
  microtasks: VoidFunction[];
  frames: FrameRequestCallback[];
  timers: { action: TimerHandler; delay: number | undefined }[];
  drainMicrotasks: () => void;
} => {
  const microtasks: VoidFunction[] = [];
  const frames: FrameRequestCallback[] = [];
  const timers: { action: TimerHandler; delay: number | undefined }[] = [];
  vi.spyOn(window, 'queueMicrotask').mockImplementation((action) => {
    microtasks.push(action);
  });
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((action) => {
    frames.push(action);
    return frames.length;
  });
  const createTimer = globalThis.setTimeout;
  vi.spyOn(window, 'setTimeout').mockImplementation((action, delay) => {
    timers.push({ action, delay });
    const handle = createTimer(() => undefined, 0);
    window.clearTimeout(handle);
    return handle;
  });
  return {
    microtasks,
    frames,
    timers,
    drainMicrotasks: () => {
      let count = 0;
      while (microtasks.length) {
        // 上限はテストの無限ループ検出であり、runtimeの因果上限ではない。
        if (++count > 20) throw new Error('refresh notification did not settle');
        microtasks.shift()?.();
      }
    },
  };
};

const nativeObservation = (
  position: AcceptedReadingPosition,
  sequence: number,
  isCurrent: () => boolean,
): NativeReadingPositionObservation => ({
  root: position.root,
  intent: position.intent,
  contentEpoch: requireFixtureValue(readContentContext()).contentEpoch,
  shellCommitId: readCurrentShellCommitId(),
  entryId: readHistoryEntry()?.id ?? null,
  url: readAddress(),
  sequence,
  policy: 'native-viewport',
  phase: 'accepted',
  isCurrent,
});

describe('TocSourceSession の単一所有と予約・transaction 契約', () => {
  it('取得は副作用を起こさず、early受理から通常activationまで同じtrackerを保持する', async () => {
    const { session, position } = await setup();
    const scheduling = captureScheduling();
    const observe = vi.spyOn(session.tracker, 'observe');
    const tracker = session.tracker;
    expect(getTocSourceSession(requireFixtureValue(controller))).toBe(session);
    expect(session.snapshot).toBeNull();
    expect(observe).not.toHaveBeenCalled();
    expect(session.accept(position)).toBe('accepted');
    assertCurrent(session.binding.nav, 'session-two');
    expect(scheduling.timers).toHaveLength(0);
    expect(scheduling.frames).toHaveLength(0);
    session.activate();
    session.activate();
    expect(getTocSourceSession(requireFixtureValue(controller))).toBe(session);
    expect(session.tracker).toBe(tracker);
    expect(scheduling.timers.map((timer) => timer.delay)).toEqual([0, 120]);
    assertCurrent(session.binding.nav, 'session-two');
  });

  it('接続中のregistry再入は公開済みの同一sessionを返し、旧session破棄は新ownerを消さない', async () => {
    const { session, position } = await setup();
    captureScheduling();
    const add = window.addEventListener.bind(window);
    let reentered: TocSourceSession | null = null;
    vi.spyOn(window, 'addEventListener').mockImplementation((...args) => {
      if (args[0] === 'hashchange')
        reentered = getTocSourceSession(requireFixtureValue(controller));
      add(...args);
    });
    expect(session.accept(position)).toBe('accepted');
    expect(reentered).toBe(session);
    const script = requireFixtureValue(position.root.querySelector('script'));
    script.text = JSON.stringify(
      headings.map((heading) => ({ ...heading, text: `${heading.text} 更新` })),
    );
    const next = requireFixtureValue(getTocSourceSession(requireFixtureValue(controller)));
    expect(next).not.toBe(session);
    session.dispose();
    expect(next.isCurrent()).toBe(true);
    expect(getTocSourceSession(requireFixtureValue(controller))).toBe(next);
  });

  it('strict適格性skipは即normal fallbackせず、後の正規activationでのみ通常適用する', async () => {
    const { session, position } = await setup();
    captureScheduling();
    requireFixtureValue(position.root.querySelector<HTMLElement>('.note-shell')).style.setProperty(
      '--note-toc-track',
      'auto',
    );
    const y = scrollY;
    expect(session.accept(position)).toBe('skipped');
    expect(session.snapshot).toBeNull();
    expect(active(session.binding.nav)).toEqual([]);
    expect(scrollY).toBe(y);
    session.activate();
    assertCurrent(session.binding.nav, 'session-two');
    expect(scrollY).toBe(y);
  });

  it('同じ候補のDOM repairは再通知せず、新surfaceはその場のviewportへ同期する', async () => {
    const { session, position } = await setup();
    captureScheduling();
    expect(session.accept(position)).toBe('accepted');
    session.activate();
    const listener = vi.fn();
    session.subscribe(listener);
    const link = requireFixtureValue(
      session.binding.nav.querySelector<HTMLElement>('[data-heading-id="session-two"] a'),
    );
    link.removeAttribute('aria-current');
    link.removeAttribute('data-active');
    link.classList.remove('is-active');
    session.refresh();
    expect(listener).toHaveBeenCalledTimes(1);
    assertCurrent(session.binding.nav, 'session-two');
    const surface = document.createElement('section');
    surface.hidden = true;
    const nav = session.binding.nav.cloneNode(true);
    if (!(nav instanceof HTMLElement)) throw new Error('nav clone');
    surface.append(nav);
    position.root.append(surface);
    window.scrollTo({ top: 2550, behavior: 'instant' });
    const detach = session.attachSurface({ nav, root: surface });
    assertCurrent(nav, 'session-three');
    assertCurrent(session.binding.nav, 'session-three');
    expect(listener).toHaveBeenCalledTimes(2);
    detach();
    surface.remove();
  });

  it('surface接続のrefresh例外は自分の登録を外し、presentation再試行を妨げない', async () => {
    const { session, position } = await setup();
    captureScheduling();
    session.activate();
    const stale = document.createElement('section');
    stale.hidden = true;
    const staleNav = session.binding.nav.cloneNode(true);
    if (!(staleNav instanceof HTMLElement)) throw new Error('stale nav');
    stale.append(staleNav);
    position.root.append(stale);
    vi.spyOn(session.tracker, 'refresh').mockImplementationOnce(() => {
      throw new Error('surface refresh');
    });
    expect(() => session.attachSurface({ root: stale, nav: staleNav })).toThrow('surface refresh');
    stale.remove();
    const fresh = document.createElement('section');
    fresh.hidden = true;
    const freshNav = session.binding.nav.cloneNode(true);
    if (!(freshNav instanceof HTMLElement)) throw new Error('fresh nav');
    fresh.append(freshNav);
    position.root.append(fresh);
    window.scrollTo({ top: 2550, behavior: 'instant' });
    const detach = session.attachSurface({ root: fresh, nav: freshNav });
    assertCurrent(freshNav, 'session-three');
    assertCurrent(session.binding.nav, 'session-three');
    detach();
    fresh.remove();
  });

  it('別linkのcurrentを途中で変更するwriteはDOM verifyで拒否し、他処理の値をrollbackしない', async () => {
    const { session, position } = await setup();
    captureScheduling();
    const first = requireFixtureValue(
      session.binding.nav.querySelector<HTMLElement>('a[data-heading-id="session-one"]'),
    );
    const second = requireFixtureValue(
      session.binding.nav.querySelector<HTMLElement>('a[data-heading-id="session-two"]'),
    );
    const write = second.setAttribute.bind(second);
    vi.spyOn(second, 'setAttribute').mockImplementation((name, value) => {
      write(name, value);
      if (name === 'data-active') first.setAttribute('aria-current', 'location');
    });
    const listener = vi.fn();
    session.subscribe(listener);
    expect(session.accept(position)).toBe('rejected-after');
    expect(session.snapshot).toBeNull();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(first.getAttribute('aria-current')).toBe('location');
    expect(second.hasAttribute('aria-current')).toBe(false);
  });

  it('通知中のA→B→C intentは再帰applyせず、最新Cを次の予約で採用する', async () => {
    const { session, position } = await setup();
    const scheduling = captureScheduling();
    const notifications: string[] = [];
    session.subscribe(() => {
      const id = session.snapshot?.activeId;
      if (!id) return;
      notifications.push(id);
      if (id !== 'session-two') return;
      beginNavigationIntent('navigation', readAddress());
      session.applyActiveId('session-one');
      beginNavigationIntent('navigation', readAddress());
      session.applyActiveId('session-three');
      expect(session.snapshot?.activeId).toBe('session-two');
    });
    expect(session.accept(position)).toBe('accepted');
    scheduling.drainMicrotasks();
    assertCurrent(session.binding.nav, 'session-three');
    expect(notifications).toEqual(['session-two', 'session-three']);
  });

  it('同じowner/intentの通常更新は通知中のstrict pendingを弱めない', async () => {
    const { session, position } = await setup();
    const scheduling = captureScheduling();
    let queuedResult: string | undefined;
    session.subscribe(() => {
      if (session.snapshot?.activeId !== 'session-two') return;
      window.scrollTo({ top: 2550, behavior: 'instant' });
      queuedResult = session.accept({ ...position, sequence: 2 });
      session.applyActiveId('session-one');
    });
    expect(session.accept({ ...position, sequence: 1 })).toBe('accepted');
    expect(queuedResult).toBe('skipped');
    expect(session.snapshot?.activeId).toBe('session-two');
    scheduling.drainMicrotasks();
    assertCurrent(session.binding.nav, 'session-three');
  });

  it('新position sequenceの後に古い観測callbackが届いても古いnative policyを採用しない', async () => {
    const { session, position } = await setup();
    captureScheduling();
    let sequence = 1;
    const old = nativeObservation(position, 1, () => sequence === 1);
    session.observe(old);
    assertCurrent(session.binding.nav, 'session-two');
    sequence = 2;
    window.scrollTo({ top: 2550, behavior: 'instant' });
    session.observe(nativeObservation(position, 2, () => sequence === 2));
    const candidate = vi.spyOn(session.tracker, 'readCandidate');
    session.observe(old);
    expect(candidate).not.toHaveBeenCalled();
    assertCurrent(session.binding.nav, 'session-three');
  });

  it('pagehideはpending strictを失効し、残った通常予約は最新viewportを再読する', async () => {
    const { session, position } = await setup();
    const scheduling = captureScheduling();
    let hidden = false;
    session.activate();
    session.subscribe(() => {
      if (hidden || session.snapshot?.activeId !== 'session-three') return;
      hidden = true;
      session.accept(position);
      window.dispatchEvent(new Event('pagehide'));
      window.scrollTo({ top: 1300, behavior: 'instant' });
    });
    window.scrollTo({ top: 2550, behavior: 'instant' });
    session.refresh();
    const current = getTocSourceSession(requireFixtureValue(controller));
    expect(current).toBe(session);
    scheduling.drainMicrotasks();
    assertCurrent(session.binding.nav, 'session-two');
    window.dispatchEvent(new Event('pageshow'));
    expect(getTocSourceSession(requireFixtureValue(controller))).toBe(session);
  });

  it('初期refresh例外でもfollowup各枠を試行し、activation再試行はtimerを再登録しない', async () => {
    const { session } = await setup();
    const scheduling = captureScheduling();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const refresh = vi.spyOn(session.tracker, 'refresh').mockImplementationOnce(() => {
      throw new Error('initial refresh');
    });
    session.activate();
    expect(scheduling.timers.map((timer) => timer.delay)).toEqual([0, 120]);
    expect(scheduling.frames).toHaveLength(3);
    expect(scheduling.microtasks).toHaveLength(1);
    expect(refresh).toHaveBeenCalledTimes(1);
    session.activate();
    expect(scheduling.timers.map((timer) => timer.delay)).toEqual([0, 120]);
    assertCurrent(session.binding.nav, 'session-two');
  });

  it('一つの初期timer登録例外は残り枠を妨げず、retryで成功枠を再登録しない', async () => {
    const { session } = await setup();
    const scheduling = captureScheduling();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.mocked(window.setTimeout).mockImplementationOnce(() => {
      throw new Error('registration');
    });
    session.activate();
    expect(scheduling.timers.map((timer) => timer.delay)).toEqual([120]);
    expect(scheduling.frames).toHaveLength(3);
    expect(scheduling.microtasks).toHaveLength(1);
    session.activate();
    expect(scheduling.timers.map((timer) => timer.delay)).toEqual([120]);
    assertCurrent(session.binding.nav, 'session-two');
  });

  it('rAF登録の例外後も後続のscroll入力を予約できる', async () => {
    const { session } = await setup();
    const scheduling = captureScheduling();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.mocked(window.requestAnimationFrame).mockImplementationOnce(() => {
      throw new Error('frame registration');
    });
    session.activate();
    // controller由来の初期frameがさらにviewport frameを一つ予約するため、全枠を進める。
    for (let pass = 0; scheduling.frames.length && pass < 5; pass += 1) {
      const frames = scheduling.frames.splice(0);
      frames.forEach((frame) => frame(performance.now()));
    }
    expect(scheduling.frames).toHaveLength(0);
    const count = scheduling.frames.length;
    window.scrollTo({ top: 2550, behavior: 'instant' });
    window.dispatchEvent(new Event('scroll'));
    expect(scheduling.frames.length).toBeGreaterThan(count);
    scheduling.frames.shift()?.(performance.now());
    assertCurrent(session.binding.nav, 'session-three');
  });

  it('rollback後に実XYが変わった事実を記録し、成功snapshotへ確定しない', async () => {
    const { session, position } = await setup();
    captureScheduling();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const read = session.tracker.readCandidate.bind(session.tracker);
    vi.spyOn(session.tracker, 'readCandidate')
      .mockImplementationOnce(read)
      .mockImplementationOnce(() => {
        throw new Error('verify');
      });
    const second = requireFixtureValue(
      session.binding.nav.querySelector<HTMLElement>('a[data-heading-id="session-two"]'),
    );
    const remove = second.removeAttribute.bind(second);
    vi.spyOn(second, 'removeAttribute').mockImplementation((name) => {
      remove(name);
      if (name === 'aria-current') window.scrollTo({ top: 2100, behavior: 'instant' });
    });
    expect(session.accept(position)).toBe('rejected-after');
    expect(session.snapshot).toBeNull();
    expect(position.root.dataset['tocPositionPreserved']).toBe('false');
    expect(scrollY).toBe(2100);
    expect(active(session.binding.nav)).toEqual([]);
  });

  it.each(['write', 'verify', 'rollback'] as const)(
    '%s例外を境界内に隔離し、未確定snapshotを通知しない',
    async (failure) => {
      const { session, position } = await setup();
      captureScheduling();
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const listener = vi.fn();
      session.subscribe(listener);
      const second = requireFixtureValue(
        session.binding.nav.querySelector<HTMLElement>('a[data-heading-id="session-two"]'),
      );
      const write = second.setAttribute.bind(second);
      if (failure === 'verify') {
        const read = session.tracker.readCandidate.bind(session.tracker);
        vi.spyOn(session.tracker, 'readCandidate')
          .mockImplementationOnce(read)
          .mockImplementationOnce(() => {
            throw new Error('verify');
          });
      } else {
        vi.spyOn(second, 'setAttribute').mockImplementation((name, value) => {
          if (name === 'data-active') throw new Error('partial write');
          write(name, value);
        });
        if (failure === 'rollback')
          vi.spyOn(second, 'removeAttribute').mockImplementation(() => {
            throw new Error('rollback');
          });
      }
      expect(() => session.accept(position)).not.toThrow();
      expect(session.snapshot).toBeNull();
      expect(listener).toHaveBeenCalledTimes(1);
      expect(console.error).toHaveBeenCalled();
      // writefaultは通常refreshで繰り返さず、許可されたactivationでのみ再試行する。
      const read = vi.spyOn(session.tracker, 'readCandidate');
      read.mockClear();
      session.refresh();
      expect(read).not.toHaveBeenCalled();
    },
  );
});
