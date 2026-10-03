import { expect, test, type Page } from '@playwright/test';
import { parse, parseFragment, serialize, type DefaultTreeAdapterMap } from 'parse5';
import { normalizeRouaultStaticSurfaceHtml } from '../../build/rehype/rouault-components.js';
import { resolveNotePreviewProfile } from '../../build/content/note-content-contracts.js';
import { annotateGeneratedPageHtmlLinkContracts } from '../../build/content/page-html-link-contracts.js';
import { createManifestLoadedRouteClassificationMode } from '../../shared/link/link-annotation.js';
import { e2eNoteFixtures } from './support/note-fixtures.js';

const path = e2eNoteFixtures.interactive.directPath;
const html = normalizeRouaultStaticSurfaceHtml(
  `
  <ui-tabs id="baseline-tabs">
    <div slot="tab" value="one">Text <em>emphasis</em> <strong>strong</strong> <code>code</code></div>
    <div slot="panel">First panel body</div>
    <div slot="tab" value="two">Second label</div><div slot="panel">Second panel body</div>
  </ui-tabs>
  <ui-translation original="Original" translated="Translated" id="baseline-translation"></ui-translation>
  <ui-code-preview id="baseline-preview" heading="Example" controls="theme surface viewport">
    <div slot="preview"><p class="header" id="author-header">Author preview</p></div>
    <pre><code>Source code</code></pre>
  </ui-code-preview>
  <p class="header" id="outside-header">Outside content</p>
  <ui-preview-sandbox id="baseline-sandbox" activation-policy="manual" iframe-title="Isolated preview">
    <template data-preview-kind="html"><p id="payload-only">Inert payload</p></template>
  </ui-preview-sandbox>
  <ui-video id="baseline-video" src="/assets/videos/sample-video.mp4" caption="Sample caption">
    <track src="/assets/other/sample-vtt.vtt" kind="captions" label="日本語" srclang="ja" default>
  </ui-video>
`,
  {
    namespace: 'native-note-baseline-e2e',
    previewProfile: resolveNotePreviewProfile('testing'),
    documentUrl: 'http://127.0.0.1:4173/',
  },
);
if (!html) throw new Error('Native note baseline fixture is required.');
const annotatedHtml = annotateGeneratedPageHtmlLinkContracts({
  html,
  siteUrlContext: { siteOrigin: 'http://127.0.0.1:4173', basePath: '' },
  currentUrl: `http://127.0.0.1:4173${path}`,
  routeClassificationMode: createManifestLoadedRouteClassificationMode({
    isInternalDocumentPathname: () => true,
  }),
  sourceLabel: 'native-note-baseline-e2e',
});
if (!annotatedHtml) throw new Error('Annotated native note fixture is required.');

const mount = async (page: Page): Promise<void> => {
  // production出力を初回documentに渡し、enhancementは既存schedulerに任せる。
  await page.route(
    (url) => url.pathname === path,
    async (route) => {
      const response = await route.fetch();
      const document = parse(await response.text());
      const replaceSurface = (node: DefaultTreeAdapterMap['node']): boolean => {
        if (
          'attrs' in node &&
          node.attrs.some((attribute) => attribute.name === 'data-note-static-surface')
        ) {
          node.childNodes = parseFragment(node, annotatedHtml, {}).childNodes;
          for (const child of node.childNodes) child.parentNode = node;
          return true;
        }
        return 'childNodes' in node && node.childNodes.some(replaceSurface);
      };
      if (!replaceSurface(document)) throw new Error('Production note surface is required.');
      await route.fulfill({ response, body: serialize(document) });
    },
    { times: 1 },
  );
  await page.goto(path, { waitUntil: 'domcontentloaded' });
};

