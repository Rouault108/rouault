import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './video';
import type { Track, UiVideo } from './video';

const SAMPLE_VIDEO_SRC = 'https://example.com/media/rouault-sample.mp4';
const SAMPLE_POSTER_SRC = `data:image/svg+xml;utf8,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1280 720'><defs><linearGradient id='bg' x1='0' x2='1' y1='0' y2='1'><stop offset='0%' stop-color='%23dbe8ff'/><stop offset='100%' stop-color='%23f4ecdc'/></linearGradient></defs><rect width='1280' height='720' fill='url(%23bg)'/><circle cx='320' cy='280' r='170' fill='%2385a9d8' fill-opacity='0.45'/><circle cx='980' cy='420' r='220' fill='%23d2b37f' fill-opacity='0.35'/><text x='74' y='118' font-size='64' fill='%23243345' font-family='sans-serif'>Rouault Video Poster</text></svg>",
)}`;

const DEFAULT_TRACKS: Track[] = [
  {
    src: '/captions/ja.vtt',
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

const getControlPlayButton = (component: UiVideo): HTMLButtonElement => {
  const button = component.shadowRoot?.querySelector<HTMLButtonElement>('.floating-bar .control-button');
  if (!button) throw new Error('.floating-bar .control-button が見つかりません');
  return button;
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

const assertState = (component: UiVideo, expected: string): void => {
  const state = getFigure(component).dataset['state'];
  if (state !== expected) {
    throw new Error(`state が不正です: expected=${expected}, actual=${state ?? 'undefined'}`);
  }
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
        caption="Figure 1. 読書フローに挿入される短い解説動画"
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

    shell.dispatchEvent(new KeyboardEvent('keydown', { key: 'm', bubbles: true, cancelable: true }));
    if (!media.muted) {
      throw new Error('M キーでミュート切替できていません');
    }

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
    await waitFrame();
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
