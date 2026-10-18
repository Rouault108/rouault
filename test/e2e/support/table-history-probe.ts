import { expect, type Page, type TestInfo } from '@playwright/test';

export const tableNotes = {
  iwanami: `/notes/library/collection/${encodeURIComponent('岩波文庫')}/`,
  chikuma: `/notes/library/collection/${encodeURIComponent('ちくま学芸文庫')}/`,
} as const;

interface TablePosition {
  x: number;
  y: number;
  rowTop: number;
  rowText: string;
  entry: string;
  url: string;
}
interface TableFrame {
  phase: 'raf' | 'after-raf-task';
  at: number;
  generation: number;
  epoch: number | null;
  title: string;
  url: string;
  entry: string | null;
  x: number;
  y: number;
  rowTop: number | null;
  eligibility: string | null;
  status: string | null;
  opacity: number;
  tables: {
    rootId: string;
    controls: string | null;
    rootTop: number;
    tableTop: number | null;
    railTop: number | null;
    rootLeft: number;
    railLeft: number | null;
    horizontalRange: number;
  }[];
  verticalRange: number;
}
interface TableHistoryProbe {
  active: boolean;
  generation: number;
  startingGeneration: number;
  epoch: number | null;
  rowIndex: number;
  frames: TableFrame[];
  replaced: number[];
  commits: number;
  focus: number;
  announcements: number;
  effects: number;
  starts: { at: number; duration: number | null; main: boolean; x: number; y: number }[];
  nativeStarts: number;
  visual: { provided: boolean; value: boolean | null } | null;
  scrolls: { at: number; requestedX: number; requestedY: number; x: number; y: number }[];
}
interface TableTiming {
  phase: 'prepare' | 'schedule';
  started: number;
  duration: number;
  withinBudget: boolean | null;
  url: string;
}
declare global {
  interface Window {
    __tableHistoryProbe: TableHistoryProbe;
    __tableHistoryTimings: TableTiming[];
  }
}

export const tableReady = async (page: Page): Promise<void> => {
  await page.evaluate(async () => {
    await customElements.whenDefined('router-document-host');
    await document.querySelector('router-document-host')?.whenReady();
    await document.fonts.ready;
  });
  await expect(page.locator('main#main-content')).toHaveAttribute(
    'data-reading-position-status',
    'settled',
  );
};

export const tableNavigate = async (page: Page, url: string): Promise<void> => {
  await page.evaluate(async (target) => {
    const result = await document.querySelector('router-document-host')?.navigate(target);
    if (!result?.committed) throw new Error(`Navigation failed: ${result?.outcome}`);
  }, url);
  await tableReady(page);
  await expect(page.locator('html')).not.toHaveAttribute('data-content-transition');
};

