import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { e2eNoteFixtures } from './note-fixtures.js';

interface NativeTocFrame {
  at: number;
  phase: string;
  settled: boolean;
  nativeSync: string | null;
  sequence: string | null;
  y: number;
  expected: string | null;
  current: string[];
  consistent: boolean;
  mobile: string[] | null;
  mobileConsistent: boolean;
  controllerDefined: boolean;
}
interface NativeTocProbe {
  frames: NativeTocFrame[];
  persisted: boolean | null;
  resumedAt: number | null;
  active: boolean;
  preferFragment: boolean;
}
declare global {
  interface Window {
    __nativeTocSession: NativeTocProbe;
  }
}

// geometryはload後から読む。rAF/MO観測はnative受理後と初期再更新の状態を検証し、
// Reading起動前のOS初回描画を保証するものではない。
const install = async (page: Page, preferFragment = false): Promise<void> => {
  await page.addInitScript((preferFragment) => {
    const probe: NativeTocProbe = (window.__nativeTocSession = {
      frames: [],
      persisted: null,
      resumedAt: null,
      active: true,
      preferFragment,
    });
    const read = (nav: Element | null): { current: string[]; consistent: boolean } => {
      const links = Array.from(nav?.querySelectorAll<HTMLElement>('[data-toc-link]') ?? []);
      const current = links.filter((a) => a.getAttribute('aria-current') === 'location');
      return {
        current: current.map((a) => a.dataset['headingId'] ?? ''),
        consistent: links.every((a) => {
          const yes = current.includes(a);
          const rail = getComputedStyle(a, '::before');
          return (
            (a.getAttribute('data-active') === 'true') === yes &&
            a.classList.contains('is-active') === yes &&
            (a.getClientRects().length === 0 || Number(rail.opacity) === (yes ? 1 : 0))
          );
        }),
      };
    };
    const sample = (phase: string): void => {
      if (!probe.active || document.readyState !== 'complete') return;
      const main = document.querySelector<HTMLElement>('main#main-content');
      const nav = main?.querySelector('[data-layout-toc-nav]');
      if (!main || !nav) return;
      const ids = new Set(
        Array.from(nav.querySelectorAll<HTMLElement>('[data-toc-link]')).map(
          (a) => a.dataset['headingId'],
        ),
      );
      const headings = Array.from(
        main.querySelectorAll<HTMLElement>('h2[id],h3[id],h4[id],h5[id],h6[id]'),
      ).filter((h) => ids.has(h.id) && h.getClientRects().length > 0);
      const pad =
        Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
      let expected = headings[0]?.id ?? null;
      for (const h of headings) {
        if (
          h.getBoundingClientRect().top >
          pad + (Number.parseFloat(getComputedStyle(h).scrollMarginTop) || 0)
        )
          break;
        expected = h.id;
      }
      if (probe.preferFragment && location.hash) {
        const id = decodeURIComponent(location.hash.slice(1));
        const target = headings.find((h) => h.id === id);
        if (
          target &&
          target.getBoundingClientRect().bottom > 0 &&
          target.getBoundingClientRect().top < innerHeight
        )
          expected = id;
      }
      const desktop = read(nav);
      const mobileNav = document.querySelector('[data-layout-toc-mobile-nav]');
      const mobile = read(mobileNav);
      probe.frames.push({
        at: performance.now(),
        phase,
        settled: main.dataset['readingPositionStatus'] === 'settled',
        nativeSync: main.dataset['tocNativeSync'] ?? null,
        sequence: main.dataset['tocPositionSequence'] ?? null,
        y: scrollY,
        expected,
        current: desktop.current,
        consistent: desktop.consistent,
        mobile: mobileNav ? mobile.current : null,
        mobileConsistent: mobile.consistent,
        controllerDefined: !!customElements.get('layout-toc-controller'),
      });
    };
    new MutationObserver(() => sample('mutation')).observe(document, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: [
        'aria-current',
        'data-reading-position-status',
        'data-toc-native-sync',
        'data-toc-position-sequence',
      ],
    });
    window.addEventListener('pageshow', (event) => {
      probe.persisted = event.persisted;
      probe.active = true;
      if (event.persisted) {
        probe.frames = [];
        probe.resumedAt = performance.now();
      }
      sample('pageshow');
    });
    window.addEventListener('pagehide', (event) => {
      // 合成lifecycle試験では実際にはfreezeしないため、hideからshowまでの観測を続ける。
      if (event.isTrusted) probe.active = false;
    });
    const frame = (): void => {
      sample('raf');
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }, preferFragment);
};

