import { describe, expect, it, vi } from 'vitest';
import type { HastProperties } from '../../build/rehype/hast-utils.js';
import { activateVideo } from '../../src/client/post-hydrate/video-enhancer.js';
import { fixtureAbortController, requireFixtureValue } from './harness/browser-fixture.js';
import { element, nativeNoteFixture } from './harness/native-note-fixture.js';
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

  it('全画面controlのアイコンと操作面が他のbar controlと同じ寸法で描画される', async () => {
    const root = await makeVideo();
    const media = requireFixtureValue(root.querySelector('video'));
    installMediaMock(media, state());
    // 実際の共通control CSSを使い、native mappingの欠落による空buttonを検出する。
    const style = document.createElement('style');
    style.textContent = (
      await Promise.all([
        fetchCssText('/src/assets/css/note-controls.css'),
        fetchCssText('/src/assets/css/video.css'),
      ])
    ).join('\n');
    root.prepend(style);
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
    expect(fullscreenSize.width).toBeGreaterThanOrEqual(24);
    expect(fullscreenSize.height).toBeGreaterThanOrEqual(24);
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
    expect(root.querySelector<HTMLElement>('[data-video-enhanced-controls]')?.hidden).toBe(true);
    media.dispatchEvent(new Event('error'));
    await flush();
    expect(root.dataset['state']).toBe('playing');
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
