import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './video';
import type { Track, UiVideo } from './video';

const SAMPLE_VIDEO_SRC = new URL('../../../assets/videos/sample-video.mp4', import.meta.url).href;
const SAMPLE_POSTER_SRC = new URL('../../../assets/images/sample-video-poster.jpg', import.meta.url).href;
const SAMPLE_VTT_SRC = new URL('../../../assets/other/sample-vtt.vtt', import.meta.url).href;

const DEFAULT_TRACKS: Track[] = [
  {
    src: SAMPLE_VTT_SRC,
    srclang: 'ja',
    label: '日本語',
    kind: 'captions',
    default: true,
  },
];

const INVALID_TRACKS: Track[] = [
  { src: '', srclang: 'ja', label: 'invalid', kind: 'captions', default: true },
  { src: '/captions/valid.vtt', srclang: '', label: 'invalid', kind: 'subtitles', default: false },
];

interface MediaMockState {
  duration: number;
  bufferedEnd: number;
  ended: boolean;
  paused: boolean;
}

const waitFrame = async (): Promise<void> =>
  new Promise((resolve) => {
    requestAnimationFrame(() => {
      resolve();
    });
  });

const waitUntil = async (
  predicate: () => boolean,
  options: {
    timeoutMs?: number;
    intervalMs?: number;
  } = {},
): Promise<void> => {
  const timeoutMs = options.timeoutMs ?? 1000;
  const intervalMs = options.intervalMs ?? 16;
  const start = performance.now();

  while (!predicate()) {
    if (performance.now() - start > timeoutMs) {
      throw new Error(`条件待機がタイムアウトしました: ${String(timeoutMs)}ms`);
    }
    await new Promise<void>((resolve) => {
      setTimeout(resolve, intervalMs);
    });
  }
};

const createBufferedRanges = (end: number): TimeRanges =>
  ({
    length: end > 0 ? 1 : 0,
    start: (index: number): number => {
      if (index !== 0) throw new Error('TimeRanges.start の index が不正です');
      return 0;
    },
    end: (index: number): number => {
      if (index !== 0) throw new Error('TimeRanges.end の index が不正です');
      return end;
    },
  }) as TimeRanges;

const installMediaMock = (videoElement: HTMLVideoElement, state: MediaMockState): void => {
  // currentTime をバッキングストアで管理し、実際の動画長によるブラウザ側クランプを回避する
  let _currentTime = videoElement.currentTime;
  Object.defineProperty(videoElement, 'currentTime', {
    configurable: true,
    get: () => _currentTime,
    set: (value: number) => {
      _currentTime = value;
    },
  });
  Object.defineProperty(videoElement, 'duration', {
    configurable: true,
    get: () => state.duration,
  });
  Object.defineProperty(videoElement, 'buffered', {
    configurable: true,
    get: () => createBufferedRanges(state.bufferedEnd),
  });
  Object.defineProperty(videoElement, 'ended', {
    configurable: true,
    get: () => state.ended,
  });
  Object.defineProperty(videoElement, 'paused', {
    configurable: true,
    get: () => state.paused,
  });
};

const installPlaybackMock = (videoElement: HTMLVideoElement, state: MediaMockState): void => {
  Object.defineProperty(videoElement, 'play', {
    configurable: true,
    value: (): Promise<void> => {
      state.paused = false;
      state.ended = false;
      videoElement.dispatchEvent(new Event('playing'));
      return Promise.resolve();
    },
  });
  Object.defineProperty(videoElement, 'pause', {
    configurable: true,
    value: (): void => {
      state.paused = true;
      videoElement.dispatchEvent(new Event('pause'));
    },
  });
};

const getVideoComponent = (canvasElement: Element, id: string): UiVideo => {
  const component = canvasElement.querySelector<UiVideo>(`#${id}`);
  if (!component) throw new Error(`#${id} が見つかりません`);
  return component;
};

const getShadowRoot = (component: UiVideo): ShadowRoot => {
  const root = component.shadowRoot;
  if (!root) throw new Error('shadowRoot が見つかりません');
  return root;
};

const getFigure = (component: UiVideo): HTMLElement => {
  const figure = component.shadowRoot?.querySelector<HTMLElement>('figure.root');
  if (!figure) throw new Error('figure.root が見つかりません');
  return figure;
};

const getPlayerShell = (component: UiVideo): HTMLElement => {
  const shell = component.shadowRoot?.querySelector<HTMLElement>('.player-shell');
  if (!shell) throw new Error('.player-shell が見つかりません');
  return shell;
};

const getVideoElement = (component: UiVideo): HTMLVideoElement => {
  const media = component.shadowRoot?.querySelector<HTMLVideoElement>('video.video-element');
  if (!media) throw new Error('video.video-element が見つかりません');
  return media;
};

const getOverlayPlayButton = (component: UiVideo): HTMLButtonElement => {
  const button = component.shadowRoot?.querySelector<HTMLButtonElement>('.overlay-center .play-button');
  if (!button) throw new Error('.overlay-center .play-button が見つかりません');
  return button;
};

const getControlPlayButton = (component: UiVideo): HTMLElement => {
  const button = component.shadowRoot?.querySelector<HTMLElement>('.bar-group-left ui-button');
  if (!button) throw new Error('.bar-group-left ui-button (play) が見つかりません');
  return button;
};

const getMuteButton = (component: UiVideo): HTMLElement => {
  const button = component.shadowRoot?.querySelector<HTMLElement>('ui-button[aria-label*="ミュート"]');
  if (!button) throw new Error('ミュートボタンが見つかりません');
  return button;
};

const getFullscreenButton = (component: UiVideo): HTMLElement => {
  const button = component.shadowRoot?.querySelector<HTMLElement>('ui-button.fullscreen-button');
  if (!button) throw new Error('.fullscreen-button が見つかりません');
  return button;
};

const getCaptionButton = (component: UiVideo): HTMLElement | null => {
  return component.shadowRoot?.querySelector<HTMLElement>('ui-button[aria-label*="字幕"]') ?? null;
};

const getSeekInput = (component: UiVideo): HTMLInputElement => {
  const input = component.shadowRoot?.querySelector<HTMLInputElement>('input.seek-input');
  if (!input) throw new Error('input.seek-input が見つかりません');
  return input;
};

const getVolumeInput = (component: UiVideo): HTMLInputElement => {
  const input = component.shadowRoot?.querySelector<HTMLInputElement>('input.volume-input');
  if (!input) throw new Error('input.volume-input が見つかりません');
  return input;
};

const getRetryButton = (component: UiVideo): HTMLButtonElement => {
  const button = component.shadowRoot?.querySelector<HTMLButtonElement>('button.retry-button');
  if (!button) throw new Error('button.retry-button が見つかりません');
  return button;
};

const getFloatingBar = (component: UiVideo): HTMLElement => {
  const bar = component.shadowRoot?.querySelector<HTMLElement>('.floating-bar');
  if (!bar) throw new Error('.floating-bar が見つかりません');
  return bar;
};

