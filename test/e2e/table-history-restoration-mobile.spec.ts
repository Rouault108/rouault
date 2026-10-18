import { expect, test } from '@playwright/test';
import {
  finishTableProbe,
  installTableFrameProbe,
  makeTableCertificateUnavailable,
  saveTablePosition,
  startTableProbe,
  tableNavigate,
  tableNotes,
  tableReady,
} from './support/table-history-probe.js';

test.use({ viewport: { width: 390, height: 844 } });

test('狭いviewportの実733行表Backは通常復元しrootのnative横scrollを保つ', async ({
  page,
}, testInfo) => {
  await installTableFrameProbe(page);
  await makeTableCertificateUnavailable(page);
  await page.goto(tableNotes.iwanami);
  await tableReady(page);
  const saved = await saveTablePosition(page, 2667);
  await tableNavigate(page, tableNotes.chikuma);
  await saveTablePosition(page, 3607);
  await startTableProbe(page);
  await page.evaluate(() => history.back());
  await expect(page.locator('main h1')).toHaveText('岩波文庫');
  await finishTableProbe(page, saved, '岩波文庫', testInfo, 'narrow-table-back');
  const root = page.locator('main [data-table-root]');
  expect(
    await root.evaluate((element) => element.scrollWidth - element.clientWidth),
  ).toBeGreaterThan(100);
  await root.evaluate((element) => {
    element.scrollLeft = 100;
  });
  expect(await root.evaluate((element) => element.scrollLeft)).toBe(100);
  // coarse pointerでは補助railを隠すが、本文とnative rootは操作可能のまま。
  if (await page.evaluate(() => matchMedia('(pointer: coarse)').matches)) {
    await expect(page.locator('main [data-table-scroll-rail]')).toBeHidden();
  }
  expect(
    await root.evaluate((element) => element.closest('[inert], [aria-hidden="true"]') === null),
  ).toBe(true);
});
