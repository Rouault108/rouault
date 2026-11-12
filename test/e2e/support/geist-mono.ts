import { expect, type Locator, type Page, type Request, type TestInfo } from '@playwright/test';
import { getE2ENoteFixture } from './note-fixtures.js';

export const geistFamily = 'Geist Mono Variable';
export const inlineCodeText = 'inline code';
export const inlineCodeSelector = '[data-note-static-surface] p > code';

export interface FontTraffic {
  requests: Request[];
  completed: { url: string; status: number; contentType: string }[];
  failed: { url: string; error: string }[];
}

export const observeFontTraffic = (page: Page): FontTraffic => {
  const traffic: FontTraffic = { requests: [], completed: [], failed: [] };
  page.on('request', (request) => {
    if (request.resourceType() === 'font') traffic.requests.push(request);
  });
  page.on('requestfinished', async (request) => {
    if (request.resourceType() !== 'font') return;
    const response = await request.response();
    if (response) {
      traffic.completed.push({
        url: response.url(),
        status: response.status(),
        contentType: response.headers()['content-type'] ?? '',
      });
    }
  });
  page.on('requestfailed', (request) => {
    if (request.resourceType() === 'font') {
      traffic.failed.push({ url: request.url(), error: request.failure()?.errorText ?? '' });
    }
  });
  return traffic;
};

export const openInlineCode = async (page: Page): Promise<Locator> => {
  const response = await page.goto(getE2ENoteFixture('note.markdown-basic').directPath, {
    waitUntil: 'domcontentloaded',
  });
  expect(response?.status(), 'representative production document').toBe(200);
  const target = page.locator(inlineCodeSelector).filter({ hasText: /^inline code$/u });
  await expect(target).toHaveCount(1);
  await target.scrollIntoViewIfNeeded();
  await expect(target).toBeVisible();
  await expect(target).toBeInViewport();
  // CDPの集計が子要素や別文字の描画を含まないことを前提にする。
  expect(
    await target.evaluate((node) => ({ text: node.textContent, children: node.children.length })),
  ).toEqual({ text: inlineCodeText, children: 0 });
  return target;
};