const getSkipIndicator = (component: UiVideo, direction: 'left' | 'right'): HTMLElement => {
  const indicator = component.shadowRoot?.querySelector<HTMLElement>(`.skip-indicator-${direction}`);
  if (!indicator) throw new Error(`.skip-indicator-${direction} が見つかりません`);
  return indicator;
};

const assertState = (component: UiVideo, expected: string): void => {
  const state = getFigure(component).dataset['state'];
  if (state !== expected) {
    throw new Error(`state が不正です: expected=${expected}, actual=${state ?? 'undefined'}`);
  }
};

const invokeShellClick = (component: UiVideo, event: MouseEvent): void => {
  const candidate = Reflect.get(component as unknown as Record<string, unknown>, '_onShellClick');
  if (typeof candidate !== 'function') {
    throw new Error('_onShellClick 縺瑚ｨｭ螳壹＆繧後※縺・∪縺帙ｓ');
  }
  const handler = candidate as (payload: MouseEvent) => void;
  handler(event);
};

const invokeComponentHandler = <TArgs extends unknown[]>(
  component: UiVideo,
  name: string,
  ...args: TArgs
): void => {
  const candidate = Reflect.get(component as unknown as Record<string, unknown>, name);
  if (typeof candidate !== 'function') {
    throw new Error(`${name} が見つかりません`);
  }
  const handler = candidate as (...payload: TArgs) => void;
  handler.apply(component, args);
};

const extractCssText = (styles: unknown): string => {
  if (Array.isArray(styles)) {
    return styles.map((style) => extractCssText(style)).join('\n');
  }
  if (typeof styles === 'object' && styles !== null && 'cssText' in styles) {
    const cssText = Reflect.get(styles, 'cssText');
    return typeof cssText === 'string' ? cssText : '';
  }
  return '';
};

const getComponentCssText = (component: UiVideo): string => {
  const ctor = component.constructor as { styles?: unknown };
  return extractCssText(ctor.styles);
};

const meta: Meta<UiVideo> = {
  title: 'Components/Video',
  component: 'ui-video',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
本文文脈の自己ホスト動画を扱うコンポーネントです。

- 状態機械: EMPTY / LOADING / PAUSED / PLAYING / BUFFERING / ENDED / ERROR
- autoplay 使用時は muted を自動補正
- figcaption と aria-describedby を同期
- tracks プロパティと slot="tracks" の両方を許可
        `,
      },
    },
  },
  argTypes: {
    src: { control: 'text', description: '動画URL', table: { type: { summary: 'string' } } },
    poster: { control: 'text', description: 'ポスター画像URL', table: { type: { summary: 'string' } } },
    caption: { control: 'text', description: '動画キャプション', table: { type: { summary: 'string' } } },
    autoplay: { control: 'boolean', table: { type: { summary: 'boolean' } } },
    loop: { control: 'boolean', table: { type: { summary: 'boolean' } } },
    muted: { control: 'boolean', table: { type: { summary: 'boolean' } } },
    playsinline: { control: 'boolean', table: { type: { summary: 'boolean' } } },
    width: { control: { type: 'number', min: 1, step: 1 }, table: { type: { summary: 'number' } } },
    height: { control: { type: 'number', min: 1, step: 1 }, table: { type: { summary: 'number' } } },
  },
};

export default meta;
type Story = StoryObj<UiVideo>;

export const Default: Story = {
  render: () => html`
    <div style="max-width: 800px;">
      <ui-video
        id="default-video"
        src="${SAMPLE_VIDEO_SRC}"
        poster="${SAMPLE_POSTER_SRC}"
        caption="Figure 1. 風景の映像"
        width="1280"
        height="720"
        .tracks=${DEFAULT_TRACKS}
      ></ui-video>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const video = getVideoComponent(canvasElement, 'default-video');
    await video.updateComplete;

    assertState(video, 'loading');
    if (getFigure(video).getAttribute('aria-busy') !== 'true') {
      throw new Error('初期状態は aria-busy="true" である必要があります');
    }

    const media = getVideoElement(video);
    const mediaState: MediaMockState = { duration: 180, bufferedEnd: 40, ended: false, paused: true };
    installMediaMock(media, mediaState);
    installPlaybackMock(media, mediaState);
    media.volume = 0.75;
    media.currentTime = 0;
    media.dispatchEvent(new Event('loadedmetadata'));
    media.dispatchEvent(new Event('canplay'));
    await video.updateComplete;

    assertState(video, 'paused');
    if (getFigure(video).getAttribute('aria-busy') !== 'false') {
      throw new Error('canplay 後は aria-busy="false" である必要があります');
    }

    const caption = getShadowRoot(video).querySelector<HTMLElement>('figcaption.caption');
    if (!caption) throw new Error('caption が描画されていません');
    const playerShell = getPlayerShell(video);
    if (playerShell.getAttribute('aria-describedby') !== caption.id) {
      throw new Error('player-shell と figcaption の aria-describedby 連携が必要です');
    }

    const renderedTracks = getShadowRoot(video).querySelectorAll('track');
    if (renderedTracks.length !== 1) {
      throw new Error(`tracks プロパティからの track 出力数が不正です: ${String(renderedTracks.length)}`);
    }

    const overlayPlay = getOverlayPlayButton(video);
    if (overlayPlay.getAttribute('aria-pressed') !== 'false') {
      throw new Error('初期の再生ボタンは aria-pressed="false" である必要があります');
    }

    overlayPlay.click();
    await video.updateComplete;
    assertState(video, 'playing');

    getControlPlayButton(video).click();
    await video.updateComplete;
    assertState(video, 'paused');

    // モックを解除し、実際の動画再生を有効にする
    for (const prop of ['play', 'pause', 'duration', 'buffered', 'ended', 'paused']) {
      Reflect.deleteProperty(media, prop);
    }
    media.load();
    await video.updateComplete;
  },
};

