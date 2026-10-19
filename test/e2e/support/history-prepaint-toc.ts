import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { e2eNoteFixtures } from './note-fixtures.js';
import { resolveRouterArtifactPathname } from '../../../shared/navigation/router-artifact-path.js';

interface TocLinkFrame {
  id: string;
  current: string | null;
  active: string | null;
  activeClass: boolean;
  hidden: boolean;
  rendered: boolean;
  railOpacity: number;
  railWidth: number;
  railColor: string;
  railTransitionProperty: string;
  railTransitionDuration: string;
  railTransitionDelay: string;
  density: string | null;
  labelClamp: string;
  labelFontWeight: string;
}
interface TocFrame {
  at: number;
  phase: string;
  generation: number;
  url: string;
  title: string;
  y: number;
  expectedId: string | null;
  sync: string | null;
  readingPrepaint: string | null;
  desktop: TocLinkFrame[];
  mobile: TocLinkFrame[] | null;
}
interface TocProbe {
  active: boolean;
  generation: number;
  startGeneration: number;
  frames: TocFrame[];
}
declare global {
  interface Window {
    __tocFirstFrame: TocProbe;
  }
}

const ready = async (page: Page): Promise<void> => {
  await page.evaluate(async () => {
    await customElements.whenDefined('router-document-host');
    const host = document.querySelector('router-document-host');
    if (!host) throw new Error('router-document-host');
    await host.whenReady();
  });
  await expect(page.locator('main#main-content')).toHaveAttribute(
    'data-reading-position-status',
    'settled',
  );
};

const navigate = async (page: Page, url: string): Promise<void> => {
  await page.evaluate(async (url) => {
    const host = document.querySelector('router-document-host');
    if (!host) throw new Error('router-document-host');
    const result = await host.navigate(url);
    if (!result.committed) throw new Error(result.outcome);
  }, url);
  await ready(page);
};

