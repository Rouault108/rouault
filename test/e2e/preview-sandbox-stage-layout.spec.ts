import { expect, test, type Frame, type Page } from '@playwright/test';

import { loadNotesData } from '../../build/data/notes.js';
import type { PreviewSandboxContentLayout } from '../../shared/preview-sandbox/content-layout.js';

type PreviewViewport = 'full' | 'mobile';

interface PreviewFixtureOptions {
  readonly viewport: PreviewViewport;
  readonly contentLayout?: PreviewSandboxContentLayout | undefined;
  readonly html: string;
  readonly css: string;
  readonly js?: string | undefined;
}

interface FrameSnapshot {
  readonly layout: string | undefined;
  readonly directRootCount: number;
  readonly allRootCount: number;
  readonly authorStartRootCount: string | undefined;
  readonly clientWidth: number;
  readonly clientHeight: number;
  readonly scrollWidth: number;
  readonly scrollHeight: number;
  readonly scrollLeft: number;
  readonly scrollTop: number;
  readonly scrollingTag: string | null;
  readonly htmlDisplay: string;
  readonly htmlOverflowX: string;
  readonly htmlOverflowY: string;
  readonly bodyDisplay: string;
  readonly bodyBackgroundColor: string;
  readonly rootDisplay: string;
  readonly rootOverflowX: string;
  readonly rootOverflowY: string;
  readonly firstOverflowX: string | null;
  readonly firstOverflowY: string | null;
  readonly rootLeft: number;
  readonly rootTop: number;
  readonly rootWidth: number;
  readonly rootHeight: number;
  readonly firstLeft: number | null;
  readonly firstTop: number | null;
  readonly secondLeft: number | null;
  readonly secondTop: number | null;
  readonly nestedDisplay: string | null;
  readonly nestedOverflowX: string | null;
  readonly nestedOverflowY: string | null;
}

const sandboxNote = loadNotesData().find((note) => note.slug === 'testing/sandbox');
if (sandboxNote === undefined) {
  throw new Error('testing/sandbox note is required for preview sandbox geometry verification.');
}
const sandboxPath = `${sandboxNote.permalink.replace(/\/+$/u, '')}/`;

const openSandboxPage = async (page: Page): Promise<void> => {
  await page.goto(sandboxPath);
  await page.locator('article').waitFor();
  await page.evaluate(async () => {
    await Promise.all([
      customElements.whenDefined('ui-code-preview'),
      customElements.whenDefined('ui-preview-sandbox'),
    ]);
  });
};

const mountPreviewFixture = async (page: Page, options: PreviewFixtureOptions): Promise<Frame> => {
  await page.evaluate((fixtureOptions) => {
    document.querySelector('#preview-stage-geometry')?.remove();

    const fixtureRoot = document.createElement('div');
    fixtureRoot.id = 'preview-stage-geometry';
    fixtureRoot.style.cssText =
      'position: fixed; inset: 0; z-index: 2147483647; padding: 16px; overflow: auto; background: white;';

    const codePreview = document.createElement('ui-code-preview');
    codePreview.setAttribute('preview-viewport', fixtureOptions.viewport);
    codePreview.setAttribute('preview-padding', 'none');
    codePreview.setAttribute('preview-align', 'stretch');
    codePreview.setAttribute('preview-theme', 'light');
    codePreview.setAttribute('preview-surface', 'canvas');

    const sandbox = document.createElement('ui-preview-sandbox');
    sandbox.setAttribute('slot', 'preview');
    sandbox.setAttribute('activation-policy', 'eager');
    sandbox.setAttribute('height-mode', 'fixed');
    sandbox.setAttribute('height', '240');
    sandbox.setAttribute('iframe-title', 'Preview stage geometry');
    if (fixtureOptions.contentLayout !== undefined) {
      sandbox.setAttribute('content-layout', fixtureOptions.contentLayout);
    }
    if (fixtureOptions.js !== undefined) {
      sandbox.setAttribute('allow-js', '');
    }

    const htmlTemplate = document.createElement('template');
    htmlTemplate.setAttribute('data-preview-kind', 'html');
    htmlTemplate.innerHTML = fixtureOptions.html;
    sandbox.append(htmlTemplate);

    const cssTemplate = document.createElement('template');
    cssTemplate.setAttribute('data-preview-kind', 'css');
    cssTemplate.content.textContent = fixtureOptions.css;
    sandbox.append(cssTemplate);

    if (fixtureOptions.js !== undefined) {
      const jsTemplate = document.createElement('template');
      jsTemplate.setAttribute('data-preview-kind', 'js');
      jsTemplate.content.textContent = fixtureOptions.js;
      sandbox.append(jsTemplate);
    }

    codePreview.append(sandbox);
    fixtureRoot.append(codePreview);
    document.body.append(fixtureRoot);
  }, options);

  const iframeLocator = page.locator('#preview-stage-geometry ui-preview-sandbox iframe');
  await expect(iframeLocator).toBeVisible();
  const iframeHandle = await iframeLocator.elementHandle();
  const frame = await iframeHandle?.contentFrame();
  if (frame === null || frame === undefined) {
    throw new Error('Preview sandbox iframe was not available.');
  }
  await frame.locator('body[data-preview-content-layout] > ui-preview-content-root').waitFor();
  await frame.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );
  return frame;
};

