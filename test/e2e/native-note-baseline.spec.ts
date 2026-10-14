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
  <button id="video-before">動画前</button>
  <ui-video id="baseline-video" src="/assets/videos/sample-video.mp4" caption="Sample caption">
    <track src="/assets/other/sample-vtt.vtt" kind="captions" label="日本語" srclang="ja" default>
  </ui-video>
  <button id="video-after">動画後</button>
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
      .poll(() =>
        nativeVideo.evaluate((node) => node instanceof HTMLVideoElement && node.readyState),
      )
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

test('videoの実Tab経路は初回handoff・focus維持・idle復帰を提供する', async ({ page }) => {
  await mount(page);
  const root = page.locator('#baseline-video');
  await root.scrollIntoViewIfNeeded();
  await expect(root).toHaveAttribute('data-video-enhanced', '');
  const media = root.locator('video');
  await media.evaluate((node) => {
    if (!(node instanceof HTMLVideoElement)) throw new Error('videoが必要です');
    node.loop = true;
  });
  const entry = root.locator('.play-button');
  const bar = root.locator('.floating-bar');
  const play = bar.locator('[data-video-action="play"]');
  await page.locator('#video-before').click();
  await page.keyboard.press('Tab');
  await expect(entry).toBeFocused();
  await expect(bar).toBeHidden();
  await page.keyboard.press('Enter');
  await expect(root).toHaveAttribute('data-state', 'playing');
  await expect(play).toBeFocused();
  await page.mouse.move(1, 1);
  await page.waitForTimeout(3200);
  await expect(bar).toHaveCSS('opacity', '1');
  await expect(entry).toBeHidden();
  await page.keyboard.press('Tab');
  await expect(bar.locator('[data-video-action="back"]')).toBeFocused();
  await expect(bar).toHaveCSS('opacity', '1');
  await page.locator('#video-before').click();
  await page.mouse.move(1, 1);
  await expect(bar).toHaveCSS('opacity', '0');
  await page.keyboard.press('Tab');
  await expect(play).toBeFocused();
  await expect(bar).toHaveCSS('opacity', '1');
  for (const action of ['back', 'forward']) {
    await page.keyboard.press('Tab');
    await expect(bar.locator(`[data-video-action="${action}"]`)).toBeFocused();
  }
  await page.keyboard.press('Tab');
  await expect(bar.locator('[data-video-seek]')).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(bar.locator('[data-video-seek]')).not.toHaveAttribute('aria-valuenow', '0');
  await play.click();
  await expect(root).toHaveAttribute('data-state', 'paused');
  await media.evaluate((node) => {
    if (!(node instanceof HTMLVideoElement)) throw new Error('videoが必要です');
    node.currentTime = 0;
  });
  await expect(bar).toBeVisible();
  await expect(entry).toBeHidden();
  await play.click();
  await play.click();
  await play.click();
  await expect(root).toHaveAttribute('data-state', 'playing');
});

