import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { resolveRouterArtifactPathname } from '../../../shared/navigation/router-artifact-path.js';
import { e2eNoteFixtures } from './note-fixtures.js';

const longNote = '/notes/testing/toc-readable-long-heading';
const shortNote = '/notes/testing/reader-basic';
const title = 'TOC Readable Long Heading';

interface HistoryLiveFrame {
  at: number;
  phase: string;
  frame: number;
  url: string;
  title: string;
  x: number;
  y: number;
  anchorTop: number | null;
  entryId: string | null;
  epoch: number | null;
  status: string | null;
  eligibility: string | null;
  opacity: string | null;
  nativeMarker: boolean;
}
interface HistoryLiveProbe {
  active: boolean;
  pause: boolean;
  anchorId: string;
  anchorSelector: string;
  epoch: number | null;
  nativeSupported: boolean;
  nativeStarts: number;
  blockedHistoryAnimations: number;
  replaced: number;
  committed: number;
  focus: number;
  announcements: string[];
  frames: HistoryLiveFrame[];
  mutations: HistoryLiveFrame[];
  starts: { at: number; y: number; entryId: string | null; duration: number | null }[];
  cancels: { at: number; y: number; index: number }[];
  scrolls: {
    at: number;
    y: number;
    requestedX: number;
    requestedY: number;
    appliedX: number;
    appliedY: number;
    liveActive: boolean;
  }[];
  inputs: {
    at: number;
    type: string;
    trusted: boolean;
    currentTime: number | null;
    href: string | null;
    tag: string | null;
    raceAnchorMatches: boolean;
    raceAnchorConnected: boolean;
    raceNavConnected: boolean;
    raceLabelConnected: boolean;
  }[];
  visual: { provided: boolean; value: boolean | null } | null;
  animations: Animation[];
  raceTarget: Element | null;
  raceNav: Element | null;
  raceLabel: Element | null;
  raceDetachments: { at: number; kind: string }[];
  stateChanges: number;
}
declare global {
  interface Window {
    __rouaultHistoryLiveProbe: HistoryLiveProbe;
  }
}
interface SavedReading {
  y: number;
  anchorTop: number;
  anchorId: string;
  entryId: string;
  historyLength: number;
  epochBeforeBack: number;
  nativeStartsBeforeBack: number;
  points: Record<'main' | 'header' | 'sidebar', { x: number; y: number }>;
  sidebarOpen: boolean;
}

const ready = async (page: Page): Promise<void> => {
  await page.evaluate(async () => {
    await customElements.whenDefined('router-document-host');
    const host = document.querySelector('router-document-host');
    if (!host) throw new Error('router-document-host');
    await host.whenReady();
    await document.fonts.ready;
  });
  await expect(page.locator('#main-content')).toHaveAttribute(
    'data-reading-position-status',
    'settled',
  );
};
const navigate = async (page: Page, url: string): Promise<void> => {
  await page.evaluate(async (next) => {
    const host = document.querySelector('router-document-host');
    if (!host) throw new Error('router-document-host');
    const result = await host.navigate(next);
    if (!result.committed) throw new Error(result.outcome);
  }, url);
  await ready(page);
  await expect(page.locator('html')).not.toHaveAttribute('data-content-transition');
};