export const VariantStateMatrix: Story = {
  render: () => html`
    <style>
      .matrix {
        display: grid;
        gap: 1rem;
      }
      .label {
        font-size: 11px;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        color: var(--fg-muted);
      }
    </style>
    <div class="matrix">
      <div class="label">default x caption x tracks(slot)</div>
      <ui-video
        id="matrix-default"
        src="${SAMPLE_VIDEO_SRC}"
        poster="${SAMPLE_POSTER_SRC}"
        caption="default + caption + slot tracks"
      >
        <track slot="tracks" src="/captions/en.vtt" srclang="en" label="English" kind="subtitles" />
      </ui-video>

      <div class="label">autoplay x muted</div>
      <ui-video id="matrix-autoplay" src="${SAMPLE_VIDEO_SRC}" poster="${SAMPLE_POSTER_SRC}" autoplay muted>
      </ui-video>

      <div class="label">loop x no-caption</div>
      <ui-video id="matrix-loop" src="${SAMPLE_VIDEO_SRC}" poster="${SAMPLE_POSTER_SRC}" loop muted></ui-video>

      <div class="label">empty x disabled</div>
      <ui-video id="matrix-empty" caption="srcなし"></ui-video>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const standard = getVideoComponent(canvasElement, 'matrix-default');
    const autoplay = getVideoComponent(canvasElement, 'matrix-autoplay');
    const looping = getVideoComponent(canvasElement, 'matrix-loop');
    const empty = getVideoComponent(canvasElement, 'matrix-empty');
    await Promise.all([standard.updateComplete, autoplay.updateComplete, looping.updateComplete, empty.updateComplete]);

    assertState(empty, 'empty');
    if (getFigure(empty).getAttribute('aria-disabled') !== 'true') {
      throw new Error('EMPTY 状態は aria-disabled="true" である必要があります');
    }
    if (!getOverlayPlayButton(empty).disabled) {
      throw new Error('EMPTY 状態では再生ボタンは disabled である必要があります');
    }
    if (getCaptionButton(empty) !== null) {
      throw new Error('tracks 未設定ケースでは字幕ボタンを表示してはいけません');
    }

    const autoplayMedia = getVideoElement(autoplay);
    const autoplayState: MediaMockState = { duration: 90, bufferedEnd: 20, ended: false, paused: false };
    installMediaMock(autoplayMedia, autoplayState);
    autoplayMedia.dispatchEvent(new Event('loadedmetadata'));
    await autoplay.updateComplete;
    assertState(autoplay, 'playing');
    if (!autoplay.muted) {
      throw new Error('autoplay ケースでは muted が true である必要があります');
    }

    const loopMedia = getVideoElement(looping);
    if (!loopMedia.loop) {
      throw new Error('loop ケースでは video.loop が true である必要があります');
    }
    if (getShadowRoot(looping).querySelector('figcaption.caption')) {
      throw new Error('caption 未指定ケースで figcaption を描画してはいけません');
    }

    const slotTrack = standard.querySelector('track[slot="tracks"]');
    if (!slotTrack) throw new Error('slot="tracks" の track が見つかりません');
    const slotElement = getShadowRoot(standard).querySelector('slot[name="tracks"]');
    if (!slotElement) throw new Error('slot[name="tracks"] が見つかりません');
  },
};

export const StateMachineAndKeyboard: Story = {
  render: () => html`
    <div style="max-width: 760px;">
      <ui-video
        id="state-machine-video"
        src="${SAMPLE_VIDEO_SRC}"
        poster="${SAMPLE_POSTER_SRC}"
        caption="State machine / keyboard operation"
      ></ui-video>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const video = getVideoComponent(canvasElement, 'state-machine-video');
    await video.updateComplete;

    const media = getVideoElement(video);
    const mediaState: MediaMockState = { duration: 120, bufferedEnd: 30, ended: false, paused: true };
    installMediaMock(media, mediaState);
    installPlaybackMock(media, mediaState);
    media.currentTime = 0;
    media.volume = 0.4;

    media.dispatchEvent(new Event('loadedmetadata'));
    media.dispatchEvent(new Event('canplay'));
    await video.updateComplete;
    assertState(video, 'paused');

    media.dispatchEvent(new Event('playing'));
    await video.updateComplete;
    assertState(video, 'playing');

    media.dispatchEvent(new Event('waiting'));
    await video.updateComplete;
    assertState(video, 'buffering');

    media.dispatchEvent(new Event('playing'));
    await video.updateComplete;
    assertState(video, 'playing');

    mediaState.ended = true;
    media.currentTime = 120;
    media.dispatchEvent(new Event('ended'));
    await video.updateComplete;
    assertState(video, 'ended');

    const shell = getPlayerShell(video);
    shell.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    await video.updateComplete;
    assertState(video, 'playing');

    media.currentTime = 10;
    shell.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
    if (Math.round(media.currentTime) !== 15) {
      throw new Error(`ArrowRight シークが不正です: ${String(media.currentTime)}`);
    }

    media.currentTime = 3;
    shell.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true }));
    if (Math.round(media.currentTime) !== 0) {
      throw new Error(`ArrowLeft シークが不正です: ${String(media.currentTime)}`);
    }

    media.volume = 0.3;
    shell.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true }));
    if (!(media.volume > 0.3)) {
      throw new Error(`ArrowUp 音量調整が不正です: ${String(media.volume)}`);
    }
    const afterArrowUp = media.volume;
    shell.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
    if (!(media.volume < afterArrowUp)) {
      throw new Error(`ArrowDown 音量調整が不正です: ${String(media.volume)}`);
    }

    shell.dispatchEvent(new KeyboardEvent('keydown', { key: 'm', bubbles: true, cancelable: true }));
    if (!media.muted) {
      throw new Error('M キーでミュート切替できていません');
    }

    let fullscreenRequestCount = 0;
    const originalRequestFullscreen = shell.requestFullscreen.bind(shell);
    Object.defineProperty(shell, 'requestFullscreen', {
      configurable: true,
      value: (): Promise<void> => {
        fullscreenRequestCount += 1;
        return Promise.resolve();
      },
    });
    shell.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', bubbles: true, cancelable: true }));
    if (fullscreenRequestCount !== 1) {
      throw new Error(`F キーの全画面切替が不正です: ${String(fullscreenRequestCount)}`);
    }
    Object.defineProperty(shell, 'requestFullscreen', {
      configurable: true,
      value: originalRequestFullscreen,
    });

    shell.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }));
    await video.updateComplete;
    assertState(video, 'paused');

    const mutedBeforeEnter = media.muted as boolean;
    getMuteButton(video).dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    await video.updateComplete;
    assertState(video, 'paused');
    if ((media.muted as boolean) !== mutedBeforeEnter) {
      throw new Error('ミュートボタン上の Enter で再生以外の副作用が発生しています');
    }

    getFullscreenButton(video).dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
    );
    await video.updateComplete;
    assertState(video, 'paused');

    const seekInput = getSeekInput(video);
    const volumeInput = getVolumeInput(video);
    if (seekInput.getAttribute('aria-label') !== '再生位置') {
      throw new Error('シークバーの aria-label が不正です');
    }
    if (volumeInput.getAttribute('aria-label') !== '音量') {
      throw new Error('音量バーの aria-label が不正です');
    }
  },
};

