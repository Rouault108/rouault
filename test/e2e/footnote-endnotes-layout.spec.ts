import { expect, test, type Page } from '@playwright/test';

import { e2eNoteFixtures } from './support/note-fixtures.js';

const footnoteEndnotesLayoutPath = e2eNoteFixtures.footnoteEndnotesLayout.directPath;

interface EndnoteParagraphMetrics {
  lineCount: number;
  paragraphLeft: number;
  olLeft: number;
  gutter: number;
  textIndent: string;
  scrollWidth: number;
  clientWidth: number;
  targetBackgroundColor: string;
}

const readEndnoteParagraphMetrics = async (
  page: Page,
  index: number,
): Promise<EndnoteParagraphMetrics> =>
  await page.evaluate((targetIndex) => {
    const endnotes = document.querySelector('section[role="doc-endnotes"]');
    const ol = endnotes?.querySelector('ol');
    const li = ol?.querySelectorAll(':scope > li').item(targetIndex) ?? null;
    const paragraph = li?.querySelector(':scope > p');

    if (!(endnotes instanceof HTMLElement) || !(ol instanceof HTMLOListElement)) {
      throw new Error('doc-endnotes ol が見つかりません');
    }
    if (!(li instanceof HTMLLIElement) || !(paragraph instanceof HTMLParagraphElement)) {
      throw new Error(`endnote item ${targetIndex + 1} の paragraph が見つかりません`);
    }

    const computedParagraph = getComputedStyle(paragraph);
    const lineHeight = Number.parseFloat(computedParagraph.lineHeight);
    const paragraphRect = paragraph.getBoundingClientRect();
    const lineCount = Number.isFinite(lineHeight)
      ? Math.round(paragraphRect.height / lineHeight)
      : paragraph.getClientRects().length;

    if (lineCount < 2) {
      throw new Error(`endnote item ${targetIndex + 1} が 2 行以上に折り返していません`);
    }

    const olRect = ol.getBoundingClientRect();
    const computedTarget = getComputedStyle(li);

    return {
      lineCount,
      paragraphLeft: paragraphRect.left,
      olLeft: olRect.left,
      gutter: paragraphRect.left - olRect.left,
      textIndent: computedParagraph.textIndent,
      scrollWidth: document.scrollingElement?.scrollWidth ?? document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      targetBackgroundColor: computedTarget.backgroundColor,
    };
  }, index);

test.describe('footnote endnotes layout contract', () => {
  test.describe.configure({ timeout: 60 * 1000 });

  test.use({
    viewport: {
      width: 375,
      height: 812,
    },
  });

  test('1 桁番号と 2 桁番号の脚注で hanging indent を維持し、target 強調を失わないこと', async ({
    page,
  }) => {
    await page.goto(`${footnoteEndnotesLayoutPath}#fn-layout-10`);
    await page.locator('article').waitFor();

    const singleDigit = await readEndnoteParagraphMetrics(page, 0);
    const doubleDigit = await readEndnoteParagraphMetrics(page, 9);

    expect(singleDigit.gutter).toBeGreaterThanOrEqual(16);
    expect(doubleDigit.gutter).toBeGreaterThanOrEqual(16);
    expect(singleDigit.textIndent).toBe('0px');
    expect(doubleDigit.textIndent).toBe('0px');
    expect(singleDigit.paragraphLeft).toBeGreaterThan(singleDigit.olLeft + 12);
    expect(doubleDigit.paragraphLeft).toBeGreaterThan(doubleDigit.olLeft + 12);
    expect(doubleDigit.targetBackgroundColor).not.toBe('rgba(0, 0, 0, 0)');
  });

  test('TOC の脚注項目と endnotes 冒頭の脚注見出しが h2#footnote-label で一致すること', async ({
    page,
  }) => {
    await page.goto(footnoteEndnotesLayoutPath);
    await page.locator('article').waitFor();

    const tocLink = page.locator(
      '[data-layout-toc-nav] a[data-toc-link][data-heading-id="footnote-label"]',
    );
    await expect(tocLink).toHaveAttribute('href', '#footnote-label');
    await expect(tocLink.locator('.layout-toc__link-label')).toHaveText('脚注');

    const heading = page.locator('section[role="doc-endnotes"] > h2#footnote-label');
    await expect(heading).toHaveText('脚注');
    await expect(heading).toBeVisible();

    const permalink = heading.locator(':scope > a.heading-anchor');
    await expect(permalink).toHaveAttribute('href', '#footnote-label');
  });

  test('長い URL を含んでも endnotes が mobile viewport を横方向に押し広げないこと', async ({
    page,
  }) => {
    await page.goto(footnoteEndnotesLayoutPath);
    await page.locator('article').waitFor();

    const lastEndnote = await readEndnoteParagraphMetrics(page, 10);
    expect(lastEndnote.scrollWidth).toBeLessThanOrEqual(lastEndnote.clientWidth + 1);
  });
});