test('videoの実pointer seek・音量展開・ended replayを維持する', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 844 });
  await mount(page);
  const root = page.locator('#baseline-video');
  await root.scrollIntoViewIfNeeded();
  await expect(root).toHaveAttribute('data-video-enhanced', '');
  const media = root.locator('video');
  await media.evaluate((node) => {
    if (!(node instanceof HTMLVideoElement)) throw new Error('videoが必要です');
    node.loop = true;
  });
  await root.locator('.play-button').click();
  const bar = root.locator('.floating-bar');
  await expect(root).toHaveAttribute('data-state', 'playing');
  const seek = bar.locator('[data-video-seek]');
  const rect = await seek.boundingBox();
  if (!rect) throw new Error('seek操作域が必要です');
  expect(rect.height).toBeGreaterThanOrEqual(40);
  await page.mouse.move(rect.x + rect.width / 2, rect.y + 8);
  await page.mouse.down();
  await seek.evaluate((node) => {
    if (!(node instanceof HTMLInputElement)) throw new Error('seek rangeが必要です');
    node.blur();
  });
  await page.waitForTimeout(3200);
  await expect(bar).toHaveCSS('opacity', '1');
  await page.mouse.up();
  await page.mouse.move(1, 1);
  await expect(bar).toHaveCSS('opacity', '0');
  await page.locator('#video-before').click();
  await page.keyboard.press('Tab');
  await bar.locator('[data-video-action="volume"]').click();
  const volume = bar.locator('[data-video-volume]');
  await expect(volume).toBeVisible();
  await volume.focus();
  await volume.press('End');
  await expect
    .poll(() =>
      media.evaluate((node) => {
        if (!(node instanceof HTMLVideoElement)) throw new Error('videoが必要です');
        return node.volume;
      }),
    )
    .toBe(1);
  await bar.locator('[data-video-action="mute"]').click();
  await expect
    .poll(() =>
      media.evaluate((node) => {
        if (!(node instanceof HTMLVideoElement)) throw new Error('videoが必要です');
        return node.muted;
      }),
    )
    .toBe(true);
  await bar.locator('[data-video-action="mute"]').click();
  await expect
    .poll(() =>
      media.evaluate((node) => {
        if (!(node instanceof HTMLVideoElement)) throw new Error('videoが必要です');
        return node.muted;
      }),
    )
    .toBe(false);
  const captions = bar.locator('[data-video-action="captions"]');
  const initiallyShowing = await media.evaluate((node) => {
    if (!(node instanceof HTMLVideoElement)) throw new Error('videoが必要です');
    return node.textTracks[0]?.mode === 'showing';
  });
  await captions.click();
  await expect
    .poll(() =>
      media.evaluate((node) => {
        if (!(node instanceof HTMLVideoElement)) throw new Error('videoが必要です');
        return node.textTracks[0]?.mode;
      }),
    )
    .toBe(initiallyShowing ? 'hidden' : 'showing');
  await captions.click();
  await expect
    .poll(() =>
      media.evaluate((node) => {
        if (!(node instanceof HTMLVideoElement)) throw new Error('videoが必要です');
        return node.textTracks[0]?.mode;
      }),
    )
    .toBe(initiallyShowing ? 'showing' : 'hidden');
  await media.evaluate((node) => {
    if (!(node instanceof HTMLVideoElement)) throw new Error('videoが必要です');
    node.loop = false;
    node.currentTime = node.duration - 0.1;
  });
  await expect(root).toHaveAttribute('data-state', 'ended');
  await expect(bar.locator('[data-video-action="play"]')).toHaveAttribute(
    'aria-label',
    '動画を最初から再生',
  );
  await bar.locator('[data-video-action="play"]').click();
  await expect(root).toHaveAttribute('data-state', 'playing');
  await expect
    .poll(() =>
      media.evaluate((node) => {
        if (!(node instanceof HTMLVideoElement)) throw new Error('videoが必要です');
        return node.currentTime;
      }),
    )
    .toBeLessThan(3);
});

