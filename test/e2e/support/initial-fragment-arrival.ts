import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { e2eNoteFixtures } from './note-fixtures.js';

interface FragmentCall {
  at: number;
  behavior: string;
  top: number | null;
  status: string | null;
}
interface FragmentFrame {
  at: number;
  status: string | null;
  x: number;
  y: number;
  error: number | null;
}
interface FragmentProbe {
  timeOrigin: number;
  calls: FragmentCall[];
  frames: FragmentFrame[];
  changedAt: number | null;
  cancelledAt: number | null;
  stopReason: string | null;
  active: boolean;
  finish: (reason: string) => void;
}
declare global {
  interface Window {
    __initialFragmentArrival: FragmentProbe;
  }
}

const installProbe = async (
  page: Page,
  id: string,
  scenario: 'direct' | 'layout' | 'cancel',
): Promise<void> => {
  await page.addInitScript(
    ({ id, scenario }) => {
      let frame = 0;
      const probe: FragmentProbe = (window.__initialFragmentArrival = {
        timeOrigin: performance.timeOrigin,
        calls: [],
        frames: [],
        changedAt: null,
        cancelledAt: null,
        stopReason: null,
        active: true,
        finish: (reason) => {
          if (!probe.active) return;
          probe.active = false;
          probe.stopReason = reason;
          cancelAnimationFrame(frame);
          observer.disconnect();
          clearTimeout(timer);
        },
      });
      const status = (): string | null =>
        document.getElementById('main-content')?.dataset['readingPositionStatus'] ?? null;
      const original = window.scrollTo;
      window.scrollTo = function (
        this: Window,
        ...args: [options?: ScrollToOptions | undefined] | [x: number, y: number]
      ): void {
        if (probe.active) {
          if (probe.calls.length >= 1024) probe.finish('event-cap');
          else {
            const options = args[0];
            const behavior: unknown =
              options !== null && typeof options === 'object'
                ? Object.getOwnPropertyDescriptor(options, 'behavior')?.value
                : undefined;
            const top: unknown =
              typeof options === 'number'
                ? args[1]
                : options
                  ? Object.getOwnPropertyDescriptor(options, 'top')?.value
                  : undefined;
            probe.calls.push({
              at: performance.now(),
              behavior: typeof behavior === 'string' ? behavior : 'auto',
              top: typeof top === 'number' ? top : null,
              status: status(),
            });
          }
        }
        return Reflect.apply(original, this, args) as ReturnType<typeof original>;
      };
      const intervene = (): void => {
        if (!probe.active || status() !== 'pending') return;
        const target = document.getElementById(id);
        if (!target) return;
        if (scenario === 'layout' && probe.changedAt === null) {
          const paragraph = document.createElement('p');
          paragraph.dataset['initialFragmentLayoutFixture'] = 'true';
          paragraph.textContent = '初回移動中に追加された本文の幾何変化を検証します。'.repeat(120);
          target.before(paragraph);
          probe.changedAt = performance.now();
        }
        if (scenario === 'cancel' && probe.cancelledAt === null) {
          probe.cancelledAt = performance.now();
          window.dispatchEvent(new WheelEvent('wheel', { deltaY: 100 }));
        }
      };
      const observer = new MutationObserver(intervene);
      observer.observe(document, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ['data-reading-position-status'],
      });
      const sample = (): void => {
        if (!probe.active) return;
        if (document.hidden) return probe.finish('hidden');
        if (probe.frames.length >= 4096) return probe.finish('frame-cap');
        // 読込途中のlayoutを強制せず、load後の対象一要素だけを測る。
        let error: number | null = null;
        const target = document.readyState === 'complete' ? document.getElementById(id) : null;
        if (target) {
          const root = document.scrollingElement ?? document.documentElement;
          const padding =
            Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
          const margin = Number.parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
          const desired = Math.max(
            0,
            Math.min(
              root.scrollHeight - root.clientHeight,
              target.getBoundingClientRect().top + scrollY - padding - margin,
            ),
          );
          error = scrollY - desired;
        }
        probe.frames.push({
          at: performance.now(),
          status: status(),
          x: scrollX,
          y: scrollY,
          error,
        });
        frame = requestAnimationFrame(sample);
      };
      const timer = window.setTimeout(() => probe.finish('duration-cap'), 15000);
      frame = requestAnimationFrame(sample);
    },
    { id, scenario },
  );
};

const fragmentId = async (page: Page): Promise<string> => {
  const html = await (
    await page.request.get(e2eNoteFixtures.tocReadableLongHeading.directPath)
  ).text();
  const ids = Array.from(html.matchAll(/<h[2-6]\b[^>]*\bid="([^"]+)"/gu)).map((match) => match[1]);
  const id = ids.at(-2);
  if (!id) throw new Error('長い本文の明示見出しfixtureが必要です');
  return id;
};

