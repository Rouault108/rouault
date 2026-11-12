import { expect, test, type Page } from '@playwright/test';
import {
  expectNaturalFont,
  geistFamily,
  inlineCodeText,
  observeFontTraffic,
  openInlineCode,
  readTargetFont,
  reportFontEvidence,
} from './support/geist-mono.js';

test.use({ javaScriptEnabled: false });

interface PlatformFont {
  familyName: string;
  postScriptName: string;
  isCustomFont: boolean;
  glyphCount: number;
}

const platformFonts = async (page: Page): Promise<PlatformFont[]> => {
  const session = await page.context().newCDPSession(page);
  try {
    await session.send('DOM.enable');
    await session.send('CSS.enable');
    await session.send('DOM.getDocument');
    const { searchId, resultCount } = await session.send('DOM.performSearch', {
      query: `//*[@data-note-static-surface]//p/code[text()="${inlineCodeText}" and not(*)]`,
    });
    expect(resultCount).toBe(1);
    const { nodeIds } = await session.send('DOM.getSearchResults', {
      searchId,
      fromIndex: 0,
      toIndex: 1,
    });
    await session.send('DOM.discardSearchResults', { searchId });
    const nodeId = nodeIds[0];
    if (nodeId === undefined) throw new Error('Inline code node is required.');
    const { fonts } = await session.send('CSS.getPlatformFontsForNode', { nodeId });
    return fonts.filter((font) => font.glyphCount > 0);
  } finally {
    await session.detach();
  }
};

// 固定済みFontsourceパッケージのWOFF2 name table（name ID 1 / 6）にある内部名。
const isGeist = (font: PlatformFont): boolean =>
  font.isCustomFont &&
  font.familyName === 'Geist Mono' &&
  font.postScriptName === 'GeistMono-Regular';

const expectGeistGlyphs = async (page: Page): Promise<PlatformFont[]> => {
  await expect
    .poll(async () => {
      const fonts = await platformFonts(page);
      return fonts.length > 0 && fonts.every(isGeist);
    })
    .toBe(true);
  return platformFonts(page);
};

test('Geist Mono draws the existing ASCII inline code using a custom font (CDP)', async ({
  page,
}, testInfo) => {
  const traffic = observeFontTraffic(page);
  const target = await openInlineCode(page);
  await expectNaturalFont(target, traffic);
  const fonts = await expectGeistGlyphs(page);
  await reportFontEvidence(testInfo, { state: await readTargetFont(target), fonts });
});

test('Geist Mono detects an applied fallback with actual alternate glyphs (CDP)', async ({
  page,
}, testInfo) => {
  const traffic = observeFontTraffic(page);
  const target = await openInlineCode(page);
  await expectNaturalFont(target, traffic);
  const before = await expectGeistGlyphs(page);
  await target.evaluate((node) => node.style.setProperty('font-family', 'monospace', 'important'));
  await expect(target).toBeVisible();
  await expect(target).toBeInViewport();
  const state = await readTargetFont(target);
  expect(state.firstFamily).toBe('monospace');
  expect(state.firstFamily).not.toBe(geistFamily);
  expect(state.faces.map((face) => face.status)).toEqual(['loaded']);
  await expect
    .poll(async () => {
      const fonts = await platformFonts(page);
      return (
        fonts.length > 0 &&
        fonts.every((font) => !isGeist(font) && !/Geist/iu.test(font.familyName))
      );
    })
    .toBe(true);
  const after = await platformFonts(page);
  expect(after.every(isGeist)).toBe(false);
  await reportFontEvidence(testInfo, { state, before, after });
});