const installProbe = async (
  page: Page,
  pause = false,
  visual: 'native' | 'true' | 'undefined' | 'absent' = 'native',
  presentation: 'live' | 'none' = 'live',
): Promise<void> => {
  await page.addInitScript(
    ({ pause, visual, presentation }) => {
      if (visual === 'absent')
        Reflect.deleteProperty(PopStateEvent.prototype, 'hasUAVisualTransition');
      else if (visual !== 'native')
        Object.defineProperty(PopStateEvent.prototype, 'hasUAVisualTransition', {
          configurable: true,
          get: () => (visual === 'true' ? true : undefined),
        });
      const probe: HistoryLiveProbe = (window.__rouaultHistoryLiveProbe = {
        active: false,
        pause,
        anchorId: '',
        anchorSelector: '',
        epoch: null,
        nativeSupported: typeof document.startViewTransition === 'function',
        nativeStarts: 0,
        blockedHistoryAnimations: 0,
        replaced: 0,
        committed: 0,
        focus: 0,
        announcements: [],
        frames: [],
        mutations: [],
        starts: [],
        cancels: [],
        scrolls: [],
        inputs: [],
        visual: null,
        animations: [],
        raceTarget: null,
        raceNav: null,
        raceLabel: null,
        raceDetachments: [],
        stateChanges: 0,
      });
      const read = (phase: string, frame = 0): HistoryLiveFrame => {
        const main = document.querySelector<HTMLElement>('#main-content');
        return {
          at: performance.now(),
          phase,
          frame,
          url: location.pathname + location.search + location.hash,
          title: main?.querySelector('h1')?.textContent?.trim() ?? '',
          x: scrollX,
          y: scrollY,
          anchorTop:
            (probe.anchorSelector
              ? main?.querySelector(probe.anchorSelector)
              : document.getElementById(probe.anchorId)
            )?.getBoundingClientRect().top ?? null,
          entryId: history.state?.__rouaultHistoryEntry?.id ?? null,
          epoch: probe.epoch,
          status: main?.dataset['readingPositionStatus'] ?? null,
          eligibility: main?.dataset['historyPresentationEligibility'] ?? null,
          opacity: main ? getComputedStyle(main).opacity : null,
          nativeMarker: document.documentElement.hasAttribute('data-content-transition'),
        };
      };
      const animate = Element.prototype.animate;
      Element.prototype.animate = function (keyframes, options): Animation {
        if (
          presentation === 'none' &&
          typeof options === 'object' &&
          options.id === 'rouault-history-content'
        ) {
          probe.blockedHistoryAnimations++;
          throw new Error('History animation disabled for the input baseline');
        }
        const animation = animate.call(this, keyframes, options);
        if (animation.id !== 'rouault-history-content') return animation;
        const index = probe.animations.push(animation) - 1;
        const duration = animation.effect?.getTiming().duration;
        probe.starts.push({
          at: performance.now(),
          y: scrollY,
          entryId: history.state?.__rouaultHistoryEntry?.id ?? null,
          duration: typeof duration === 'number' ? duration : null,
        });
        const cancel = animation.cancel.bind(animation);
        animation.cancel = () => {
          probe.cancels.push({ at: performance.now(), y: scrollY, index });
          cancel();
        };
        // pause は自然進行の入力試験と分離し、取消と旧session残留だけを調べる。
        if (probe.pause) {
          animation.pause();
          animation.currentTime = 90;
        }
        return animation;
      };
      const nativeStart = document.startViewTransition?.bind(document);
      if (presentation === 'none')
        Object.defineProperty(document, 'startViewTransition', {
          configurable: true,
          value: undefined,
        });
      else if (nativeStart)
        Object.defineProperty(document, 'startViewTransition', {
          configurable: true,
          value: (update: () => Promise<void>) => {
            probe.nativeStarts++;
            return nativeStart(update);
          },
        });
      const scroll = window.scrollTo.bind(window);
      window.scrollTo = (options?: ScrollToOptions | number, top?: number): void => {
        const at = performance.now();
        const y = scrollY;
        const requestedX = typeof options === 'number' ? options : (options?.left ?? scrollX);
        const requestedY = typeof options === 'number' ? (top ?? 0) : (options?.top ?? scrollY);
        const liveActive = document
          .getAnimations()
          .some((animation) => animation.id === 'rouault-history-content');
        if (typeof options === 'number') scroll(options, top ?? 0);
        else scroll(options);
        if (probe.active)
          probe.scrolls.push({
            at,
            y,
            requestedX,
            requestedY,
            appliedX: scrollX,
            appliedY: scrollY,
            liveActive,
          });
      };
      const focus = HTMLElement.prototype.focus;
      HTMLElement.prototype.focus = function (options?: FocusOptions): void {
        if (probe.active && this.id === 'main-content') probe.focus++;
        focus.call(this, options);
      };
      document.addEventListener('router-document-host:content-dom-replaced', () => {
        if (!probe.active) return;
        probe.replaced++;
        probe.epoch = null;
        probe.mutations.push(read('content-dom-replaced'));
      });
      document.addEventListener('router-document-host:navigation-committed', (event) => {
        const detail = (event as CustomEvent<{ contentEpoch?: number }>).detail;
        probe.epoch = detail.contentEpoch ?? null;
        if (probe.active) probe.committed++;
      });
      document.addEventListener('ui-url-state-change', () => {
        if (probe.active) probe.stateChanges++;
      });
      window.addEventListener(
        'popstate',
        (event) => {
          if (!probe.active) return;
          const value: unknown = event.hasUAVisualTransition;
          probe.visual = {
            provided: 'hasUAVisualTransition' in event,
            value: typeof value === 'boolean' ? value : null,
          };
        },
        { capture: true },
      );
      // appの取消listenerより前に登録し、実入力が届いた瞬間の自然な時刻を残す。
      for (const name of ['pointermove', 'pointerdown', 'pointerup', 'click'] as const)
        window.addEventListener(
          name,
          (event) => {
            if (!probe.active) return;
            const animation = document
              .getAnimations()
              .find((item) => item.id === 'rouault-history-content');
            const target = event.target instanceof Element ? event.target : null;
            probe.inputs.push({
              at: performance.now(),
              type: name,
              trusted: event.isTrusted,
              currentTime:
                typeof animation?.currentTime === 'number' ? animation.currentTime : null,
              href: target?.closest('a')?.getAttribute('href') ?? null,
              tag: target?.closest('a, summary, button')?.localName ?? null,
              raceAnchorMatches: target?.closest('a') === probe.raceTarget,
              raceAnchorConnected: target?.closest('a')?.isConnected ?? false,
              raceNavConnected: probe.raceNav?.isConnected ?? false,
              raceLabelConnected: probe.raceLabel?.isConnected ?? false,
            });
          },
          { capture: true },
        );
      new MutationObserver((records) => {
        if (!probe.active) return;
        for (const record of records) {
          for (const removed of record.removedNodes)
            for (const [kind, target] of [
              ['nav', probe.raceNav],
              ['link', probe.raceTarget],
              ['label', probe.raceLabel],
            ] as const)
              if (target && (removed === target || removed.contains(target)))
                probe.raceDetachments.push({ at: performance.now(), kind });
          if (
            record.target instanceof HTMLElement &&
            record.target.matches('[data-router-document-host-announcement]') &&
            record.target.textContent
          )
            probe.announcements.push(record.target.textContent);
        }
      }).observe(document, { childList: true, subtree: true });
      let frame = 0;
      const channel = new MessageChannel();
      channel.port1.onmessage = (event: MessageEvent<number>) => {
        if (probe.active) probe.frames.push(read('after-raf-task', event.data));
      };
      const sample = (): void => {
        if (probe.active) {
          probe.frames.push(read('raf-entry', ++frame));
          channel.port2.postMessage(frame);
        }
        requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    },
    { pause, visual, presentation },
  );
};

const prepare = async (
  page: Page,
  reading: { headingIndex: number; y: number } | null = null,
): Promise<SavedReading> => {
  await page.goto(longNote);
  await ready(page);
  const saved = await page.evaluate(async (reading) => {
    const main = document.querySelector('#main-content');
    if (!main) throw new Error('main');
    const headingIndex = reading?.headingIndex ?? 7;
    const anchor = main.querySelectorAll<HTMLElement>('.prose h2[id]')[headingIndex];
    if (!anchor) throw new Error(`heading ${headingIndex + 1}`);
    const forbidden =
      'img, table, pre, code, details, iframe, video, button, input, [data-footnote-ref], [data-copy-button]';
    if (main.querySelector(forbidden)) throw new Error('plain fixture changed');
    window.__rouaultHistoryLiveProbe.anchorId = anchor.id;
    scrollTo({
      top: reading?.y ?? Math.round(anchor.getBoundingClientRect().top + scrollY - 100),
      left: 0,
      behavior: 'instant',
    });
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
    const point = (element: Element | null): { x: number; y: number } => {
      const box = element?.getBoundingClientRect();
      if (!box || !box.width || !box.height) throw new Error('input target');
      return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    };
    const sidebar = document.querySelector('aside [data-sidebar-nav-branch-control]');
    const entryId: unknown = history.state?.__rouaultHistoryEntry?.id;
    if (typeof entryId !== 'string') throw new Error('managed source entry');
    return {
      y: scrollY,
      anchorTop: anchor.getBoundingClientRect().top,
      anchorId: anchor.id,
      entryId,
      historyLength: history.length,
      epochBeforeBack: 0,
      nativeStartsBeforeBack: 0,
      points: {
        main: point(anchor.querySelector('[data-heading-permalink]')),
        header: point(document.getElementById('static-header-theme-trigger')),
        sidebar: point(sidebar),
      },
      sidebarOpen: sidebar?.closest('details')?.open ?? false,
    };
  }, reading);
  if (reading) {
    expect(Math.abs(saved.y - reading.y)).toBeLessThanOrEqual(2);
    expect(saved.anchorTop).toBeGreaterThanOrEqual(0);
    expect(saved.anchorTop).toBeLessThan(await page.evaluate(() => innerHeight));
  } else expect(saved.y).toBeGreaterThan(700);
  await navigate(page, shortNote);
  const state = await page.evaluate(() => {
    const probe = window.__rouaultHistoryLiveProbe;
    if (probe.epoch === null) throw new Error('committed epoch');
    const state = {
      epoch: probe.epoch,
      nativeStarts: probe.nativeStarts,
      historyLength: history.length,
    };
    probe.active = true;
    return state;
  });
  return {
    ...saved,
    epochBeforeBack: state.epoch,
    nativeStartsBeforeBack: state.nativeStarts,
    historyLength: state.historyLength,
  };
};
const back = async (page: Page): Promise<boolean> => {
  await page.evaluate(() => history.back());
  // 100ms単位のexpect再試行で自然な180msの前半を消費しない。
  await page.waitForFunction(
    ({ url, heading }) =>
      location.pathname === url &&
      document.querySelector('#main-content h1')?.textContent?.trim() === heading &&
      window.__rouaultHistoryLiveProbe.visual !== null,
    { url: longNote, heading: title },
    { polling: 'raf' },
  );
  const visual = await page.evaluate(() => window.__rouaultHistoryLiveProbe.visual);
  return visual?.provided === true && visual.value === false;
};
const finishFrames = async (page: Page): Promise<void> => {
  await ready(page);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document.getAnimations().filter((animation) => animation.id === 'rouault-history-content')
            .length,
      ),
    )
    .toBe(0);
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
};
const snapshot = async (page: Page) =>
  page.evaluate(() => {
    const {
      active,
      pause,
      anchorId,
      anchorSelector,
      epoch,
      nativeSupported,
      nativeStarts,
      blockedHistoryAnimations,
      replaced,
      committed,
      focus,
      announcements,
      frames,
      mutations,
      starts,
      cancels,
      scrolls,
      inputs,
      visual,
      stateChanges,
      raceDetachments,
    } = window.__rouaultHistoryLiveProbe;
    return {
      active,
      pause,
      anchorId,
      anchorSelector,
      epoch,
      nativeSupported,
      nativeStarts,
      blockedHistoryAnimations,
      replaced,
      committed,
      focus,
      announcements,
      frames,
      mutations,
      starts,
      cancels,
      scrolls,
      inputs,
      visual,
      stateChanges,
      raceDetachments,
      raceOriginalTargetConnected: window.__rouaultHistoryLiveProbe.raceTarget?.isConnected ?? null,
      raceOriginalNavConnected: window.__rouaultHistoryLiveProbe.raceNav?.isConnected ?? null,
      raceOriginalLabelConnected: window.__rouaultHistoryLiveProbe.raceLabel?.isConnected ?? null,
    };
  });
