import { expect, test, type Page, type Response, type TestInfo } from '@playwright/test';
import sharp from 'sharp';
import { resolveRouterArtifactPathname } from '../../../shared/navigation/router-artifact-path.js';

const notes = {
  iwanami: `/notes/library/collection/${encodeURIComponent('岩波文庫')}/`,
  chikuma: `/notes/library/collection/${encodeURIComponent('ちくま学芸文庫')}/`,
};
interface Point {
  x: number;
  y: number;
  row: number;
  rowTop: number;
  rowText: string;
  entry: string;
  title: string;
}
interface Frame {
  at: number;
  phase: string;
  generation: number;
  x: number;
  y: number;
  rangeY: number;
  rowTop: number | null;
  rowText: string | null;
  title: string;
  entry: string | null;
  status: string | null;
  prepaint: string | null;
}
interface Probe {
  active: boolean;
  generation: number;
  startGeneration: number;
  row: number;
  phase: string;
  frames: Frame[];
  replacements: number;
  commits: number;
  focus: number;
  announcements: number;
  nativeStarts: number;
  historyEffects: number;
  scrolls: { at: number; requestedY: number; appliedY: number }[];
}
declare global {
  interface Window {
    __prepaintXY: Probe;
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
  await page.evaluate(async (target) => {
    const host = document.querySelector('router-document-host');
    if (!host) throw new Error('router-document-host');
    const result = await host.navigate(target);
    if (!result.committed) throw new Error(result.outcome);
  }, url);
  await ready(page);
};
const install = async (page: Page, unsupported = false): Promise<void> => {
  await page.addInitScript((unsupported) => {
    if (unsupported) Reflect.deleteProperty(Document.prototype, 'startViewTransition');
    const probe: Probe = (window.__prepaintXY = {
      active: false,
      generation: 0,
      startGeneration: 0,
      row: 0,
      phase: 'initial',
      frames: [],
      replacements: 0,
      commits: 0,
      focus: 0,
      announcements: 0,
      nativeStarts: 0,
      historyEffects: 0,
      scrolls: [],
    });
    const sample = (phase: string): void => {
      if (!probe.active) return;
      const main = document.querySelector<HTMLElement>('main#main-content');
      const row = main?.querySelector('table')?.rows[probe.row];
      const scrolling = document.scrollingElement;
      probe.frames.push({
        at: performance.now(),
        phase: `${probe.phase}:${phase}`,
        generation: probe.generation,
        x: scrollX,
        y: scrollY,
        rangeY: scrolling ? Math.max(0, scrolling.scrollHeight - scrolling.clientHeight) : 0,
        rowTop: row?.getBoundingClientRect().top ?? null,
        rowText: row?.textContent ?? null,
        title: main?.querySelector('h1')?.textContent?.trim() ?? '',
        entry: history.state?.__rouaultHistoryEntry?.id ?? null,
        status: main?.dataset['readingPositionStatus'] ?? null,
        prepaint: main?.dataset['readingPositionPrepaint'] ?? null,
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
      if (probe.active) probe.replacements++;
      // このイベント自身はpaint機会でない。初回可視判定にはrAF/posttaskを使う。
    });
    document.addEventListener('router-document-host:navigation-committed', () => {
      if (probe.active) probe.commits++;
    });
    const scroll = window.scrollTo.bind(window);
    window.scrollTo = (options?: ScrollToOptions | number, y?: number): void => {
      const requestedY = typeof options === 'number' ? (y ?? 0) : (options?.top ?? scrollY);
      if (typeof options === 'number') scroll(options, y ?? 0);
      else scroll(options);
      if (probe.active)
        probe.scrolls.push({ at: performance.now(), requestedY, appliedY: scrollY });
    };
    const focus = HTMLElement.prototype.focus;
    HTMLElement.prototype.focus = function (options?: FocusOptions): void {
      if (probe.active && this.id === 'main-content') probe.focus++;
      focus.call(this, options);
    };
    const start = document.startViewTransition?.bind(document);
    if (start)
      document.startViewTransition = (...args) => {
        if (probe.active) probe.nativeStarts++;
        return start(...args);
      };
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (frames, options): Animation {
      const result = animate.call(this, frames, options);
      if (probe.active && result.id === 'rouault-history-content') probe.historyEffects++;
      return result;
    };
    new MutationObserver((records) => {
      for (const record of records) {
        if (
          probe.active &&
          record.target instanceof HTMLElement &&
          record.target.matches('[data-router-document-host-announcement]') &&
          record.target.textContent
        )
          probe.announcements++;
      }
    }).observe(document, { subtree: true, childList: true });
  }, unsupported);
};
const save = async (page: Page, y: number): Promise<Point> => {
  await ready(page);
  await page.evaluate(async (y) => {
    window.scrollTo({ left: 0, top: y, behavior: 'instant' });
    await document.fonts.ready;
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
  }, y);
  const point = await page.evaluate(() => {
    const main = document.querySelector('main#main-content');
    const rows = Array.from(main?.querySelector('table')?.rows ?? []);
    const row = rows.findIndex(
      (row) =>
        row.getBoundingClientRect().top >= 96 && row.getBoundingClientRect().bottom < innerHeight,
    );
    const element = rows[row];
    const entry: unknown = history.state?.__rouaultHistoryEntry?.id;
    if (!element || typeof entry !== 'string') throw new Error('可視行と管理entryが必要');
    return {
      x: scrollX,
      y: scrollY,
      row,
      rowTop: element.getBoundingClientRect().top,
      rowText: element.textContent ?? '',
      entry,
      title: main?.querySelector('h1')?.textContent?.trim() ?? '',
    };
  });
  expect(point.y).toBe(y);
  expect(point.x).toBe(0);
  expect(point.rowTop).toBeGreaterThanOrEqual(96);
  return point;
};
const pair = async (page: Page) => {
  await page.goto(notes.iwanami);
  const first = await save(page, 2667);
  await navigate(page, notes.chikuma);
  const second = await save(page, 3607);
  return { first, second };
};
const begin = async (page: Page, saved: Point, phase: string): Promise<void> => {
  await page.evaluate(
    ({ row, phase }) => {
      const p = window.__prepaintXY;
      Object.assign(p, {
        active: true,
        startGeneration: p.generation,
        row,
        phase,
        frames: [],
        replacements: 0,
        commits: 0,
        focus: 0,
        announcements: 0,
        nativeStarts: 0,
        historyEffects: 0,
        scrolls: [],
      });
    },
    { row: saved.row, phase },
  );
};
const finish = async (page: Page, saved: Point, info: TestInfo, name: string): Promise<void> => {
  await ready(page);
  // 従来の観測窓を維持し、最初のrAF→MessageChannelの採取も打ち切らない。
  // 先頭から全frameを保持し、同じ新世代のsettled後の両機会まで追加観測する。
  await page.waitForTimeout(80);
  await page.waitForFunction(() => {
    const probe = window.__prepaintXY;
    const frames = probe.frames.filter(
      (frame) => frame.generation === probe.startGeneration + 1 && frame.status === 'settled',
    );
    return (
      frames.some((frame) => frame.phase.endsWith(':raf')) &&
      frames.some((frame) => frame.phase.endsWith(':posttask'))
    );
  });
  const result = await page.evaluate(() => {
    window.__prepaintXY.active = false;
    return window.__prepaintXY;
  });
  const frames = result.frames.filter((frame) => frame.generation > result.startGeneration);
  await info.attach(name, {
    body: JSON.stringify(
      { kind: 'intrusive-raf-posttask-not-OS-presented-frame', saved, firstNew: frames[0], result },
      null,
      2,
    ),
    contentType: 'application/json',
  });
  expect(frames.some((frame) => frame.phase.endsWith(':raf'))).toBe(true);
  expect(frames.some((frame) => frame.phase.endsWith(':posttask'))).toBe(true);
  for (const frame of frames) {
    expect(frame.generation).toBe(result.startGeneration + 1);
    expect(frame.title).toBe(saved.title);
    expect(frame.entry).toBe(saved.entry);
    const expectedY = saved.y;
    expect(
      Math.abs(frame.y - expectedY),
      `${frame.phase} first-new Y at ${frame.at}`,
    ).toBeLessThanOrEqual(2);
    expect(Math.abs(frame.x - saved.x)).toBeLessThanOrEqual(2);
    expect(frame.rowText).toBe(saved.rowText);
    expect(Math.abs((frame.rowTop ?? Infinity) - saved.rowTop)).toBeLessThanOrEqual(2);
  }
  expect(result.replacements).toBe(1);
  expect(result.commits).toBe(1);
  expect(result.focus).toBe(1);
  expect(result.announcements).toBe(1);
  expect(result.nativeStarts).toBe(0);
  expect(result.historyEffects).toBe(0);
  expect(
    await page.locator('main#main-content').evaluate((main) => document.activeElement === main),
  ).toBe(true);
};

export const registerHistoryPrepaintXYTests = (): void => {
  test.describe('履歴entryのprepaint rawXY（案A）', () => {
    test('同一ページのtop→TOC→Backはhashを除去してtopへ戻る', async ({ page }) => {
      const target = `/notes/library/collection/${encodeURIComponent('計算機科学・ソフトウェア開発関連書籍')}`;
      await page.goto(target);
      await ready(page);
      await page.evaluate(async () => {
        await document.fonts.ready;
        scrollTo({ top: 0, behavior: 'instant' });
      });
      const entry: unknown = await page.evaluate(() => history.state?.__rouaultHistoryEntry?.id);
      await page.locator('[data-layout-toc-nav] a[href="#c-net-visual-basic"]').first().click();
      await expect.poll(() => page.evaluate(() => location.hash)).toBe('#c-net-visual-basic');
      await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(100);
      await page.goBack();
      await ready(page);
      expect(await page.evaluate(() => location.hash)).toBe('');
      expect(await page.evaluate(() => history.state?.__rouaultHistoryEntry?.id)).toBe(entry);
      expect(Math.abs(await page.evaluate(() => scrollY))).toBeLessThanOrEqual(2);
    });

    for (const title of ['計算機科学・ソフトウェア開発関連書籍', '岩波文庫']) {
      test(`table rail activation preserves the no-JS body geometry: ${title}`, async ({
        page,
        browser,
      }) => {
        const target = `/notes/library/collection/${encodeURIComponent(title)}`;
        const minimumTables = title === '岩波文庫' ? 1 : 2;
        const nativeContext = await browser.newContext({
          javaScriptEnabled: false,
          viewport: page.viewportSize(),
        });
        try {
          const native = await nativeContext.newPage();
          const measure = (page: Page) =>
            page.evaluate(() => ({
              range: document.scrollingElement?.scrollHeight,
              points: [
                ...document.querySelectorAll<HTMLElement>(
                  'main [data-table-root], main h2[id], main h3[id]',
                ),
              ].map((element) => ({
                id: element.id,
                top: element.getBoundingClientRect().top + scrollY,
                height: element.getBoundingClientRect().height,
              })),
            }));
          await native.goto(target);
          await expect.poll(() => native.evaluate(() => document.fonts.status)).toBe('loaded');
          const baseline = await measure(native);
          await page.goto(target);
          await ready(page);
          await page.evaluate(() => document.fonts.ready.then(() => undefined));
          await expect
            .poll(() => page.locator('[data-table-scroll-rail]').count())
            .toBeGreaterThanOrEqual(minimumTables);
          const enhanced = await measure(page);
          expect(enhanced.points.length).toBeGreaterThanOrEqual(minimumTables);
          const railClearances = await page
            .locator('[data-table-scroll-rail]')
            .evaluateAll((rails) =>
              rails.map((rail) => {
                const root = rail.nextElementSibling;
                if (!(root instanceof HTMLElement)) throw new Error('owned table root');
                return root.getBoundingClientRect().top - rail.getBoundingClientRect().bottom;
              }),
            );
          for (const clearance of railClearances) expect(clearance).toBeGreaterThanOrEqual(-2);
          expect(enhanced.points.map(({ id }) => id)).toEqual(baseline.points.map(({ id }) => id));
          expect(Math.abs((enhanced.range ?? 0) - (baseline.range ?? 0))).toBeLessThanOrEqual(2);
          for (const [index, point] of enhanced.points.entries()) {
            const expected = baseline.points[index];
            if (!expected) throw new Error('static reading point');
            expect(Math.abs(point.top - expected.top), point.id).toBeLessThanOrEqual(2);
            expect(Math.abs(point.height - expected.height), point.id).toBeLessThanOrEqual(2);
          }
        } finally {
          await nativeContext.close();
        }
      });
    }

    for (const viewport of [
      { width: 1365, height: 768 },
      { width: 1280, height: 720 },
    ]) {
      test.describe(`actual HTTP warm-cache reload ${viewport.width}x${viewport.height}`, () => {
        test.use({ viewport });
        for (const position of ['hash', 'middle', 'end'] as const) {
          test(`new-to-new reload preserves ${position} reading position`, async ({
            page,
          }, info) => {
            const target = `/notes/library/collection/${encodeURIComponent('計算機科学・ソフトウェア開発関連書籍')}#c-net-visual-basic`;
            const response = await page.goto(target);
            if (!response) throw new Error('initial HTTP response');
            const staticIds = await page.evaluate(
              (html) => {
                const document = new DOMParser().parseFromString(html, 'text/html');
                const wrappers = [...document.querySelectorAll('div[data-table-root="true"]')];
                return wrappers.map((wrapper) => ({
                  id: wrapper.id,
                  count: [...document.querySelectorAll('[id]')].filter(
                    (element) => element.id === wrapper.id,
                  ).length,
                }));
              },
              await response.text(),
            );
            expect(staticIds.length).toBeGreaterThan(1);
            expect(staticIds.every(({ id, count }) => id.length > 0 && count === 1)).toBe(true);
            const settle = async () => {
              await ready(page);
              await page.evaluate(() => document.fonts.ready.then(() => undefined));
              let previous = '';
              let stable = 0;
              for (let sample = 0; sample < 40; sample++) {
                const point = await page.evaluate(() =>
                  [
                    scrollX,
                    scrollY,
                    document.scrollingElement?.scrollHeight,
                    document.fonts.status,
                  ].join(':'),
                );
                stable = point === previous ? stable + 1 : 0;
                if (stable >= 5) return;
                previous = point;
                await page.waitForTimeout(50);
              }
              throw new Error('reading position did not settle');
            };
            const measure = () =>
              page.evaluate(() => ({
                x: scrollX,
                y: scrollY,
                range: document.scrollingElement
                  ? document.scrollingElement.scrollHeight - document.scrollingElement.clientHeight
                  : 0,
                viewport: [innerWidth, innerHeight],
                zoom: visualViewport?.scale,
                font: getComputedStyle(document.querySelector('main') ?? document.body).font,
                fonts: document.fonts.status,
                hash: location.hash,
              }));
            await settle();
            if (position !== 'hash')
              await page.evaluate((position) => {
                const scrolling = document.scrollingElement;
                if (!scrolling) throw new Error('scrolling element');
                scrollTo({
                  top: Math.round(
                    (scrolling.scrollHeight - scrolling.clientHeight) *
                      (position === 'middle' ? 0.55 : 0.9),
                  ),
                  behavior: 'instant',
                });
              }, position);
            await settle();
            const before = await measure();
            // Firefoxは304でもresource timingに初回転送量を残すため、HTTP応答も記録する。
            const revalidated: string[] = [];
            const recordRevalidation = (response: Response): void => {
              if (
                response.status() === 304 &&
                new URL(response.url()).origin === new URL(page.url()).origin &&
                /\.js(?:\?|$)/u.test(response.url())
              )
                revalidated.push(response.url());
            };
            page.on('response', recordRevalidation);
            await page.reload();
            await settle();
            page.off('response', recordRevalidation);
            const after = await measure();
            const cached = await page.evaluate(() =>
              performance
                .getEntriesByType('resource')
                .filter(
                  (resource) =>
                    resource instanceof PerformanceResourceTiming &&
                    new URL(resource.name).origin === location.origin &&
                    /\.js(?:\?|$)/u.test(resource.name) &&
                    resource.encodedBodySize > resource.transferSize,
                )
                .map((resource) => ({
                  name: resource.name,
                  transferSize:
                    resource instanceof PerformanceResourceTiming ? resource.transferSize : null,
                })),
            );
            await info.attach('warm-cache-reload', {
              body: JSON.stringify(
                {
                  kind: 'actual-HTTP-new-to-new-no-interception-baseline-not-proven',
                  position,
                  before,
                  after,
                  cached,
                  revalidated,
                  staticIds,
                },
                null,
                2,
              ),
              contentType: 'application/json',
            });
            expect(
              cached.length + revalidated.length,
              'HTTP cache or revalidation evidence is required',
            ).toBeGreaterThan(0);
            expect(before.fonts).toBe('loaded');
            expect(after.fonts).toBe('loaded');
            expect(after.font).toBe(before.font);
            expect(after.zoom).toBe(before.zoom);
            expect(after.viewport).toEqual(before.viewport);
            expect(after.hash).toBe(before.hash);
            expect(Math.abs(after.range - before.range)).toBeLessThanOrEqual(2);
            expect(Math.abs(after.x - before.x)).toBeLessThanOrEqual(2);
            expect(Math.abs(after.y - before.y)).toBeLessThanOrEqual(2);
          });
        }
      });
    }

    test('hash full Backの最初のdestination compositor frameを保存位置と比較する', async ({
      page,
      browserName,
    }, info) => {
      test.skip(browserName !== 'chromium', 'CDP compositor capture is available only in Chromium');
      const target = `/notes/library/collection/${encodeURIComponent('計算機科学・ソフトウェア開発関連書籍')}#c-net-visual-basic`;
      await page.goto(target);
      await ready(page);
      await page.evaluate(async () => {
        await document.fonts.ready;
        const scrolling = document.scrollingElement;
        if (!scrolling) throw new Error('scrolling element');
        window.scrollTo({
          top: Math.round((scrolling.scrollHeight - scrolling.clientHeight) * 0.55),
          behavior: 'instant',
        });
      });
      await page.waitForTimeout(120);
      const saved = await page.evaluate(() => {
        const article = document.querySelector('main article');
        const rect = article?.getBoundingClientRect();
        const entry: unknown = history.state?.__rouaultHistoryEntry?.id;
        if (!rect || typeof entry !== 'string') throw new Error('article/entry');
        return {
          x: scrollX,
          y: scrollY,
          entry,
          crop: {
            left: Math.max(0, Math.ceil(rect.left + 24)),
            top: 160,
            width: Math.floor(Math.min(rect.width - 48, innerWidth - Math.max(0, rect.left + 24))),
            height: innerHeight - 190,
          },
        };
      });
      const correct = await page.screenshot();
      await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
      const top = await page.screenshot();
      await page.evaluate(({ x, y }) => scrollTo({ left: x, top: y, behavior: 'instant' }), saved);
      await page.waitForTimeout(80);
      await page.evaluate((target) => {
        const link = Array.from(
          document.querySelectorAll<HTMLAnchorElement>('aside[data-layout-sidebar-root] a[href]'),
        ).find(
          (link) =>
            decodeURI(new URL(link.href).pathname).replace(/\/$/u, '') ===
            decodeURI(target).replace(/\/$/u, ''),
        );
        if (!link) throw new Error('sidebar destination link');
        link.click();
      }, notes.chikuma);
      await ready(page);
      await page.evaluate(() => document.fonts.ready.then(() => undefined));
      const source = await page.screenshot();
      const session = await page.context().newCDPSession(page);
      const frames: { data: Buffer; timestamp: number | undefined }[] = [];
      session.on('Page.screencastFrame', (frame) => {
        frames.push({
          data: Buffer.from(frame.data, 'base64'),
          timestamp: frame.metadata.timestamp,
        });
        void session.send('Page.screencastFrameAck', { sessionId: frame.sessionId });
      });
      try {
        await session.send('Page.startScreencast', { format: 'png', everyNthFrame: 1 });
        await page.evaluate(() => history.back());
        await page.waitForFunction(
          (entry) =>
            history.state?.__rouaultHistoryEntry?.id === entry &&
            document.querySelector<HTMLElement>('main#main-content')?.dataset[
              'readingPositionStatus'
            ] === 'settled',
          saved.entry,
        );
        await page.waitForTimeout(120);
        await session.send('Page.stopScreencast');
      } finally {
        await session.detach();
      }
      const pixels = (data: Buffer) =>
        sharp(data).extract(saved.crop).removeAlpha().raw().toBuffer();
      const references = await Promise.all([correct, top, source].map(pixels));
      const difference = (left: Buffer, right: Buffer): number => {
        if (left.length !== right.length) throw new Error('frame dimensions changed');
        let sum = 0;
        for (let index = 0; index < left.length; index++)
          sum += Math.abs((left[index] ?? 0) - (right[index] ?? 0));
        return sum / left.length;
      };
      const measured = await Promise.all(
        frames.map(async (frame, index) => {
          const data = await pixels(frame.data);
          return {
            index,
            timestamp: frame.timestamp,
            saved: difference(data, references[0] ?? Buffer.alloc(0)),
            top: difference(data, references[1] ?? Buffer.alloc(0)),
            source: difference(data, references[2] ?? Buffer.alloc(0)),
          };
        }),
      );
      const destination = measured.filter(
        (frame) => Math.min(frame.saved, frame.top) < frame.source,
      );
      await info.attach('compositor-frame-classification', {
        body: JSON.stringify(
          {
            kind: 'captured-Chromium-compositor-frames-not-exhaustive-OS-presentations',
            saved,
            measured,
            destination,
          },
          null,
          2,
        ),
        contentType: 'application/json',
      });
      const first = destination[0];
      expect(first, 'a captured destination frame is required').toBeDefined();
      if (!first) return;
      const frame = frames[first.index];
      if (frame)
        await info.attach('first-captured-destination', {
          body: frame.data,
          contentType: 'image/png',
        });
      expect(first.saved).toBeLessThan(first.top);
      expect(first.saved).toBeLessThan(2);
      expect(Math.abs((await page.evaluate(() => scrollY)) - saved.y)).toBeLessThanOrEqual(2);
    });

    for (const mode of ['normal', 'unsupported', 'reduced-motion'] as const)
      test(`実岩波↔ちくまのBack/Forwardは最初の新本文から保存XYと同じ可視行: ${mode}`, async ({
        page,
      }, info) => {
        await install(page, mode === 'unsupported');
        await page.emulateMedia({
          reducedMotion: mode === 'reduced-motion' ? 'reduce' : 'no-preference',
        });
        const { first, second } = await pair(page);
        if (mode === 'unsupported')
          expect(await page.evaluate(() => typeof document.startViewTransition)).toBe('undefined');
        expect(
          await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches),
        ).toBe(mode === 'reduced-motion');
        await begin(page, first, 'back');
        await page.evaluate(() => history.back());
        await finish(page, first, info, `first-new-${mode}-back`);
        await begin(page, second, 'forward');
        await page.evaluate(() => history.forward());
        await finish(page, second, info, `first-new-${mode}-forward`);
      });

    test('短文化した実entryは先行成功とせず候補を通常jobのclamp終端へ渡す', async ({
      page,
    }, info) => {
      await install(page);
      const { first } = await pair(page);
      await page.route(`**${resolveRouterArtifactPathname(notes.iwanami)}`, async (route) => {
        const response = await route.fetch();
        const envelope = (await response.json()) as { document: { html: string } };
        envelope.document.html =
          '<article><h1>岩波文庫</h1><p style="height:1600px">短文化した実entry</p></article>';
        await route.fulfill({ response, json: envelope });
      });
      await begin(page, first, 'clamp');
      await page.evaluate(() => history.back());
      await ready(page);
      await page.waitForTimeout(80);
      const outcome = await page.evaluate(() => {
        const main = document.querySelector<HTMLElement>('main#main-content');
        const root = document.scrollingElement;
        window.__prepaintXY.active = false;
        return {
          prepaint: main?.dataset['readingPositionPrepaint'],
          y: scrollY,
          max: root ? Math.max(0, root.scrollHeight - root.clientHeight) : 0,
          entry: history.state?.__rouaultHistoryEntry?.id,
          probe: window.__prepaintXY,
        };
      });
      await info.attach('clamp-fallback-not-prepaint-success', {
        body: JSON.stringify(
          { kind: 'candidate-retained-final-clamp-not-first-frame-success', saved: first, outcome },
          null,
          2,
        ),
        contentType: 'application/json',
      });
      expect(outcome.prepaint).toBe('unavailable');
      expect(outcome.max).toBeGreaterThan(0);
      expect(outcome.max).toBeLessThan(first.y);
      // 候補が消えて通常topへ変わっていれば、この正のrange末尾には到達しない。
      expect(Math.abs(outcome.y - outcome.max)).toBeLessThanOrEqual(2);
      expect(outcome.entry).toBe(first.entry);
      expect(outcome.probe.commits).toBe(1);
      expect(outcome.probe.focus).toBe(1);
      expect(outcome.probe.announcements).toBe(1);
      expect(outcome.probe.nativeStarts).toBe(0);
      expect(outcome.probe.historyEffects).toBe(0);
    });

    test('取得中BackをForwardで取り消し、旧応答は最新entryを移動しない', async ({ page }, info) => {
      await install(page);
      const { second } = await pair(page);
      let release!: () => void;
      let requested!: () => void;
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      const seen = new Promise<void>((resolve) => {
        requested = resolve;
      });
      await page.route(`**${resolveRouterArtifactPathname(notes.iwanami)}`, async (route) => {
        requested();
        await gate;
        await route.continue().catch(() => {
          /* 取消済みrequestを再実行しない。 */
        });
      });
      try {
        await begin(page, second, 'cancelled-back-forward');
        await page.evaluate(() => history.back());
        await seen;
        await page.evaluate(() => history.forward());
        await expect
          .poll(() => page.evaluate(() => history.state?.__rouaultHistoryEntry?.id))
          .toBe(second.entry);
        await ready(page);
        release();
        await page.waitForTimeout(120);
        const p = await page.evaluate(() => {
          window.__prepaintXY.active = false;
          return window.__prepaintXY;
        });
        await info.attach('cancelled-back-forward', {
          body: JSON.stringify(p, null, 2),
          contentType: 'application/json',
        });
        expect(
          p.frames
            .filter((frame) => frame.generation > p.startGeneration)
            .every((frame) => frame.title === second.title),
        ).toBe(true);
        expect(Math.abs((await page.evaluate(() => scrollY)) - second.y)).toBeLessThanOrEqual(2);
        expect(p.nativeStarts).toBe(0);
        expect(p.historyEffects).toBe(0);
        expect(p.announcements).toBeLessThanOrEqual(1);
      } finally {
        release();
      }
    });

    for (const change of ['font', 'image', 'rail'] as const)
      test(`初回復元とsettled後の${change}によるlayout shiftを別々に観測する`, async ({
        page,
      }, info) => {
        await install(page);
        const { first } = await pair(page);
        await begin(page, first, 'initial-before-late-change');
        await page.evaluate(() => history.back());
        await finish(page, first, info, `${change}-initial-first-new`);
        const evidence = await page.evaluate(
          async ({ change, row }) => {
            const main = document.querySelector<HTMLElement>('main#main-content');
            const table = main?.querySelector('table');
            const element = table?.rows[row];
            if (!main || !table || !element) throw new Error('遅延変更の実tableが必要');
            const probe = window.__prepaintXY;
            probe.frames = [];
            probe.phase = `late-${change}`;
            probe.active = true;
            if (change === 'font') {
              // 固定line-heightによる無変化と混同せず、字体metricで高さが変わる対照を作る。
              table.style.lineHeight = 'normal';
              await new Promise<void>((resolve) =>
                requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
              );
            }
            const before = {
              at: performance.now(),
              x: scrollX,
              y: scrollY,
              rowTop: element.getBoundingClientRect().top,
              rowText: element.textContent,
            };
            if (change === 'font') {
              const resources = performance.getEntriesByType('resource');
              const font =
                resources.find((entry) => /latin[^/]*\.woff2(?:\?|$)/u.test(entry.name)) ??
                resources.find((entry) => /\.woff2(?:\?|$)/u.test(entry.name));
              if (!font) throw new Error('配信済み実woff2が必要');
              const face = new FontFace('PrepaintLateFont', `url("${font.name}")`);
              if (!Reflect.has(face, 'sizeAdjust') || !Reflect.set(face, 'sizeAdjust', '180%'))
                throw new Error('遅延font fixtureには実sizeAdjust対応が必要');
              await face.load();
              document.fonts.add(face);
              table.style.fontFamily = 'PrepaintLateFont, serif';
              await document.fonts.ready;
            } else if (change === 'image') {
              const image = document.createElement('img');
              image.alt = '初回復元後に寸法が確定する画像';
              image.src =
                'data:image/svg+xml,' +
                encodeURIComponent(
                  '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="120"/>',
                );
              main.prepend(image);
              await image.decode();
            } else {
              const rail = main.querySelector<HTMLElement>('[data-table-scroll-rail]');
              if (!rail) throw new Error('enhancerが作った実railが必要');
              rail.style.blockSize = '64px';
            }
            await new Promise<void>((resolve) =>
              requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
            );
            await new Promise<void>((resolve) => setTimeout(resolve, 30));
            probe.active = false;
            return {
              before,
              after: {
                at: performance.now(),
                x: scrollX,
                y: scrollY,
                rowTop: element.getBoundingClientRect().top,
                rowText: element.textContent,
              },
              frames: probe.frames,
            };
          },
          { change, row: first.row },
        );
        await info.attach(`${change}-later-shift-separate-from-first-new`, {
          body: JSON.stringify(
            { kind: 'controlled-post-settle-layout-change-not-first-frame-acceptance', evidence },
            null,
            2,
          ),
          contentType: 'application/json',
        });
        expect(evidence.after.rowText).toBe(first.rowText);
        expect(evidence.frames.some((frame) => frame.phase.endsWith(':raf'))).toBe(true);
        expect(evidence.frames.some((frame) => frame.phase.endsWith(':posttask'))).toBe(true);
        // UAのscroll anchoringが行位置を保つ場合もrawY変化として区別する。
        expect(
          Math.max(
            Math.abs(evidence.after.rowTop - evidence.before.rowTop),
            Math.abs(evidence.after.y - evidence.before.y),
          ),
        ).toBeGreaterThan(2);
      });

    test.describe('mobile', () => {
      test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });
      test('狭い画面でも実表のBack/Forward初回rawXYと可視行を保持する', async ({ page }, info) => {
        await install(page);
        const { first, second } = await pair(page);
        await begin(page, first, 'mobile-back');
        await page.evaluate(() => history.back());
        await finish(page, first, info, 'mobile-first-new-back');
        await begin(page, second, 'mobile-forward');
        await page.evaluate(() => history.forward());
        await finish(page, second, info, 'mobile-first-new-forward');
      });
    });
  });
};
