import { describe, expect, it, vi } from 'vitest';
import type { HastProperties } from '../../build/rehype/hast-utils.js';
import { activateVideo } from '../../src/client/post-hydrate/video-enhancer.js';
import { fixtureAbortController, requireFixtureValue } from './harness/browser-fixture.js';
import { element, nativeNoteFixture } from './harness/native-note-fixture.js';
import { compositeOver, contrastRatio, resolveComputedColor } from './helpers/color-contrast.js';
import { fetchCssText } from './helpers/fetch-css-text.js';
import {
  dispatchKey,
  nextAnimationFrame,
  waitForCondition,
} from './harness/browser-test-utilities.js';

interface MediaMockState {
  currentTime: number;
  duration: number;
  bufferedEnd: number;
  paused: boolean;
  ended: boolean;
  volume: number;
  muted: boolean;
  loadCalls: number;
  textTracks: { kind: string; mode: string }[];
}
const createBufferedRanges = (end: number): TimeRanges =>
  ({
    length: end > 0 ? 1 : 0,
    start: (index: number): number => {
      if (index !== 0) {
        throw new Error('TimeRanges.start index が不正です');
      }
      return 0;
    },
    end: (index: number): number => {
      if (index !== 0) {
        throw new Error('TimeRanges.end index が不正です');
      }
      return end;
    },
  }) as TimeRanges;

const installMediaMock = (video: HTMLVideoElement, state: MediaMockState): void => {
  // Mock stateとテストで送るerrorだけを観測し、fixture URLのnetwork failureを混ぜない。
  video.addEventListener(
    'error',
    (event) => {
      if (event.isTrusted) event.stopImmediatePropagation();
    },
    { signal: fixtureAbortController(video).signal },
  );
  Object.defineProperty(video, 'currentTime', {
    configurable: true,
    get: () => state.currentTime,
    set: (value: number) => {
      state.currentTime = value;
    },
  });

  Object.defineProperty(video, 'duration', {
    configurable: true,
    get: () => state.duration,
  });

  Object.defineProperty(video, 'buffered', {
    configurable: true,
    get: () => createBufferedRanges(state.bufferedEnd),
  });

  Object.defineProperty(video, 'paused', {
    configurable: true,
    get: () => state.paused,
  });

  Object.defineProperty(video, 'ended', {
    configurable: true,
    get: () => state.ended,
  });

  Object.defineProperty(video, 'volume', {
    configurable: true,
    get: () => state.volume,
    set: (value: number) => {
      state.volume = value;
    },
  });

  Object.defineProperty(video, 'muted', {
    configurable: true,
    get: () => state.muted,
    set: (value: boolean) => {
      state.muted = value;
    },
  });

  Object.defineProperty(video, 'error', {
    configurable: true,
    get: () => null,
  });

  Object.defineProperty(video, 'textTracks', {
    configurable: true,
    get: () => Object.assign(state.textTracks, { addEventListener: () => undefined }),
  });

  Object.defineProperty(video, 'play', {
    configurable: true,
    value: (): Promise<void> => {
      state.paused = false;
      state.ended = false;
      video.dispatchEvent(new Event('playing'));
      return Promise.resolve();
    },
  });

  Object.defineProperty(video, 'pause', {
    configurable: true,
    value: (): void => {
      state.paused = true;
      video.dispatchEvent(new Event('pause'));
    },
  });

  Object.defineProperty(video, 'load', {
    configurable: true,
    value: (): void => {
      state.loadCalls += 1;
    },
  });
};

const makeVideo = (properties: HastProperties = {}) =>
  nativeNoteFixture(
    element(
      'ui-video',
      {
        src: '/media/sample.mp4',
        caption: '字幕付き動画の要約',
        ...properties,
      },
      [
        element('track', {
          src: '/captions/ja.vtt',
          srclang: 'ja',
          label: '日本語',
          kind: 'captions',
          default: true,
        }),
      ],
    ),
  );
const activate = (root: HTMLElement) => {
  const lifetime = fixtureAbortController(root);
  activateVideo(root, lifetime.signal);
  return lifetime;
};
const state = (overrides: Partial<MediaMockState> = {}): MediaMockState => ({
  currentTime: 0,
  duration: 120,
  bufferedEnd: 60,
  paused: true,
  ended: false,
  volume: 0.6,
  muted: false,
  loadCalls: 0,
  textTracks: [{ kind: 'captions', mode: 'hidden' }],
  ...overrides,
});
const button = (root: HTMLElement, action: string) =>
  requireFixtureValue(root.querySelector<HTMLButtonElement>(`[data-video-action="${action}"]`));