const evidence = async (page: Page, info: TestInfo, classification: string): Promise<void> => {
  const data = await snapshot(page);
  info.annotations.push({ type: 'history-live-presentation', description: classification });
  const filename = info.outputPath('history-live-trace.json');
  await writeFile(
    filename,
    JSON.stringify(
      {
        classification,
        savedTolerance: 2,
        unavailableInputTarget:
          '自然180ms入力は既存plain noteのmain permalink/header summary/sidebar summaryを使用。generic routeの本文controlへ入力結果を一般化しない。',
        limits:
          'rAF単独はpaintの証明にしない。after-rAF taskはpaint機会後の観測。Windows/実機touchの結果へ一般化しない。',
        data,
      },
      null,
      2,
    ),
  );
  await info.attach('history-live-trace', { path: filename, contentType: 'application/json' });
};
const assertFirstFrames = async (
  page: Page,
  saved: SavedReading,
  phases: readonly string[] = ['after-raf-task'],
  motion = true,
): Promise<void> => {
  const probe = await snapshot(page);
  const frames = probe.frames.filter(
    (frame) => phases.includes(frame.phase) && frame.title === title,
  );
  for (const phase of phases)
    expect(frames.filter((frame) => frame.phase === phase).length).toBeGreaterThanOrEqual(2);
  for (const frame of frames) {
    expect(Math.abs(frame.y - saved.y)).toBeLessThanOrEqual(2);
    expect(frame.anchorTop).not.toBeNull();
    expect(Math.abs((frame.anchorTop ?? Infinity) - saved.anchorTop)).toBeLessThanOrEqual(2);
    expect(frame.entryId).toBe(saved.entryId);
    expect(frame.epoch).toBeGreaterThan(saved.epochBeforeBack);
    expect(frame.nativeMarker).toBe(false);
  }
  if (motion) {
    expect(probe.starts[0]?.entryId).toBe(saved.entryId);
    expect(probe.starts[0]?.y).toBe(saved.y);
  } else expect(probe.starts).toEqual([]);
};
const assertUnavailable = async (page: Page): Promise<void> => {
  await ready(page);
  expect((await snapshot(page)).starts).toEqual([]);
  await expect(page.locator('#main-content')).toHaveAttribute(
    'data-history-presentation-eligibility',
    'unavailable',
  );
};

const assertPositionReadyWithoutMotion = async (page: Page, saved: SavedReading): Promise<void> => {
  await finishFrames(page);
  await expect(page.locator('#main-content')).toHaveAttribute(
    'data-history-presentation-eligibility',
    'ready',
  );
  await assertFirstFrames(page, saved, ['raf-entry', 'after-raf-task'], false);
};

