import { expect, test } from '@playwright/test';
import { resolveRouterArtifactPathname } from '../../shared/navigation/router-artifact-path.js';
import {
  auditActualTableCellFonts,
  finishTableProbe,
  finishStrictTableProbe,
  installTableFrameProbe,
  installTableTimingProbe,
  makeTableCertificateUnavailable,
  saveTablePosition,
  startTableProbe,
  tableNavigate,
  tableNotes,
  tableReady,
  waitForTableSourceCertificate,
} from './support/table-history-probe.js';

test.use({ viewport: { width: 1280, height: 720 }, reducedMotion: 'no-preference' });

test.describe('大表のincoming証明が成立する実ページ同期復元', () => {
  test('実本文の全セルcomputed字体はsource辞書と復帰後DOMで等価（描画・採用とは別監査）', async ({
    page,
  }, testInfo) => {
    test.setTimeout(60_000);
    await page.goto(tableNotes.iwanami);
    await tableReady(page);
    const iwanami = await saveTablePosition(page, 2667);
    await waitForTableSourceCertificate(page, iwanami);
    const sourceIwanami = await auditActualTableCellFonts(page, iwanami.entry);
    expect(sourceIwanami.cells).toBe(5872);
    expect(sourceIwanami.textCells).toBeGreaterThan(4000);
    expect(sourceIwanami.mismatchCount).toBe(0);
    expect(sourceIwanami.glyphFailures).toBe(0);
    await tableNavigate(page, tableNotes.chikuma);
    const chikuma = await saveTablePosition(page, 3607);
    await waitForTableSourceCertificate(page, chikuma);
    const sourceChikuma = await auditActualTableCellFonts(page, chikuma.entry);
    expect(sourceChikuma.mismatchCount).toBe(0);
    expect(sourceChikuma.glyphFailures).toBe(0);
    await page.evaluate(() => history.back());
    await expect(page.locator('main h1')).toHaveText('岩波文庫');
    await tableReady(page);
    const destinationIwanami = await auditActualTableCellFonts(
      page,
      iwanami.entry,
      sourceIwanami.roles,
    );
    expect(destinationIwanami).toEqual(sourceIwanami);
    await page.evaluate(() => history.forward());
    await expect(page.locator('main h1')).toHaveText('ちくま学芸文庫');
    await tableReady(page);
    const destinationChikuma = await auditActualTableCellFonts(
      page,
      chikuma.entry,
      sourceChikuma.roles,
    );
    expect(destinationChikuma).toEqual(sourceChikuma);
    await testInfo.attach('actual-table-all-cell-font-oracle', {
      body: JSON.stringify(
        { sourceIwanami, destinationIwanami, sourceChikuma, destinationChikuma },
        null,
        2,
      ),
      contentType: 'application/json',
    });
  });

  for (const mode of ['native', 'unsupported', 'reduced-motion'] as const)
    test(`実733行の準備済みBack/Forwardは最初の新本文世代から保存XY: ${mode}`, async ({
      page,
    }, testInfo) => {
      test.setTimeout(60_000);
      await installTableFrameProbe(page, mode === 'unsupported');
      if (mode === 'reduced-motion') await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(tableNotes.iwanami);
      await tableReady(page);
      const iwanami = await saveTablePosition(page, 2667);
      expect(iwanami.x).toBe(0);
      expect(iwanami.y).toBe(2667);
      expect(iwanami.rowText).toContain('人間の絆（上）');
      await waitForTableSourceCertificate(page, iwanami);
      await page.waitForTimeout(1600);
      await tableNavigate(page, tableNotes.chikuma);
      const chikuma = await saveTablePosition(page, 3607);
      expect(chikuma.x).toBe(0);
      expect(chikuma.y).toBe(3607);
      await waitForTableSourceCertificate(page, chikuma);
      await page.waitForTimeout(1600);
      await startTableProbe(page);
      await page.evaluate(() => history.back());
      await expect(page.locator('main h1')).toHaveText('岩波文庫');
      const backEligible = await finishStrictTableProbe(
        page,
        iwanami,
        '岩波文庫',
        testInfo,
        `strict-${mode}-back`,
        mode !== 'native',
      );
      await startTableProbe(page);
      await page.evaluate(() => history.forward());
      await expect(page.locator('main h1')).toHaveText('ちくま学芸文庫');
      const forwardEligible = await finishStrictTableProbe(
        page,
        chikuma,
        'ちくま学芸文庫',
        testInfo,
        `strict-${mode}-forward`,
        mode !== 'native',
      );
      if (mode === 'native')
        test.skip(
          !backEligible || !forwardEligible,
          'UA visual情報がfalseでない: 同期位置は検証済み、演出positiveは未検証',
        );
    });
});