const finishProbe = async (
  page: Page,
  info: TestInfo,
  name: string,
): Promise<Omit<FragmentProbe, 'finish'>> => {
  const data = await page.evaluate(() => {
    const probe = window.__initialFragmentArrival;
    probe.finish('host-finish');
    return {
      timeOrigin: probe.timeOrigin,
      calls: probe.calls,
      frames: probe.frames,
      changedAt: probe.changedAt,
      cancelledAt: probe.cancelledAt,
      stopReason: probe.stopReason,
      active: probe.active,
    };
  });
  await info.attach(name, { body: JSON.stringify(data, null, 2), contentType: 'application/json' });
  expect(data.stopReason).toBe('host-finish');
  return data;
};

export const registerInitialFragmentArrivalTests = (): void => {
  test.describe('managed initial fragment arrival', () => {
    test.use({ viewport: { width: 1280, height: 720 }, reducedMotion: 'no-preference' });
    for (const scenario of ['direct', 'layout'] as const) {
      test(`${scenario}: 通常motionはinstant補正せず最新見出しに実到達してsettledになる`, async ({
        page,
      }, info) => {
        test.setTimeout(20000);
        const id = await fragmentId(page);
        await installProbe(page, id, scenario);
        try {
          await page.goto(
            `${e2eNoteFixtures.tocReadableLongHeading.directPath}#${encodeURIComponent(id)}`,
            { timeout: 15000 },
          );
          await expect(page.locator('main#main-content')).toHaveAttribute(
            'data-reading-position-status',
            'settled',
          );
          await expect
            .poll(async () =>
              page.evaluate(() => {
                const frames = window.__initialFragmentArrival.frames;
                return Math.abs(frames.at(-1)?.error ?? Number.POSITIVE_INFINITY);
              }),
            )
            .toBeLessThanOrEqual(2);
        } catch (error) {
          await finishProbe(page, info, `initial-fragment-${scenario}-failure`);
          throw error;
        }
        const data = await finishProbe(page, info, `initial-fragment-${scenario}`);
        const final = data.frames.at(-1);
        expect(final?.status).toBe('settled');
        expect(Math.abs(final?.error ?? Number.POSITIVE_INFINITY)).toBeLessThanOrEqual(2);
        expect(data.calls.filter((call) => call.behavior === 'instant')).toEqual([]);
        expect(
          data.frames
            .filter((sample) => sample.status === 'settled' && sample.error !== null)
            .every((sample) => Math.abs(sample.error ?? 0) <= 2),
        ).toBe(true);
        if (scenario === 'layout') expect(data.changedAt).not.toBeNull();
      });
    }
    test('空fragment直接アクセスは通常motionでinstant補正せず文書先頭に到達する', async ({
      page,
    }, info) => {
      test.setTimeout(20000);
      await installProbe(page, '', 'direct');
      try {
        await page.goto(`${e2eNoteFixtures.tocReadableLongHeading.directPath}#`, {
          timeout: 15000,
        });
        await expect(page.locator('main#main-content')).toHaveAttribute(
          'data-reading-position-status',
          'settled',
        );
        await expect
          .poll(async () =>
            page.evaluate(() => {
              const sample = window.__initialFragmentArrival.frames.at(-1);
              return sample?.status === 'settled'
                ? Math.max(Math.abs(sample.x), Math.abs(sample.y))
                : Number.POSITIVE_INFINITY;
            }),
          )
          .toBeLessThanOrEqual(2);
      } catch (error) {
        await finishProbe(page, info, 'initial-fragment-empty-failure');
        throw error;
      }
      const data = await finishProbe(page, info, 'initial-fragment-empty');
      expect(data.frames.at(-1)?.status).toBe('settled');
      expect(Math.abs(data.frames.at(-1)?.x ?? Number.POSITIVE_INFINITY)).toBeLessThanOrEqual(2);
      expect(Math.abs(data.frames.at(-1)?.y ?? Number.POSITIVE_INFINITY)).toBeLessThanOrEqual(2);
      expect(data.calls.filter((call) => call.behavior === 'instant')).toEqual([]);
    });
    test('初回pending中の本人入力は取消し、旧jobから後続scrollを出さない', async ({
      page,
    }, info) => {
      test.setTimeout(20000);
      const id = await fragmentId(page);
      await installProbe(page, id, 'cancel');
      try {
        await page.goto(
          `${e2eNoteFixtures.tocReadableLongHeading.directPath}#${encodeURIComponent(id)}`,
          { timeout: 15000 },
        );
        await expect(page.locator('main#main-content')).toHaveAttribute(
          'data-reading-position-status',
          'cancelled',
        );
        await page.evaluate(() => new Promise<void>((resolve) => setTimeout(resolve, 150)));
      } catch (error) {
        await finishProbe(page, info, 'initial-fragment-cancel-failure');
        throw error;
      }
      const data = await finishProbe(page, info, 'initial-fragment-cancel');
      expect(data.cancelledAt).not.toBeNull();
      expect(
        data.calls.filter((call) => call.at >= (data.cancelledAt ?? Number.POSITIVE_INFINITY)),
      ).toEqual([]);
      expect(data.frames.some((frame) => frame.status === 'settled')).toBe(false);
    });
  });
};