interface GenericReading {
  url: string;
  title: string;
  x: number;
  y: number;
  anchorSelector: string;
  anchorTop: number | null;
  entryId: string;
}
interface GenericTraverse {
  at: number;
  before: Awaited<ReturnType<typeof snapshot>>;
}
const saveGenericReading = async (page: Page, fraction = 0.45): Promise<GenericReading> => {
  await ready(page);
  await expect(page.locator('html')).not.toHaveAttribute('data-content-transition');
  return page.evaluate(async (fraction) => {
    const main = document.querySelector<HTMLElement>('#main-content');
    const scrolling = document.scrollingElement;
    if (!main || !scrolling) throw new Error('reading root');
    scrollTo({
      top: Math.floor(Math.max(0, scrolling.scrollHeight - scrolling.clientHeight) * fraction),
      left: 0,
      behavior: 'instant',
    });
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
    // 読書停止後のcheckpoint集約を待つ。履歴操作後の初回frame観測には待機を加えない。
    await new Promise<void>((resolve) => window.setTimeout(resolve, 160));
    const heading = [...main.querySelectorAll<HTMLElement>('h2[id], h3[id]')].sort(
      (a, b) => Math.abs(a.getBoundingClientRect().top) - Math.abs(b.getBoundingClientRect().top),
    )[0];
    const anchorSelector = heading
      ? `#${CSS.escape(heading.id)}`
      : main.querySelector('.prose > p')
        ? '.prose > p'
        : 'h1';
    const entryId: unknown = history.state?.__rouaultHistoryEntry?.id;
    if (typeof entryId !== 'string') throw new Error('managed reading entry');
    return {
      url: location.pathname + location.search + location.hash,
      title: main.querySelector('h1')?.textContent?.trim() ?? '',
      x: scrollX,
      y: scrollY,
      anchorSelector,
      anchorTop: main.querySelector(anchorSelector)?.getBoundingClientRect().top ?? null,
      entryId,
    };
  }, fraction);
};
const prepareGenericPair = async (page: Page, sourceUrl: string, targetUrl: string) => {
  await page.goto(sourceUrl);
  const source = await saveGenericReading(page, 0.58);
  await navigate(page, targetUrl);
  const target = await saveGenericReading(page, 0.31);
  return { source, target };
};
const waitForGenericTraverse = async (
  page: Page,
  saved: GenericReading,
  committed: number,
): Promise<void> => {
  await page.waitForFunction(
    ({ url, entryId, committed }) => {
      const probe = window.__rouaultHistoryLiveProbe;
      return (
        location.pathname + location.search + location.hash === url &&
        history.state?.__rouaultHistoryEntry?.id === entryId &&
        probe.committed > committed &&
        probe.visual !== null
      );
    },
    { url: saved.url, entryId: saved.entryId, committed },
    { polling: 'raf' },
  );
};
const beginGenericTraverse = async (
  page: Page,
  direction: 'back' | 'forward',
  saved: GenericReading,
): Promise<GenericTraverse> => {
  const before = await snapshot(page);
  const at = await page.evaluate(
    ({ direction, selector }) => {
      const probe = window.__rouaultHistoryLiveProbe;
      probe.active = true;
      probe.anchorSelector = selector;
      probe.visual = null;
      const at = performance.now();
      if (direction === 'back') history.back();
      else history.forward();
      return at;
    },
    { direction, selector: saved.anchorSelector },
  );
  await waitForGenericTraverse(page, saved, before.committed);
  return { at, before };
};
const assertGenericTraverse = async (
  page: Page,
  saved: GenericReading,
  visit: GenericTraverse,
  presentation: 'live' | 'fallback' | 'no-motion' = 'live',
): Promise<void> => {
  await finishFrames(page);
  const probe = await snapshot(page);
  expect(Math.abs((await page.evaluate(() => scrollY)) - saved.y)).toBeLessThanOrEqual(2);
  expect(await page.evaluate(() => history.state?.__rouaultHistoryEntry?.id)).toBe(saved.entryId);
  expect(probe.replaced - visit.before.replaced).toBe(1);
  expect(probe.committed - visit.before.committed).toBe(1);
  expect(probe.focus - visit.before.focus).toBe(1);
  expect(probe.announcements.length - visit.before.announcements.length).toBe(1);
  expect(probe.nativeStarts).toBe(visit.before.nativeStarts);
  const starts = probe.starts.slice(visit.before.starts.length);
  const nativeEligible = probe.visual?.provided === true && probe.visual.value === false;
  if (presentation === 'fallback') {
    expect(starts).toEqual([]);
    await expect(page.locator('#main-content')).toHaveAttribute(
      'data-history-presentation-eligibility',
      'unavailable',
    );
    return;
  }
  await expect(page.locator('#main-content')).toHaveAttribute(
    'data-history-presentation-eligibility',
    'ready',
  );
  const frames = probe.frames.filter(
    (frame) =>
      frame.at >= visit.at &&
      frame.title === saved.title &&
      frame.url === saved.url &&
      frame.entryId === saved.entryId,
  );
  for (const phase of ['raf-entry', 'after-raf-task']) {
    const phaseFrames = frames.filter((frame) => frame.phase === phase);
    expect(phaseFrames.length).toBeGreaterThanOrEqual(2);
    for (const frame of phaseFrames) {
      expect(frame.title).toBe(saved.title);
      expect(Math.abs(frame.x - saved.x)).toBeLessThanOrEqual(2);
      expect(Math.abs(frame.y - saved.y)).toBeLessThanOrEqual(2);
      if (saved.anchorTop !== null)
        expect(Math.abs((frame.anchorTop ?? Infinity) - saved.anchorTop)).toBeLessThanOrEqual(2);
      expect(frame.epoch).toBeGreaterThan(visit.before.epoch ?? -1);
      expect(frame.nativeMarker).toBe(false);
    }
  }
  const scrolls = probe.scrolls.slice(visit.before.scrolls.length);
  expect(scrolls).toHaveLength(1);
  expect(Math.abs((scrolls[0]?.requestedX ?? Infinity) - saved.x)).toBeLessThanOrEqual(2);
  expect(Math.abs((scrolls[0]?.appliedX ?? Infinity) - saved.x)).toBeLessThanOrEqual(2);
  expect(Math.abs((scrolls[0]?.requestedY ?? Infinity) - saved.y)).toBeLessThanOrEqual(2);
  expect(Math.abs((scrolls[0]?.appliedY ?? Infinity) - saved.y)).toBeLessThanOrEqual(2);
  expect(scrolls[0]?.liveActive).toBe(false);
  if (presentation === 'no-motion' || !nativeEligible) expect(starts).toEqual([]);
  else {
    expect(starts).toHaveLength(1);
    expect(starts[0]?.duration).toBe(180);
    expect(starts[0]?.entryId).toBe(saved.entryId);
    expect(Math.abs((starts[0]?.y ?? Infinity) - saved.y)).toBeLessThanOrEqual(2);
    expect(scrolls[0]?.at).toBeLessThanOrEqual(starts[0]?.at ?? -1);
  }
  if (presentation === 'live' && !nativeEligible)
    test.skip(true, '位置ready確認済、UA情報なし/true: generic fade未検証');
};

