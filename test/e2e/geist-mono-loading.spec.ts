import { expect, test } from '@playwright/test';
import {
  expectNaturalFont,
  expectTargetDefinition,
  observeFontTraffic,
  openInlineCode,
  readTargetFont,
  reportFontEvidence,
} from './support/geist-mono.js';

test.use({ javaScriptEnabled: false });

test('Geist Mono naturally loads the ASCII inline-code face without JavaScript', async ({
  page,
}, testInfo) => {
  const traffic = observeFontTraffic(page);
  const target = await openInlineCode(page);
  await expectNaturalFont(target, traffic);
  await reportFontEvidence(testInfo, {
    state: await readTargetFont(target),
    completed: traffic.completed,
  });
});

for (const intervention of ['blocked', 'corrupt-200'] as const) {
  test(`Geist Mono detects ${intervention} for the target face`, async ({ page }, testInfo) => {
    const traffic = observeFontTraffic(page);
    const intercepted: string[] = [];
    const responses: { url: string; status: number }[] = [];
    page.on('response', (response) =>
      responses.push({ url: response.url(), status: response.status() }),
    );
    // cacheを共有しないtest fixtureで、初回navigation前に介入を設置する。
    await page.route(/geist-mono[^/]*\.woff2(?:[?#].*)?$/u, async (route) => {
      expect(route.request().resourceType()).toBe('font');
      if (intervention === 'blocked') await route.abort('failed');
      else
        await route.fulfill({
          status: 200,
          contentType: 'font/woff2',
          body: 'invalid WOFF2 regression control',
        });
      intercepted.push(route.request().url());
    });
    const target = await openInlineCode(page);
    const definition = await expectTargetDefinition(target);
    await expect
      .poll(() => intercepted.filter((url) => definition.urls.includes(url)).length)
      .toBeGreaterThan(0);
    await expect
      .poll(async () => (await readTargetFont(target)).faces.map((face) => face.status))
      .toEqual(['error']);
    if (intervention === 'blocked') {
      await expect
        .poll(() =>
          traffic.failed.some(
            (failure) => definition.urls.includes(failure.url) && failure.error.length > 0,
          ),
        )
        .toBe(true);
      expect(responses.filter((response) => definition.urls.includes(response.url))).toEqual([]);
    } else {
      await expect
        .poll(() =>
          responses
            .filter((response) => definition.urls.includes(response.url))
            .map((response) => response.status),
        )
        .toEqual([200]);
    }
    // 「何かが失敗した」ではなく、正常系と同じfaceがloadedにならないことを検証する。
    expect((await readTargetFont(target)).faces.some((face) => face.status === 'loaded')).toBe(
      false,
    );
    await reportFontEvidence(testInfo, {
      intervention,
      intercepted,
      state: await readTargetFont(target),
      responses: responses.filter((response) => definition.urls.includes(response.url)),
      failed: traffic.failed,
    });
  });
}
