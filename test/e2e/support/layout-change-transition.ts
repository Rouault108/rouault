import { expect, test, type Page } from '@playwright/test';
import { e2eNoteFixtures } from './note-fixtures.js';

type Mode = 'hold' | 'defer' | 'native' | 'unsupported';
interface Probe {
  supported: boolean;
  starts: number;
  updates: number;
  skips: number;
  paused: number;
  pushes: number;
  focus: number;
  commits: number;
  releases: (() => void)[];
}
declare global {
  interface Window {
    __layoutTransition: Probe;
  }
}

const install = async (page: Page, mode: Mode) => {
  await page.addInitScript((selected: Mode) => {
    const native = document.startViewTransition?.bind(document);
    const p: Probe = {
      supported: !!native,
      starts: 0,
      updates: 0,
      skips: 0,
      paused: 0,
      pushes: 0,
      focus: 0,
      commits: 0,
      releases: [],
    };
    window.__layoutTransition = p;
    const push = history.pushState.bind(history);
    history.pushState = (...args) => {
      p.pushes++;
      push(...args);
    };
    const focus = HTMLElement.prototype.focus;
    HTMLElement.prototype.focus = function (options) {
      if (this.id === 'main-content') p.focus++;
      focus.call(this, options);
    };
    document.addEventListener('router-document-host:content-dom-replaced', () => p.commits++);
    if (selected === 'unsupported') {
      Object.defineProperty(document, 'startViewTransition', {
        configurable: true,
        value: undefined,
      });
      return;
    }
    if (selected === 'native' && !native) return;
    Object.defineProperty(document, 'startViewTransition', {
      configurable: true,
      value: (update: () => Promise<void>) => {
        p.starts++;
        const callback = async () => {
          p.updates++;
          await update();
        };
        if (selected === 'native' && native) {
          const transition = native(callback);
          void transition.ready.then(
            () => {
              for (const animation of document.getAnimations()) {
                if (
                  animation instanceof CSSAnimation &&
                  animation.animationName === 'content-navigation-appear'
                ) {
                  animation.pause();
                  animation.currentTime = 90;
                  p.paused++;
                }
              }
            },
            () => undefined,
          );
          const skip = transition.skipTransition.bind(transition);
          transition.skipTransition = () => {
            p.skips++;
            skip();
          };
          return transition;
        }
        const updateCallbackDone =
          selected === 'defer'
            ? new Promise<void>((resolve, reject) => {
                p.releases.push(() => {
                  void callback().then(resolve, reject);
                });
              })
            : Promise.resolve().then(callback);
        const finished = new Promise<void>((resolve) => {
          if (selected !== 'defer') p.releases.push(resolve);
        });
        return {
          updateCallbackDone,
          ready: updateCallbackDone,
          finished,
          skipTransition: () => {
            p.skips++;
          },
        };
      },
    });
  }, mode);
};
const read = (page: Page) =>
  page.evaluate(() => {
    const { supported, starts, updates, skips, paused, pushes, focus, commits } =
      window.__layoutTransition;
    return { supported, starts, updates, skips, paused, pushes, focus, commits };
  });
const ready = async (page: Page) => {
  await page.evaluate(async () => {
    await customElements.whenDefined('router-document-host');
    await document.querySelector('router-document-host')?.whenReady();
  });
  await expect(page.locator('#main-content')).toHaveAttribute(
    'data-reading-position-status',
    'settled',
  );
};
const navigate = async (page: Page, target: string) => {
  const result = await page.evaluate(
    async (url) => document.querySelector('router-document-host')?.navigate(url),
    target,
  );
  expect(result?.committed).toBe(true);
  expect(result?.stateOnly).toBe(false);
  await ready(page);
};
const note = () => e2eNoteFixtures.layoutRich.normalizedPath;
const tag = '/tags/Programming/';