// このprobeはlayoutを読む機能検証。性能値やOSの実提示frameの証拠とは分離する。
export const installTableFrameProbe = async (page: Page, unsupported = false): Promise<void> => {
  await page.addInitScript(
    ({ unsupported }) => {
      const probe: TableHistoryProbe = (window.__tableHistoryProbe = {
        active: false,
        generation: 0,
        startingGeneration: 0,
        epoch: null,
        rowIndex: 48,
        frames: [],
        replaced: [],
        commits: 0,
        focus: 0,
        announcements: 0,
        effects: 0,
        starts: [],
        nativeStarts: 0,
        visual: null,
        scrolls: [],
      });
      const animate = Element.prototype.animate;
      Element.prototype.animate = function (keyframes, options): Animation {
        if (unsupported && typeof options === 'object' && options.id === 'rouault-history-content')
          throw new Error('Owner test: history animation unavailable');
        const result = animate.call(this, keyframes, options);
        if (probe.active && result.id === 'rouault-history-content') {
          probe.effects++;
          const duration = result.effect?.getTiming().duration;
          probe.starts.push({
            at: performance.now(),
            duration: typeof duration === 'number' ? duration : null,
            main: this === document.querySelector('main#main-content'),
            x: scrollX,
            y: scrollY,
          });
        }
        return result;
      };
      const nativeStart = document.startViewTransition?.bind(document);
      if (unsupported) Object.defineProperty(document, 'startViewTransition', { value: undefined });
      else if (nativeStart)
        Object.defineProperty(document, 'startViewTransition', {
          value: (update: () => Promise<void>) => {
            if (probe.active) probe.nativeStarts++;
            return nativeStart(update);
          },
        });
      const focus = HTMLElement.prototype.focus;
      HTMLElement.prototype.focus = function (options?: FocusOptions): void {
        if (probe.active && this.id === 'main-content') probe.focus++;
        focus.call(this, options);
      };
      const scroll = window.scrollTo.bind(window);
      window.scrollTo = (options?: ScrollToOptions | number, top?: number): void => {
        const requestedX = typeof options === 'number' ? options : (options?.left ?? scrollX);
        const requestedY = typeof options === 'number' ? (top ?? 0) : (options?.top ?? scrollY);
        if (typeof options === 'number') scroll(options, top ?? 0);
        else scroll(options);
        if (probe.active)
          probe.scrolls.push({
            at: performance.now(),
            requestedX,
            requestedY,
            x: scrollX,
            y: scrollY,
          });
      };
      document.addEventListener('router-document-host:content-dom-replaced', () => {
        probe.generation++;
        probe.epoch = null;
        // dirty layoutの準備前にrect/scroll/styleを読まない。
        if (probe.active) probe.replaced.push(performance.now());
      });
      document.addEventListener('router-document-host:navigation-committed', (event) => {
        probe.epoch = (event as CustomEvent<{ contentEpoch: number }>).detail.contentEpoch;
        if (probe.active) probe.commits++;
      });
      window.addEventListener('popstate', (event) => {
        if (!probe.active) return;
        const value: unknown = event.hasUAVisualTransition;
        probe.visual = {
          provided: 'hasUAVisualTransition' in event,
          value: typeof value === 'boolean' ? value : null,
        };
      });
      new MutationObserver((records) => {
        if (!probe.active) return;
        for (const record of records)
          if (
            record.target instanceof HTMLElement &&
            record.target.matches('[data-router-document-host-announcement]') &&
            record.target.textContent
          )
            probe.announcements++;
      }).observe(document, { childList: true, subtree: true });
      const sample = (phase: TableFrame['phase']): void => {
        if (!probe.active) return;
        const main = document.querySelector<HTMLElement>('main#main-content');
        const state: unknown = history.state;
        const entry = (state as { __rouaultHistoryEntry?: { id?: string } } | null)
          ?.__rouaultHistoryEntry?.id;
        probe.frames.push({
          phase,
          at: performance.now(),
          generation: probe.generation,
          epoch: probe.epoch,
          title: main?.querySelector('h1')?.textContent?.trim() ?? '',
          url: location.pathname + location.search + location.hash,
          entry: entry ?? null,
          x: scrollX,
          y: scrollY,
          rowTop:
            main?.querySelector('table')?.rows[probe.rowIndex]?.getBoundingClientRect().top ?? null,
          eligibility: main?.dataset['historyPresentationEligibility'] ?? null,
          status: main?.dataset['readingPositionStatus'] ?? null,
          opacity: main ? Number(getComputedStyle(main).opacity) : 1,
          tables: Array.from(
            main?.querySelectorAll<HTMLElement>('[data-table-root]') ?? [],
            (root) => {
              const sibling = root.previousElementSibling;
              const rail =
                sibling instanceof HTMLElement && sibling.hasAttribute('data-table-scroll-rail')
                  ? sibling
                  : null;
              return {
                rootId: root.id,
                controls: rail?.getAttribute('aria-controls') ?? null,
                rootTop: root.getBoundingClientRect().top,
                tableTop: root.querySelector('table')?.getBoundingClientRect().top ?? null,
                railTop: rail?.getBoundingClientRect().top ?? null,
                rootLeft: root.scrollLeft,
                railLeft: rail?.scrollLeft ?? null,
                horizontalRange: root.scrollWidth - root.clientWidth,
              };
            },
          ),
          verticalRange: (document.scrollingElement?.scrollHeight ?? 0) - innerHeight,
        });
      };
      const channel = new MessageChannel();
      channel.port1.onmessage = () => sample('after-raf-task');
      const frame = (): void => {
        if (probe.active) {
          sample('raf');
          channel.port2.postMessage(null);
        }
        requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    },
    { unsupported },
  );
};

export const makeTableCertificateUnavailable = async (page: Page): Promise<void> => {
  await page.addInitScript(() => {
    document.addEventListener(
      'DOMContentLoaded',
      () => {
        // sourceから同じ未知CSSが存在しても、有限profileの証明として採用しない。
        const style = document.createElement('style');
        style.dataset['tableHistoryUnpreparedProfile'] = 'true';
        style.textContent =
          '[data-table-root] tbody tr:nth-child(733) td:nth-child(8){font-kerning:none}';
        document.head.append(style);
      },
      { once: true },
    );
  });
};

export const saveTablePosition = async (page: Page, y: number): Promise<TablePosition> => {
  await page.evaluate((top) => scrollTo({ left: 0, top, behavior: 'instant' }), y);
  await page.waitForTimeout(180);
  return page.evaluate(() => {
    const row = document.querySelector<HTMLTableElement>('main table')?.rows[48];
    const state: unknown = history.state;
    const entry = (state as { __rouaultHistoryEntry?: { id: string } } | null)
      ?.__rouaultHistoryEntry?.id;
    if (!row || !entry) throw new Error('Missing saved table entry/row');
    return {
      x: scrollX,
      y: scrollY,
      rowTop: row.getBoundingClientRect().top,
      rowText: row.textContent ?? '',
      entry,
      url: location.pathname + location.search + location.hash,
    };
  });
};

export const startTableProbe = async (page: Page): Promise<void> => {
  await page.evaluate(() => {
    const probe = window.__tableHistoryProbe;
    probe.frames = [];
    probe.startingGeneration = probe.generation;
    probe.starts = [];
    probe.replaced = [];
    probe.scrolls = [];
    probe.commits = probe.focus = probe.announcements = probe.effects = probe.nativeStarts = 0;
    probe.visual = null;
    probe.active = true;
  });
};

export const finishTableProbe = async (
  page: Page,
  saved: TablePosition,
  title: string,
  testInfo: TestInfo,
  name: string,
): Promise<void> => {
  await tableReady(page);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeCloseTo(saved.y, 0);
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));
  const result = await page.evaluate(() => {
    window.__tableHistoryProbe.active = false;
    return window.__tableHistoryProbe;
  });
  const frames = result.frames.filter(
    (frame) => frame.title === title && frame.entry === saved.entry,
  );
  await testInfo.attach(name, {
    body: JSON.stringify(
      {
        kind: 'intrusive-functional-raf-not-presented-frame',
        classification: 'unapproved-source-css-no-portable-certificate-ordinary-restoration',
        saved,
        firstObservedNewMain: frames[0] ?? null,
        firstAfterRafTask: frames.find((frame) => frame.phase === 'after-raf-task') ?? null,
        final: frames.at(-1) ?? null,
        probe: result,
      },
      null,
      2,
    ),
    contentType: 'application/json',
  });
  expect(frames.length).toBeGreaterThan(0);
  expect(result.replaced).toHaveLength(1);
  expect(result.commits).toBe(1);
  expect(result.focus).toBe(1);
  expect(result.announcements).toBe(1);
  expect(result.nativeStarts).toBe(0);
  expect(result.effects).toBe(0);
  expect(frames.at(-1)?.eligibility).toBe('unavailable');
  expect(Math.abs((frames.at(-1)?.x ?? Infinity) - saved.x)).toBeLessThanOrEqual(2);
  expect(Math.abs((frames.at(-1)?.rowTop ?? Infinity) - saved.rowTop)).toBeLessThanOrEqual(2);
  expect(result.scrolls.some((call) => Math.abs(call.requestedY - saved.y) <= 2)).toBe(true);
};