export const readTargetFont = (target: Locator) =>
  target.evaluate((node, family) => {
    const unquote = (value: string): string => value.trim().replace(/^["']|["']$/gu, '');
    const normalize = (value: string): string => value.replace(/\s+/gu, '').toUpperCase();
    const weightRange = (value: string): number[] =>
      value
        .trim()
        .split(/\s+/u)
        .map((part) => (part === 'normal' ? 400 : part === 'bold' ? 700 : Number(part)));
    const covers = (range: string, code: number): boolean =>
      range.split(',').some((part) => {
        const match = /^U\+([0-9A-F?]+)(?:-([0-9A-F]+))?$/iu.exec(part.trim());
        if (!match?.[1]) throw new Error(`Unsupported unicode-range: ${part}`);
        const low = Number.parseInt(match[1].replace(/\?/gu, '0'), 16);
        const high = Number.parseInt(match[2] ?? match[1].replace(/\?/gu, 'F'), 16);
        return low <= code && code <= high;
      });
    const computed = getComputedStyle(node);
    const weight = Number(computed.fontWeight);
    const codes = [...(node.textContent ?? '')].map((char) => char.codePointAt(0) ?? -1);
    if (codes.length === 0 || codes.some((code) => code < 0x20 || code > 0x7e)) {
      throw new Error('Existing ASCII inline code is required.');
    }
    const definitions: {
      stylesheet: string;
      urls: string[];
      weight: string;
      style: string;
      stretch: string;
      unicodeRange: string;
    }[] = [];
    const visit = (rules: CSSRuleList, stylesheet: string): void => {
      for (const rule of rules) {
        if (rule instanceof CSSFontFaceRule) {
          const style = rule.style;
          if (unquote(style.getPropertyValue('font-family')) !== family) continue;
          const descriptorWeight = style.getPropertyValue('font-weight') || 'normal';
          const [min = NaN, max = min] = weightRange(descriptorWeight);
          const descriptorStyle = style.getPropertyValue('font-style') || 'normal';
          const unicodeRange = style.getPropertyValue('unicode-range') || 'U+0-10FFFF';
          if (
            weight < min ||
            weight > max ||
            descriptorStyle !== computed.fontStyle ||
            !codes.every((code) => covers(unicodeRange, code))
          )
            continue;
          const urls = [
            ...style
              .getPropertyValue('src')
              .matchAll(/url\(\s*(?:"([^"\n]*)"|'([^'\n]*)'|([^\s)]+))\s*\)/gu),
          ].map((match) => new URL(match[1] ?? match[2] ?? match[3] ?? '', stylesheet).href);
          definitions.push({
            stylesheet,
            urls,
            weight: descriptorWeight,
            style: descriptorStyle,
            stretch: style.getPropertyValue('font-stretch') || 'normal',
            unicodeRange,
          });
        } else if (rule instanceof CSSMediaRule) {
          if (matchMedia(rule.conditionText).matches) visit(rule.cssRules, stylesheet);
        } else if (rule instanceof CSSSupportsRule) {
          if (CSS.supports(rule.conditionText)) visit(rule.cssRules, stylesheet);
        } else if ('cssRules' in rule) {
          visit((rule as CSSGroupingRule).cssRules, stylesheet);
        }
      }
    };
    for (const sheet of document.styleSheets) {
      if (sheet.disabled || !sheet.href || new URL(sheet.href).origin !== location.origin) continue;
      if (sheet.media.length > 0 && !matchMedia(sheet.media.mediaText).matches) continue;
      visit(sheet.cssRules, sheet.href);
    }
    const faces = definitions.flatMap((definition) =>
      [...document.fonts]
        .filter(
          (face) =>
            unquote(face.family) === family &&
            normalize(face.weight) === normalize(definition.weight) &&
            face.style === definition.style &&
            face.stretch === definition.stretch &&
            normalize(face.unicodeRange) === normalize(definition.unicodeRange),
        )
        .map((face) => ({
          status: face.status,
          weight: face.weight,
          style: face.style,
          unicodeRange: face.unicodeRange,
        })),
    );
    return {
      firstFamily: unquote(computed.fontFamily.split(',')[0] ?? ''),
      weight: computed.fontWeight,
      style: computed.fontStyle,
      definitions,
      faces,
    };
  }, geistFamily);

export const expectTargetDefinition = async (target: Locator) => {
  const state = await readTargetFont(target);
  expect(state.firstFamily, 'CSS first family').toBe(geistFamily);
  expect(
    state.definitions,
    'face covering every target ASCII character, weight and style',
  ).toHaveLength(1);
  expect(state.faces, 'FontFaceSet entry corresponding to the CSS definition').toHaveLength(1);
  const definition = state.definitions[0];
  if (!definition) throw new Error('Target font definition is required.');
  expect(definition.urls.length).toBeGreaterThan(0);
  const origin = new URL(target.page().url()).origin;
  for (const url of definition.urls) expect(new URL(url).origin).toBe(origin);
  return definition;
};

export const expectNaturalFont = async (target: Locator, traffic: FontTraffic) => {
  const definition = await expectTargetDefinition(target);
  // no-JS Firefoxでも解決できるよう、文書内でPromiseを待たず同期状態をpollする。
  // fonts.load / face.loadは適用漏れを隠すため呼ばない。
  await expect
    .poll(async () => (await readTargetFont(target)).faces.map((face) => face.status))
    .toEqual(['loaded']);
  await expect
    .poll(() =>
      traffic.completed.some(
        (response) =>
          definition.urls.includes(response.url) &&
          response.status === 200 &&
          /font|octet-stream/iu.test(response.contentType),
      ),
    )
    .toBe(true);
  expect(traffic.requests.some((request) => definition.urls.includes(request.url()))).toBe(true);
  expect(traffic.failed.filter((failure) => definition.urls.includes(failure.url))).toEqual([]);
  return definition;
};

export const reportFontEvidence = async (testInfo: TestInfo, evidence: unknown): Promise<void> => {
  await testInfo.attach('geist-mono-evidence', {
    body: JSON.stringify(evidence, null, 2),
    contentType: 'application/json',
  });
  // 既存CIの成功時にも各ブラウザでの実行・非skipをログから照合できるようにする。
  console.info(`geist-mono verified: ${testInfo.project.name} / ${testInfo.title}`);
};