export const registerLayoutChangeTransitionTests = (): void => {
  test.describe('既知の配置変更の通常移動', () => {
    test.use({ reducedMotion: 'no-preference' });

    test('noteとtag/discoveryの両方向を各一回commitし、履歴移動は演出せず位置を復元する', async ({
      page,
    }) => {
      await install(page, 'hold');
      await page.goto(e2eNoteFixtures.layoutRich.directPath);
      await ready(page);
      const first = await read(page);
      await page.evaluate(() => scrollTo({ top: 900, behavior: 'instant' }));
      const originalY = await page.evaluate(() => scrollY);
      await navigate(page, tag);
      await expect(page.locator('router-document-host')).toHaveAttribute(
        'data-sidebar-presence',
        'absent',
      );
      expect((await read(page)).starts - first.starts).toBe(1);
      expect((await read(page)).commits - first.commits).toBe(1);
      expect((await read(page)).pushes - first.pushes).toBe(1);
      expect((await read(page)).focus - first.focus).toBe(1);
      expect(await page.evaluate(() => scrollY)).toBe(0);
      await page.goBack();
      await expect(page).toHaveURL(new RegExp(note() + '/?$'));
      await ready(page);
      expect(Math.abs((await page.evaluate(() => scrollY)) - originalY)).toBeLessThanOrEqual(2);
      expect((await read(page)).starts).toBe(first.starts + 1);
      await page.goForward();
      await expect(page).toHaveURL(tag);
      await ready(page);
      expect((await read(page)).starts).toBe(first.starts + 1);
      const corpusLink = '/corpora/';
      for (const url of [
        note(),
        '/search/',
        e2eNoteFixtures.tocAbsent.normalizedPath,
        corpusLink,
        e2eNoteFixtures.tocStaticPresent.normalizedPath,
        '/',
        note(),
        '/about/',
        '/memos/',
        note(),
      ]) {
        const before = await read(page);
        await navigate(page, url);
        const after = await read(page);
        expect(after.starts - before.starts).toBe(1);
        expect(after.commits - before.commits).toBe(1);
        expect(after.pushes - before.pushes).toBe(1);
        expect(after.focus - before.focus).toBe(1);
        expect(await page.evaluate(() => scrollY)).toBe(0);
        await expect(page.locator('header[data-layout-header]')).toHaveCount(1);
        await expect(page.locator('main#main-content')).toHaveCount(1);
      }
      await navigate(page, '/corpora/');
      const href = await page.locator('.corpus-index-row').first().getAttribute('href');
      expect(href).toBeTruthy();
      const before = await read(page);
      await navigate(page, href ?? '');
      expect((await read(page)).starts - before.starts).toBe(1);
      await navigate(page, note());
    });

    test('nativeの配置変更は新mainのopacityだけを描画し操作を遮らない', async ({ page }, info) => {
      await install(page, 'native');
      await page.goto(e2eNoteFixtures.layoutRich.directPath);
      await ready(page);
      const observations = [];
      for (const [index, url] of [
        tag,
        e2eNoteFixtures.tocAbsent.normalizedPath,
        '/search/',
        note(),
      ].entries()) {
        const before = await read(page);
        await navigate(page, url);
        const after = await read(page);
        expect(after.starts - before.starts).toBe(after.supported ? 1 : 0);
        if (after.supported) {
          await expect.poll(async () => (await read(page)).paused).toBe(before.paused + 1);
          const style = await page.evaluate(() => {
            const root = document.documentElement;
            const newStyle = getComputedStyle(root, '::view-transition-new(rouault-content)');
            return {
              root: getComputedStyle(root).viewTransitionName,
              group: getComputedStyle(root, '::view-transition-group(rouault-content)')
                .animationName,
              old: getComputedStyle(root, '::view-transition-old(rouault-content)').display,
              opacity: Number(newStyle.opacity),
              duration: newStyle.animationDuration,
              transform: newStyle.transform,
              pointer: newStyle.pointerEvents,
              header: getComputedStyle(document.querySelector('header[data-layout-header]') ?? root)
                .opacity,
              y: scrollY,
              focus: document.activeElement?.id,
            };
          });
          expect(style.root).toBe('none');
          expect(style.group).toBe('none');
          expect(style.old).toBe('none');
          expect(style.transform).toBe('none');
          expect(style.pointer).toBe('none');
          expect(style.header).toBe('1');
          expect(style.opacity).toBeGreaterThanOrEqual(0.82);
          expect(style.opacity).toBeLessThanOrEqual(1);
          expect(style.duration).toBe('0.18s');
          expect(style.y).toBe(0);
          expect(style.focus).toBe('main-content');
          const path = info.outputPath(`layout-change-${index}.png`);
          await page.screenshot({ path, animations: 'allow' });
          await info.attach(`layout-change-${index}`, { path, contentType: 'image/png' });
          observations.push({ url, style });
          await page.locator('#static-header-theme-trigger').click();
          await expect(page.locator('#static-header-theme-trigger').locator('..')).toHaveAttribute(
            'open',
            '',
          );
          await expect(page.locator('html')).not.toHaveAttribute('data-content-transition');
        }
      }
      console.info(
        'layout-transition-evidence',
        JSON.stringify({
          project: info.project.name,
          viewport: page.viewportSize(),
          supported: (await read(page)).supported,
          observations,
        }),
      );
    });

    for (const fallback of ['unsupported', 'reduced-motion'] as const)
      test(`${fallback}は配置変更でも通常commitする`, async ({ page }) => {
        await install(page, fallback === 'unsupported' ? 'unsupported' : 'hold');
        if (fallback === 'reduced-motion') await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.goto(e2eNoteFixtures.layoutRich.directPath);
        await ready(page);
        for (const url of [tag, note(), '/search/', note()]) {
          await navigate(page, url);
          expect((await read(page)).starts).toBe(0);
        }
      });

    test('配置変更の遅延callbackも連打後の最新intentを上書きしない', async ({ page }) => {
      await install(page, 'defer');
      await page.goto(e2eNoteFixtures.layoutRich.directPath);
      await ready(page);
      const before = await read(page);
      await page.evaluate((url) => {
        void document.querySelector('router-document-host')?.navigate(url);
      }, tag);
      await expect.poll(async () => (await read(page)).starts).toBe(1);
      await page.evaluate(() => {
        void document.querySelector('router-document-host')?.navigate('/search/');
      });
      await page.evaluate(() => window.__layoutTransition.releases[0]?.());
      await expect.poll(async () => (await read(page)).starts).toBe(2);
      await page.evaluate(() => window.__layoutTransition.releases[1]?.());
      await expect(page).toHaveURL('/search/');
      await ready(page);
      expect((await read(page)).commits - before.commits).toBe(1);
      expect((await read(page)).pushes - before.pushes).toBe(1);
    });

    test('既知pageからのhash移動とnot-found、その直後の移動を演出しない', async ({ page }) => {
      await install(page, 'hold');
      await page.goto(tag);
      await ready(page);
      await navigate(page, `${note()}#missing-heading`);
      expect((await read(page)).starts).toBe(0);
      await navigate(page, note());
      const result = await page.evaluate(async () =>
        document.querySelector('router-document-host')?.navigate('/layout-change-missing/'),
      );
      expect(result?.renderedKind).toBe('not-found');
      await ready(page);
      expect((await read(page)).starts).toBe(0);
      await navigate(page, note());
      expect((await read(page)).starts).toBe(0);
      await navigate(page, tag);
      expect((await read(page)).starts).toBe(1);
    });

    test('配置変更の失敗はshellと本文と履歴を復元して演出を止める', async ({ page }) => {
      await install(page, 'hold');
      await page.goto(e2eNoteFixtures.layoutRich.directPath);
      await ready(page);
      const original = await page.locator('#main-content').innerText();
      const originalUrl = page.url();
      const result = await page.evaluate(async (url) => {
        const push = history.pushState;
        history.pushState = () => {
          throw new Error('layout-history-failure');
        };
        try {
          return await document.querySelector('router-document-host')?.navigate(url);
        } finally {
          history.pushState = push;
        }
      }, tag);
      expect(result?.committed).toBe(false);
      expect(page.url()).toBe(originalUrl);
      expect(await page.locator('#main-content').innerText()).toBe(original);
      await expect(page.locator('router-document-host')).toHaveAttribute(
        'data-sidebar-presence',
        'present',
      );
      await expect(page.locator('html')).not.toHaveAttribute('data-content-transition');
      expect((await read(page)).skips).toBeGreaterThanOrEqual(1);
    });
  });
};