export const waitForTableSourceCertificate = async (
  page: Page,
  saved: TablePosition,
): Promise<void> => {
  await expect
    .poll(
      () =>
        page.evaluate((entry) => {
          interface Checkpoint {
            position: { x: number; y: number };
            tableCertificate?: unknown;
          }
          interface ReadingOwner {
            readTableDiagnostics(): {
              preparation?: { outcome: string };
              capture?: { outcome: string };
            } | null;
            geometry: Map<string, Checkpoint>;
          }
          const owner = (
            document.querySelector('router-document-host') as unknown as {
              _postRenderController: { reading: ReadingOwner };
            }
          )._postRenderController.reading;
          const diagnostic = owner.readTableDiagnostics();
          const checkpoint = owner.geometry.get(entry);
          return {
            preparation: diagnostic?.preparation?.outcome ?? null,
            capture: diagnostic?.capture?.outcome ?? null,
            hasCertificate: !!checkpoint?.tableCertificate,
            position: checkpoint?.position ?? null,
          };
        }, saved.entry),
      { timeout: 10_000 },
    )
    .toMatchObject({
      preparation: 'ready',
      capture: 'ready',
      hasCertificate: true,
      position: { x: saved.x, y: saved.y },
    });
};

export const auditActualTableCellFonts = async (
  page: Page,
  entry: string,
  expected?: readonly (readonly [string, readonly string[]])[],
) =>
  page.evaluate(
    async ({ entry, expected }) => {
      interface Certificate {
        roles: readonly (readonly [string, readonly string[]])[];
      }
      const owner = (
        document.querySelector('router-document-host') as unknown as {
          _postRenderController: {
            reading: { geometry: Map<string, { tableCertificate?: Certificate }> };
          };
        }
      )._postRenderController.reading;
      const roles = expected ?? owner.geometry.get(entry)?.tableCertificate?.roles;
      if (!roles) throw new Error('Prepared source font certificate required');
      const dictionary = new Map(roles);
      const records: unknown[] = [];
      const mismatches: unknown[] = [];
      let cells = 0,
        textCells = 0,
        glyphFailures = 0;
      for (const [tableIndex, table] of Array.from(
        document.querySelectorAll('main table'),
      ).entries()) {
        for (const cell of table.querySelectorAll<HTMLTableCellElement>('th,td')) {
          const style = getComputedStyle(cell);
          // Browser oracleとは別にactual production DOMから全値を採り、製品role関数を使わない。
          const values = [
            `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`,
            style.getPropertyValue('font-stretch'),
            style.fontVariant,
            style.fontFeatureSettings,
            style.fontVariationSettings,
            style.fontKerning,
            style.fontOpticalSizing,
            style.lineHeight,
            style.letterSpacing,
            style.wordSpacing,
            style.textTransform,
            ...[
              'font-size-adjust',
              'font-synthesis',
              'font-language-override',
              'text-rendering',
              'direction',
              'writing-mode',
              'text-orientation',
              'white-space',
              'word-break',
              'overflow-wrap',
              'hyphens',
              'tab-size',
              'unicode-bidi',
            ].map((name) => style.getPropertyValue(name)),
          ];
          const role = `${tableIndex}:${cell.localName}:${cell.getAttribute('align') ?? ''}`;
          const text = Array.from(cell.childNodes)
            .filter((node) => node.nodeType === Node.TEXT_NODE)
            .map((node) => node.textContent ?? '')
            .join('')
            .trim();
          if (text) {
            textCells++;
            if (!document.fonts.check(values[0] ?? '', text)) glyphFailures++;
          }
          if (JSON.stringify(dictionary.get(role)) !== JSON.stringify(values))
            mismatches.push({
              cell: cells,
              role,
              text,
              actual: values,
              expected: dictionary.get(role),
            });
          records.push([cells++, role, text, values]);
        }
      }
      const digest = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(JSON.stringify(records)),
      );
      return {
        kind: 'independent-actual-cell-computed-font-audit-layout-warmed-not-first-frame-proof',
        cells,
        textCells,
        glyphFailures,
        mismatchCount: mismatches.length,
        mismatches: mismatches.slice(0, 20),
        roles,
        digest: Array.from(new Uint8Array(digest), (byte) =>
          byte.toString(16).padStart(2, '0'),
        ).join(''),
      };
    },
    { entry, expected },
  );