test.describe('native note without JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  test('all five native note features retain the no-JS baseline', async ({ page }) => {
    await mount(page);
    const tabs = page.locator('#baseline-tabs');
    await expect(tabs.locator('[data-tab-panel]')).toHaveCount(2);
    for (const panel of await tabs.locator('[data-tab-panel]').all())
      await expect(panel).toBeVisible();
    await expect(tabs.locator('[role="tab"], [role="tablist"]')).toHaveCount(0);
    const link = tabs.locator('a[data-tab]').first();
    await expect(link.locator('em')).toHaveText('emphasis');
    await expect(link.locator('strong')).toHaveText('strong');
    await expect(link.locator('code')).toHaveText('code');
    await expect(link.locator('a,button,input,select,textarea')).toHaveCount(0);
    const fragment = await link.getAttribute('href');
    const identifiers = await tabs
      .locator('[id]')
      .evaluateAll((nodes) => nodes.map((node) => node.id));
    expect(new Set(identifiers).size).toBe(identifiers.length);
    await page.locator('#baseline-translation > summary').click();
    await expect(page.locator('#baseline-translation > [data-translation-content]')).toBeVisible();
    await expect(page.locator('#baseline-preview [data-code-preview-surface]')).toContainText(
      'Author preview',
    );
    await expect(page.locator('#baseline-preview [data-code-preview-code]')).toContainText(
      'Source code',
    );
    await expect(page.locator('#baseline-preview [data-command-menu]:visible')).toHaveCount(0);
    await expect(
      page.locator('#baseline-sandbox [data-preview-sandbox-placeholder]'),
    ).toBeVisible();
    await expect(page.locator('#baseline-sandbox iframe, #payload-only')).toHaveCount(0);
    await expect(page.locator('#baseline-video video')).toHaveAttribute('controls', '');
    await expect(page.locator('#baseline-video [data-video-enhanced-controls]')).toBeHidden();
    await expect(page.locator('#baseline-video figcaption')).toHaveText('Sample caption');
    const nativeVideo = page.locator('#baseline-video video');
    await nativeVideo.scrollIntoViewIfNeeded();
    await expect
      .poll(() => nativeVideo.evaluate((node) => node instanceof HTMLVideoElement && node.readyState))
      .toBeGreaterThanOrEqual(2);
    await nativeVideo.focus();
    await nativeVideo.press('Space');
    await expect
      .poll(() => nativeVideo.evaluate((node) => node instanceof HTMLVideoElement && node.paused))
      .toBe(false);
    await nativeVideo.press('Space');
    await expect
      .poll(() => nativeVideo.evaluate((node) => node instanceof HTMLVideoElement && node.paused))
      .toBe(true);
    await link.click();
    expect(new URL(page.url()).hash).toBe(fragment);
  });
});

test('native preview controls preserve author CSS and mobile viewport while video upgrades', async ({
  page,
}) => {
  await mount(page);
  const preview = page.locator('#baseline-preview');
  await preview.scrollIntoViewIfNeeded();
  const menu = preview.locator('[data-code-preview-control="viewport"]');
  await expect(menu).toBeVisible();
  await menu.locator('[data-command-menu-trigger]').click();
  await menu.locator('[data-command-menu-value="mobile"]').click();
  await expect(preview).toHaveAttribute('data-preview-viewport', 'mobile');
  const authorStyle = await page.locator('#author-header').evaluate((node) => {
    const style = getComputedStyle(node);
    return { display: style.display, border: style.borderBottomWidth, padding: style.padding };
  });
  const outsideStyle = await page.locator('#outside-header').evaluate((node) => {
    const style = getComputedStyle(node);
    return { display: style.display, border: style.borderBottomWidth, padding: style.padding };
  });
  expect(authorStyle).toEqual(outsideStyle);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await preview.locator('.preview-frame').evaluate((node) => node.getBoundingClientRect().width),
  ).toBeLessThanOrEqual(390);
  const video = page.locator('#baseline-video');
  await video.scrollIntoViewIfNeeded();
  await expect(video).toHaveAttribute('data-video-enhanced', '');
  await expect(video.locator('video')).not.toHaveAttribute('controls');
  await expect(video.locator('[data-video-enhanced-controls]')).not.toHaveAttribute('hidden');
  const media = video.locator('video');
  await expect
    .poll(() =>
      media.evaluate((node) => {
        if (!(node instanceof HTMLVideoElement)) throw new Error('Native media is required.');
        return node.readyState;
      }),
    )
    .toBeGreaterThan(0);
  await video.locator('.play-button[data-video-action="play"]').click();
  await expect
    .poll(() =>
      media.evaluate((node) => {
        if (!(node instanceof HTMLVideoElement)) throw new Error('Native media is required.');
        return node.paused;
      }),
    )
    .toBe(false);
  await video.locator('.floating-bar [data-video-action="play"]').click();
  await expect
    .poll(() =>
      media.evaluate((node) => {
        if (!(node instanceof HTMLVideoElement)) throw new Error('Native media is required.');
        return node.paused;
      }),
    )
    .toBe(true);
  await page.emulateMedia({ media: 'print' });
  await expect(preview.locator('[data-code-preview-header]')).toBeVisible();
  await expect(preview.locator('#author-header')).toBeVisible();
  await expect(preview.locator('[data-code-preview-control]:visible')).toHaveCount(0);
});