const readFrameSnapshot = async (frame: Frame): Promise<FrameSnapshot> =>
  frame.evaluate(() => {
    const directRoots = Array.from(document.body.children).filter(
      (child): child is HTMLElement =>
        child instanceof HTMLElement && child.tagName.toLowerCase() === 'ui-preview-content-root',
    );
    const root = directRoots[0];
    if (root === undefined) {
      throw new Error('Canonical preview content root was not found.');
    }

    const allRoots = document.querySelectorAll<HTMLElement>('ui-preview-content-root');
    const nested = root.querySelector<HTMLElement>('ui-preview-content-root');
    const first = root.children[0] as HTMLElement | undefined;
    const second = root.children[1] as HTMLElement | undefined;
    const rootRect = root.getBoundingClientRect();
    const firstRect = first?.getBoundingClientRect();
    const secondRect = second?.getBoundingClientRect();
    const htmlStyle = getComputedStyle(document.documentElement);
    const bodyStyle = getComputedStyle(document.body);
    const rootStyle = getComputedStyle(root);
    const firstStyle = first ? getComputedStyle(first) : null;
    const nestedStyle = nested ? getComputedStyle(nested) : null;
    const scrollingElement = document.scrollingElement;

    return {
      layout: document.body.dataset['previewContentLayout'],
      directRootCount: directRoots.length,
      allRootCount: allRoots.length,
      authorStartRootCount: document.body.dataset['authorStartRootCount'],
      clientWidth: document.documentElement.clientWidth,
      clientHeight: document.documentElement.clientHeight,
      scrollWidth: scrollingElement?.scrollWidth ?? -1,
      scrollHeight: scrollingElement?.scrollHeight ?? -1,
      scrollLeft: scrollingElement?.scrollLeft ?? -1,
      scrollTop: scrollingElement?.scrollTop ?? -1,
      scrollingTag: scrollingElement?.tagName ?? null,
      htmlDisplay: htmlStyle.display,
      htmlOverflowX: htmlStyle.overflowX,
      htmlOverflowY: htmlStyle.overflowY,
      bodyDisplay: bodyStyle.display,
      bodyBackgroundColor: bodyStyle.backgroundColor,
      rootDisplay: rootStyle.display,
      rootOverflowX: rootStyle.overflowX,
      rootOverflowY: rootStyle.overflowY,
      firstOverflowX: firstStyle?.overflowX ?? null,
      firstOverflowY: firstStyle?.overflowY ?? null,
      rootLeft: rootRect.left,
      rootTop: rootRect.top,
      rootWidth: rootRect.width,
      rootHeight: rootRect.height,
      firstLeft: firstRect?.left ?? null,
      firstTop: firstRect?.top ?? null,
      secondLeft: secondRect?.left ?? null,
      secondTop: secondRect?.top ?? null,
      nestedDisplay: nestedStyle?.display ?? null,
      nestedOverflowX: nestedStyle?.overflowX ?? null,
      nestedOverflowY: nestedStyle?.overflowY ?? null,
    };
  });