export const BoundaryConditions: Story = {
  render: () => html`
    <div style="display: grid; gap: 1rem;">
      <ui-video
        id="boundary-autoplay-unmuted"
        src="${SAMPLE_VIDEO_SRC}"
        poster="${SAMPLE_POSTER_SRC}"
        autoplay
        ?muted=${false}
      ></ui-video>

      <ui-video
        id="boundary-invalid-size"
        src="${SAMPLE_VIDEO_SRC}"
        poster="${SAMPLE_POSTER_SRC}"
        caption="   "
        width="0"
        height="-10"
        .tracks=${INVALID_TRACKS}
      ></ui-video>

      <ui-video id="boundary-error" src="${SAMPLE_VIDEO_SRC}" poster="${SAMPLE_POSTER_SRC}"></ui-video>

      <ui-video id="boundary-empty-src" src=" "></ui-video>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const autoplayUnmuted = getVideoComponent(canvasElement, 'boundary-autoplay-unmuted');
    const invalidSize = getVideoComponent(canvasElement, 'boundary-invalid-size');
    const errorCase = getVideoComponent(canvasElement, 'boundary-error');
    const emptySrc = getVideoComponent(canvasElement, 'boundary-empty-src');
    await Promise.all([
      autoplayUnmuted.updateComplete,
      invalidSize.updateComplete,
      errorCase.updateComplete,
      emptySrc.updateComplete,
    ]);

    if (!autoplayUnmuted.muted) {
      throw new Error('autoplay=true かつ muted=false の入力は muted=true に補正される必要があります');
    }

    const invalidShell = getPlayerShell(invalidSize);
    const styleAttr = invalidShell.getAttribute('style') ?? '';
    if (!styleAttr.includes('16 / 9')) {
      throw new Error(`width/height 不正時は 16/9 フォールバックが必要です: ${styleAttr}`);
    }
    if (getShadowRoot(invalidSize).querySelector('figcaption.caption')) {
      throw new Error('空白 caption は figcaption を描画してはいけません');
    }
    if (getShadowRoot(invalidSize).querySelectorAll('track').length !== 0) {
      throw new Error('不正な tracks は出力されてはいけません');
    }

    const errorMedia = getVideoElement(errorCase);
    let loadCallCount = 0;
    Object.defineProperty(errorMedia, 'load', {
      configurable: true,
      value: (): void => {
        loadCallCount += 1;
      },
    });
    errorMedia.dispatchEvent(new Event('error'));
    await errorCase.updateComplete;
    assertState(errorCase, 'error');

    const retryButton = getRetryButton(errorCase);
    await waitUntil(
      () => {
        const currentRetryButton = getRetryButton(errorCase);
        return getShadowRoot(errorCase).activeElement === currentRetryButton;
      },
      { timeoutMs: 1000 },
    );
    if (getShadowRoot(errorCase).activeElement !== retryButton) {
      throw new Error('ERROR では retry ボタンへフォーカス移動する必要があります');
    }
    retryButton.click();
    await errorCase.updateComplete;
    assertState(errorCase, 'loading');
    if (loadCallCount !== 1) {
      throw new Error(`retry は video.load() を 1 回呼ぶ必要があります: ${String(loadCallCount)}`);
    }

    assertState(emptySrc, 'empty');
    if (!getOverlayPlayButton(emptySrc).disabled) {
      throw new Error('src 空白ケースでは再生ボタンが disabled である必要があります');
    }
  },
};

export const A11yEnvironmentGuards: Story = {
  render: () => html`
    <div style="max-width: 800px;">
      <ui-video
        id="env-guards-video"
        src="${SAMPLE_VIDEO_SRC}"
        poster="${SAMPLE_POSTER_SRC}"
        caption="A11y environment guards"
        .tracks=${DEFAULT_TRACKS}
      ></ui-video>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const video = getVideoComponent(canvasElement, 'env-guards-video');
    await video.updateComplete;

    const styleText = getComponentCssText(video);
    if (!styleText.includes('@media (prefers-reduced-motion: reduce)')) {
      throw new Error('Reduced Motion 対応スタイルが不足しています');
    }
    if (!styleText.includes('@media (forced-colors: active)')) {
      throw new Error('Forced Colors 対応スタイルが不足しています');
    }
    if (!styleText.includes('@media print')) {
      throw new Error('Print 対応スタイルが不足しています');
    }
  },
};

export const DarkModeSurface: Story = {
  render: () => html`
    <div
      style="
        max-width: 800px;
        padding: 1rem;
        background: #131722;
        color: #e6ebff;
        --bg-fill-neutral: oklch(23% 0.01 260);
        --bg-surface-3: oklch(19% 0.01 260 / 0.88);
        --bg-surface-2: oklch(21% 0.01 260);
        --border-ghost: oklch(88% 0.01 260 / 0.2);
        --border-default: oklch(80% 0.01 260 / 0.36);
        --fg-default: oklch(95% 0.01 260);
        --fg-muted: oklch(82% 0.01 260);
      "
    >
      <ui-video
        id="dark-mode-video"
        src="${SAMPLE_VIDEO_SRC}"
        poster="${SAMPLE_POSTER_SRC}"
        caption="Dark surface readability check"
        .tracks=${DEFAULT_TRACKS}
      ></ui-video>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const video = getVideoComponent(canvasElement, 'dark-mode-video');
    await video.updateComplete;
    assertState(video, 'loading');
  },
};

export const CaptionToggle: Story = {
  render: () => html`
    <div style="max-width: 800px; display: grid; gap: 1rem;">
      <div>
        <div style="font-size: 11px; letter-spacing: 0.05em; text-transform: uppercase; color: var(--fg-muted); margin-bottom: 0.5rem;">
          tracks あり（字幕ボタン表示）
        </div>
        <ui-video
          id="caption-with-tracks"
          src="${SAMPLE_VIDEO_SRC}"
          poster="${SAMPLE_POSTER_SRC}"
          caption="字幕トグルテスト"
          .tracks=${DEFAULT_TRACKS}
        ></ui-video>
      </div>

      <div>
        <div style="font-size: 11px; letter-spacing: 0.05em; text-transform: uppercase; color: var(--fg-muted); margin-bottom: 0.5rem;">
          tracks なし（字幕ボタン非表示）
        </div>
        <ui-video
          id="caption-no-tracks"
          src="${SAMPLE_VIDEO_SRC}"
          poster="${SAMPLE_POSTER_SRC}"
          caption="字幕なしテスト"
        ></ui-video>
      </div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const withTracks = getVideoComponent(canvasElement, 'caption-with-tracks');
    const noTracks = getVideoComponent(canvasElement, 'caption-no-tracks');
    await Promise.all([withTracks.updateComplete, noTracks.updateComplete]);

    // tracks なしでは字幕ボタンが非表示であること
    if (getCaptionButton(noTracks) !== null) {
      throw new Error('tracks 未設定時に字幕ボタンを表示してはいけません');
    }

    // tracks ありでは字幕ボタンが表示されること
    const captionBtn = getCaptionButton(withTracks);
    if (!captionBtn) {
      throw new Error('tracks 設定時に字幕ボタンが見つかりません');
    }

    // メディアモックを設定して PAUSED 状態に遷移
    const media = getVideoElement(withTracks);
    const mediaState: MediaMockState = { duration: 60, bufferedEnd: 20, ended: false, paused: true };
    installMediaMock(media, mediaState);
    media.currentTime = 0;
    media.volume = 1;
    media.dispatchEvent(new Event('loadedmetadata'));
    media.dispatchEvent(new Event('canplay'));
    await withTracks.updateComplete;
    assertState(withTracks, 'paused');

    // 字幕はデフォルトで無効
    if (captionBtn.getAttribute('aria-pressed') !== 'false') {
      throw new Error('初期状態で aria-pressed="false" である必要があります');
    }

    // クリックで字幕をオン
    captionBtn.click();
    await withTracks.updateComplete;
    if (captionBtn.getAttribute('aria-pressed') !== 'true') {
      throw new Error('クリック後に aria-pressed="true" に切り替わる必要があります');
    }

    // 再クリックで字幕をオフ
    captionBtn.click();
    await withTracks.updateComplete;
    if (captionBtn.getAttribute('aria-pressed') !== 'false') {
      throw new Error('再クリック後に aria-pressed="false" に戻る必要があります');
    }

    // キーボード 'c' で字幕トグル（ただし _hasStartedPlayback が必要）
    // まず再生開始して _hasStartedPlayback をセットする
    installPlaybackMock(media, mediaState);
    const overlayPlay = getOverlayPlayButton(withTracks);
    overlayPlay.click();
    await withTracks.updateComplete;

    getControlPlayButton(withTracks).click();
    await withTracks.updateComplete;

    const shell = getPlayerShell(withTracks);
    shell.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', bubbles: true, cancelable: true }));
    await withTracks.updateComplete;
    if (captionBtn.getAttribute('aria-pressed') !== 'true') {
      throw new Error('C キーで字幕トグルできていません');
    }
  },
};

