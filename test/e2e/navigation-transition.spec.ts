import { expect, test, type Page } from '@playwright/test';
import { e2eNoteFixtures } from './support/note-fixtures.js';

type ProbeMode = 'native' | 'unsupported' | 'hold' | 'defer' | 'ready-reject';
interface TransitionProbe {
  supported: boolean;
  starts: number;
  updates: number;
  skips: number;
  replaced: number;
  focus: number;
  announcements: string[];
  updateStates: { marker: boolean; focus: string; y: number }[];
  release: (() => void)[];
}
declare global {
  interface Window {
    __navigationTransitionProbe: TransitionProbe;
  }
}

const source = (): string => e2eNoteFixtures.markdownBasic.normalizedPath;
const target = (): string => e2eNoteFixtures.code.normalizedPath;
const ready = async (page: Page): Promise<void> => {
  await page.evaluate(async () => {
    await customElements.whenDefined('router-document-host');
    const host = document.querySelector('router-document-host');
    if (!host) throw new Error('router-document-host');
    await host.whenReady();
  });
  await expect(page.locator('#main-content')).toHaveAttribute(
    'data-reading-position-status',
    'settled',
  );
};
const navigate = async (page: Page, url: string): Promise<void> => {
  await page.evaluate(async (next) => {
    const host = document.querySelector('router-document-host');
    if (!host) throw new Error('router-document-host');
    await host.navigate(next);
  }, url);
};
const installProbe = async (page: Page, mode: ProbeMode): Promise<void> => {
  await page.addInitScript((selectedMode: ProbeMode) => {
    const nativeStart = document.startViewTransition?.bind(document);
    const probe: TransitionProbe = {
      supported: typeof nativeStart === 'function',
      starts: 0,
      updates: 0,
      skips: 0,
      replaced: 0,
      focus: 0,
      announcements: [],
      updateStates: [],
      release: [],
    };
    window.__navigationTransitionProbe = probe;
    const focus = HTMLElement.prototype.focus;
    HTMLElement.prototype.focus = function (options?: FocusOptions): void {
      if (this.id === 'main-content') probe.focus++;
      focus.call(this, options);
    };
    document.addEventListener('router-document-host:content-dom-replaced', () => {
      probe.replaced++;
    });
    new MutationObserver((records) => {
      for (const record of records) {
        const element = record.target;
        if (
          element instanceof HTMLElement &&
          element.matches('[data-router-document-host-announcement]') &&
          element.textContent
        )
          probe.announcements.push(element.textContent);
      }
    }).observe(document, { subtree: true, childList: true });
    if (selectedMode === 'unsupported') {
      Object.defineProperty(document, 'startViewTransition', {
        configurable: true,
        value: undefined,
      });
      return;
    }
    if (selectedMode === 'native' && !nativeStart) return;
    Object.defineProperty(document, 'startViewTransition', {
      configurable: true,
      value: (update: () => Promise<void>) => {
        probe.starts++;
        const wrappedUpdate = async (): Promise<void> => {
          probe.updates++;
          await update();
          probe.updateStates.push({
            marker: document.documentElement.hasAttribute('data-content-transition'),
            focus: document.activeElement?.id ?? '',
            y: scrollY,
          });
        };
        if (selectedMode === 'native' && nativeStart) {
          const transition = nativeStart(wrappedUpdate);
          void transition.ready.then(
            () => {
              // 中間フレームを実APIのanimationから固定し、画像と実操作を観察する。
              for (const animation of document.getAnimations()) {
                if (
                  !(animation instanceof CSSAnimation) ||
                  animation.animationName !== 'content-navigation-appear'
                )
                  continue;
                animation.pause();
                animation.currentTime = 90;
                document.documentElement.dataset['transitionMidpoint'] = 'true';
              }
            },
            () => {
              /* 未対応条件のready失敗はcoordinatorの縮退判定で扱う。 */
            },
          );
          const skip = transition.skipTransition.bind(transition);
          transition.skipTransition = () => {
            probe.skips++;
            skip();
          };
          return transition;
        }
        // 模擬APIは描画能力の証拠にせず、更新と演出の寿命の分離だけを検証する。
        const updateCallbackDone =
          selectedMode === 'defer'
            ? new Promise<void>((resolve, reject) => {
                probe.release.push(() => {
                  void wrappedUpdate().then(resolve, reject);
                });
              })
            : Promise.resolve().then(wrappedUpdate);
        const ready = updateCallbackDone.then(() => {
          if (selectedMode === 'ready-reject') throw new Error('forced ready rejection');
        });
        let finish!: () => void;
        const finished = new Promise<void>((resolve) => {
          finish = resolve;
          if (selectedMode !== 'defer') probe.release.push(resolve);
        });
        void ready.catch(() => {
          /* 模擬API自身が未処理rejectionを生成しないよう観測する。 */
        });
        return {
          updateCallbackDone,
          ready,
          finished,
          skipTransition: () => {
            probe.skips++;
            finish();
          },
        };
      },
    });
  }, mode);
};
const counts = async (page: Page) =>
  page.evaluate(() => {
    const { starts, updates, skips, replaced, focus, announcements, updateStates } =
      window.__navigationTransitionProbe;
    return { starts, updates, skips, replaced, focus, announcements, updateStates };
  });