const ready = async (page: Page): Promise<void> => {
  await expect(page.locator('main#main-content')).toHaveAttribute(
    'data-reading-position-status',
    'settled',
  );
};
const readAt = async (page: Page, fraction: number): Promise<number> => {
  await ready(page);
  return page.evaluate(async (fraction) => {
    await document.fonts.ready;
    const root = document.scrollingElement;
    if (!root) throw new Error('scrollingElement');
    scrollTo({
      top: Math.round((root.scrollHeight - root.clientHeight) * fraction),
      behavior: 'instant',
    });
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
    return scrollY;
  }, fraction);
};
const assertFrames = (frames: NativeTocFrame[], y?: number): void => {
  expect(frames.length, 'Reading settled後の観測が必要').toBeGreaterThan(0);
  expect(frames.some((f) => f.phase === 'raf')).toBe(true);
  for (const f of frames) {
    expect(f.expected, `${f.phase}@${f.at} oracle`).toBeTruthy();
    expect(f.current, `${f.phase}@${f.at} desktop current`).toEqual([f.expected]);
    expect(f.consistent, `${f.phase}@${f.at} aria/data/class/rail`).toBe(true);
    if (f.mobile) {
      expect(f.mobile, `${f.phase}@${f.at} mobile current`).toEqual([f.expected]);
      expect(f.mobileConsistent).toBe(true);
    }
    if (y !== undefined) expect(Math.abs(f.y - y)).toBeLessThanOrEqual(2);
  }
};
const finish = async (
  page: Page,
  info: TestInfo,
  name: string,
  y?: number,
  newerThanSequence = -1,
): Promise<NativeTocFrame[]> => {
  await ready(page);
  await page.waitForTimeout(220); // 独立した0ms/rAF/120msの初期再更新を含める。
  const probe = await page.evaluate(() => window.__nativeTocSession);
  await info.attach(name, {
    body: JSON.stringify(
      { observation: 'intrusive DOM/rAF; not OS presented frames', ...probe },
      null,
      2,
    ),
    contentType: 'application/json',
  });
  const accepted = probe.frames.findIndex(
    (f) => f.nativeSync === 'accepted' && Number(f.sequence) > newerThanSequence,
  );
  expect(accepted, 'native受理とTOC transaction成功の観測が必要').toBeGreaterThanOrEqual(0);
  const frames = probe.frames.slice(accepted);
  assertFrames(frames, y);
  expect((frames.at(-1)?.at ?? 0) - (frames[0]?.at ?? Infinity)).toBeGreaterThanOrEqual(120);
  return frames;
};