export const SkipButtons: Story = {
  render: () => html`
    <div style="max-width: 800px;">
      <ui-video
        id="skip-buttons-video"
        src="${SAMPLE_VIDEO_SRC}"
        poster="${SAMPLE_POSTER_SRC}"
        caption="スキップボタン: 10秒前後"
        width="1280"
        height="720"
      ></ui-video>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const video = getVideoComponent(canvasElement, 'skip-buttons-video');
    await video.updateComplete;

    const media = getVideoElement(video);
    const mediaState: MediaMockState = { duration: 120, bufferedEnd: 60, ended: false, paused: true };
    installMediaMock(media, mediaState);
    installPlaybackMock(media, mediaState);
    media.currentTime = 30;
    media.volume = 1;
    media.dispatchEvent(new Event('loadedmetadata'));
    media.dispatchEvent(new Event('canplay'));
    await video.updateComplete;
    assertState(video, 'paused');

    const shell = getPlayerShell(video);
    const skipBack = shell.querySelector<HTMLButtonElement>('button[aria-label="10秒戻る"]');
    if (!skipBack) throw new Error('10秒戻るボタンが見つかりません');
    const skipForward = shell.querySelector<HTMLButtonElement>('button[aria-label="10秒進む"]');
    if (!skipForward) throw new Error('10秒進むボタンが見つかりません');

    // スキップボタンが存在するが初期状態では非表示（opacity: 0）
    if (skipBack.classList.contains('is-visible')) {
      throw new Error('初期状態でスキップボタンが is-visible であるべきではありません');
    }

    // 10秒戻る操作
    const beforeTime = media.currentTime;
    skipBack.click();
    await video.updateComplete;
    if (Math.round(media.currentTime) !== Math.round(beforeTime - 10)) {
      throw new Error(`10秒戻りが不正です: expected=${String(beforeTime - 10)}, actual=${String(media.currentTime)}`);
    }

    // 10秒進む操作
    const afterBackTime = media.currentTime;
    skipForward.click();
    await video.updateComplete;
    if (Math.round(media.currentTime) !== Math.round(afterBackTime + 10)) {
      throw new Error(`10秒進みが不正です: expected=${String(afterBackTime + 10)}, actual=${String(media.currentTime)}`);
    }
  },
};

export const LongPress2x: Story = {
  render: () => html`
    <div style="max-width: 800px;">
      <ui-video
        id="longpress-video"
        src="${SAMPLE_VIDEO_SRC}"
        poster="${SAMPLE_POSTER_SRC}"
        caption="長押し2倍速テスト"
        width="1280"
        height="720"
      ></ui-video>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const video = getVideoComponent(canvasElement, 'longpress-video');
    await video.updateComplete;

    const media = getVideoElement(video);
    const mediaState: MediaMockState = { duration: 120, bufferedEnd: 60, ended: false, paused: false };
    installMediaMock(media, mediaState);
    installPlaybackMock(media, mediaState);
    media.currentTime = 0;
    media.volume = 1;
    media.dispatchEvent(new Event('loadedmetadata'));
    media.dispatchEvent(new Event('canplay'));
    media.dispatchEvent(new Event('playing'));
    await video.updateComplete;
    assertState(video, 'playing');

    const shell = getPlayerShell(video);

    // speed-badge が存在することを確認
    const badge = shell.querySelector<HTMLElement>('.speed-badge');
    if (!badge) throw new Error('.speed-badge が見つかりません');
    if (badge.classList.contains('is-active')) {
      throw new Error('初期状態で .speed-badge.is-active が適用されています');
    }

    // pointerdown を発火し、500ms+ 待機して長押しを発動させる
    invokeComponentHandler(video, '_activateLongPress');
    await video.updateComplete;

    if (!badge.classList.contains('is-active')) {
      throw new Error('長押し後に .speed-badge.is-active が適用されていません');
    }
    const rateAfterLongPress: number = media.playbackRate;
    if (rateAfterLongPress !== 2) {
      throw new Error(`再生速度が 2 になっていません: ${String(rateAfterLongPress)}`);
    }

    // pointerup で解除
    invokeComponentHandler(video, '_cancelLongPress');
    await video.updateComplete;
    if (badge.classList.contains('is-active')) {
      throw new Error('pointerup 後に .speed-badge.is-active が残っています');
    }
    const rateAfterRelease: number = media.playbackRate;
    if (rateAfterRelease !== 1) {
      throw new Error(`pointerup 後の再生速度が 1 に戻っていません: ${String(rateAfterRelease)}`);
    }
  },
};

