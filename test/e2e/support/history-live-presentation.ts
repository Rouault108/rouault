import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { resolveRouterArtifactPathname } from '../../../shared/navigation/router-artifact-path.js';

const longNote = '/notes/testing/toc-readable-long-heading';
const shortNote = '/notes/testing/reader-basic';
const title = 'TOC Readable Long Heading';

interface HistoryLiveFrame {
  at: number;
  phase: string;
  frame: number;
  url: string;
  title: string;
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
  epoch: number | null;
  nativeSupported: boolean;
  nativeStarts: number;
  replaced: number;
  committed: number;
  focus: number;
  announcements: string[];
  frames: HistoryLiveFrame[];
  mutations: HistoryLiveFrame[];
  starts: { at: number; y: number; entryId: string | null; duration: number | null }[];
  cancels: { at: number; y: number; index: number }[];
  scrolls: { at: number; y: number; liveActive: boolean }[];
  inputs: {
    at: number;
    type: string;
    trusted: boolean;
    currentTime: number | null;
    href: string | null;
    tag: string | null;
  }[];
  visual: { provided: boolean; value: boolean | null } | null;
  animations: Animation[];
  raceTarget: Element | null;
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
  visual: 'native' | 'true' | 'undefined' = 'native',
): Promise<void> => {
  await page.addInitScript(
    ({ pause, visual }) => {
      if (visual !== 'native')
        Object.defineProperty(PopStateEvent.prototype, 'hasUAVisualTransition', {
          configurable: true,
          get: () => (visual === 'true' ? true : undefined),
        });
      const probe: HistoryLiveProbe = (window.__rouaultHistoryLiveProbe = {
        active: false,
        pause,
        anchorId: '',
        epoch: null,
        nativeSupported: typeof document.startViewTransition === 'function',
        nativeStarts: 0,
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
          y: scrollY,
          anchorTop: document.getElementById(probe.anchorId)?.getBoundingClientRect().top ?? null,
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
      if (nativeStart)
        Object.defineProperty(document, 'startViewTransition', {
          configurable: true,
          value: (update: () => Promise<void>) => {
            probe.nativeStarts++;
            return nativeStart(update);
          },
        });
      const scroll = window.scrollTo.bind(window);
      window.scrollTo = (options?: ScrollToOptions | number, top?: number): void => {
        if (probe.active)
          probe.scrolls.push({
            at: performance.now(),
            y: scrollY,
            liveActive: document
              .getAnimations()
              .some((animation) => animation.id === 'rouault-history-content'),
          });
        if (typeof options === 'number') scroll(options, top ?? 0);
        else scroll(options);
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
            });
          },
          { capture: true },
        );
      new MutationObserver((records) => {
        if (!probe.active) return;
        for (const record of records)
          if (
            record.target instanceof HTMLElement &&
            record.target.matches('[data-router-document-host-announcement]') &&
            record.target.textContent
          )
            probe.announcements.push(record.target.textContent);
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
    { pause, visual },
  );
};

const prepare = async (page: Page): Promise<SavedReading> => {
  await page.goto(longNote);
  await ready(page);
  const saved = await page.evaluate(async () => {
    const main = document.querySelector('#main-content');
    if (!main) throw new Error('main');
    const anchor = main.querySelectorAll<HTMLElement>('.prose h2[id]')[7];
    if (!anchor) throw new Error('heading 8');
    const forbidden =
      'img, table, pre, code, details, iframe, video, button, input, [data-footnote-ref], [data-copy-button]';
    if (main.querySelector(forbidden)) throw new Error('plain fixture changed');
    window.__rouaultHistoryLiveProbe.anchorId = anchor.id;
    scrollTo({
      top: Math.round(anchor.getBoundingClientRect().top + scrollY - 100),
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
  });
  expect(saved.y).toBeGreaterThan(700);
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
      epoch,
      nativeSupported,
      nativeStarts,
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
    } = window.__rouaultHistoryLiveProbe;
    return {
      active,
      pause,
      anchorId,
      epoch,
      nativeSupported,
      nativeStarts,
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
      raceOriginalTargetConnected: window.__rouaultHistoryLiveProbe.raceTarget?.isConnected ?? null,
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
          '本文buttonはplain gateにより存在せず、本文controlの自然統合は未実施。実在するmain permalink/header summary/sidebar summaryだけを使用。',
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
const assertFirstFrames = async (page: Page, saved: SavedReading): Promise<void> => {
  const probe = await snapshot(page);
  const frames = probe.frames.filter(
    (frame) => frame.phase === 'after-raf-task' && frame.title === title,
  );
  expect(frames.length).toBeGreaterThanOrEqual(2);
  for (const frame of frames) {
    expect(Math.abs(frame.y - saved.y)).toBeLessThanOrEqual(2);
    expect(frame.anchorTop).not.toBeNull();
    expect(Math.abs((frame.anchorTop ?? Infinity) - saved.anchorTop)).toBeLessThanOrEqual(2);
    expect(frame.entryId).toBe(saved.entryId);
    expect(frame.epoch).toBeGreaterThan(saved.epochBeforeBack);
    expect(frame.nativeMarker).toBe(false);
  }
  expect(probe.starts[0]?.entryId).toBe(saved.entryId);
  expect(probe.starts[0]?.y).toBe(saved.y);
};
const assertUnavailable = async (page: Page): Promise<void> => {
  await ready(page);
  expect((await snapshot(page)).starts).toEqual([]);
  await expect(page.locator('#main-content')).toHaveAttribute(
    'data-history-presentation-eligibility',
    'unavailable',
  );
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
        await assertUnavailable(page);
        expect(Math.abs((await page.evaluate(() => scrollY)) - saved.y)).toBeLessThanOrEqual(2);
        await evidence(page, info, 'UA情報なし/true: 通常復元のみ検証。live演出成功には数えない');
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
            await assertUnavailable(page);
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

    test('DOM差替えをまたぐ一度のpointer down/upは成立と消失を観測して区別する', async ({
      page,
    }, info) => {
      await installProbe(page);
      await prepare(page);
      const link = page.locator('aside').getByRole('link', { name: title, exact: true });
      const point = await link.boundingBox();
      if (!point) throw new Error('sidebar return link');
      await link.evaluate((element) => {
        window.__rouaultHistoryLiveProbe.raceTarget = element;
      });
      await page.mouse.move(point.x + point.width / 2, point.y + point.height / 2);
      await page.mouse.down();
      await back(page);
      await page.mouse.up();
      await finishFrames(page);
      const probe = await snapshot(page);
      expect(probe.inputs.filter((event) => event.type === 'pointerdown')).toHaveLength(1);
      expect(probe.inputs.filter((event) => event.type === 'pointerup')).toHaveLength(1);
      const clicks = probe.inputs.filter((event) => event.type === 'click');
      expect(clicks.length).toBeLessThanOrEqual(1);
      expect(probe.stateChanges).toBeLessThanOrEqual(1);
      expect(probe.replaced).toBe(1);
      const delivered =
        clicks.length === 1 && clicks[0]?.href === longNote && probe.stateChanges === 1;
      // node破棄でclickが失われた場合も、replayや追加clickで成功へ変換しない。
      await evidence(
        page,
        info,
        delivered
          ? '差替え跨ぎ: 一回のclickとstate-only結果を観測（一般的な入力保証には拡張しない）'
          : '差替え跨ぎ: clickまたは結果の未成立を観測。入力成功に数えない',
      );
    });

    test('90ms pauseのBack/Forward取消とnative→live→nativeで旧効果を残さない', async ({
      page,
    }, info) => {
      await installProbe(page, true);
      const saved = await prepare(page);
      if (!(await back(page))) {
        await assertUnavailable(page);
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
      await expect(page.locator('#main-content')).not.toHaveAttribute(
        'data-history-presentation-eligibility',
      );
      expect((await snapshot(page)).starts).toHaveLength(1);
      await back(page);
      await ready(page);
      await page.evaluate(
        () =>
          new Promise<void>((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
          ),
      );
      expect((await snapshot(page)).starts).toHaveLength(2);
      expect(
        await page.evaluate(() => window.__rouaultHistoryLiveProbe.animations[1]?.playState),
      ).toBe('paused');
      expect(
        await page.evaluate(() => window.__rouaultHistoryLiveProbe.animations[1]?.currentTime),
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
      expect(probe.starts).toHaveLength(2);
      await expect(page.locator('#main-content')).toHaveCSS('opacity', '1');
      await evidence(page, info, 'native UA=false: pause取消・新session維持・通常native復帰');
    });

    for (const visual of ['true', 'undefined'] as const)
      test(`UA visual情報${visual}はlive対象外で既存復元へ返す`, async ({ page }, info) => {
        await installProbe(page, false, visual);
        const saved = await prepare(page);
        expect(await back(page)).toBe(false);
        await assertUnavailable(page);
        expect(Math.abs((await page.evaluate(() => scrollY)) - saved.y)).toBeLessThanOrEqual(2);
        await evidence(page, info, `UA ${visual}: unavailable成立（演出成功ではない）`);
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
};