export const registerNativeTocSessionTests = (): void => {
  test.describe('native TOC source session', () => {
    test.use({ viewport: { width: 1440, height: 900 } });
    for (const { motion, syntheticHide } of [
      { motion: 'reduce', syntheticHide: false },
      { motion: 'no-preference', syntheticHide: false },
      { motion: 'reduce', syntheticHide: true },
    ] as const) {
      test(`directのnative受理後はmodule未loadでもcurrentを維持する: ${motion}${syntheticHide ? ' synthetic pagehide後の通常観測' : ''}`, async ({
        page,
      }, info) => {
        await install(page);
        await page.emulateMedia({ reducedMotion: motion });
        let release!: () => void;
        const gate = new Promise<void>((resolve) => {
          release = resolve;
        });
        await page.route('**/layout-toc-controller-*.js', async (route) => {
          await gate;
          await route.continue();
        });
        try {
          await page.goto(e2eNoteFixtures.tocReadableLongHeading.directPath, {
            waitUntil: 'domcontentloaded',
          });
          const frames = await finish(page, info, `native-direct-before-controller-${motion}`, 0);
          expect(frames.every((f) => !f.controllerDefined && f.mobile === null)).toBe(true);
          if (syntheticHide) {
            info.annotations.push({
              type: 'lifecycle',
              description:
                '合成pagehideからpageshow前の通常観測。実BFCache成立の証明には数えない。',
            });
            await page.evaluate(() =>
              window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })),
            );
          }
          // 早期受理からpresentation構築までに入った本人のscrollを優先する。
          await page.mouse.wheel(0, 800);
          await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(200);
          await page.evaluate(async () => {
            let previous = scrollY;
            let stable = 0;
            while (stable < 4) {
              await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
              stable = scrollY === previous ? stable + 1 : 0;
              previous = scrollY;
            }
          });
          await page.evaluate(() => {
            window.__nativeTocSession.frames = [];
          });
          await page.evaluate(
            () =>
              new Promise<void>((resolve) =>
                requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
              ),
          );
          const beforePresentation = await page.evaluate(() => window.__nativeTocSession.frames);
          assertFrames(beforePresentation);
          expect(beforePresentation.every((f) => !f.controllerDefined && f.mobile === null)).toBe(
            true,
          );
          expect(beforePresentation.at(-1)?.expected).not.toBe(frames[0]?.expected);
          await info.attach(`native-user-scroll-before-controller-${motion}`, {
            body: JSON.stringify(beforePresentation, null, 2),
            contentType: 'application/json',
          });
          if (syntheticHide)
            await page.evaluate(() =>
              window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })),
            );
          release();
          await expect(page.locator('[data-layout-toc-mobile-nav]')).toHaveCount(1);
          const adopted = await finish(page, info, `native-direct-after-user-scroll-${motion}`);
          expect(adopted.some((f) => f.mobile !== null)).toBe(true);
        } finally {
          release();
        }
      });
    }
    for (const [name, fraction] of [
      ['upper', 0],
      ['middle', 0.5],
      ['end', 1],
    ] as const) {
      test(`reloadはstale hashよりnative ${name} viewportを採用する`, async ({ page }, info) => {
        await install(page);
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.goto(e2eNoteFixtures.tocReadableLongHeading.directPath);
        await ready(page);
        // appへreveal/scrollを要求せずfragmentを持つアドレスを保持する。
        await page.evaluate(() => {
          const first = document.querySelector<HTMLElement>('[data-layout-toc-nav] [data-toc-link]')
            ?.dataset['headingId'];
          if (!first) throw new Error('heading');
          history.replaceState(history.state, '', `#${encodeURIComponent(first)}`);
        });
        const y = await readAt(page, fraction);
        await page.reload();
        await finish(page, info, `native-reload-${name}`, y);
      });
    }
    test('direct fragmentは既存のhash reveal/current policyを維持する', async ({ page }, info) => {
      await install(page, true);
      const html = await (
        await page.request.get(e2eNoteFixtures.tocReadableLongHeading.directPath)
      ).text();
      const id = Array.from(html.matchAll(/<h[2-6]\b[^>]*\bid="([^"]+)"/gu))[1]?.[1];
      expect(id).toBeTruthy();
      await page.goto(
        `${e2eNoteFixtures.tocReadableLongHeading.directPath}#${encodeURIComponent(id ?? '')}`,
      );
      await finish(page, info, 'native-direct-fragment');
    });
    test('BFCache復帰はpersisted成立時のみ古い証明と再開後currentを検証する', async ({
      page,
    }, info) => {
      await install(page);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(e2eNoteFixtures.tocReadableLongHeading.directPath);
      const y = await readAt(page, 0.5);
      await expect(page.locator('[data-layout-toc-mobile-nav]')).toHaveCount(1);
      const sequence = await page
        .locator('main#main-content')
        .getAttribute('data-toc-position-sequence');
      await page.goto('/about/');
      // BFCache復帰ではloadが再発火しないため、URLとpageshowの観測で判定する。
      await page.goBack({ waitUntil: 'commit' });
      await expect(page).toHaveURL(e2eNoteFixtures.tocReadableLongHeading.directPath);
      const persisted = await page.evaluate(() => window.__nativeTocSession.persisted);
      await info.attach('native-bfcache-eligibility', {
        body: JSON.stringify({ persisted }),
        contentType: 'application/json',
      });
      test.skip(persisted !== true, 'pageshow.persisted未成立。BFCache成功として数えない。');
      await finish(page, info, 'native-bfcache-resume', y, Number(sequence));
    });
  });
};