export const finishStrictTableProbe = async (
  page: Page,
  saved: TablePosition,
  title: string,
  testInfo: TestInfo,
  name: string,
  noMotion = false,
): Promise<boolean> => {
  await tableReady(page);
  // 自然180msを最後まで記録し、start直後の取消も中間opacity不在として検出する。
  await page.waitForTimeout(210);
  const result = await page.evaluate(() => {
    window.__tableHistoryProbe.active = false;
    return window.__tableHistoryProbe;
  });
  // 新本文はhead/receipt公開より先に存在し得る。epochやtitleで誤位置frameを捨てない。
  const frames = result.frames.filter((frame) => frame.generation > result.startingGeneration);
  const visualEligible = result.visual?.provided === true && result.visual.value === false;
  await testInfo.attach(name, {
    body: JSON.stringify(
      {
        kind: 'strict-intrusive-new-main-generation-position-not-OS-presented-frame',
        saved,
        firstNewMain: frames[0] ?? null,
        firstPostTask: frames.find((frame) => frame.phase === 'after-raf-task') ?? null,
        visualEligible,
        noMotion,
        probe: result,
      },
      null,
      2,
    ),
    contentType: 'application/json',
  });
  expect(result.replaced).toHaveLength(1);
  expect(result.commits).toBe(1);
  expect(result.focus).toBe(1);
  expect(result.announcements).toBe(1);
  expect(result.nativeStarts).toBe(0);
  expect(frames.some((frame) => frame.phase === 'raf')).toBe(true);
  expect(frames.some((frame) => frame.phase === 'after-raf-task')).toBe(true);
  for (const frame of frames) {
    expect(frame.generation).toBe(result.startingGeneration + 1);
    expect(frame.title).toBe(title);
    expect(frame.entry).toBe(saved.entry);
    expect(frame.url).toBe(saved.url);
    expect(frame.eligibility).toBe('ready');
    expect(Math.abs(frame.x - saved.x), `${frame.phase} X at ${frame.at}`).toBeLessThanOrEqual(2);
    expect(Math.abs(frame.y - saved.y), `${frame.phase} Y at ${frame.at}`).toBeLessThanOrEqual(2);
    expect(Math.abs((frame.rowTop ?? Infinity) - saved.rowTop)).toBeLessThanOrEqual(2);
  }
  const applies = result.scrolls.filter(
    (call) => Math.abs(call.requestedX - saved.x) <= 2 && Math.abs(call.requestedY - saved.y) <= 2,
  );
  expect(applies).toHaveLength(1);
  expect(applies[0]?.at).toBeLessThanOrEqual(frames[0]?.at ?? -Infinity);
  if (noMotion || !visualEligible) expect(result.effects).toBe(0);
  else {
    expect(result.effects).toBe(1);
    expect(result.starts[0]).toMatchObject({ main: true, duration: 180 });
    expect(result.starts[0]?.x).toBe(saved.x);
    expect(result.starts[0]?.y).toBe(saved.y);
    expect(
      frames.some(
        (frame) => frame.phase === 'after-raf-task' && frame.opacity >= 0.82 && frame.opacity < 1,
      ),
    ).toBe(true);
  }
  return visualEligible;
};