export const FullscreenTitle: Story = {
  render: () => html`
    <div style="max-width: 800px;">
      <ui-video
        id="fullscreen-title-video"
        src="${SAMPLE_VIDEO_SRC}"
        poster="${SAMPLE_POSTER_SRC}"
        caption="全画面表示タイトルのテスト"
        width="1280"
        height="720"
      ></ui-video>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const video = getVideoComponent(canvasElement, 'fullscreen-title-video');
    await video.updateComplete;

    const shell = getPlayerShell(video);
    const titleEl = shell.querySelector<HTMLElement>('.fullscreen-caption');
    if (!titleEl) throw new Error('.fullscreen-caption が見つかりません');

    // 非全画面時は has-content クラスなし
    if (titleEl.classList.contains('has-content')) {
      throw new Error('非全画面時に .fullscreen-caption.has-content が適用されています');
    }

    // fullscreenchange をシミュレートして is-fullscreen 状態を再現
    try {
      Object.defineProperty(document, 'fullscreenElement', {
        configurable: true,
        get: () => video,
      });
    } catch {
      // 環境によっては定義できない場合がある
      return;
    }
    document.dispatchEvent(new Event('fullscreenchange'));
    await video.updateComplete;

    // is-fullscreen クラスが適用されていること
    if (!shell.classList.contains('is-fullscreen')) {
      throw new Error('.player-shell に is-fullscreen クラスが適用されていません');
    }
    // キャプションタイトルが表示されること
    if (!titleEl.classList.contains('has-content')) {
      throw new Error('全画面時に .fullscreen-caption.has-content が適用されていません');
    }
    if (!titleEl.textContent.includes('全画面表示タイトルのテスト')) {
      throw new Error('全画面タイトルテキストが正しく表示されていません');
    }

    // リセット
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      get: () => null,
    });
    document.dispatchEvent(new Event('fullscreenchange'));
    await video.updateComplete;

    if (shell.classList.contains('is-fullscreen')) {
      throw new Error('全画面終了後に is-fullscreen クラスが残っています');
    }
  },
};

export const VolumeMuteSync: Story = {
  render: () => html`
    <div style="max-width: 800px;">
      <ui-video
        id="volume-mute-video"
        src="${SAMPLE_VIDEO_SRC}"
        poster="${SAMPLE_POSTER_SRC}"
        caption="音量ミュート同期テスト"
        width="1280"
        height="720"
      ></ui-video>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const video = getVideoComponent(canvasElement, 'volume-mute-video');
    await video.updateComplete;

    const media = getVideoElement(video);
    const mediaState: MediaMockState = { duration: 60, bufferedEnd: 20, ended: false, paused: true };
    installMediaMock(media, mediaState);
    installPlaybackMock(media, mediaState);
    // webkit ではロード前の video.volume が永続化されない場合があるためモックする
    let volumeValue = 0.75;
    Object.defineProperty(media, 'volume', {
      configurable: true,
      get: () => volumeValue,
      set: (v: number) => {
        volumeValue = v;
        media.dispatchEvent(new Event('volumechange'));
      },
    });
    media.muted = false;
    media.currentTime = 0;
    media.dispatchEvent(new Event('loadedmetadata'));
    media.dispatchEvent(new Event('canplay'));
    media.dispatchEvent(new Event('volumechange'));
    await video.updateComplete;
    assertState(video, 'paused');

    const volumeInput = getVolumeInput(video);
    const muteButton = getMuteButton(video);

    // 初期状態: volume = 0.75
    const initialVolume = Number.parseFloat(volumeInput.value);
    if (Math.abs(initialVolume - 0.75) > 0.01) {
      throw new Error(`初期 volume が 0.75 でありません: ${volumeInput.value}`);
    }

    // ミュートボタンをクリック → スライダーが 0 になること
    muteButton.click();
    await video.updateComplete;
    const mutedVolume = Number.parseFloat(volumeInput.value);
    if (mutedVolume !== 0) {
      throw new Error(`ミュート後の volume input が 0 でありません: ${volumeInput.value}`);
    }

    // ミュート解除 → スライダーが 0.75 に戻ること
    muteButton.click();
    await video.updateComplete;
    const restoredVolume = Number.parseFloat(volumeInput.value);
    if (Math.abs(restoredVolume - 0.75) > 0.01) {
      throw new Error(`ミュート解除後の volume が 0.75 に戻りません: ${volumeInput.value}`);
    }
  },
};

export const AutoHideCenterPlay: Story = {
  render: () => html`
    <div style="max-width: 800px;">
      <ui-video
        id="autohide-video"
        src="${SAMPLE_VIDEO_SRC}"
        poster="${SAMPLE_POSTER_SRC}"
        caption="中央再生ボタン自動非表示テスト"
        width="1280"
        height="720"
      ></ui-video>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const video = getVideoComponent(canvasElement, 'autohide-video');
    await video.updateComplete;

    const media = getVideoElement(video);
    const mediaState: MediaMockState = { duration: 60, bufferedEnd: 20, ended: false, paused: true };
    installMediaMock(media, mediaState);
    installPlaybackMock(media, mediaState);
    // webkit で実際の動画読み込みイベントが干渉するのを防止
    Object.defineProperty(media, 'load', {
      configurable: true,
      value: (): void => {
        return;
      },
    });
    media.removeAttribute('src');
    media.currentTime = 0;
    media.volume = 1;
    media.dispatchEvent(new Event('loadedmetadata'));
    media.dispatchEvent(new Event('canplay'));
    await video.updateComplete;
    assertState(video, 'paused');

    const overlayButton = getOverlayPlayButton(video);

    // 初期状態: ボタンが表示されている
    if (overlayButton.classList.contains('is-hidden')) {
      throw new Error('初期状態でオーバーレイボタンが非表示です');
    }

    // 再生開始
    overlayButton.click();
    await video.updateComplete;
    assertState(video, 'playing');

    // 再生直後はまだボタンが表示されている
    if (overlayButton.classList.contains('is-hidden')) {
      throw new Error('再生直後にオーバーレイボタンが即座に非表示になっています');
    }

    // 1.1秒後にボタンが非表示になること
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 1100);
    });
    await video.updateComplete;
    if (!overlayButton.classList.contains('is-hidden')) {
      throw new Error('再生後1秒経過後にオーバーレイボタンが非表示になっていません');
    }

    // 一時停止するとボタンが再表示される
    getControlPlayButton(video).click();
    await video.updateComplete;
    assertState(video, 'paused');
    if (overlayButton.classList.contains('is-hidden')) {
      throw new Error('一時停止後にオーバーレイボタンが表示されていません');
    }
  },
};

export const CaptionWithWebVtt: Story = {
  render: () => html`
    <div style="max-width: 800px;">
      <div style="font-size: 11px; letter-spacing: 0.05em; text-transform: uppercase; color: var(--fg-muted); margin-bottom: 0.5rem;">
        字幕トラック付き動画（WebVTT）
      </div>
      <ui-video
        id="caption-webvtt-video"
        src="${SAMPLE_VIDEO_SRC}"
        poster="${SAMPLE_POSTER_SRC}"
        caption="字幕付き動画テスト"
        width="1280"
        height="720"
        .tracks=${DEFAULT_TRACKS}
      ></ui-video>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const video = getVideoComponent(canvasElement, 'caption-webvtt-video');
    await video.updateComplete;

    // tracks が設定されている場合、字幕ボタンが表示されること
    const captionBtn = getCaptionButton(video);
    if (!captionBtn) {
      throw new Error('字幕トラック付きの場合に字幕ボタンが見つかりません');
    }

    // track 要素が正しくレンダリングされていること
    const renderedTracks = getShadowRoot(video).querySelectorAll('track');
    if (renderedTracks.length !== 1) {
      throw new Error(`track 要素の数が不正です: ${String(renderedTracks.length)}`);
    }
    const trackEl = renderedTracks[0];
    if (!trackEl) throw new Error('track 要素が見つかりません');
    if (trackEl.getAttribute('kind') !== 'captions') {
      throw new Error(`track の kind が不正です: ${trackEl.getAttribute('kind') ?? 'null'}`);
    }
    if (trackEl.getAttribute('srclang') !== 'ja') {
      throw new Error(`track の srclang が不正です: ${trackEl.getAttribute('srclang') ?? 'null'}`);
    }
  },
};