const install = async (page: Page): Promise<void> => {
  await page.addInitScript(() => {
    const probe = (window.__tocFirstFrame = {
      active: false,
      generation: 0,
      startGeneration: 0,
      frames: [] as TocFrame[],
    });
    const readLinks = (nav: Element | null): TocLinkFrame[] =>
      Array.from(nav?.querySelectorAll<HTMLElement>('[data-toc-link]') ?? []).map((link) => {
        const rail = getComputedStyle(link, '::before');
        const label = link.querySelector('.layout-toc__link-label');
        return {
          id: link.dataset['headingId'] ?? '',
          current: link.getAttribute('aria-current'),
          active: link.getAttribute('data-active'),
          activeClass: link.classList.contains('is-active'),
          hidden: link.closest('[hidden], [aria-hidden="true"]') !== null,
          rendered: link.getClientRects().length > 0,
          railOpacity: Number.parseFloat(rail.opacity),
          railWidth: Number.parseFloat(rail.width),
          railColor: rail.backgroundColor,
          railTransitionProperty: rail.transitionProperty,
          railTransitionDuration: rail.transitionDuration,
          railTransitionDelay: rail.transitionDelay,
          density: link.closest('[data-density-tier]')?.getAttribute('data-density-tier') ?? null,
          labelClamp: label ? getComputedStyle(label).webkitLineClamp : '',
          labelFontWeight: getComputedStyle(link).fontWeight,
        };
      });
    const sample = (phase: string): void => {
      if (!probe.active) return;
      const main = document.querySelector<HTMLElement>('main#main-content');
      const desktopNav = document.querySelector('[data-layout-toc-nav]');
      const mobileNav = document.querySelector('[data-layout-toc-mobile-nav]');
      // production helperを呼ばず、実際に描画される本文見出しとactivation lineを照合する。
      const ids = new Set(
        Array.from(desktopNav?.querySelectorAll<HTMLElement>('[data-toc-link]') ?? []).map(
          (link) => link.dataset['headingId'],
        ),
      );
      const headings = Array.from(
        main?.querySelectorAll<HTMLElement>('h2[id],h3[id],h4[id],h5[id],h6[id]') ?? [],
      ).filter((heading) => ids.has(heading.id) && heading.getClientRects().length > 0);
      let expectedId = headings[0]?.id ?? null;
      const padding =
        Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
      for (const heading of headings) {
        const offset =
          padding + (Number.parseFloat(getComputedStyle(heading).scrollMarginTop) || 0);
        if (heading.getBoundingClientRect().top > offset) break;
        expectedId = heading.id;
      }
      probe.frames.push({
        at: performance.now(),
        phase,
        generation: probe.generation,
        url: location.pathname + location.search + location.hash,
        title: main?.querySelector('h1')?.textContent?.trim() ?? '',
        y: scrollY,
        expectedId,
        sync: main?.dataset['tocPositionSync'] ?? null,
        readingPrepaint: main?.dataset['readingPositionPrepaint'] ?? null,
        desktop: readLinks(desktopNav),
        mobile: mobileNav ? readLinks(mobileNav) : null,
      });
    };
    const channel = new MessageChannel();
    channel.port1.onmessage = () => sample('posttask');
    const frame = (): void => {
      sample('raf');
      if (probe.active) channel.port2.postMessage(null);
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
    document.addEventListener('router-document-host:content-dom-replaced', () => {
      probe.generation++;
    });
    new MutationObserver((records) => {
      if (
        records.some((record) =>
          Array.from(record.addedNodes).some(
            (node) =>
              node instanceof Element &&
              (node.matches('[data-layout-toc-mobile-nav]') ||
                node.querySelector('[data-layout-toc-mobile-nav]')),
          ),
        )
      )
        sample('mobile-created');
    }).observe(document, { childList: true, subtree: true });
  });
};

const begin = async (page: Page): Promise<void> => {
  await page.evaluate(() => {
    const probe = window.__tocFirstFrame;
    probe.startGeneration = probe.generation;
    probe.frames = [];
    probe.active = true;
  });
};

const assertLinks = (links: TocLinkFrame[], expectedId: string, description: string): void => {
  expect(links.length, description).toBeGreaterThan(0);
  for (const link of links) {
    const current = link.id === expectedId;
    expect(link.current, `${description}: ${link.id} aria-current`).toBe(
      current ? 'location' : null,
    );
    expect(link.active, `${description}: ${link.id} data-active`).toBe(current ? 'true' : null);
    expect(link.activeClass, `${description}: ${link.id} class`).toBe(current);
    // hidden cloneは未描画のためDOM stateだけを検証し、可視surfaceのrailは最初から検証する。
    if (link.rendered) {
      expect(link.railOpacity, `${description}: ${link.id} rail`).toBe(current ? 1 : 0);
    }
    if (current && link.rendered) {
      expect(link.railWidth).toBeGreaterThan(0);
      expect(link.railColor).not.toBe('rgba(0, 0, 0, 0)');
    }
    const expanded = link.density === 'expanded';
    expect(link.labelClamp, `${description}: ${link.id} label clamp`).toBe(
      String(current ? (expanded ? 4 : 3) : expanded ? 3 : 2),
    );
  }
};

const finish = async (
  page: Page,
  info: TestInfo,
  name: string,
  expectedY: number,
): Promise<void> => {
  await ready(page);
  // tracker start、0ms、120msの再更新と、その次の描画機会までを含める。
  await page.waitForTimeout(200);
  const probe = await page.evaluate(() => {
    window.__tocFirstFrame.active = false;
    return window.__tocFirstFrame;
  });
  const frames = probe.frames.filter((frame) => frame.generation > probe.startGeneration);
  await info.attach(name, {
    body: JSON.stringify(
      { kind: 'intrusive-raf-posttask-not-OS-presented-frame', first: frames[0], frames },
      null,
      2,
    ),
    contentType: 'application/json',
  });
  expect(frames.some((frame) => frame.phase === 'raf')).toBe(true);
  expect(frames.some((frame) => frame.phase === 'posttask')).toBe(true);
  expect((frames.at(-1)?.at ?? 0) - (frames[0]?.at ?? Infinity)).toBeGreaterThanOrEqual(120);
  const firstId = frames[0]?.expectedId;
  expect(firstId).toBeTruthy();
  for (const frame of frames) {
    const description = `${name} ${frame.phase} at ${frame.at}`;
    expect(frame.generation, description).toBe(probe.startGeneration + 1);
    expect(frame.sync, description).toBe('accepted');
    expect(frame.expectedId, description).toBe(firstId);
    expect(Math.abs(frame.y - expectedY), description).toBeLessThanOrEqual(2);
    assertLinks(frame.desktop, firstId ?? '', `${description} desktop`);
    // cloneが生成された最初の観測から、空currentや先頭仮設定を許さない。
    if (frame.mobile) assertLinks(frame.mobile, firstId ?? '', `${description} mobile`);
  }
  expect(frames.some((frame) => frame.mobile !== null)).toBe(true);
};

const readAt = async (page: Page, fraction: number): Promise<number> => {
  await ready(page);
  return page.evaluate(async (fraction) => {
    await document.fonts.ready;
    const scrolling = document.scrollingElement;
    if (!scrolling) throw new Error('scrollingElement');
    const y = Math.round((scrolling.scrollHeight - scrolling.clientHeight) * fraction);
    window.scrollTo({ top: y, left: 0, behavior: 'instant' });
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
    return scrollY;
  }, fraction);
};

export const registerHistoryPrepaintTocTests = (): void => {
  test.describe('TOC currentの最初の新本文frame', () => {
    test('expandedの長いラベルは初回currentでweightとclampが変わっても本文XYを維持する', async ({
      page,
    }, info) => {
      await install(page);
      await page.route(
        `**${resolveRouterArtifactPathname(e2eNoteFixtures.tocReadableLongHeading.normalizedPath)}`,
        async (route) => {
          const response = await route.fetch();
          const envelope = (await response.json()) as { document: { html: string } };
          // 既存fixtureの配信応答だけを4見出しへ投影し、productionのexpanded recipeを使う。
          envelope.document.html = await page.evaluate((html) => {
            const parsed = new DOMParser().parseFromString(html, 'text/html');
            const source = parsed.querySelector('script[id^="toc-source-"]');
            const value: unknown = JSON.parse(source?.textContent ?? 'null');
            if (!source || !Array.isArray(value)) throw new Error('TOC source');
            const headings = value
              .slice(0, 4)
              .filter(
                (heading): heading is { id: string } =>
                  typeof heading === 'object' &&
                  heading !== null &&
                  'id' in heading &&
                  typeof heading.id === 'string',
              );
            if (headings.length !== 4) throw new Error('expanded fixture headings');
            source.textContent = JSON.stringify(headings);
            const ids = new Set(headings.map((heading) => heading.id));
            for (const item of parsed.querySelectorAll<HTMLElement>(
              '.layout-toc__item[data-heading-id]',
            )) {
              if (!ids.has(item.dataset['headingId'] ?? '')) item.remove();
            }
            for (const element of parsed.querySelectorAll('[data-density-tier]'))
              element.setAttribute('data-density-tier', 'expanded');
            return parsed.body.innerHTML;
          }, envelope.document.html);
          await route.fulfill({ response, json: envelope });
        },
      );
      await page.goto(e2eNoteFixtures.layoutRich.directPath);
      await ready(page);
      await navigate(page, e2eNoteFixtures.tocReadableLongHeading.normalizedPath);
      await expect(page.locator('[data-layout-toc-nav]')).toHaveAttribute(
        'data-density-tier',
        'expanded',
      );
      const y = await page.evaluate(async () => {
        await document.fonts.ready;
        const heading = document.querySelectorAll<HTMLElement>('main h2[id]')[1];
        if (!heading) throw new Error('long heading');
        const offset =
          (Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0) +
          (Number.parseFloat(getComputedStyle(heading).scrollMarginTop) || 0);
        window.scrollTo({
          top: scrollY + heading.getBoundingClientRect().top - offset + 24,
          behavior: 'instant',
        });
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        );
        return scrollY;
      });
      await navigate(page, e2eNoteFixtures.layoutRich.normalizedPath);
      await begin(page);
      await page.evaluate(() => history.back());
      await finish(page, info, 'toc-expanded-long-label', y);
    });

    test.describe('mobile viewport', () => {
      test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });
      test('Back/Forwardはmobile cloneの最初の状態も本文位置へ一致する', async ({ page }, info) => {
        await install(page);
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.goto(e2eNoteFixtures.layoutRich.directPath);
        const firstY = await readAt(page, 0.5);
        await navigate(page, e2eNoteFixtures.tocReadableLongHeading.normalizedPath);
        const secondY = await readAt(page, 0.5);
        await begin(page);
        await page.evaluate(() => history.back());
        await finish(page, info, 'toc-mobile-back', firstY);
        await begin(page);
        await page.evaluate(() => history.forward());
        await finish(page, info, 'toc-mobile-forward', secondY);
      });
    });

    test('独立trackを証明できない800pxではTOCをskipしてrawXY復元を維持する', async ({
      page,
    }, info) => {
      await page.setViewportSize({ width: 800, height: 900 });
      await install(page);
      await page.goto(e2eNoteFixtures.layoutRich.directPath);
      const y = await readAt(page, 0.5);
      expect(y).toBeGreaterThan(0);
      await navigate(page, e2eNoteFixtures.tocReadableLongHeading.normalizedPath);
      await begin(page);
      await page.evaluate(() => history.back());
      await ready(page);
      await page.waitForTimeout(200);
      const probe = await page.evaluate(() => {
        window.__tocFirstFrame.active = false;
        return window.__tocFirstFrame;
      });
      const frames = probe.frames.filter((frame) => frame.generation > probe.startGeneration);
      await info.attach('toc-skipped-raw-xy-retained', {
        body: JSON.stringify(
          { kind: 'TOC-skipped-not-first-frame-TOC-success', y, frames },
          null,
          2,
        ),
        contentType: 'application/json',
      });
      expect(frames.length).toBeGreaterThan(0);
      for (const frame of frames) {
        expect(frame.sync).toBe('skipped');
        expect(frame.readingPrepaint).toBe('applied');
        expect(Math.abs(frame.y - y)).toBeLessThanOrEqual(2);
      }
      const final = frames.at(-1);
      expect(final?.expectedId).toBeTruthy();
      assertLinks(final?.desktop ?? [], final?.expectedId ?? '', 'skip後の遅延初期化');
    });

    test('遅延TOC moduleを待つ間の本人scrollを最初のcontroller/mobile状態へ採用する', async ({
      page,
    }, info) => {
      await install(page);
      let release!: () => void;
      let requested!: () => void;
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      const seen = new Promise<void>((resolve) => {
        requested = resolve;
      });
      await page.route('**/layout-toc-controller-*.js', async (route) => {
        requested();
        await gate;
        await route.continue();
      });
      try {
        await page.goto(e2eNoteFixtures.tocAbsent.directPath);
        await ready(page);
        await begin(page);
        await page.evaluate((url) => {
          const host = document.querySelector('router-document-host');
          if (!host) throw new Error('router-document-host');
          void host.navigate(url);
        }, e2eNoteFixtures.tocReadableLongHeading.normalizedPath);
        await seen;
        await expect(page.locator('main#main-content')).toHaveAttribute(
          'data-toc-position-sync',
          'accepted',
        );
        await page.evaluate(
          () =>
            new Promise<void>((resolve) =>
              requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
            ),
        );
        const initial = await page.evaluate(() =>
          window.__tocFirstFrame.frames.filter(
            (frame) => frame.generation > window.__tocFirstFrame.startGeneration,
          ),
        );
        expect(initial.length).toBeGreaterThan(0);
        for (const frame of initial) {
          expect(frame.y).toBeLessThanOrEqual(2);
          assertLinks(frame.desktop, frame.expectedId ?? '', 'module待機中の初回top');
          expect(frame.mobile).toBeNull();
        }
        await page.mouse.wheel(0, 650);
        await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(100);
        const y = await page.evaluate(async () => {
          let previous = scrollY;
          let stable = 0;
          const deadline = performance.now() + 2000;
          while (stable < 4 && performance.now() < deadline) {
            await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
            stable = Math.abs(scrollY - previous) <= 1 ? stable + 1 : 0;
            previous = scrollY;
          }
          return scrollY;
        });
        release();
        await expect(page.locator('[data-layout-toc-mobile-nav]')).toHaveCount(1);
        await page.waitForTimeout(200);
        const frames = await page.evaluate(() => {
          window.__tocFirstFrame.active = false;
          return window.__tocFirstFrame.frames.filter(
            (frame) =>
              frame.generation > window.__tocFirstFrame.startGeneration && frame.mobile !== null,
          );
        });
        await info.attach('toc-delayed-module-user-scroll', {
          body: JSON.stringify({ initial, userY: y, frames }, null, 2),
          contentType: 'application/json',
        });
        expect(frames.some((frame) => frame.phase === 'mobile-created')).toBe(true);
        for (const frame of frames) {
          assertLinks(frame.desktop, frame.expectedId ?? '', '遅延module後desktop');
          assertLinks(frame.mobile ?? [], frame.expectedId ?? '', '最初のmobile構築から');
          expect(Math.abs(frame.y - y)).toBeLessThanOrEqual(2);
        }
        expect(frames[0]?.expectedId).not.toBe(initial[0]?.expectedId);
      } finally {
        release();
      }
    });

    for (const reducedMotion of ['no-preference', 'reduce'] as const) {
      for (const [position, fraction] of [
        ['upper', 0],
        ['middle', 0.5],
        ['end', 1],
      ] as const) {
        test(`hashless Back/Forwardの${position}は初回から120ms再更新後までcurrentを保つ: ${reducedMotion}`, async ({
          page,
        }, info) => {
          await install(page);
          await page.emulateMedia({ reducedMotion });
          await page.goto(e2eNoteFixtures.layoutRich.directPath);
          const firstY = await readAt(page, fraction);
          await navigate(page, e2eNoteFixtures.tocReadableLongHeading.normalizedPath);
          const secondY = await readAt(page, fraction);
          await begin(page);
          await page.evaluate(() => history.back());
          await finish(page, info, `toc-${position}-back`, firstY);
          await begin(page);
          await page.evaluate(() => history.forward());
          await finish(page, info, `toc-${position}-forward`, secondY);
        });
      }
      for (const target of ['long-heading', 'layout-rich'] as const)
        test(`通常SPA遷移は最初の新本文からtopとcurrentを一緒に公開する: ${target} ${reducedMotion}`, async ({
          page,
        }, info) => {
          await install(page);
          await page.emulateMedia({ reducedMotion });
          const source =
            target === 'long-heading'
              ? e2eNoteFixtures.layoutRich
              : e2eNoteFixtures.tocReadableLongHeading;
          const destination =
            target === 'long-heading'
              ? e2eNoteFixtures.tocReadableLongHeading
              : e2eNoteFixtures.layoutRich;
          await page.goto(source.directPath);
          expect(await readAt(page, 0.7)).toBeGreaterThan(0);
          await begin(page);
          await navigate(page, destination.normalizedPath);
          await finish(page, info, `toc-normal-spa-${target}`, 0);
        });
    }
  });
};