test.describe('preview sandbox stage layout geometry', () => {
  test.beforeEach(async ({ page }) => {
    await openSandboxPage(page);
  });

  test('case 1: 小さい単体UIは既定stageでFull/Mobileとも縦横中央になること', async ({ page }) => {
    for (const viewport of ['full', 'mobile'] as const) {
      const frame = await mountPreviewFixture(page, {
        viewport,
        html: '<button class="probe">Push</button>',
        css: '.probe { display: block; inline-size: 100px; block-size: 44px; }',
      });
      const snapshot = await readFrameSnapshot(frame);

      expect(snapshot.layout).toBe('stage');
      expect(snapshot.directRootCount).toBe(1);
      expect(snapshot.rootWidth).toBeLessThan(snapshot.clientWidth);
      expect(
        Math.abs(snapshot.rootLeft + snapshot.rootWidth / 2 - snapshot.clientWidth / 2),
      ).toBeLessThanOrEqual(1);
      expect(
        Math.abs(snapshot.rootTop + snapshot.rootHeight / 2 - snapshot.clientHeight / 2),
      ).toBeLessThanOrEqual(1);
      expect(snapshot.scrollLeft).toBe(0);
      expect(snapshot.scrollTop).toBe(0);
      if (viewport === 'mobile') {
        expect(snapshot.clientWidth).toBeLessThanOrEqual(375);
      } else {
        expect(snapshot.clientWidth).toBeGreaterThan(375);
      }
    }
  });

  test('case 2: 同じUIはflowでblock-start/inline-startの通常フローになること', async ({ page }) => {
    const frame = await mountPreviewFixture(page, {
      viewport: 'full',
      contentLayout: 'flow',
      html: '<button class="probe">Push</button>',
      css: '.probe { display: block; inline-size: 100px; block-size: 44px; }',
    });
    const snapshot = await readFrameSnapshot(frame);

    expect(snapshot.layout).toBe('flow');
    expect(snapshot.rootLeft).toBeCloseTo(0, 1);
    expect(snapshot.rootTop).toBeCloseTo(0, 1);
    expect(snapshot.rootWidth).toBeCloseTo(snapshot.clientWidth, 1);
    expect(snapshot.firstLeft).toBeCloseTo(0, 1);
    expect(snapshot.firstTop).toBeCloseTo(0, 1);
  });

  test('case 3: fixed oversized contentはFull/Mobileともdocument overflowで開始側と両軸終端へ到達できること', async ({
    page,
  }) => {
    for (const viewport of ['full', 'mobile'] as const) {
      const frame = await mountPreviewFixture(page, {
        viewport,
        html: '<div class="oversized">Oversized</div>',
        css: '.oversized { inline-size: 1600px; block-size: 800px; }',
      });
      const initial = await readFrameSnapshot(frame);

      expect(initial.scrollWidth).toBeGreaterThan(initial.clientWidth);
      expect(initial.scrollHeight).toBeGreaterThan(initial.clientHeight);
      expect(initial.scrollLeft).toBe(0);
      expect(initial.scrollTop).toBe(0);
      expect(initial.rootLeft).toBeGreaterThanOrEqual(-0.5);
      expect(initial.rootTop).toBeGreaterThanOrEqual(-0.5);
      expect(initial.scrollingTag).toBe('HTML');
      expect(initial.htmlOverflowX).toBe('auto');
      expect(initial.htmlOverflowY).toBe('auto');
      expect(initial.rootOverflowX).toBe('visible');
      expect(initial.rootOverflowY).toBe('visible');
      expect(initial.firstOverflowX).toBe('visible');
      expect(initial.firstOverflowY).toBe('visible');
      expect(initial.rootWidth).toBeLessThanOrEqual(initial.clientWidth + 1);

      const end = await frame.evaluate(
        () =>
          new Promise<{
            readonly left: number;
            readonly top: number;
            readonly maxLeft: number;
            readonly maxTop: number;
          }>((resolve) => {
            const scrollingElement = document.scrollingElement;
            if (scrollingElement === null) {
              throw new Error('Document scrolling element was not found.');
            }
            window.scrollTo(scrollingElement.scrollWidth, scrollingElement.scrollHeight);
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                resolve({
                  left: scrollingElement.scrollLeft,
                  top: scrollingElement.scrollTop,
                  maxLeft: scrollingElement.scrollWidth - scrollingElement.clientWidth,
                  maxTop: scrollingElement.scrollHeight - scrollingElement.clientHeight,
                });
              });
            });
          }),
      );

      expect(Math.abs(end.left - end.maxLeft)).toBeLessThanOrEqual(1);
      expect(Math.abs(end.top - end.maxTop)).toBeLessThanOrEqual(1);

      const iframe = page.locator('#preview-stage-geometry ui-preview-sandbox iframe');
      const heights: number[] = [];
      for (let index = 0; index < 3; index += 1) {
        heights.push((await iframe.boundingBox())?.height ?? -1);
        await page.waitForTimeout(50);
      }
      expect(new Set(heights).size).toBe(1);
      expect(heights[0]).toBeCloseTo(240, 1);
    }
  });

  test('case 4: 複数siblingはgeneric div CSS下でもroot内の通常block flowを維持すること', async ({
    page,
  }) => {
    const frame = await mountPreviewFixture(page, {
      viewport: 'full',
      html: '<div>First</div><div>Second</div>',
      css: 'div { display: block; inline-size: 120px; block-size: 30px; }',
    });
    const snapshot = await readFrameSnapshot(frame);

    expect(snapshot.rootDisplay).toBe('block');
    expect(snapshot.rootWidth).toBeCloseTo(120, 1);
    expect(snapshot.rootHeight).toBeCloseTo(60, 1);
    expect(snapshot.secondLeft).toBeCloseTo(snapshot.firstLeft ?? -1, 1);
    expect(snapshot.secondTop).toBeCloseTo((snapshot.firstTop ?? -1) + 30, 1);
  });

  test('case 5: html/body構造指定をguardし、payload内同名要素を正規rootと誤認しないこと', async ({
    page,
  }) => {
    const frame = await mountPreviewFixture(page, {
      viewport: 'full',
      html: '<section><ui-preview-content-root id="nested">Nested</ui-preview-content-root></section>',
      css: 'html, body { display: grid; place-items: end; overflow: hidden; min-height: 0; } body { background: rgb(9 8 7); } ui-preview-content-root { display: grid; overflow: auto; inline-size: 12px; }',
      js: "document.body.dataset.authorStartRootCount = String(Array.from(document.body.children).filter((child) => child.tagName.toLowerCase() === 'ui-preview-content-root').length);",
    });
    const snapshot = await readFrameSnapshot(frame);

    expect(snapshot.directRootCount).toBe(1);
    expect(snapshot.allRootCount).toBe(2);
    expect(snapshot.authorStartRootCount).toBe('1');
    expect(snapshot.htmlDisplay).toBe('block');
    expect(snapshot.bodyDisplay).toBe('flex');
    expect(snapshot.rootDisplay).toBe('block');
    expect(snapshot.rootOverflowX).toBe('visible');
    expect(snapshot.rootOverflowY).toBe('visible');
    expect(snapshot.nestedDisplay).toBe('grid');
    expect(snapshot.nestedOverflowX).toBe('auto');
    expect(snapshot.nestedOverflowY).toBe('auto');
    expect(snapshot.bodyBackgroundColor).toBe('rgb(9, 8, 7)');
  });
});