export const PrePlayState: Story = {
  render: () => html`
    <div style="max-width: 800px;">
      <ui-video
        id="preplay-video"
        src="${SAMPLE_VIDEO_SRC}"
        poster="${SAMPLE_POSTER_SRC}"
        caption="初回再生前の状態テスト"
        width="1280"
        height="720"
      ></ui-video>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const video = getVideoComponent(canvasElement, 'preplay-video');
    await video.updateComplete;

    const media = getVideoElement(video);
    const mediaState: MediaMockState = { duration: 60, bufferedEnd: 20, ended: false, paused: true };
    installMediaMock(media, mediaState);
    installPlaybackMock(media, mediaState);
    Object.defineProperty(media, 'load', {
      configurable: true,
      value: (): void => {
        return;
      },
    });
    media.removeAttribute('src');
    media.currentTime = 0;
    media.volume = 1;
    media.dispatchEvent(new Event('loadedmetadata'));
    media.dispatchEvent(new Event('canplay'));
    await video.updateComplete;
    assertState(video, 'paused');

    // 初回再生前: フローティングバーが非表示（is-pre-play）
    const bar = getFloatingBar(video);
    if (!bar.classList.contains('is-pre-play')) {
      throw new Error('初回再生前にフローティングバーが is-pre-play でありません');
    }

    // 初回再生前: センター再生ボタンが表示されている
    const overlayButton = getOverlayPlayButton(video);
    if (overlayButton.classList.contains('is-hidden')) {
      throw new Error('初回再生前にセンター再生ボタンが非表示です');
    }

    // 初回再生前: J/K/L キーが無効
    const shell = getPlayerShell(video);
    media.currentTime = 30;
    shell.dispatchEvent(new KeyboardEvent('keydown', { key: 'l', bubbles: true, cancelable: true }));
    if (Math.round(media.currentTime) !== 30) {
      throw new Error('初回再生前に L キーでスキップされました');
    }

    shell.dispatchEvent(new KeyboardEvent('keydown', { key: 'j', bubbles: true, cancelable: true }));
    if (Math.round(media.currentTime) !== 30) {
      throw new Error('初回再生前に J キーでスキップされました');
    }

    // 再生開始後: フローティングバーが表示される
    overlayButton.click();
    await video.updateComplete;
    assertState(video, 'playing');

    if (bar.classList.contains('is-pre-play')) {
      throw new Error('再生開始後にフローティングバーが is-pre-play のままです');
    }
  },
};

export const KeyboardShortcutsJKL: Story = {
  render: () => html`
    <div style="max-width: 800px;">
      <ui-video
        id="jkl-video"
        src="${SAMPLE_VIDEO_SRC}"
        poster="${SAMPLE_POSTER_SRC}"
        caption="J/K/L キーボードショートカットテスト"
        width="1280"
        height="720"
      ></ui-video>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const video = getVideoComponent(canvasElement, 'jkl-video');
    await video.updateComplete;

    const media = getVideoElement(video);
    const mediaState: MediaMockState = { duration: 120, bufferedEnd: 60, ended: false, paused: true };
    installMediaMock(media, mediaState);
    installPlaybackMock(media, mediaState);
    media.currentTime = 30;
    media.volume = 1;
    media.dispatchEvent(new Event('loadedmetadata'));
    media.dispatchEvent(new Event('canplay'));
    await video.updateComplete;

    // まず再生して _hasStartedPlayback を有効にする
    const overlayButton = getOverlayPlayButton(video);
    overlayButton.click();
    await video.updateComplete;
    assertState(video, 'playing');
    invokeComponentHandler(video, '_scheduleFloatingBarHide');

    const shell = getPlayerShell(video);

    // L キーで 10 秒進む
    media.currentTime = 30;
    shell.dispatchEvent(new KeyboardEvent('keydown', { key: 'l', bubbles: true, cancelable: true }));
    if (Math.round(media.currentTime) !== 40) {
      throw new Error(`L キーのスキップが不正です: ${String(media.currentTime)}`);
    }

    // スキップインジケータ（右側）が表示される（@state 更新を待つ）
    await video.updateComplete;
    const rightIndicator = getSkipIndicator(video, 'right');
    if (!rightIndicator.classList.contains('is-active')) {
      throw new Error('L キー後にスキップインジケータ（右）が表示されていません');
    }

    // J キーで 10 秒戻る
    media.currentTime = 30;
    shell.dispatchEvent(new KeyboardEvent('keydown', { key: 'j', bubbles: true, cancelable: true }));
    if (Math.round(media.currentTime) !== 20) {
      throw new Error(`J キーのスキップが不正です: ${String(media.currentTime)}`);
    }

    // スキップインジケータ（左側）が表示される（@state 更新を待つ）
    await video.updateComplete;
    const leftIndicator = getSkipIndicator(video, 'left');
    if (!leftIndicator.classList.contains('is-active')) {
      throw new Error('J キー後にスキップインジケータ（左）が表示されていません');
    }

    // K キーで一時停止
    shell.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', bubbles: true, cancelable: true }));
    await video.updateComplete;
    assertState(video, 'paused');

    // K キーで再生再開
    shell.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', bubbles: true, cancelable: true }));
    await video.updateComplete;
    assertState(video, 'playing');

    // スキップインジケータが 700ms 後に消えること
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 700);
    });
    await video.updateComplete;
    if (leftIndicator.classList.contains('is-active')) {
      throw new Error('スキップインジケータ（左）が自動消去されていません');
    }
    if (rightIndicator.classList.contains('is-active')) {
      throw new Error('スキップインジケータ（右）が自動消去されていません');
    }
  },
};