test('video B案の実Tab順・幅変更focus・音量展開を本番CSSで繰り返し操作する', async ({ page }) => {
  await mount(page);
  const root = page.locator('#baseline-video');
  await root.scrollIntoViewIfNeeded();
  await expect(root).toHaveAttribute('data-video-enhanced', '');
  await root.evaluate((node) => {
    node.style.width = '739px';
  });
  const entry = root.locator('.play-button');
  const entryBox = await entry.boundingBox();
  expect(entryBox?.width).toBe(40);
  expect(entryBox?.height).toBe(40);
  const glyphBox = await entry.locator('svg:not([hidden])').boundingBox();
  expect(glyphBox?.width).toBe(20);
  await entry.focus();
  await page.keyboard.press('Enter');
  await expect(root).toHaveAttribute('data-state', 'playing');
  await expect(root.locator('.floating-bar [data-video-action="play"]')).toBeFocused();
  const bar = root.locator('.floating-bar');
  await expect(bar).toHaveCSS('height', '42px');
  const readFocus = () =>
    page.evaluate(() => {
      const active = document.activeElement;
      if (!(active instanceof HTMLElement)) return '';
      return active.dataset['videoAction'] ?? active.getAttribute('aria-label');
    });
  for (const expected of ['back', 'forward', '再生位置']) {
    await page.keyboard.press('Tab');
    expect(await readFocus()).toBe(expected);
  }
  const seek = root.locator('[data-video-seek]');
  const media = root.locator('video');
  await media.evaluate((node) => {
    if (!(node instanceof HTMLVideoElement)) throw new Error('videoが必要です');
    node.pause();
  });
  await expect(root).toHaveAttribute('data-state', 'paused');
  for (const width of [320, 739, 375, 739, 320]) {
    await root.evaluate((node, size) => {
      node.style.width = `${String(size)}px`;
    }, width);
    await expect(seek).toBeFocused();
    await expect
      .poll(() => bar.evaluate((node) => node.firstElementChild?.className))
      .toBe(width >= 642 ? 'bar-group-left' : 'bar-row bar-row-top');
    await expect(seek).toBeFocused();
  }
  await expect(bar).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  for (const expected of ['play', 'back', 'forward', 'mute', 'volume', 'captions', 'fullscreen']) {
    await page.keyboard.press('Tab');
    expect(await readFocus()).toBe(expected);
  }
  const volumeButton = root.locator('[data-video-action="volume"]');
  const volume = root.locator('[data-video-volume]');
  for (let iteration = 0; iteration < 3; iteration += 1) {
    await volumeButton.click();
    await expect(volumeButton).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Tab');
    await expect(volume).toBeFocused();
    await root.evaluate((node) => {
      node.style.width = '600px';
    });
    await expect(volumeButton).toBeHidden();
    await expect(volume).toBeFocused();
    await root.evaluate((node) => {
      node.style.width = '320px';
    });
    await expect(volumeButton).toBeVisible();
    await expect(volumeButton).toHaveAttribute('aria-expanded', 'true');
    await expect(volume).toBeFocused();
    await volumeButton.click();
    await expect(volumeButton).toHaveAttribute('aria-expanded', 'false');
    await expect(volume).toBeHidden();
    await volumeButton.focus();
    await root.evaluate((node) => {
      node.style.width = '600px';
    });
    await expect(volume).toBeFocused();
    await root.evaluate((node) => {
      node.style.width = '320px';
    });
    await expect(volumeButton).toHaveAttribute('aria-expanded', 'true');
    await expect(volume).toBeFocused();
    await volumeButton.click();
  }
  const captions = root.locator('[data-video-action="captions"]');
  const initiallySelected = (await captions.getAttribute('aria-pressed')) === 'true';
  for (let iteration = 0; iteration < 4; iteration += 1) {
    await captions.click();
    await expect(captions).toHaveAttribute(
      'aria-pressed',
      String(iteration % 2 === 0 ? !initiallySelected : initiallySelected),
    );
    await expect(captions.locator('svg[data-icon="captions"]')).toBeVisible();
  }
});