test.use({ viewport: { width: 1280, height: 720 }, reducedMotion: 'no-preference' });

test('native: 同shellの内部anchorは本文だけを短くfadeしshellと操作を保つ', async ({
  page,
}, testInfo) => {
  await installProbe(page, 'native');
  await page.goto(e2eNoteFixtures.sidebarScrollSource.directPath);
  await ready(page);
  const supported = await page.evaluate(() => window.__navigationTransitionProbe.supported);
  testInfo.annotations.push({
    type: 'native-view-transition',
    description: supported ? '実ブラウザAPIで描画を検証' : '未対応: 通常commitへの縮退のみ検証',
  });
  expect((await counts(page)).starts).toBe(0);
  await page.evaluate((url) => {
    const link = document.createElement('a');
    link.id = 'transition-next';
    link.href = url;
    link.textContent = '次の本文';
    document.querySelector('#main-content')?.prepend(link);
  }, e2eNoteFixtures.sidebarScrollTarget.normalizedPath);
  const shellBefore = await page.evaluate(() =>
    ['header[data-layout-header]', 'aside[data-layout-sidebar-root]'].map((selector) => {
      const element = document.querySelector(selector);
      const box = element?.getBoundingClientRect();
      return { selector, x: box?.x, y: box?.y, width: box?.width, height: box?.height };
    }),
  );
  // requestAnimationFrameで観測して自動待機が短い演出を通り過ぎないようにする。
  await page.evaluate(() => {
    document.documentElement.dataset['transitionFrames'] = '0';
    const sample = (): void => {
      if (document.documentElement.hasAttribute('data-content-transition')) {
        const main = document.querySelector('#main-content');
        const style = getComputedStyle(
          document.documentElement,
          '::view-transition-new(rouault-content)',
        );
        document.documentElement.dataset['transitionNativeStyle'] = JSON.stringify({
          name: main && getComputedStyle(main).viewTransitionName,
          root: getComputedStyle(document.documentElement).viewTransitionName,
          pointerEvents: style.pointerEvents,
          duration: style.animationDuration,
          opacity: style.opacity,
          transform: style.transform,
          filter: style.filter,
          oldDisplay: getComputedStyle(
            document.documentElement,
            '::view-transition-old(rouault-content)',
          ).display,
          shell: [
            ...document.querySelectorAll(
              'header[data-layout-header], aside[data-layout-sidebar-root], footer',
            ),
          ].map((node) => ({
            opacity: getComputedStyle(node).opacity,
            name: getComputedStyle(node).viewTransitionName,
          })),
        });
        document.documentElement.dataset['transitionFrames'] = String(
          Number(document.documentElement.dataset['transitionFrames']) + 1,
        );
      }
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
  await page.locator('#transition-next').click();
  await expect
    .poll(() => page.evaluate(() => location.pathname))
    .toBe(e2eNoteFixtures.sidebarScrollTarget.normalizedPath);
  await ready(page);
  const probe = await counts(page);
  expect(probe.starts).toBe(supported ? 1 : 0);
  expect(probe.updates).toBe(supported ? 1 : 0);
  expect(await page.evaluate(() => document.activeElement?.id)).toBe('main-content');
  expect(await page.evaluate(() => scrollY)).toBe(0);
  if (supported) {
    await expect
      .poll(() => page.locator('html').getAttribute('data-transition-native-style'))
      .not.toBeNull();
    const style = JSON.parse(
      (await page.locator('html').getAttribute('data-transition-native-style')) ?? '{}',
    ) as {
      name: string;
      root: string;
      pointerEvents: string;
      duration: string;
      opacity: string;
      transform: string;
      filter: string;
      oldDisplay: string;
      shell: { opacity: string; name: string }[];
    };
    expect(style.name).toBe('rouault-content');
    expect(style.root).toBe('none');
    expect(style.pointerEvents).toBe('none');
    expect(style.oldDisplay).toBe('none');
    expect(style.transform).toBe('none');
    expect(style.filter).toBe('none');
    expect(Number(style.opacity)).toBeGreaterThanOrEqual(0.82);
    expect(Number(style.opacity)).toBeLessThanOrEqual(1);
    expect(parseFloat(style.duration)).toBeGreaterThanOrEqual(0.15);
    expect(parseFloat(style.duration)).toBeLessThanOrEqual(0.2);
    expect(style.shell.every((entry) => entry.opacity === '1' && entry.name === 'none')).toBe(true);
    expect(probe.updateStates).toEqual([{ marker: true, focus: 'main-content', y: 0 }]);
  }
  const shellAfter = await page.evaluate(() =>
    ['header[data-layout-header]', 'aside[data-layout-sidebar-root]'].map((selector) => {
      const box = document.querySelector(selector)?.getBoundingClientRect();
      return { selector, x: box?.x, y: box?.y, width: box?.width, height: box?.height };
    }),
  );
  expect(shellAfter).toEqual(shellBefore);
  if (supported) {
    await expect(page.locator('html')).toHaveAttribute('data-transition-midpoint', 'true');
    const midpointPath = testInfo.outputPath('native-transition-midpoint.png');
    await page.screenshot({ path: midpointPath, animations: 'allow' });
    await testInfo.attach('native-transition-midpoint', {
      path: midpointPath,
      contentType: 'image/png',
    });
    await page.locator('#static-header-theme-trigger').click();
    expect(
      await page
        .locator('#static-header-theme-trigger')
        .evaluate((element) => element.closest('details')?.open),
    ).toBe(true);
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => document.activeElement?.id)).not.toBe('main-content');
    expect((await counts(page)).skips).toBeGreaterThanOrEqual(1);
  }
  await expect(page.locator('html')).not.toHaveAttribute('data-content-transition');
  await testInfo.attach('native-transition-result', {
    body: JSON.stringify({ supported, probe, shellBefore, shellAfter }, null, 2),
    contentType: 'application/json',
  });
  const finalPath = testInfo.outputPath('native-transition-final.png');
  await page.screenshot({ path: finalPath });
  await testInfo.attach('native-transition-final', {
    path: finalPath,
    contentType: 'image/png',
  });
});

for (const fallback of ['unsupported', 'reduced-motion'] as const) {
  test(`${fallback}: 演出なしで本文・focus・先頭位置を一度commitする`, async ({ page }) => {
    await installProbe(page, fallback === 'unsupported' ? 'unsupported' : 'hold');
    if (fallback === 'reduced-motion') await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(e2eNoteFixtures.markdownBasic.directPath);
    await ready(page);
    await page.evaluate(() => scrollTo({ top: 400, behavior: 'instant' }));
    const before = await counts(page);
    await navigate(page, target());
    await ready(page);
    const after = await counts(page);
    expect(after.starts).toBe(0);
    expect(after.replaced - before.replaced).toBe(1);
    expect(after.focus - before.focus).toBe(1);
    expect(after.announcements.length - before.announcements.length).toBe(1);
    expect(await page.evaluate(() => scrollY)).toBe(0);
    await expect(page.locator('html')).not.toHaveAttribute('data-content-transition');
  });
}

test('mock: ready rejectionでも本文・focus・announcementを再commitしない', async ({ page }) => {
  await installProbe(page, 'ready-reject');
  await page.goto(e2eNoteFixtures.markdownBasic.directPath);
  await ready(page);
  const before = await counts(page);
  await navigate(page, target());
  await ready(page);
  const after = await counts(page);
  expect(after.starts).toBe(1);
  expect(after.updates).toBe(1);
  expect(after.replaced - before.replaced).toBe(1);
  expect(after.focus - before.focus).toBe(1);
  expect(after.announcements.length - before.announcements.length).toBe(1);
  await expect(page.locator('html')).not.toHaveAttribute('data-content-transition');
});

test('mock: finished待機中も次のnavigationがcommitし古いcleanupは新演出を消さない', async ({
  page,
}) => {
  await installProbe(page, 'hold');
  await page.goto(e2eNoteFixtures.markdownBasic.directPath);
  await ready(page);
  await navigate(page, target());
  await expect(page.locator('html')).toHaveAttribute('data-content-transition');
  await navigate(page, source());
  await ready(page);
  expect((await counts(page)).starts).toBe(2);
  expect((await counts(page)).updates).toBe(2);
  expect((await counts(page)).skips).toBeGreaterThanOrEqual(1);
  await page.evaluate(() => window.__navigationTransitionProbe.release[0]?.());
  await expect(page.locator('html')).toHaveAttribute('data-content-transition');
  await page.evaluate(() => window.__navigationTransitionProbe.release[1]?.());
  await expect(page.locator('html')).not.toHaveAttribute('data-content-transition');
});

test('mock: 演出中の本人操作は効果を止め操作対象を遮らない', async ({ page }) => {
  await installProbe(page, 'hold');
  await page.goto(e2eNoteFixtures.markdownBasic.directPath);
  await ready(page);
  await navigate(page, target());
  await expect(page.locator('html')).toHaveAttribute('data-content-transition');
  await page.mouse.wheel(0, 100);
  await expect(page.locator('html')).not.toHaveAttribute('data-content-transition');
  expect((await counts(page)).skips).toBeGreaterThanOrEqual(1);
  expect(await page.evaluate(() => location.pathname)).toBe(target());
});

test('mock: callback前の連打でskipされても旧callbackは最新intentを上書きしない', async ({
  page,
}) => {
  await installProbe(page, 'defer');
  await page.goto(e2eNoteFixtures.markdownBasic.directPath);
  await ready(page);
  const before = await counts(page);
  await page.evaluate((url) => {
    void document.querySelector('router-document-host')?.navigate(url);
  }, target());
  await expect.poll(async () => (await counts(page)).starts).toBe(1);
  const lastTarget = e2eNoteFixtures.interactive.normalizedPath;
  await page.evaluate((url) => {
    void document.querySelector('router-document-host')?.navigate(url);
  }, lastTarget);
  await expect.poll(async () => (await counts(page)).skips).toBeGreaterThanOrEqual(1);
  // skipはcallback取消ではない。旧callbackも実行してstale guardを通す。
  await page.evaluate(() => window.__navigationTransitionProbe.release[0]?.());
  await expect.poll(async () => (await counts(page)).starts).toBe(2);
  await page.evaluate(() => window.__navigationTransitionProbe.release[1]?.());
  await expect.poll(() => page.evaluate(() => location.pathname)).toBe(lastTarget);
  await ready(page);
  expect((await counts(page)).replaced - before.replaced).toBe(1);
});

test('mock: initial・hash・state-only・traverse・shell変更・not-foundは演出しない', async ({
  page,
}) => {
  await installProbe(page, 'hold');
  await page.goto(e2eNoteFixtures.markdownBasic.directPath);
  await ready(page);
  expect((await counts(page)).starts).toBe(0);
  await navigate(page, `${target()}#missing-heading`);
  await ready(page);
  await navigate(page, `${target()}?tab=example`);
  await page.goBack();
  await ready(page);
  expect((await counts(page)).starts).toBe(0);
  await navigate(page, '/tags/Programming/');
  await ready(page);
  expect((await counts(page)).starts).toBe(0);
  await navigate(page, '/transition-missing-page/');
  await ready(page);
  expect((await counts(page)).starts).toBe(0);
});

test('mock: hashなしの実在tab変更はstate-onlyで本文をcommitせず演出しない', async ({ page }) => {
  await installProbe(page, 'hold');
  await page.goto(e2eNoteFixtures.interactive.directPath);
  await ready(page);
  const before = await counts(page);
  const result = await page.evaluate(async (url) => {
    const host = document.querySelector('router-document-host');
    if (!host) throw new Error('router-document-host');
    return host.navigate(`${url}?tab=rust`);
  }, e2eNoteFixtures.interactive.normalizedPath);
  expect(result.stateOnly).toBe(true);
  expect(result.committed).toBe(true);
  expect((await counts(page)).starts).toBe(0);
  expect((await counts(page)).replaced).toBe(before.replaced);
  await expect(page).toHaveURL(`${e2eNoteFixtures.interactive.normalizedPath}?tab=rust`);
});

test('mock: sidebarの枝の開閉は本文commitも演出も起こさない', async ({ page }) => {
  await installProbe(page, 'hold');
  await page.goto(e2eNoteFixtures.sidebarScrollSource.directPath);
  await ready(page);
  const before = await counts(page);
  const branch = page
    .locator('aside[data-layout-sidebar-root] [data-sidebar-nav-branch-control]')
    .first();
  const opened = await branch.evaluate((element) => element.closest('details')?.open);
  await branch.click();
  expect(await branch.evaluate((element) => element.closest('details')?.open)).toBe(!opened);
  expect((await counts(page)).starts).toBe(0);
  expect((await counts(page)).replaced).toBe(before.replaced);
});

test('mock: callback内のhistory失敗は旧本文・URLへrollbackし演出を残さない', async ({ page }) => {
  await installProbe(page, 'hold');
  await page.goto(e2eNoteFixtures.markdownBasic.directPath);
  await ready(page);
  const originalUrl = page.url();
  const originalHeading = await page.locator('#main-content h1').textContent();
  await page.evaluate(() => {
    history.pushState = () => {
      throw new Error('forced transition history failure');
    };
  });
  await navigate(page, target());
  expect(page.url()).toBe(originalUrl);
  expect(await page.locator('#main-content h1').textContent()).toBe(originalHeading);
  expect((await counts(page)).updates).toBe(1);
  await expect(page.locator('html')).not.toHaveAttribute('data-content-transition');
});