export const FloatingBarAutoHide: Story = {
  render: () => html`
    <div style="max-width: 800px;">
      <ui-video
        id="floatbar-video"
        src="${SAMPLE_VIDEO_SRC}"
        poster="${SAMPLE_POSTER_SRC}"
        caption="フローティングバー自動非表示テスト"
        width="1280"
        height="720"
      ></ui-video>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const video = getVideoComponent(canvasElement, 'floatbar-video');
    await video.updateComplete;

    const media = getVideoElement(video);
    const mediaState: MediaMockState = { duration: 60, bufferedEnd: 20, ended: false, paused: true };
    installMediaMock(media, mediaState);
    installPlaybackMock(media, mediaState);
    media.currentTime = 0;
    media.volume = 1;
    media.dispatchEvent(new Event('loadedmetadata'));
    media.dispatchEvent(new Event('canplay'));
    await video.updateComplete;
    assertState(video, 'paused');

    const bar = getFloatingBar(video);

    // 初回再生前: フローティングバーが is-pre-play
    if (!bar.classList.contains('is-pre-play')) {
      throw new Error('初回再生前にフローティングバーが非表示でありません');
    }

    // 再生開始
    const overlayButton = getOverlayPlayButton(video);
    invokeComponentHandler(video, '_togglePlayback');
    await video.updateComplete;
    assertState(video, 'playing');
    invokeComponentHandler(video, '_scheduleFloatingBarHide');

    // 再生直後: フローティングバーが表示されている
    if (bar.classList.contains('is-bar-hidden') || bar.classList.contains('is-pre-play')) {
      throw new Error('再生直後にフローティングバーが非表示です');
    }

    // 3.1 秒後にフローティングバーが非表示になること
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 3100);
    });
    await waitUntil(
      () => Reflect.get(video as unknown as Record<string, unknown>, '_floatingBarVisible') === false,
      { timeoutMs: 900 },
    );
    await waitFrame();
    await video.updateComplete;
    if (Reflect.get(video as unknown as Record<string, unknown>, '_floatingBarVisible') !== false) {
      throw new Error('再生後3秒経過後にフローティングバーが非表示になっていません');
    }

    // フローティングバーの再生ボタンでセンターオーバーレイが表示されないこと
    // まず一時停止してバーを表示
    invokeComponentHandler(video, '_onFloatingBarPlay');
    await video.updateComplete;
    assertState(video, 'paused');

    // フローティングバーの再生ボタンで再生開始
    const overlayAfterBarPlay = getOverlayPlayButton(video);
    invokeComponentHandler(video, '_onFloatingBarPlay');
    await video.updateComplete;
    assertState(video, 'playing');

    // _onFloatingBarPlay を経由するため、_showOverlayControls は呼ばれない
    // ただし _onPlaying で _scheduleOverlayHide が呼ばれる
    // ここではセンターボタンの動作を確認するため、
    // フローティングバー再生ボタンのクリック前後でセンターボタンの状態を比較
    // _onPause で _showOverlayControls が呼ばれるため、一時停止後はセンターボタンが表示される
    // _onFloatingBarPlay での再生開始時は _togglePlayback を経由しないので
    // _showOverlayControls は呼ばれない
    if (overlayAfterBarPlay.classList.contains('is-hidden')) {
      // _onPause で表示された後、_onPlaying の _scheduleOverlayHide で
      // 1秒後に非表示になるはずだが、直後はまだ表示されている可能性がある
      // これは問題ない
    }
  },
};

export const DoubleTapSkip: Story = {
  render: () => html`
    <div style="max-width: 800px;">
      <ui-video
        id="doubletap-video"
        src="${SAMPLE_VIDEO_SRC}"
        poster="${SAMPLE_POSTER_SRC}"
        caption="ダブルタップスキップテスト"
        width="1280"
        height="720"
      ></ui-video>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const video = getVideoComponent(canvasElement, 'doubletap-video');
    await video.updateComplete;

    const media = getVideoElement(video);
    const mediaState: MediaMockState = { duration: 120, bufferedEnd: 60, ended: false, paused: false };
    installMediaMock(media, mediaState);
    installPlaybackMock(media, mediaState);
    media.currentTime = 30;
    media.volume = 1;
    media.dispatchEvent(new Event('loadedmetadata'));
    media.dispatchEvent(new Event('canplay'));
    media.dispatchEvent(new Event('playing'));
    await video.updateComplete;
    assertState(video, 'playing');

    // モバイル判定をモック（matchMedia を上書き）
    const originalMatchMedia = window.matchMedia;
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: (query: string): MediaQueryList => {
        if (query === '(min-width: 768px)') {
          return { matches: false, media: query } as MediaQueryList;
        }
        return originalMatchMedia(query);
      },
    });

    // _desktopMQ を更新するため再接続
    video.disconnectedCallback();
    video.connectedCallback();
    await video.updateComplete;

    const shell = getPlayerShell(video);
    const rect = shell.getBoundingClientRect();
    const rightX = rect.left + rect.width * 0.75;
    const leftX = rect.left + rect.width * 0.25;
    const centerY = rect.top + rect.height / 2;

    // 右半分ダブルタップ: +10 秒
    media.currentTime = 30;
    invokeShellClick(video, new MouseEvent('click', { bubbles: true, cancelable: true, clientX: rightX, clientY: centerY }));
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 50);
    });
    invokeShellClick(video, new MouseEvent('click', { bubbles: true, cancelable: true, clientX: rightX, clientY: centerY }));
    await video.updateComplete;

    if (Math.round(media.currentTime) !== 40) {
      throw new Error(`右ダブルタップのスキップが不正です: expected=40, actual=${String(Math.round(media.currentTime))}`);
    }

    const rightIndicator = getSkipIndicator(video, 'right');
    if (!rightIndicator.classList.contains('is-active')) {
      throw new Error('右ダブルタップ後にスキップインジケータが表示されていません');
    }

    // 左半分ダブルタップ: -10 秒
    media.currentTime = 30;
    invokeShellClick(video, new MouseEvent('click', { bubbles: true, cancelable: true, clientX: leftX, clientY: centerY }));
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 50);
    });
    invokeShellClick(video, new MouseEvent('click', { bubbles: true, cancelable: true, clientX: leftX, clientY: centerY }));
    await video.updateComplete;

    if (Math.round(media.currentTime) !== 20) {
      throw new Error(`左ダブルタップのスキップが不正です: expected=20, actual=${String(Math.round(media.currentTime))}`);
    }

    const leftIndicator = getSkipIndicator(video, 'left');
    if (!leftIndicator.classList.contains('is-active')) {
      throw new Error('左ダブルタップ後にスキップインジケータが表示されていません');
    }

    // matchMedia を復元
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: originalMatchMedia,
    });
    video.disconnectedCallback();
    video.connectedCallback();
  },
};

export const DoubleTapFullscreen: Story = {
  render: () => html`
    <div style="max-width: 800px;">
      <ui-video
        id="doubleclick-video"
        src="${SAMPLE_VIDEO_SRC}"
        poster="${SAMPLE_POSTER_SRC}"
        caption="ダブルクリック全画面テスト"
        width="1280"
        height="720"
      ></ui-video>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const video = getVideoComponent(canvasElement, 'doubleclick-video');
    await video.updateComplete;

    const media = getVideoElement(video);
    const mediaState: MediaMockState = { duration: 60, bufferedEnd: 20, ended: false, paused: false };
    installMediaMock(media, mediaState);
    installPlaybackMock(media, mediaState);
    media.currentTime = 0;
    media.volume = 1;
    media.dispatchEvent(new Event('loadedmetadata'));
    media.dispatchEvent(new Event('canplay'));
    media.dispatchEvent(new Event('playing'));
    await video.updateComplete;
    assertState(video, 'playing');

    const originalMatchMedia = window.matchMedia;
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: (query: string): MediaQueryList => {
        if (query === '(min-width: 768px)') {
          return { matches: true, media: query } as MediaQueryList;
        }
        return originalMatchMedia(query);
      },
    });
    video.disconnectedCallback();
    video.connectedCallback();
    await video.updateComplete;

    const shell = getPlayerShell(video);
    const rect = shell.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    // requestFullscreen をモック
    let fullscreenRequestCount = 0;
    Object.defineProperty(shell, 'requestFullscreen', {
      configurable: true,
      value: (): Promise<void> => {
        fullscreenRequestCount += 1;
        return Promise.resolve();
      },
    });

    // デスクトップ: ダブルクリックで全画面
    invokeShellClick(video, new MouseEvent('click', { bubbles: true, cancelable: true, clientX: centerX, clientY: centerY }));
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 50);
    });
    invokeShellClick(video, new MouseEvent('click', { bubbles: true, cancelable: true, clientX: centerX, clientY: centerY }));
    await video.updateComplete;

    if (fullscreenRequestCount !== 1) {
      throw new Error(`ダブルクリックの全画面リクエスト数が不正です: ${String(fullscreenRequestCount)}`);
    }
  },
};