test('videoの本番CSSで狭幅・テーマ・fullscreenの操作域とcontainを保証する', async ({
  page,
}, testInfo) => {
  await mount(page);
  const root = page.locator('#baseline-video');
  await root.scrollIntoViewIfNeeded();
  await expect(root).toHaveAttribute('data-video-enhanced', '');
  await root.locator('.play-button').click();
  await root.locator('.floating-bar [data-video-action="play"]').click();
  await page.waitForTimeout(1200);
  for (const width of [320, 375, 560, 640, 642, 739]) {
    await root.evaluate((node, size) => {
      node.style.width = `${String(size)}px`;
    }, width);
    const player = root.locator('[data-video-player]');
    const bounds = await player.boundingBox();
    if (!bounds) throw new Error('playerが必要です');
    const controls = await root
      .locator('.floating-bar button:visible, .floating-bar input:visible')
      .all();
    for (const control of controls) {
      const rect = await control.boundingBox();
      if (!rect) throw new Error('controlが必要です');
      expect(rect.width).toBeGreaterThanOrEqual(40);
      expect(rect.height).toBeGreaterThanOrEqual(40);
      expect(rect.x).toBeGreaterThanOrEqual(bounds.x);
      expect(rect.x + rect.width).toBeLessThanOrEqual(bounds.x + bounds.width);
    }
    expect(
      await root.locator('.floating-bar').evaluate((node) => node.scrollWidth <= node.clientWidth),
    ).toBe(true);
    await expect(root.locator('video')).toHaveCSS('object-fit', 'contain');
    await root.screenshot({ path: testInfo.outputPath(`video-${String(width)}-light.png`) });
  }
  await root.evaluate((node) => {
    node.style.width = '320px';
  });
  await page.evaluate(() => {
    document.documentElement.dataset['theme'] = 'dark';
  });
  await root.screenshot({ path: testInfo.outputPath('video-320-dark.png') });
  await page.emulateMedia({ forcedColors: 'active' });
  await expect(root.locator('.floating-bar')).toHaveCSS('box-shadow', 'none');
  await root.screenshot({ path: testInfo.outputPath('video-320-forced-colors.png') });
  await page.emulateMedia({ forcedColors: 'none' });
  await page.setViewportSize({ width: 375, height: 844 });
  await root.locator('[data-video-action="fullscreen"]').click();
  await expect(root.locator('[data-video-player]')).toHaveClass(/is-fullscreen/u);
  await expect(root.locator('video')).toHaveCSS('object-fit', 'contain');
  expect(
    await root.locator('.floating-bar').evaluate((node) => node.scrollWidth <= node.clientWidth),
  ).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('video-portrait-fullscreen.png') });
  await root.locator('[data-video-action="fullscreen"]').click();
});

test('videoの実長押し2倍速はpointerupとSPA離脱で解除する', async ({ page }) => {
  await mount(page);
  const root = page.locator('#baseline-video');
  await root.scrollIntoViewIfNeeded();
  await expect(root).toHaveAttribute('data-video-enhanced', '');
  const media = root.locator('video');
  await media.evaluate((node) => {
    if (!(node instanceof HTMLVideoElement)) throw new Error('videoが必要です');
    node.loop = true;
  });
  await root.locator('.play-button').click();
  await expect(root).toHaveAttribute('data-state', 'playing');
  const bounds = await root.locator('[data-video-player]').boundingBox();
  if (!bounds) throw new Error('playerが必要です');
  await page.mouse.move(bounds.x + bounds.width * 0.2, bounds.y + bounds.height * 0.2);
  await page.mouse.down();
  await expect
    .poll(() =>
      media.evaluate((node) => {
        if (!(node instanceof HTMLVideoElement)) throw new Error('videoが必要です');
        return node.playbackRate;
      }),
    )
    .toBe(2);
  await page.mouse.up();
  await expect
    .poll(() =>
      media.evaluate((node) => {
        if (!(node instanceof HTMLVideoElement)) throw new Error('videoが必要です');
        return node.playbackRate;
      }),
    )
    .toBe(1);
  await expect(root).toHaveAttribute('data-state', 'playing');
  await page.mouse.down();
  await expect
    .poll(() =>
      media.evaluate((node) => {
        if (!(node instanceof HTMLVideoElement)) throw new Error('videoが必要です');
        return node.playbackRate;
      }),
    )
    .toBe(2);
  const result = await page.evaluate(async (url) => {
    const root = document.querySelector('#baseline-video');
    const media = root?.querySelector('video');
    const host = document.querySelector('router-document-host');
    if (!root || !media || !host) throw new Error('video / routerが必要です');
    const navigation = await host.navigate(url);
    await new Promise((resolve) => setTimeout(resolve, 350));
    const state = root.getAttribute('data-state');
    media.dispatchEvent(new Event('error'));
    await Promise.resolve();
    return {
      committed: navigation.committed,
      connected: root.isConnected,
      rate: media.playbackRate,
      stateStable: state === root.getAttribute('data-state'),
    };
  }, e2eNoteFixtures.markdownBasic.normalizedPath);
  await page.mouse.up();
  expect(result).toEqual({ committed: true, connected: false, rate: 1, stateStable: true });
});