test.describe('未監査CSSで大表certificateを準備できない通常復元の境界', () => {
  for (const mode of ['native', 'unsupported', 'reduced-motion'] as const) {
    test(`実733行の岩波↔ちくま Back/Forward: ${mode} は保存XY/行結果を通常復元する`, async ({
      page,
    }, testInfo) => {
      await installTableFrameProbe(page, mode === 'unsupported');
      await makeTableCertificateUnavailable(page);
      if (mode === 'reduced-motion') await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(tableNotes.iwanami);
      await tableReady(page);
      await expect(page.locator('main table tbody tr')).toHaveCount(733);
      const iwanami = await saveTablePosition(page, 2667);
      expect(iwanami.rowText).toContain('人間の絆（上）');
      await tableNavigate(page, tableNotes.chikuma);
      const chikuma = await saveTablePosition(page, 3607);
      expect(Math.abs(chikuma.y - iwanami.y)).toBeGreaterThan(900);
      const length = await page.evaluate(() => history.length);
      await startTableProbe(page);
      await page.evaluate(() => history.back());
      await expect(page.locator('main h1')).toHaveText('岩波文庫');
      await finishTableProbe(page, iwanami, '岩波文庫', testInfo, `${mode}-back`);
      await startTableProbe(page);
      await page.evaluate(() => history.forward());
      await expect(page.locator('main h1')).toHaveText('ちくま学芸文庫');
      await finishTableProbe(page, chikuma, 'ちくま学芸文庫', testInfo, `${mode}-forward`);
      expect(await page.evaluate(() => history.length)).toBe(length);
      await expect(page.locator('main#main-content')).toHaveCount(1);
    });
  }

  test('SSRの意味を保ち、複数の表は独立した一意のrailをactivationする', async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 900, height: 900 });
    // 公開本文を変えず、このdocument応答だけに小さい二表を置く統合fixture。
    await page.route(`**${tableNotes.iwanami}`, async (route) => {
      if (route.request().resourceType() !== 'document') return route.continue();
      const response = await route.fetch();
      const body = await response.text();
      const original = body.match(
        /<div\b[^>]*data-table-root[^>]*><table>[\s\S]*?<\/table><\/div>/u,
      )?.[0];
      if (!original) throw new Error('Missing SSR table root');
      const head = original.match(/<thead>[\s\S]*?<\/thead>/u)?.[0];
      const rows = original
        .match(/<tbody>([\s\S]*?)<\/tbody>/u)?.[1]
        ?.match(/<tr>[\s\S]*?<\/tr>/gu);
      if (!head || !rows || rows.length !== 733) throw new Error('Unexpected public table fixture');
      const tables = ['table-history-author-a', 'table-history-author-b']
        .map(
          (id) =>
            `<div data-table-root="true" role="region" tabindex="0" aria-label="Data table" id="${id}"><table>${head}<tbody>${rows.slice(0, 20).join('')}</tbody></table></div>`,
        )
        .join('');
      await route.fulfill({ response, body: body.replace(original, tables) });
    });
    await page.goto(tableNotes.iwanami);
    await tableReady(page);
    await expect(page.locator('main [data-table-root]')).toHaveCount(2);
    await expect(page.locator('main [data-table-scroll-rail]')).toHaveCount(2);
    const pairs = await page.locator('main [data-table-root]').evaluateAll((roots) =>
      roots.map((root) => {
        const rail = root.previousElementSibling;
        return {
          id: root.id,
          controls: rail?.getAttribute('aria-controls'),
          rail: rail?.hasAttribute('data-table-scroll-rail'),
          hidden: root.closest('[inert], [aria-hidden="true"]') !== null,
          railHidden: rail?.getAttribute('aria-hidden'),
          tabIndex: rail?.getAttribute('tabindex'),
        };
      }),
    );
    expect(pairs.map((pair) => pair.id)).toEqual([
      'table-history-author-a',
      'table-history-author-b',
    ]);
    for (const pair of pairs) {
      expect(pair.controls).toBe(pair.id);
      expect(pair.rail).toBe(true);
      expect(pair.hidden).toBe(false);
      expect(pair.railHidden).not.toBe('true');
      expect(pair.tabIndex).toBe('0');
    }
    const appliedLeft = await page.locator('#table-history-author-a').evaluate((root) => {
      root.scrollLeft = Math.min(100, root.scrollWidth - root.clientWidth);
      return root.scrollLeft;
    });
    expect(appliedLeft).toBeGreaterThan(0);
    await expect
      .poll(() =>
        page
          .locator('[aria-controls="table-history-author-a"]')
          .evaluate((rail) => rail.scrollLeft),
      )
      .toBe(appliedLeft);
    expect(await page.locator('#table-history-author-b').evaluate((root) => root.scrollLeft)).toBe(
      0,
    );
    await testInfo.attach('multiple-table-active-pairs', {
      body: JSON.stringify(pairs),
      contentType: 'application/json',
    });
  });

  test('no-JS初期SSRは733行とnativeの横scroll rootを提供する', async ({ browser }) => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      viewport: { width: 900, height: 900 },
    });
    try {
      const page = await context.newPage();
      await page.goto(`http://127.0.0.1:4173${tableNotes.iwanami}`);
      await expect(page.locator('main table tbody tr')).toHaveCount(733);
      await expect(page.locator('main [data-table-root]')).toHaveAttribute('tabindex', '0');
      await expect(page.locator('main [data-table-scroll-rail]')).toHaveCount(0);
      await expect(page.locator('main table')).toBeVisible();
    } finally {
      await context.close();
    }
  });

  test('history失敗rollback後も一つのrailとrootの横位置同期を維持する', async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 900 });
    await page.goto(tableNotes.iwanami);
    await tableReady(page);
    const originalUrl = page.url();
    const text = await page.locator('main table tbody tr').nth(47).textContent();
    expect(text).not.toBeNull();
    const result = await page.evaluate(async (url) => {
      const push = history.pushState;
      history.pushState = () => {
        throw new Error('table-history-rollback-owner-test');
      };
      try {
        return await document.querySelector('router-document-host')?.navigate(url);
      } finally {
        history.pushState = push;
      }
    }, tableNotes.chikuma);
    expect(result?.committed).toBe(false);
    expect(page.url()).toBe(originalUrl);
    await tableReady(page);
    await expect(page.locator('main table tbody tr')).toHaveCount(733);
    await expect.poll(() => page.locator('main table tbody tr').nth(47).textContent()).toBe(text);
    await expect(page.locator('main [data-table-scroll-rail]')).toHaveCount(1);
    const root = page.locator('main [data-table-root]');
    const rail = page.locator('main [data-table-scroll-rail]');
    const id = await root.getAttribute('id');
    expect(id).toBeTruthy();
    await expect(rail).toHaveAttribute('aria-controls', id ?? '');
    await root.evaluate((element) => {
      element.scrollLeft = 120;
    });
    await expect.poll(() => rail.evaluate((element) => element.scrollLeft)).toBe(120);
    await rail.evaluate((element) => {
      element.scrollLeft = 60;
    });
    await expect.poll(() => root.evaluate((element) => element.scrollLeft)).toBe(60);
    await expect(page.locator('html')).not.toHaveAttribute('data-content-transition');
  });

  test('未完BackをForwardが取消しても古い表準備は現在entryを変更しない', async ({
    page,
  }, testInfo) => {
    await installTableFrameProbe(page);
    await page.goto(tableNotes.iwanami);
    await tableReady(page);
    await saveTablePosition(page, 2667);
    await tableNavigate(page, tableNotes.chikuma);
    const saved = await saveTablePosition(page, 3607);
    let release = (): void => {
      throw new Error('Release not initialized');
    };
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    let intercepted = (): void => {
      throw new Error('Intercept not initialized');
    };
    const seen = new Promise<void>((resolve) => {
      intercepted = resolve;
    });
    await page.route(`**${resolveRouterArtifactPathname(tableNotes.iwanami)}`, async (route) => {
      intercepted();
      await held;
      await route.abort();
    });
    try {
      await startTableProbe(page);
      await page.evaluate(() => history.back());
      await seen;
      await page.evaluate(() => history.forward());
      await expect
        .poll(() =>
          page.evaluate(
            () =>
              (history.state as { __rouaultHistoryEntry: { id: string } }).__rouaultHistoryEntry.id,
          ),
        )
        .toBe(saved.entry);
    } finally {
      release();
    }
    await tableReady(page);
    await page.waitForTimeout(180);
    await expect(page.locator('main h1')).toHaveText('ちくま学芸文庫');
    await expect.poll(() => page.evaluate(() => scrollY)).toBeCloseTo(saved.y, 0);
    await expect(page.locator('main [data-table-root]')).toHaveCount(1);
    await expect(page.locator('main [data-table-scroll-rail]')).toHaveCount(1);
    const probe = await page.evaluate(() => {
      window.__tableHistoryProbe.active = false;
      return window.__tableHistoryProbe;
    });
    expect(probe.effects).toBe(0);
    expect(probe.commits).toBeLessThanOrEqual(1);
    await testInfo.attach('cancelled-old-table-owner', {
      body: JSON.stringify(probe),
      contentType: 'application/json',
    });
  });

  test('dirty新DOMのprepare/schedule同期コストとbudget判定を別計測する', async ({
    page,
  }, testInfo) => {
    test.setTimeout(60_000);
    await page.goto(tableNotes.iwanami);
    await tableReady(page);
    await saveTablePosition(page, 2667);
    await tableNavigate(page, tableNotes.chikuma);
    await saveTablePosition(page, 3607);
    await installTableTimingProbe(page);
    for (let visit = 0; visit < 3; visit++) {
      await page.evaluate(() => history.back());
      await expect(page.locator('main h1')).toHaveText('岩波文庫');
      await tableReady(page);
      await page.evaluate(() => history.forward());
      await expect(page.locator('main h1')).toHaveText('ちくま学芸文庫');
      await tableReady(page);
    }
    const timings = await page.evaluate(() => window.__tableHistoryTimings);
    const prepare = timings.filter((sample) => sample.phase === 'prepare');
    const schedule = timings.filter((sample) => sample.phase === 'schedule');
    expect(prepare).toHaveLength(6);
    expect(schedule).toHaveLength(6);
    for (let index = 0; index < prepare.length; index++) {
      expect(schedule[index]?.withinBudget).toBe(prepare[index]?.withinBudget);
    }
    const summary = (values: number[]): { p50: number; p95: number; max: number } => {
      const sorted = [...values].sort((a, b) => a - b);
      return {
        p50: sorted[Math.floor(sorted.length * 0.5)] ?? 0,
        p95: sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)] ?? 0,
        max: sorted.at(-1) ?? 0,
      };
    };
    await testInfo.attach('table-critical-sync-performance', {
      body: JSON.stringify(
        {
          kind: 'actual-managed-back-forward-owner-timing-only-no-frame-layout-probe',
          n: 6,
          hardUpperBoundProven: false,
          // wrapper側の時間には観測処理も含むため、内部8ms判定を外側の時間で代用しない。
          outerMeasurementsOver8ms: prepare.filter((sample) => sample.duration > 8),
          timings,
          prepare: summary(prepare.map((sample) => sample.duration)),
          schedule: summary(schedule.map((sample) => sample.duration)),
          combined: summary(
            prepare.map((sample, index) => sample.duration + (schedule[index]?.duration ?? 0)),
          ),
          elapsedThroughScheduleIncludingObserverOverhead: summary(
            prepare.map((sample, index) => {
              const end = schedule[index];
              return end ? end.started + end.duration - sample.started : 0;
            }),
          ),
        },
        null,
        2,
      ),
      contentType: 'application/json',
    });
  });
});