const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

let videoStyles: Promise<string> | undefined;
const applyVideoStyles = async (root: HTMLElement): Promise<void> => {
  // 本番のmain.cssと同じ順にし、後置される共通controlとのcascadeも検証する。
  videoStyles ??= Promise.all([
    fetchCssText('/src/assets/css/tokens.css'),
    fetchCssText('/src/assets/css/video.css'),
    fetchCssText('/src/assets/css/note-controls.css'),
  ]).then((styles) => styles.join('\n'));
  const style = document.createElement('style');
  style.textContent = await videoStyles;
  root.prepend(style);
};

describe('native video browser contract', () => {
  it('no-JSのnative media、caption、trackとhidden controlsを出力する', async () => {
    const root = await makeVideo();
    const media = requireFixtureValue(root.querySelector('video'));
    expect(media.controls).toBe(true);
    expect(media.getAttribute('aria-describedby')).toBe(root.querySelector('figcaption')?.id);
    expect(root.querySelector('figcaption')?.textContent).toBe('字幕付き動画の要約');
    expect(media.querySelector('track')?.getAttribute('label')).toBe('日本語');
    expect(root.querySelector<HTMLElement>('[data-video-enhanced-controls]')?.hidden).toBe(true);
    expect(root.dataset['hydrationTrigger']).toBe('visible');
  });

  it('本番のCSS順でも広幅音量は一列になり、18px記号と40px操作域を分離する', async () => {
    const root = await makeVideo();
    installMediaMock(requireFixtureValue(root.querySelector('video')), state({ paused: false }));
    await applyVideoStyles(root);
    root.style.width = '739px';
    activate(root);
    const bar = requireFixtureValue(root.querySelector<HTMLElement>('.floating-bar'));
    expect(getComputedStyle(button(root, 'volume')).display).toBe('none');
    expect(bar.getBoundingClientRect().height).toBe(42);
    const play = requireFixtureValue(
      bar.querySelector<HTMLButtonElement>('[data-video-action="play"]'),
    );
    expect(play.getBoundingClientRect().width).toBe(40);
    expect(play.querySelector('svg:not([hidden])')?.getBoundingClientRect().width).toBe(18);
  });

  it('開始記号は青灰20pxの塗りで、40px操作域とthemeの判別性を保つ', async () => {
    const root = await makeVideo();
    installMediaMock(requireFixtureValue(root.querySelector('video')), state());
    await applyVideoStyles(root);
    activate(root);
    const entry = button(root, 'play');
    const glyph = requireFixtureValue(entry.querySelector<SVGElement>('svg[data-icon="play"]'));
    const shape = requireFixtureValue(glyph.querySelector<SVGElement>('path'));
    expect(entry.getBoundingClientRect().width).toBe(40);
    expect(entry.getBoundingClientRect().height).toBe(40);
    expect(glyph.getBoundingClientRect().width).toBe(20);
    expect(getComputedStyle(shape).fill).not.toBe('none');
    expect(getComputedStyle(shape).strokeWidth).toBe('0px');
    const oldTheme = document.documentElement.getAttribute('data-theme');
    try {
      for (const theme of ['light', 'dark']) {
        document.documentElement.dataset['theme'] = theme;
        const fg = resolveComputedColor('var(--video-entry-foreground)', entry, 'color');
        const bg = resolveComputedColor('var(--video-control-surface)', entry, 'background-color');
        if (theme === 'light') expect(fg).toMatchObject({ r: 60, g: 79, b: 98 });
        for (const shade of [0, 255]) {
          expect(
            contrastRatio(fg, compositeOver(bg, { r: shade, g: shade, b: shade, a: 1 })),
          ).toBeGreaterThanOrEqual(3);
        }
      }
    } finally {
      if (oldTheme === null) document.documentElement.removeAttribute('data-theme');
      else document.documentElement.setAttribute('data-theme', oldTheme);
    }
  });

  it('狭幅は上段を透明にし、幅変更で視覚順とDOM順・seek focusを揃える', async () => {
    const root = await makeVideo();
    installMediaMock(requireFixtureValue(root.querySelector('video')), state({ paused: false }));
    await applyVideoStyles(root);
    root.style.width = '320px';
    activate(root);
    const bar = requireFixtureValue(root.querySelector<HTMLElement>('.floating-bar'));
    const timeline = requireFixtureValue(root.querySelector<HTMLElement>('.bar-row-top'));
    const left = requireFixtureValue(root.querySelector<HTMLElement>('.bar-group-left'));
    const right = requireFixtureValue(root.querySelector<HTMLElement>('.bar-group-right'));
    const seek = requireFixtureValue(root.querySelector<HTMLInputElement>('[data-video-seek]'));
    expect([...bar.children]).toEqual([timeline, left, right]);
    expect(getComputedStyle(bar).backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(bar.getBoundingClientRect().height).toBe(82);
    expect(getComputedStyle(bar, '::before').top).toBe('40px');
    seek.focus();
    for (const width of [739, 320, 739, 375]) {
      root.style.width = `${String(width)}px`;
      await waitForCondition(
        () => bar.firstElementChild === (width >= 642 ? left : timeline),
        'control DOM整列',
      );
      expect([...bar.children]).toEqual(
        width >= 642 ? [left, timeline, right] : [timeline, left, right],
      );
      expect(document.activeElement).toBe(seek);
      expect(bar.classList.contains('is-bar-hidden')).toBe(false);
    }
  });

  it('幅変更で音量rangeのfocusと展開triggerの到達先を維持する', async () => {
    const root = await makeVideo();
    installMediaMock(requireFixtureValue(root.querySelector('video')), state({ paused: false }));
    await applyVideoStyles(root);
    root.style.width = '739px';
    activate(root);
    const volume = requireFixtureValue(root.querySelector<HTMLInputElement>('[data-video-volume]'));
    volume.focus();
    root.style.width = '320px';
    await waitForCondition(
      () => button(root, 'volume').getAttribute('aria-expanded') === 'true',
      '音量focusを狭幅へ保持',
    );
    expect(document.activeElement).toBe(volume);
    expect(volume.getBoundingClientRect().width).toBeGreaterThanOrEqual(40);
    for (let iteration = 0; iteration < 3; iteration += 1) {
      button(root, 'volume').focus();
      button(root, 'volume').click();
      await flush();
      expect(button(root, 'volume').getAttribute('aria-expanded')).toBe('false');
      button(root, 'volume').focus();
      await nextAnimationFrame();
      root.style.width = '600px';
      await waitForCondition(
        () => document.activeElement === volume,
        '展開triggerからinline音量へfocus移動',
      );
      expect(getComputedStyle(button(root, 'volume')).display).toBe('none');
      root.style.width = '320px';
      await waitForCondition(
        () => button(root, 'volume').getAttribute('aria-expanded') === 'true',
        '狭幅へfocusと展開状態を復帰',
      );
      expect(getComputedStyle(button(root, 'volume')).display).not.toBe('none');
      expect(document.activeElement).toBe(volume);
    }
  });

  it('range drag中の幅変更は対象を残し、release後にDOMを整列する', async () => {
    const root = await makeVideo();
    installMediaMock(requireFixtureValue(root.querySelector('video')), state({ paused: false }));
    await applyVideoStyles(root);
    root.style.width = '739px';
    const lifetime = activate(root);
    const bar = requireFixtureValue(root.querySelector<HTMLElement>('.floating-bar'));
    const seek = requireFixtureValue(root.querySelector<HTMLInputElement>('[data-video-seek]'));
    const left = requireFixtureValue(root.querySelector<HTMLElement>('.bar-group-left'));
    const timeline = requireFixtureValue(root.querySelector<HTMLElement>('.bar-row-top'));
    seek.focus();
    seek.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 71 }));
    root.style.width = '320px';
    await nextAnimationFrame();
    await nextAnimationFrame();
    expect(bar.firstElementChild).toBe(left);
    expect(document.activeElement).toBe(seek);
    document.dispatchEvent(new PointerEvent('pointerup', { pointerId: 71 }));
    await waitForCondition(() => bar.firstElementChild === timeline, 'range release後のDOM整列');
    expect(document.activeElement).toBe(seek);
    const volume = requireFixtureValue(root.querySelector<HTMLInputElement>('[data-video-volume]'));
    root.style.width = '739px';
    await waitForCondition(() => bar.firstElementChild === left, '広幅へ復帰');
    volume.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 72 }));
    root.style.width = '320px';
    await waitForCondition(
      () => button(root, 'volume').getAttribute('aria-expanded') === 'true',
      'drag中の音量を表示',
    );
    expect(volume.getBoundingClientRect().width).toBeGreaterThanOrEqual(40);
    document.dispatchEvent(new PointerEvent('pointercancel', { pointerId: 72 }));
    await waitForCondition(() => bar.firstElementChild === timeline, 'pointercancel後のDOM整列');
    lifetime.abort();
    root.style.width = '739px';
    await nextAnimationFrame();
    await nextAnimationFrame();
    expect(bar.firstElementChild).toBe(timeline);
  });

  it('字幕の形を保ち、繰返しtoggleで下線とARIAを同期する', async () => {
    const root = await makeVideo();
    installMediaMock(requireFixtureValue(root.querySelector('video')), state({ paused: false }));
    await applyVideoStyles(root);
    activate(root);
    const captions = button(root, 'captions');
    for (let iteration = 0; iteration < 4; iteration += 1) {
      captions.click();
      await flush();
      const selected = iteration % 2 === 0;
      expect(captions.getAttribute('aria-pressed')).toBe(String(selected));
      expect(captions.querySelector('svg:not([hidden])')?.getAttribute('data-icon')).toBe(
        'captions',
      );
      expect(getComputedStyle(captions, '::after').content).toBe(selected ? '""' : 'none');
    }
  });

  it('全画面controlのアイコンと操作面が他のbar controlと同じ寸法で描画される', async () => {
    const root = await makeVideo();
    const media = requireFixtureValue(root.querySelector('video'));
    installMediaMock(media, state({ paused: false }));
    // 実際の共通control CSSを使い、native mappingの欠落による空buttonを検出する。
    await applyVideoStyles(root);
    root.style.width = '600px';
    activate(root);
    const fullscreen = button(root, 'fullscreen');
    const play = requireFixtureValue(
      root.querySelector<HTMLButtonElement>('.floating-bar [data-video-action="play"]'),
    );
    const icon = requireFixtureValue(fullscreen.querySelector<SVGElement>('svg:not([hidden])'));
    const playIcon = requireFixtureValue(play.querySelector<SVGElement>('svg:not([hidden])'));
    const fullscreenSize = fullscreen.getBoundingClientRect();
    const playSize = play.getBoundingClientRect();
    const iconSize = icon.getBoundingClientRect();
    expect(iconSize.width).toBeGreaterThan(0);
    expect(iconSize.height).toBeGreaterThan(0);
    expect(iconSize.width).toBe(playIcon.getBoundingClientRect().width);
    expect(fullscreenSize.width).toBe(playSize.width);
    expect(fullscreenSize.height).toBe(playSize.height);
    expect(fullscreenSize.width).toBeGreaterThanOrEqual(40);
    expect(fullscreenSize.height).toBeGreaterThanOrEqual(40);
  });

  it('初回中央再生はTab対象で、初回下部controlsは対象外になる', async () => {
    const root = await makeVideo({ muted: false });
    installMediaMock(requireFixtureValue(root.querySelector('video')), state({ muted: false }));
    activate(root);
    expect(button(root, 'play').tabIndex).toBe(0);
    expect(root.querySelector<HTMLElement>('.floating-bar')?.hidden).toBe(true);
  });

  it('再生中のfocusはtimeout・leave・外部clickでも操作面を維持する', async () => {
    const root = await makeVideo();
    const media = requireFixtureValue(root.querySelector('video'));
    installMediaMock(media, state({ paused: false, currentTime: 40 }));
    activate(root);
    media.dispatchEvent(new Event('playing'));
    const play = requireFixtureValue(
      root.querySelector<HTMLButtonElement>('.floating-bar [data-video-action="play"]'),
    );
    const bar = requireFixtureValue(root.querySelector<HTMLElement>('.floating-bar'));
    play.focus();
    await new Promise((resolve) => setTimeout(resolve, 3200));
    expect(bar.classList.contains('is-bar-hidden')).toBe(false);
    requireFixtureValue(root.querySelector('[data-video-player]')).dispatchEvent(
      new PointerEvent('pointerleave'),
    );
    document.body.click();
    await flush();
    expect(bar.classList.contains('is-bar-hidden')).toBe(false);
    requireFixtureValue(root.querySelector<HTMLInputElement>('[data-video-seek]')).focus();
    await flush();
    expect(bar.classList.contains('is-bar-hidden')).toBe(false);
  });

  it('開始後にseek 0してpauseしても初回UIへ戻らない', async () => {
    const root = await makeVideo();
    const media = requireFixtureValue(root.querySelector('video'));
    const current = state();
    installMediaMock(media, current);
    activate(root);
    button(root, 'play').click();
    await flush();
    media.pause();
    await flush();
    expect(root.querySelector('.floating-bar')?.classList.contains('is-pre-play')).toBe(false);
    expect(root.querySelector<HTMLButtonElement>('.play-button')?.hidden).toBe(true);
  });

  it('アイドルcontrolsのfocus復帰とslider操作中のtimeout保護を分離する', async () => {
    const root = await makeVideo();
    const media = requireFixtureValue(root.querySelector('video'));
    installMediaMock(media, state({ paused: false }));
    activate(root);
    const bar = requireFixtureValue(root.querySelector<HTMLElement>('.floating-bar'));
    const seek = requireFixtureValue(root.querySelector<HTMLInputElement>('[data-video-seek]'));
    vi.useFakeTimers();
    try {
      media.dispatchEvent(new Event('playing'));
      await vi.advanceTimersByTimeAsync(3100);
      expect(bar.classList.contains('is-bar-hidden')).toBe(true);
      seek.focus();
      expect(bar.classList.contains('is-bar-hidden')).toBe(false);
      seek.blur();
      await flush();
      seek.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 17 }));
      await vi.advanceTimersByTimeAsync(3100);
      expect(bar.classList.contains('is-bar-hidden')).toBe(false);
      document.dispatchEvent(new PointerEvent('pointercancel', { pointerId: 17 }));
      await vi.advanceTimersByTimeAsync(3100);
      expect(bar.classList.contains('is-bar-hidden')).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it.each([320, 375, 600])('%ipx幅で長い時刻・字幕・音量と40px操作域が収まる', async (width) => {
    const root = await makeVideo();
    installMediaMock(
      requireFixtureValue(root.querySelector('video')),
      state({ paused: false, duration: 360000 }),
    );
    await applyVideoStyles(root);
    root.style.width = `${String(width)}px`;
    activate(root);
    button(root, 'volume').click();
    await flush();
    const shell = requireFixtureValue(root.querySelector<HTMLElement>('[data-video-player]'));
    const shellRect = shell.getBoundingClientRect();
    expect(getComputedStyle(requireFixtureValue(root.querySelector('video'))).objectFit).toBe(
      'contain',
    );
    for (const control of root.querySelectorAll<HTMLElement>(
      '.floating-bar button, .floating-bar input',
    )) {
      const rect = control.getBoundingClientRect();
      if (rect.width === 0) continue;
      expect(rect.width).toBeGreaterThanOrEqual(40);
      expect(rect.height).toBeGreaterThanOrEqual(40);
      expect(rect.left).toBeGreaterThanOrEqual(shellRect.left);
      expect(rect.right).toBeLessThanOrEqual(shellRect.right);
    }
    const bar = requireFixtureValue(root.querySelector<HTMLElement>('.floating-bar'));
    expect(bar.scrollWidth).toBeLessThanOrEqual(bar.clientWidth);
    const controls = [...bar.querySelectorAll<HTMLButtonElement>('button')].filter(
      (control) => control.getBoundingClientRect().width > 0,
    );
    for (let index = 1; index < controls.length; index += 1) {
      expect(
        requireFixtureValue(controls[index]).getBoundingClientRect().left,
      ).toBeGreaterThanOrEqual(
        requireFixtureValue(controls[index - 1]).getBoundingClientRect().right,
      );
    }
    const time = requireFixtureValue(root.querySelector<HTMLElement>('.time-label'));
    expect(time.textContent).toContain('100:00:00');
    expect(time.getBoundingClientRect().right).toBeLessThanOrEqual(shellRect.right);
  });

  it('pointercancelとabortで2倍速・待機中single tap・timer/listenerを解除する', async () => {
    const root = await makeVideo();
    const media = requireFixtureValue(root.querySelector('video'));
    const current = state({ paused: false });
    installMediaMock(media, current);
    const lifetime = activate(root);
    const shell = requireFixtureValue(root.querySelector<HTMLElement>('[data-video-player]'));
    vi.useFakeTimers();
    try {
      shell.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      await vi.advanceTimersByTimeAsync(550);
      expect(media.playbackRate).toBe(2);
      shell.dispatchEvent(new PointerEvent('pointercancel', { bubbles: true }));
      expect(media.playbackRate).toBe(1);
      shell.click();
      shell.click();
      lifetime.abort();
      await vi.advanceTimersByTimeAsync(4000);
      expect(current.paused).toBe(false);
      expect(media.controls).toBe(true);
      const previousState = root.dataset['state'];
      media.dispatchEvent(new Event('ended'));
      shell.click();
      await vi.advanceTimersByTimeAsync(4000);
      expect(root.dataset['state']).toBe(previousState);
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('light/darkの半透明操作面は明暗映像上で4.5以上の文字contrastを保つ', async () => {
    const root = await makeVideo();
    installMediaMock(requireFixtureValue(root.querySelector('video')), state({ paused: false }));
    await applyVideoStyles(root);
    activate(root);
    const oldTheme = document.documentElement.getAttribute('data-theme');
    try {
      for (const theme of ['light', 'dark']) {
        document.documentElement.dataset['theme'] = theme;
        for (const selector of ['.floating-bar', '.time-label', '.volume-popover']) {
          const surface = requireFixtureValue(root.querySelector<HTMLElement>(selector));
          const bg = resolveComputedColor(
            'var(--video-control-surface)',
            surface,
            'background-color',
          );
          const fg = resolveComputedColor('var(--fg-default)', surface, 'color');
          for (const shade of [0, 255]) {
            const painted = compositeOver(bg, { r: shade, g: shade, b: shade, a: 1 });
            expect(contrastRatio(fg, painted)).toBeGreaterThanOrEqual(4.5);
          }
        }
      }
    } finally {
      if (oldTheme === null) document.documentElement.removeAttribute('data-theme');
      else document.documentElement.setAttribute('data-theme', oldTheme);
    }
  });

  it('mobileのdouble tapは見える±10と同じ時間計算で左右をseekする', async () => {
    const mq = window.matchMedia('(max-width: 0px)');
    const matchMedia = vi.spyOn(window, 'matchMedia').mockReturnValue(mq);
    const clock = vi.spyOn(Date, 'now');
    try {
      const root = await makeVideo();
      root.style.width = '320px';
      const media = requireFixtureValue(root.querySelector('video'));
      const current = state({ paused: false, currentTime: 40 });
      installMediaMock(media, current);
      activate(root);
      const shell = requireFixtureValue(root.querySelector<HTMLElement>('[data-video-player]'));
      const rect = shell.getBoundingClientRect();
      clock
        .mockReturnValueOnce(10000)
        .mockReturnValueOnce(10100)
        .mockReturnValueOnce(20000)
        .mockReturnValueOnce(20100);
      for (const clientX of [rect.right - 1, rect.right - 1]) {
        shell.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX }));
      }
      expect(current.currentTime).toBe(50);
      for (const clientX of [rect.left + 1, rect.left + 1]) {
        shell.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX }));
      }
      await flush();
      expect(current.currentTime).toBe(40);
      expect(root.querySelector('[data-video-seek]')?.getAttribute('aria-valuenow')).toBe('40');
      expect(button(root, 'back').textContent).toBe('−10');
      expect(button(root, 'forward').textContent).toBe('+10');
    } finally {
      clock.mockRestore();
      matchMedia.mockRestore();
    }
  });

  it.each([
    [640, 360, '640 / 360'],
    [360, 640, '360 / 640'],
    [400, 400, '400 / 400'],
    [0, 640, '16 / 9'],
  ])('有効寸法 %i × %i とfallbackを投影する', async (width, height, ratio) => {
    const root = await makeVideo({ width, height });
    expect(root.querySelector<HTMLElement>('[data-video-player]')?.style.aspectRatio).toBe(ratio);
  });

  it('unsafe source/trackを出力せずEMPTYを公開する', async () => {
    const root = await nativeNoteFixture(
      element('ui-video', { src: 'data:text/html,bad' }, [
        element('track', { src: 'javascript:bad()' }),
      ]),
    );
    expect(root.querySelector('track')).toBeNull();
    expect(root.querySelector('video')?.hasAttribute('src')).toBe(false);
    activate(root);
    expect(root.dataset['state']).toBe('empty');
    expect(root.getAttribute('aria-disabled')).toBe('true');
    expect(root.querySelector<HTMLElement>('[data-video-empty]')?.hidden).toBe(false);
    expect(root.querySelector<HTMLElement>('[data-video-error]')?.hidden).toBe(true);
  });

  it('同一mediaの再生時刻・音量・字幕を初期化せず引き継ぎ、abortでnative controlsへ戻す', async () => {
    const root = await makeVideo();
    const media = requireFixtureValue(root.querySelector('video'));
    const current = state({
      currentTime: 42,
      paused: false,
      volume: 0.35,
      textTracks: [{ kind: 'captions', mode: 'showing' }],
    });
    installMediaMock(media, current);
    const lifetime = activate(root);
    expect(root.querySelector('video')).toBe(media);
    expect(current.currentTime).toBe(42);
    expect(current.paused).toBe(false);
    expect(current.volume).toBe(0.35);
    expect(current.muted).toBe(false);
    expect(current.textTracks[0]?.mode).toBe('showing');
    expect(current.loadCalls).toBe(0);
    expect(root.dataset['state']).toBe('playing');
    expect(button(root, 'captions').getAttribute('aria-pressed')).toBe('true');
    expect(media.controls).toBe(false);
    lifetime.abort();
    expect(media.controls).toBe(true);
    expect(media.hasAttribute('tabindex')).toBe(false);
    expect(root.querySelector<HTMLElement>('[data-video-enhanced-controls]')?.hidden).toBe(true);
    media.dispatchEvent(new Event('error'));
    await flush();
    expect(root.dataset['state']).toBe('playing');
  });

  it('enhance/abortでnative tabindex属性を復元する', async () => {
    const root = await makeVideo();
    const media = requireFixtureValue(root.querySelector('video'));
    installMediaMock(media, state());
    media.setAttribute('tabindex', '2');
    const lifetime = activate(root);
    expect(media.tabIndex).toBe(-1);
    lifetime.abort();
    expect(media.getAttribute('tabindex')).toBe('2');
    expect(media.controls).toBe(true);
  });

  it('native controlsのfocus中は切替を延期し、focusout後だけ切り替える', async () => {
    const root = await makeVideo();
    const media = requireFixtureValue(root.querySelector('video'));
    installMediaMock(media, state());
    media.focus();
    expect(document.activeElement).toBe(media);
    activate(root);
    expect(media.controls).toBe(true);
    expect(root.hasAttribute('data-video-enhanced')).toBe(false);
    media.blur();
    await flush();
    expect(media.controls).toBe(false);
    expect(media.getAttribute('tabindex')).toBe('-1');
    expect(root.hasAttribute('data-video-enhanced')).toBe(true);
  });

  it('接続失敗はnative controlsを維持し、登録済みlistenerを解除する', async () => {
    const root = await makeVideo();
    const media = requireFixtureValue(root.querySelector('video'));
    const tracks = new EventTarget();
    tracks.addEventListener = () => {
      throw new Error('attach failed');
    };
    Object.defineProperty(media, 'textTracks', { configurable: true, value: tracks });
    expect(() => activate(root)).toThrow('attach failed');
    expect(media.controls).toBe(true);
    media.dispatchEvent(new Event('error'));
    await flush();
    expect(root.hasAttribute('data-state')).toBe(false);
    expect(root.querySelector<HTMLElement>('[data-video-enhanced-controls]')?.hidden).toBe(true);
  });

  it('native buttonでplay/pause、endedからの再生を操作する', async () => {
    const root = await makeVideo();
    const media = requireFixtureValue(root.querySelector('video'));
    const current = state();
    installMediaMock(media, current);
    activate(root);
    media.dispatchEvent(new Event('loadedmetadata'));
    await flush();
    expect(root.dataset['state']).toBe('paused');
    button(root, 'play').click();
    await flush();
    expect(root.dataset['state']).toBe('playing');
    expect(button(root, 'play').getAttribute('aria-label')).toBe('一時停止');
    button(root, 'play').click();
    await flush();
    expect(current.paused).toBe(true);
    current.ended = true;
    current.currentTime = 120;
    media.dispatchEvent(new Event('ended'));
    await flush();
    expect(root.dataset['state']).toBe('ended');
    button(root, 'play').click();
    await flush();
    expect(current.currentTime).toBe(0);
    expect(root.dataset['state']).toBe('playing');
  });

  it('player内のkeyboardでseek/mute/captionsを操作する', async () => {
    const root = await makeVideo();
    const media = requireFixtureValue(root.querySelector('video'));
    const current = state({ currentTime: 40, paused: false });
    installMediaMock(media, current);
    activate(root);
    const shell = requireFixtureValue(root.querySelector<HTMLElement>('[data-video-player]'));
    dispatchKey(shell, 'l');
    await flush();
    expect(current.currentTime).toBe(50);
    expect(root.querySelector('[data-video-seek]')?.getAttribute('aria-valuenow')).toBe('50');
    dispatchKey(shell, 'j');
    dispatchKey(shell, 'm');
    dispatchKey(shell, 'c');
    await flush();
    expect(current.currentTime).toBe(40);
    expect(current.muted).toBe(true);
    expect(current.textTracks[0]?.mode).toBe('showing');
    expect(button(root, 'captions').getAttribute('aria-pressed')).toBe('true');
  });

  it('error live regionとretry buttonを更新し、retryでのみloadする', async () => {
    const root = await makeVideo();
    const media = requireFixtureValue(root.querySelector('video'));
    const current = state();
    installMediaMock(media, current);
    activate(root);
    expect(current.loadCalls).toBe(0);
    media.dispatchEvent(new Event('error'));
    await flush();
    await nextAnimationFrame();
    const live = requireFixtureValue(root.querySelector('[data-video-live-region]'));
    expect(root.dataset['state']).toBe('error');
    expect(live.getAttribute('role')).toBe('alert');
    expect(live.getAttribute('aria-live')).toBe('assertive');
    expect(live.textContent?.length).toBeGreaterThan(0);
    expect(document.activeElement).toBe(button(root, 'retry'));
    button(root, 'retry').click();
    await flush();
    expect(current.loadCalls).toBe(1);
    expect(root.dataset['state']).toBe('loading');
  });

  it('native seek/volume rangeとskip/mute buttonをmedia stateへ反映する', async () => {
    const root = await makeVideo();
    const media = requireFixtureValue(root.querySelector('video'));
    const current = state({ currentTime: 115, paused: false });
    installMediaMock(media, current);
    activate(root);
    button(root, 'forward').click();
    expect(current.currentTime).toBe(120);
    button(root, 'back').click();
    expect(current.currentTime).toBe(110);
    const seek = requireFixtureValue(root.querySelector<HTMLInputElement>('[data-video-seek]'));
    seek.value = '25';
    seek.dispatchEvent(new Event('input'));
    const volume = requireFixtureValue(root.querySelector<HTMLInputElement>('[data-video-volume]'));
    volume.value = '0.3';
    volume.dispatchEvent(new Event('input'));
    await flush();
    expect(current.currentTime).toBe(25);
    expect(current.volume).toBe(0.3);
    expect(volume.getAttribute('aria-valuetext')).toBe('30%');
    button(root, 'mute').click();
    await flush();
    expect(current.muted).toBe(true);
    expect(volume.value).toBe('0');
    button(root, 'mute').click();
    await flush();
    expect(current.muted).toBe(false);
    expect(current.volume).toBe(0.3);
  });

  it('fullscreen buttonとdesktop double tapが同じplayerを操作する', async () => {
    const root = await makeVideo();
    const media = requireFixtureValue(root.querySelector('video'));
    installMediaMock(media, state({ paused: false }));
    activate(root);
    const shell = requireFixtureValue(root.querySelector<HTMLElement>('[data-video-player]'));
    let fullscreen: Element | null = null;
    const fullscreenState = vi
      .spyOn(document, 'fullscreenElement', 'get')
      .mockImplementation(() => fullscreen);
    const request = vi.spyOn(shell, 'requestFullscreen').mockImplementation(() => {
      fullscreen = shell;
      document.dispatchEvent(new Event('fullscreenchange'));
      return Promise.resolve();
    });
    const exit = vi.spyOn(document, 'exitFullscreen').mockImplementation(() => {
      fullscreen = null;
      document.dispatchEvent(new Event('fullscreenchange'));
      return Promise.resolve();
    });
    const clock = vi.spyOn(Date, 'now');
    try {
      button(root, 'fullscreen').click();
      await flush();
      expect(request).toHaveBeenCalledOnce();
      expect(button(root, 'fullscreen').getAttribute('aria-label')).toBe('全画面を終了');
      button(root, 'fullscreen').click();
      await flush();
      expect(exit).toHaveBeenCalledOnce();
      clock.mockReturnValueOnce(10_000).mockReturnValueOnce(10_100);
      shell.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      shell.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await flush();
      expect(request).toHaveBeenCalledTimes(2);
      expect(shell.classList.contains('is-fullscreen')).toBe(true);
    } finally {
      clock.mockRestore();
      exit.mockRestore();
      request.mockRestore();
      fullscreenState.mockRestore();
    }
  });

  it('長押し2倍速はpointerupで解除し、直後のclickで再生状態を反転しない', async () => {
    const root = await makeVideo();
    const media = requireFixtureValue(root.querySelector('video'));
    const current = state({ paused: false });
    installMediaMock(media, current);
    activate(root);
    const shell = requireFixtureValue(root.querySelector<HTMLElement>('[data-video-player]'));
    shell.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    await waitForCondition(() => media.playbackRate === 2, '長押し2倍速', { timeout: 1500 });
    shell.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    shell.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flush();
    expect(media.playbackRate).toBe(1);
    expect(current.paused).toBe(false);
  });
});