export const registerHistoryLivePresentationTests = (): void => {
  test.describe('history live presentation', () => {
    test.use({ viewport: { width: 1280, height: 720 }, reducedMotion: 'no-preference' });
    test.afterEach(async ({ page }, info) => {
      if (info.status === 'passed') return;
      const available = await page
        .evaluate(() => Boolean(window.__rouaultHistoryLiveProbe))
        .catch(() => false);
      if (available)
        await evidence(
          page,
          info,
          `未成立 (${info.status ?? 'unknown'})。入力・演出の成功に数えない`,
        );
    });

    test('自然進行は最初のpaint機会から保存Y・anchor・entry・epochを保つ', async ({
      page,
    }, info) => {
      await installProbe(page);
      const saved = await prepare(page);
      const eligible = await back(page);
      await finishFrames(page);
      if (eligible) {
        await assertFirstFrames(page, saved);
        const probe = await snapshot(page);
        expect(probe.starts).toHaveLength(1);
        expect(probe.starts[0]?.duration).toBe(180);
        expect(
          probe.frames.some(
            (frame) =>
              frame.phase === 'after-raf-task' &&
              frame.title === title &&
              frame.eligibility === 'ready' &&
              Number(frame.opacity) >= 0.82 &&
              Number(frame.opacity) < 1,
          ),
        ).toBe(true);
        expect(probe.replaced).toBe(1);
        expect(probe.committed).toBe(1);
        expect(probe.focus).toBe(1);
        expect(probe.announcements).toHaveLength(1);
        expect(probe.scrolls).toHaveLength(1);
        expect(probe.scrolls[0]?.liveActive).toBe(false);
        expect(probe.scrolls[0]?.at).toBeLessThanOrEqual(probe.starts[0]?.at ?? -1);
        expect(probe.nativeStarts).toBe(saved.nativeStartsBeforeBack);
        expect(await page.evaluate(() => history.length)).toBe(saved.historyLength);
        await evidence(page, info, 'native UA=false: first-frame/live演出検証');
      } else {
        await assertPositionReadyWithoutMotion(page, saved);
        expect(Math.abs((await page.evaluate(() => scrollY)) - saved.y)).toBeLessThanOrEqual(2);
        await evidence(page, info, 'UA情報なし/true: 同期位置ready検証。live演出成功には数えない');
      }
    });

    for (const control of ['main', 'header', 'sidebar'] as const)
      for (const phase of ['early', 'late'] as const)
        test(`自然180msの${phase}に実pointerで${control}を一度操作できる`, async ({
          page,
        }, info) => {
          await installProbe(page);
          const saved = await prepare(page);
          const eligible = await back(page);
          if (!eligible) {
            await assertPositionReadyWithoutMotion(page, saved);
            await evidence(
              page,
              info,
              'UA情報なし/true: effect不可。自然時間入力の成功には数えない',
            );
            return;
          }
          const point = saved.points[control];
          if (control === 'main') await page.mouse.move(point.x, point.y);
          await page.waitForFunction(
            (threshold) => {
              const animation = document
                .getAnimations()
                .find((item) => item.id === 'rouault-history-content');
              return (
                typeof animation?.currentTime === 'number' && animation.currentTime >= threshold
              );
            },
            phase === 'early' ? 10 : 100,
            { polling: 'raf' },
          );
          await page.mouse.click(point.x, point.y);
          const probe = await snapshot(page);
          const down = probe.inputs.filter((event) => event.type === 'pointerdown');
          const clicks = probe.inputs.filter((event) => event.type === 'click');
          expect(down).toHaveLength(1);
          expect(clicks).toHaveLength(1);
          expect(down[0]?.trusted).toBe(true);
          expect(down[0]?.currentTime).not.toBeNull();
          const time = down[0]?.currentTime ?? Infinity;
          expect(time).toBeGreaterThanOrEqual(phase === 'early' ? 0 : 90);
          expect(time).toBeLessThan(phase === 'early' ? 90 : 180);
          if (control === 'main') {
            expect(clicks[0]?.href).toBe(`#${encodeURIComponent(saved.anchorId)}`);
            await expect
              .poll(() => page.evaluate(() => location.hash))
              .toBe(`#${encodeURIComponent(saved.anchorId)}`);
          } else if (control === 'header')
            expect(
              await page
                .locator('#static-header-theme-trigger')
                .evaluate((element) => element.closest('details')?.open),
            ).toBe(true);
          else
            expect(
              await page
                .locator('aside [data-sidebar-nav-branch-control]')
                .first()
                .evaluate((element) => element.closest('details')?.open),
            ).toBe(!saved.sidebarOpen);
          expect(probe.replaced).toBe(1);
          await expect
            .poll(() =>
              page.evaluate(
                () =>
                  document
                    .getAnimations()
                    .filter((animation) => animation.id === 'rouault-history-content').length,
              ),
            )
            .toBe(0);
          await evidence(page, info, `native UA=false: 自然${phase} ${control} 実入力成立`);
        });

    for (const presentation of ['live', 'none'] as const)
      test(`DOM差替えをまたぐ一度の押下は同じsidebar linkへ届く: ${presentation}`, async ({
        page,
      }, info) => {
        await installProbe(page, false, 'native', presentation);
        const saved = await prepare(page);
        const link = page.locator('aside').getByRole('link', { name: title, exact: true });
        const point = await link.boundingBox();
        if (!point) throw new Error('sidebar return link');
        await link.evaluate((element) => {
          const probe = window.__rouaultHistoryLiveProbe;
          probe.raceTarget = element;
          probe.raceNav = element.closest('[data-sidebar-nav]');
          probe.raceLabel = element.querySelector('[data-sidebar-nav-label]');
        });
        await page.mouse.move(point.x + point.width / 2, point.y + point.height / 2);
        await page.mouse.down();
        await back(page);
        const returned = await snapshot(page);
        expect(returned.raceOriginalTargetConnected).toBe(true);
        expect(returned.raceOriginalNavConnected).toBe(true);
        expect(returned.raceOriginalLabelConnected).toBe(true);
        expect(returned.raceDetachments).toHaveLength(0);
        expect(returned.committed).toBe(1);
        expect(returned.epoch).not.toBeNull();
        expect(await page.evaluate(() => history.state?.__rouaultHistoryEntry?.id)).toBe(
          saved.entryId,
        );
        expect(Math.abs((await page.evaluate(() => scrollY)) - saved.y)).toBeLessThanOrEqual(2);
        await page.mouse.up();
        await expect.poll(() => snapshot(page).then((probe) => probe.committed)).toBe(2);
        await finishFrames(page);
        const probe = await snapshot(page);
        expect(probe.inputs.filter((event) => event.type === 'pointerdown')).toHaveLength(1);
        expect(probe.inputs.filter((event) => event.type === 'pointerup')).toHaveLength(1);
        const clicks = probe.inputs.filter((event) => event.type === 'click');
        expect(clicks).toHaveLength(1);
        expect(clicks[0]?.href).toBe(longNote);
        expect(probe.stateChanges).toBe(0);
        expect(probe.replaced).toBe(2);
        expect(probe.committed).toBe(2);
        expect(probe.focus).toBe(2);
        const activatedAt = clicks[0]?.at ?? Infinity;
        expect(probe.raceDetachments.filter((event) => event.at < activatedAt)).toHaveLength(0);
        for (const event of probe.inputs.filter((event) => event.type !== 'pointermove')) {
          expect(event.trusted).toBe(true);
          expect(event.raceAnchorMatches).toBe(true);
          expect(event.raceAnchorConnected).toBe(true);
          expect(event.raceNavConnected).toBe(true);
          expect(event.raceLabelConnected).toBe(true);
        }
        expect(probe.epoch).toBe((returned.epoch ?? 0) + 1);
        const clickedEntryId: unknown = await page.evaluate(
          () => history.state?.__rouaultHistoryEntry?.id,
        );
        expect(typeof clickedEntryId).toBe('string');
        expect(clickedEntryId).toBeTruthy();
        expect(clickedEntryId).not.toBe(saved.entryId);
        // このhashなし通常clickは既存policyどおりfull navigationとなり、本人の先頭移動を保つ。
        expect(await page.evaluate(() => location.pathname)).toBe(longNote);
        expect(await page.evaluate(() => scrollY)).toBeLessThanOrEqual(2);
        if (presentation === 'none') {
          expect(probe.nativeStarts).toBe(0);
          expect(probe.starts).toHaveLength(0);
        }
        // 物理押下一回の成立だけを数え、入力再送で結果を補わない。
        await evidence(
          page,
          info,
          `${presentation}: clickまでsidebar実体保持、trusted clickと既存full navigation各一回（他surfaceへ一般化しない）`,
        );
      });

    test('90ms pauseのBack/Forward取消とnative→live→nativeで旧効果を残さない', async ({
      page,
    }, info) => {
      await installProbe(page, true);
      const saved = await prepare(page);
      if (!(await back(page))) {
        await assertPositionReadyWithoutMotion(page, saved);
        await evidence(page, info, 'UA情報なし/true: pause演出未実施、通常履歴のみ');
        return;
      }
      await ready(page);
      await assertFirstFrames(page, saved);
      expect(
        await page.evaluate(() => window.__rouaultHistoryLiveProbe.animations[0]?.playState),
      ).toBe('paused');
      await page.evaluate(() => history.forward());
      await expect.poll(() => page.evaluate(() => location.pathname)).toBe(shortNote);
      await ready(page);
      expect(
        await page.evaluate(() => window.__rouaultHistoryLiveProbe.animations[0]?.playState),
      ).toBe('idle');
      await expect(page.locator('#main-content')).toHaveAttribute(
        'data-history-presentation-eligibility',
        'ready',
      );
      expect((await snapshot(page)).starts).toHaveLength(2);
      await back(page);
      await ready(page);
      await page.evaluate(
        () =>
          new Promise<void>((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
          ),
      );
      expect((await snapshot(page)).starts).toHaveLength(3);
      expect(
        await page.evaluate(() => window.__rouaultHistoryLiveProbe.animations[2]?.playState),
      ).toBe('paused');
      expect(
        await page.evaluate(() => window.__rouaultHistoryLiveProbe.animations[2]?.currentTime),
      ).toBe(90);
      await navigate(page, shortNote);
      expect(
        await page.evaluate(() =>
          window.__rouaultHistoryLiveProbe.animations.every(
            (animation) => animation.playState === 'idle',
          ),
        ),
      ).toBe(true);
      const probe = await snapshot(page);
      expect(probe.nativeStarts).toBe(
        saved.nativeStartsBeforeBack + (probe.nativeSupported ? 1 : 0),
      );
      expect(probe.starts).toHaveLength(3);
      await expect(page.locator('#main-content')).toHaveCSS('opacity', '1');
      await evidence(page, info, 'native UA=false: pause取消・新session維持・通常native復帰');
    });

    for (const visual of ['true', 'undefined'] as const)
      test(`UA visual情報${visual}でも同期位置readyを保ちliveは生成しない`, async ({
        page,
      }, info) => {
        await installProbe(page, false, visual);
        const saved = await prepare(page);
        expect(await back(page)).toBe(false);
        await assertPositionReadyWithoutMotion(page, saved);
        expect(Math.abs((await page.evaluate(() => scrollY)) - saved.y)).toBeLessThanOrEqual(2);
        await evidence(page, info, `UA ${visual}: 位置ready・演出なし（演出成功ではない）`);
      });

    for (const mismatch of ['viewport', 'unknown-hydrator'] as const)
      test(`保存checkpointの${mismatch}不一致では対象を拡大しない`, async ({ page }, info) => {
        await installProbe(page);
        await prepare(page);
        if (mismatch === 'viewport') await page.setViewportSize({ width: 1160, height: 720 });
        else
          await page.route(`**${resolveRouterArtifactPathname(longNote)}`, async (route) => {
            const response = await route.fetch();
            const envelope = (await response.json()) as { document: { html: string } };
            const before = envelope.document.html;
            envelope.document.html = before.replace(
              '<p>このノートは、',
              '<p data-hydration-key="unverified-history-probe" data-hydration-trigger="visible">このノートは、',
            );
            expect(envelope.document.html).not.toBe(before);
            await route.fulfill({
              status: response.status(),
              contentType: 'application/json',
              body: JSON.stringify(envelope),
            });
          });
        await back(page);
        await assertUnavailable(page);
        await evidence(page, info, `${mismatch}: unavailable成立、代表pairからの拡張なし`);
      });
  });

  for (const { width, tocTrack } of [
    { width: 1645, tocTrack: 272 },
    { width: 1400, tocTrack: 252 },
  ])
    test.describe(`history live presentation responsive ${width}px DPR1.5`, () => {
      test.use({
        viewport: { width, height: 855 },
        deviceScaleFactor: 1.5,
        reducedMotion: 'no-preference',
      });
      test.afterEach(async ({ page }, info) => {
        if (info.status !== 'passed') {
          const available = await Promise.resolve()
            .then(() => page.evaluate(() => Boolean(window.__rouaultHistoryLiveProbe)))
            .catch(() => false);
          if (available)
            await evidence(page, info, 'responsive第4章: 未成立。first-frame成功に数えない');
        }
      });

      test('自然Backの第4章はresponsive trackでも最初のrAFとpaint機会後から保存位置を保つ', async ({
        page,
      }, info) => {
        await installProbe(page);
        const saved = await prepare(page, { headingIndex: 3, y: 520 });
        expect(await page.evaluate(() => ({ width: innerWidth, dpr: devicePixelRatio }))).toEqual({
          width,
          dpr: 1.5,
        });
        const eligible = await back(page);
        await finishFrames(page);
        const track = await page.locator('#main-content .note-shell').evaluate((shell) => {
          const tracks = getComputedStyle(shell).gridTemplateColumns.split(' ');
          return Number.parseFloat(tracks[1] ?? '');
        });
        expect(Math.abs(track - tocTrack)).toBeLessThan(0.1);
        if (!eligible) {
          await assertPositionReadyWithoutMotion(page, saved);
          await evidence(
            page,
            info,
            'responsive第4章: UA情報なし/true。live/first-frame成功には数えない',
          );
          test.skip(true, '同期位置ready確認済、UA情報なし/true: fade未検証');
          return;
        }

        await assertFirstFrames(page, saved, ['raf-entry', 'after-raf-task']);
        const probe = await snapshot(page);
        expect(probe.starts).toHaveLength(1);
        expect(probe.starts[0]?.duration).toBe(180);
        expect(
          probe.frames.some((frame) => frame.title === title && frame.eligibility === 'ready'),
        ).toBe(true);
        expect(probe.replaced).toBe(1);
        expect(probe.committed).toBe(1);
        expect(probe.focus).toBe(1);
        expect(probe.announcements).toHaveLength(1);
        expect(probe.scrolls).toHaveLength(1);
        const scroll = probe.scrolls[0];
        expect(scroll?.requestedX).toBe(0);
        expect(scroll?.appliedX).toBe(0);
        expect(Math.abs((scroll?.requestedY ?? Infinity) - saved.y)).toBeLessThanOrEqual(2);
        expect(Math.abs((scroll?.appliedY ?? Infinity) - saved.y)).toBeLessThanOrEqual(2);
        expect(scroll?.liveActive).toBe(false);
        expect(scroll?.at).toBeLessThanOrEqual(probe.starts[0]?.at ?? -1);
        expect(probe.nativeStarts).toBe(saved.nativeStartsBeforeBack);
        expect(await page.evaluate(() => history.length)).toBe(saved.historyLength);
        await evidence(
          page,
          info,
          `native UA=false: ${width}px/DPR1.5/track${tocTrack}px第4章のrAF・post-task検証。実paint捕捉とは区別`,
        );
      });
    });

  test.describe('generalized history presentation', () => {
    test.use({ viewport: { width: 1280, height: 720 }, reducedMotion: 'no-preference' });
    test.afterEach(async ({ page }, info) => {
      const available = await Promise.resolve()
        .then(() => page.evaluate(() => Boolean(window.__rouaultHistoryLiveProbe)))
        .catch(() => false);
      if (available)
        await evidence(
          page,
          info,
          info.status === 'passed'
            ? 'generic履歴のDOM/rAF/post-task検証。OS presented-frameの証明とは区別'
            : `generic履歴 ${info.status ?? 'unknown'}。live成功に数えない`,
        );
    });

    for (const pair of [
      { name: '任意heading数と短いReader Basic', source: longNote, target: shortNote },
      { name: 'noteから異なる配置のabout', source: longNote, target: '/about/' },
      { name: '非note discoveryとabout', source: '/corpora/', target: '/about/' },
    ])
      test(`${pair.name}はBackとForwardの最初のframeから各entryを保つ`, async ({ page }) => {
        await installProbe(page);
        const saved = await prepareGenericPair(page, pair.source, pair.target);
        const backVisit = await beginGenericTraverse(page, 'back', saved.source);
        await assertGenericTraverse(page, saved.source, backVisit);
        const forwardVisit = await beginGenericTraverse(page, 'forward', saved.target);
        await assertGenericTraverse(page, saved.target, forwardVisit);
      });

    test('scroll直後120ms未満のBackでも旧entryを同期採取してForwardの新Yを保つ', async ({
      page,
    }) => {
      await installProbe(page);
      const saved = await prepareGenericPair(page, longNote, '/about/');
      const before = await snapshot(page);
      const immediate = await page.evaluate(({ source, target }) => {
        const main = document.querySelector('#main-content');
        const scrolling = document.scrollingElement;
        if (!main || !scrolling) throw new Error('source owner');
        const scrolledAt = performance.now();
        scrollTo({
          top: Math.floor(Math.max(0, scrolling.scrollHeight - scrolling.clientHeight) * 0.77),
          left: 0,
          behavior: 'instant',
        });
        const nextTarget = {
          ...target,
          x: scrollX,
          y: scrollY,
          anchorTop: main.querySelector(target.anchorSelector)?.getBoundingClientRect().top ?? null,
        };
        const probe = window.__rouaultHistoryLiveProbe;
        probe.active = true;
        probe.anchorSelector = source.anchorSelector;
        probe.visual = null;
        const at = performance.now();
        history.back();
        return { target: nextTarget, scrolledAt, at };
      }, saved);
      expect(immediate.at - immediate.scrolledAt).toBeLessThan(120);
      expect(Math.abs(immediate.target.y - saved.target.y)).toBeGreaterThan(20);
      await waitForGenericTraverse(page, saved.source, before.committed);
      await assertGenericTraverse(page, saved.source, { at: immediate.at, before });
      const forwardVisit = await beginGenericTraverse(page, 'forward', immediate.target);
      await assertGenericTraverse(page, immediate.target, forwardVisit);
    });

    test('見出し0の短い静的noteはY0とparagraph anchorで両方向を復元する', async ({ page }) => {
      await installProbe(page);
      await page.goto(e2eNoteFixtures.sidebarScrollSource.directPath);
      const source = await saveGenericReading(page, 0);
      expect(source.y).toBe(0);
      const range = await page.evaluate(() => {
        const scrolling = document.scrollingElement;
        return Math.max(0, (scrolling?.scrollHeight ?? 0) - (scrolling?.clientHeight ?? 0));
      });
      expect(range).toBeLessThan(await page.evaluate(() => innerHeight));
      await expect(page.locator('#main-content :is(h2, h3, h4, h5, h6)')).toHaveCount(0);
      await navigate(page, shortNote);
      const target = await saveGenericReading(page);
      const backVisit = await beginGenericTraverse(page, 'back', source);
      await assertGenericTraverse(page, source, backVisit);
      const forwardVisit = await beginGenericTraverse(page, 'forward', target);
      await assertGenericTraverse(page, target, forwardVisit);
    });

    for (const target of [
      {
        name: 'TOC absentのtable',
        url: () => e2eNoteFixtures.tocAbsent.normalizedPath,
        selector: 'table',
      },
      {
        name: 'code初期projection',
        url: () => e2eNoteFixtures.code.normalizedPath,
        selector: 'pre',
      },
      {
        name: 'search未知hydrator',
        url: () => '/search/',
        selector: '[data-hydration-key="search-page-enhancer"]',
      },
      {
        name: 'tag内search未知hydrator',
        url: () => '/tags/Programming/',
        selector: '[data-hydration-key="search-page-enhancer"]',
      },
    ])
      test(`${target.name}は実DOMの未証明surfaceにより演出せず通常復元する`, async ({ page }) => {
        await installProbe(page);
        const saved = await prepareGenericPair(page, target.url(), longNote);
        const visit = await beginGenericTraverse(page, 'back', saved.source);
        await expect(page.locator(`#main-content ${target.selector}`).first()).toBeAttached();
        await assertGenericTraverse(page, saved.source, visit, 'fallback');
        const forwardVisit = await beginGenericTraverse(page, 'forward', saved.target);
        await assertGenericTraverse(page, saved.target, forwardVisit);
      });

    test('query/hashを含むfull traverseもexact URLと保存座標をhash targetより優先する', async ({
      page,
    }) => {
      await installProbe(page);
      await page.goto(longNote);
      await ready(page);
      const id = await page.locator('#main-content .prose h2[id]').nth(3).getAttribute('id');
      if (!id) throw new Error('hash target');
      const url = `${longNote}?historyProof=1#${encodeURIComponent(id)}`;
      const saved = await prepareGenericPair(page, url, shortNote);
      const backVisit = await beginGenericTraverse(page, 'back', saved.source);
      await assertGenericTraverse(page, saved.source, backVisit);
      expect(await page.evaluate(() => location.pathname + location.search + location.hash)).toBe(
        url,
      );
      const forwardVisit = await beginGenericTraverse(page, 'forward', saved.target);
      await assertGenericTraverse(page, saved.target, forwardVisit);
    });

    test('same-document hash操作とそのBackはepochと本文を交代せず演出しない', async ({ page }) => {
      await installProbe(page);
      await page.goto(longNote);
      await ready(page);
      await page.evaluate(() => {
        window.__rouaultHistoryLiveProbe.active = true;
      });
      const before = await snapshot(page);
      await page.locator('[data-layout-toc-nav] [data-toc-link]').nth(3).click();
      await expect.poll(() => page.evaluate(() => location.hash)).not.toBe('');
      await ready(page);
      await page.evaluate(() => history.back());
      await expect.poll(() => page.evaluate(() => location.hash)).toBe('');
      await ready(page);
      const after = await snapshot(page);
      expect(after.starts).toEqual([]);
      expect(after.replaced).toBe(before.replaced);
      expect(after.focus).toBe(before.focus);
      expect(after.epoch).toBe(before.epoch);
      expect(after.nativeStarts).toBe(before.nativeStarts);
    });

    test('reduced motionでも保存位置は同期適用し履歴のfadeを生成しない', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await installProbe(page);
      const saved = await prepareGenericPair(page, '/about/', '/corpora/');
      const visit = await beginGenericTraverse(page, 'back', saved.source);
      await assertGenericTraverse(page, saved.source, visit, 'no-motion');
      const next = await beginGenericTraverse(page, 'forward', saved.target);
      await assertGenericTraverse(page, saved.target, next, 'no-motion');
    });

    test('reduced motionでも未知animationのあるReader Forwardは通常復元へ返す', async ({
      page,
    }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await installProbe(page);
      const saved = await prepareGenericPair(page, '/about/', shortNote);
      const back = await beginGenericTraverse(page, 'back', saved.source);
      await assertGenericTraverse(page, saved.source, back, 'no-motion');
      await page.evaluate(() => {
        document.addEventListener(
          'router-document-host:content-dom-replaced',
          () => {
            // 未証明motionを決定的に作り、UAの短いCSS transitionの発生時機に依存しない。
            document
              .querySelector('#main-content')
              ?.animate([{ transform: 'translateY(0px)' }, { transform: 'translateY(1px)' }], {
                duration: 2000,
                id: 'history-proof-unknown',
              });
          },
          { once: true },
        );
      });
      const next = await beginGenericTraverse(page, 'forward', saved.target);
      expect(
        await page.evaluate(() =>
          document.getAnimations().some((animation) => animation.id === 'history-proof-unknown'),
        ),
      ).toBe(true);
      await assertGenericTraverse(page, saved.target, next, 'fallback');
      await page.evaluate(() => {
        document
          .getAnimations()
          .find((animation) => animation.id === 'history-proof-unknown')
          ?.cancel();
      });
    });

    test('WAAPI未対応でも同期位置readyと一回のcommitを保つ', async ({ page }) => {
      await installProbe(page);
      await page.addInitScript(() => {
        Object.defineProperty(Element.prototype, 'animate', {
          configurable: true,
          value: undefined,
        });
      });
      const saved = await prepareGenericPair(page, '/about/', shortNote);
      const visit = await beginGenericTraverse(page, 'back', saved.source);
      await assertGenericTraverse(page, saved.source, visit, 'no-motion');
    });

    for (const visual of ['true', 'undefined', 'absent'] as const)
      test(`generic履歴のUA ${visual}は演出せず既存位置復元へ返す`, async ({ page }) => {
        await installProbe(page, false, visual);
        const saved = await prepareGenericPair(page, '/about/', shortNote);
        const visit = await beginGenericTraverse(page, 'back', saved.source);
        await assertGenericTraverse(page, saved.source, visit, 'no-motion');
        const probe = await snapshot(page);
        if (visual === 'absent') expect(probe.visual?.provided).toBe(false);
        else expect(probe.visual?.provided).toBe(true);
        expect(probe.visual?.value).toBe(visual === 'true' ? true : null);
      });

    test('未予約画像が遅延するfull traverseはpending中も解放後もfadeを生成しない', async ({
      page,
    }) => {
      await installProbe(page);
      const saved = await prepareGenericPair(page, longNote, shortNote);
      let release!: () => void;
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      await page.route('**/history-generic-image.svg', async (route) => {
        await gate;
        await route
          .fulfill({
            contentType: 'image/svg+xml',
            body: '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"/>',
          })
          .catch(() => {
            /* 取消済みrequestの解放失敗は観測結果へ追加しない。 */
          });
      });
      await page.route(`**${resolveRouterArtifactPathname(longNote)}`, async (route) => {
        const response = await route.fetch();
        const envelope = (await response.json()) as { document: { html: string } };
        envelope.document.html =
          '<img src="/history-generic-image.svg" alt="遅延画像">' + envelope.document.html;
        await route.fulfill({ response, json: envelope });
      });
      try {
        const visit = await beginGenericTraverse(page, 'back', saved.source);
        await page.evaluate(
          () =>
            new Promise<void>((resolve) =>
              requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
            ),
        );
        await expect(page.locator('#main-content')).toHaveAttribute(
          'data-reading-position-status',
          'pending',
        );
        expect((await snapshot(page)).starts.length).toBe(visit.before.starts.length);
        release();
        await assertGenericTraverse(page, saved.source, visit, 'fallback');
      } finally {
        release();
      }
    });

    test('実fontの待機中はfirst-frame成功を装わず通常復元へ返す', async ({ page }) => {
      await installProbe(page);
      const saved = await prepareGenericPair(page, '/about/', shortNote);
      const fontUrl = await page.evaluate(() => {
        const resource = performance
          .getEntriesByType('resource')
          .find((entry) => /\.woff2(?:\?|$)/u.test(entry.name));
        if (!resource) throw new Error('existing bundled woff2');
        const url = new URL(resource.name);
        url.searchParams.set('history-font', 'pending');
        return url.href;
      });
      let release!: () => void;
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      await page.route(fontUrl, async (route) => {
        await gate;
        await route.continue().catch(() => {
          /* 取消済みrequestを再実行しない。 */
        });
      });
      try {
        await page.evaluate((url) => {
          const face = new FontFace('HistoryPendingProof', `url("${url}")`);
          document.fonts.add(face);
          void face.load().catch(() => {
            /* font失敗も既存復元へ返す条件として残す。 */
          });
        }, fontUrl);
        await expect.poll(() => page.evaluate(() => document.fonts.status)).toBe('loading');
        const visit = await beginGenericTraverse(page, 'back', saved.source);
        await page.evaluate(
          () =>
            new Promise<void>((resolve) =>
              requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
            ),
        );
        await expect(page.locator('#main-content')).toHaveAttribute(
          'data-reading-position-status',
          'pending',
        );
        expect((await snapshot(page)).starts.length).toBe(visit.before.starts.length);
        release();
        await assertGenericTraverse(page, saved.source, visit, 'fallback');
      } finally {
        release();
      }
    });

    test('Back→Forward→Backは旧finishedが最新entryの効果と座標を消さない', async ({ page }) => {
      await installProbe(page, true);
      await page.goto(longNote);
      await saveGenericReading(page);
      await navigate(page, '/about/');
      const middle = await saveGenericReading(page, 0.7);
      await navigate(page, shortNote);
      const last = await saveGenericReading(page);
      const firstVisit = await beginGenericTraverse(page, 'back', middle);
      await ready(page);
      const visual = (await snapshot(page)).visual;
      if (visual?.provided !== true || visual.value !== false)
        test.skip(true, 'UA情報なし/true: live競合未検証');
      const firstCount = (await snapshot(page)).starts.length;
      expect(firstCount - firstVisit.before.starts.length).toBe(1);
      await beginGenericTraverse(page, 'forward', last);
      await ready(page);
      const finalVisit = await beginGenericTraverse(page, 'back', middle);
      await ready(page);
      const state = await page.evaluate(() =>
        window.__rouaultHistoryLiveProbe.animations.map((animation) => ({
          playState: animation.playState,
          currentTime: animation.currentTime,
        })),
      );
      expect(state.slice(0, -1).every((animation) => animation.playState === 'idle')).toBe(true);
      expect(state.at(-1)).toMatchObject({ playState: 'paused', currentTime: 90 });
      await page.evaluate(() => window.__rouaultHistoryLiveProbe.animations.at(-1)?.cancel());
      await assertGenericTraverse(page, middle, finalVisit);
      expect((await snapshot(page)).starts.length - firstVisit.before.starts.length).toBe(3);
    });

    test.describe('狭幅の履歴表示', () => {
      test.use({ viewport: { width: 390, height: 844 } });
      test('mobile配置でもBackとForwardの本文位置を最初のframeから保つ', async ({ page }) => {
        await installProbe(page);
        const saved = await prepareGenericPair(page, longNote, shortNote);
        const visit = await beginGenericTraverse(page, 'back', saved.source);
        await assertGenericTraverse(page, saved.source, visit);
        const next = await beginGenericTraverse(page, 'forward', saved.target);
        await assertGenericTraverse(page, saved.target, next);
      });
    });
  });
};