// 所有者テスト専用。時間計測中はframe/rect/style/scroll probeを設置しない。
export const installTableTimingProbe = async (page: Page): Promise<void> => {
  await page.evaluate(() => {
    interface ScheduleInput {
      url: string;
      tablePreparationWithinBudget?: boolean;
    }
    interface PostRenderOwner {
      prepareTables(root: HTMLElement, canPrepare: () => boolean): boolean;
      reading: { schedule(input: ScheduleInput): void };
    }
    const host = document.querySelector('router-document-host');
    const owner = (host as unknown as { _postRenderController?: PostRenderOwner } | null)
      ?._postRenderController;
    if (!owner) throw new Error('Missing post-render owner');
    window.__tableHistoryTimings = [];
    const prepare = owner.prepareTables.bind(owner);
    owner.prepareTables = (root, canPrepare): boolean => {
      const started = performance.now();
      const result = prepare(root, canPrepare);
      window.__tableHistoryTimings.push({
        phase: 'prepare',
        started,
        duration: performance.now() - started,
        withinBudget: result,
        url: location.pathname,
      });
      return result;
    };
    const schedule = owner.reading.schedule.bind(owner.reading);
    owner.reading.schedule = (input): void => {
      const started = performance.now();
      schedule(input);
      window.__tableHistoryTimings.push({
        phase: 'schedule',
        started,
        duration: performance.now() - started,
        withinBudget: input.tablePreparationWithinBudget ?? null,
        url: input.url,
      });
    };
  });
};
