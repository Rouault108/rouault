import { expect, fixture, html } from '@open-wc/testing';
import '../../src/components/ui/video/video.js';
import type { Track, UiVideo } from '../../src/components/ui/video/video.js';
import { dispatchKey, nextAnimationFrame, waitForLitUpdate } from './helpers/wait-for-lit.js';

const TRACKS: Track[] = [
  {
    src: '/captions/ja.vtt',
    srclang: 'ja',
    label: '日本語',
    kind: 'captions',
    default: true,
  },
];

interface MockTextTrack {
  kind: string;
  mode: string;
}

interface MediaMockState {
  currentTime: number;
  duration: number;
  bufferedEnd: number;
  paused: boolean;
  ended: boolean;
  volume: number;
  muted: boolean;
  loadCalls: number;
  textTracks: MockTextTrack[];
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

const getFigure = (component: UiVideo): HTMLElement | null =>
  component.shadowRoot?.querySelector<HTMLElement>('figure.root') ?? null;

const getShell = (component: UiVideo): HTMLElement | null =>
  component.shadowRoot?.querySelector<HTMLElement>('.player-shell') ?? null;

const getVideoElement = (component: UiVideo): HTMLVideoElement | null =>
  component.shadowRoot?.querySelector<HTMLVideoElement>('video.video-element') ?? null;

const getOverlayPlayButton = (component: UiVideo): HTMLButtonElement | null =>
  component.shadowRoot?.querySelector<HTMLButtonElement>('.overlay-center .play-button') ?? null;

const getSeekInput = (component: UiVideo): HTMLInputElement | null =>
  component.shadowRoot?.querySelector<HTMLInputElement>('input.seek-input') ?? null;

const getCaptionButton = (component: UiVideo): HTMLElement | null =>
  component.shadowRoot?.querySelector<HTMLElement>('ui-button[aria-label*="字幕"]') ?? null;

const getRetryButton = (component: UiVideo): HTMLButtonElement | null =>
  component.shadowRoot?.querySelector<HTMLButtonElement>('button.retry-button') ?? null;

const getFigcaption = (component: UiVideo): HTMLElement | null =>
  component.shadowRoot?.querySelector<HTMLElement>('figcaption.caption') ?? null;

const getStatusLiveRegion = (component: UiVideo): HTMLElement | null =>
  component.shadowRoot?.querySelector<HTMLElement>('.sr-only') ?? null;

const expectPresent = <T>(value: T | null | undefined, name: string): T => {
  expect(value, `${name} should exist`).to.not.equal(null);
  expect(value, `${name} should exist`).to.not.equal(undefined);

  if (value === null || value === undefined) {
    throw new Error(`${name} が見つかりません`);
  }

  return value;
};

const installMediaMock = (video: HTMLVideoElement, state: MediaMockState): void => {
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
    get: () => state.textTracks,
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

describe('ui-video browser contract', () => {
  it('src が空のとき EMPTY state と empty panel を公開すること', async () => {
    const component = await fixture<UiVideo>(html` <ui-video caption="ソース未設定"></ui-video> `);

    await waitForLitUpdate(component);

    const figure = expectPresent(getFigure(component), 'figure');
    const shell = expectPresent(getShell(component), 'shell');
    const video = expectPresent(getVideoElement(component), 'video');
    const emptyPanel = component.shadowRoot?.querySelector('.empty-panel');
    const retryButton = getRetryButton(component);

    expect(figure.dataset['state']).to.equal('empty');
    expect(figure.getAttribute('aria-busy')).to.equal('false');
    expect(figure.getAttribute('aria-disabled')).to.equal('true');
    expect(shell.getAttribute('data-state')).to.equal('empty');
    expect(video.getAttribute('src')).to.equal(null);
    expect(emptyPanel).to.not.equal(null);
    expect(retryButton).to.equal(null);
  });

  it('caption と valid tracks を render し、figcaption と video に aria-describedby を設定すること', async () => {
    const invalidTrack = {
      src: '/captions/invalid.vtt',
      srclang: 'ja',
      label: '無効トラック',
      kind: 'invalid-kind',
      default: false,
    } as unknown as Track;

    const component = await fixture<UiVideo>(html`
      <ui-video
        src="/media/sample.mp4"
        poster="/media/poster.jpg"
        caption="字幕付き動画の要約"
        .tracks=${[...TRACKS, invalidTrack]}
      ></ui-video>
    `);

    await waitForLitUpdate(component);

    const video = expectPresent(getVideoElement(component), 'video');
    const figcaption = expectPresent(getFigcaption(component), 'figcaption');
    const tracks = video.querySelectorAll('track');

    expect(figcaption.textContent?.trim()).to.equal('字幕付き動画の要約');
    expect(figcaption.id).to.not.equal('');
    expect(video.getAttribute('aria-describedby')).to.equal(figcaption.id);
    expect(tracks.length).to.equal(1);

    const firstTrack = tracks[0];
    expect(firstTrack?.getAttribute('src')).to.equal('/captions/ja.vtt');
    expect(firstTrack?.getAttribute('kind')).to.equal('captions');
    expect(firstTrack?.getAttribute('label')).to.equal('日本語');
  });

  it('playVideo / pauseVideo の公開 API で状態と aria を更新すること', async () => {
    const component = await fixture<UiVideo>(html`
      <ui-video src="/media/sample.mp4" .tracks=${TRACKS}></ui-video>
    `);

    await waitForLitUpdate(component);

    const figure = expectPresent(getFigure(component), 'figure');
    const video = expectPresent(getVideoElement(component), 'video');
    const overlayPlayButton = expectPresent(getOverlayPlayButton(component), 'overlayPlayButton');

    const state: MediaMockState = {
      currentTime: 0,
      duration: 120,
      bufferedEnd: 60,
      paused: true,
      ended: false,
      volume: 0.6,
      muted: false,
      loadCalls: 0,
      textTracks: [{ kind: 'captions', mode: 'hidden' }],
    };

    installMediaMock(video, state);

    video.dispatchEvent(new Event('loadedmetadata'));
    await waitForLitUpdate(component);

    expect(figure.dataset['state']).to.equal('paused');
    expect(overlayPlayButton.getAttribute('aria-label')).to.equal('再生');

    await component.playVideo();
    await waitForLitUpdate(component);

    expect(figure.dataset['state']).to.equal('playing');
    expect(component.muted).to.equal(true);
    expect(state.muted).to.equal(true);
    expect(overlayPlayButton.getAttribute('aria-label')).to.equal('一時停止');

    component.pauseVideo();
    await waitForLitUpdate(component);

    expect(figure.dataset['state']).to.equal('paused');
    expect(overlayPlayButton.getAttribute('aria-label')).to.equal('再生');
  });

  it('keyboard shortcut で seek / mute / captions を操作できること', async () => {
    const component = await fixture<UiVideo>(html`
      <ui-video src="/media/sample.mp4" .tracks=${TRACKS}></ui-video>
    `);

    await waitForLitUpdate(component);

    const figure = expectPresent(getFigure(component), 'figure');
    const shell = expectPresent(getShell(component), 'shell');
    const video = expectPresent(getVideoElement(component), 'video');
    const seekInput = expectPresent(getSeekInput(component), 'seekInput');
    const captionButton = expectPresent(getCaptionButton(component), 'captionButton');

    const state: MediaMockState = {
      currentTime: 40,
      duration: 120,
      bufferedEnd: 80,
      paused: false,
      ended: false,
      volume: 0.4,
      muted: false,
      loadCalls: 0,
      textTracks: [{ kind: 'captions', mode: 'hidden' }],
    };

    installMediaMock(video, state);

    video.dispatchEvent(new Event('loadedmetadata'));
    video.dispatchEvent(new Event('playing'));
    await waitForLitUpdate(component);

    expect(figure.dataset['state']).to.equal('playing');
    expect(seekInput.getAttribute('aria-valuenow')).to.equal('40');

    dispatchKey(shell, 'l');
    await waitForLitUpdate(component);

    expect(state.currentTime).to.equal(50);
    expect(seekInput.getAttribute('aria-valuenow')).to.equal('50');

    dispatchKey(shell, 'j');
    await waitForLitUpdate(component);

    expect(state.currentTime).to.equal(40);
    expect(seekInput.getAttribute('aria-valuenow')).to.equal('40');

    dispatchKey(shell, 'm');
    await waitForLitUpdate(component);

    expect(component.muted).to.equal(true);

    dispatchKey(shell, 'c');
    await waitForLitUpdate(component);

    expect(captionButton.getAttribute('aria-pressed')).to.equal('true');
    expect(state.textTracks[0]?.mode).to.equal('showing');
  });

  it('ended から playVideo() で先頭へ戻して再生すること', async () => {
    const component = await fixture<UiVideo>(html` <ui-video src="/media/sample.mp4"></ui-video> `);

    await waitForLitUpdate(component);

    const video = expectPresent(getVideoElement(component), 'video');

    const state: MediaMockState = {
      currentTime: 118,
      duration: 120,
      bufferedEnd: 120,
      paused: true,
      ended: true,
      volume: 0.7,
      muted: false,
      loadCalls: 0,
      textTracks: [],
    };

    installMediaMock(video, state);

    video.dispatchEvent(new Event('loadedmetadata'));
    video.dispatchEvent(new Event('ended'));
    await waitForLitUpdate(component);

    expect(getFigure(component)?.dataset['state']).to.equal('ended');

    await component.playVideo();
    await waitForLitUpdate(component);

    expect(state.currentTime).to.equal(0);
    expect(getFigure(component)?.dataset['state']).to.equal('playing');
  });

  it('error から retry() で loading へ戻し、video.load() を再実行すること', async () => {
    const component = await fixture<UiVideo>(html` <ui-video src="/media/sample.mp4"></ui-video> `);

    await waitForLitUpdate(component);

    const figure = expectPresent(getFigure(component), 'figure');
    const video = expectPresent(getVideoElement(component), 'video');

    const state: MediaMockState = {
      currentTime: 0,
      duration: 120,
      bufferedEnd: 0,
      paused: true,
      ended: false,
      volume: 0.5,
      muted: false,
      loadCalls: 0,
      textTracks: [],
    };

    installMediaMock(video, state);

    video.dispatchEvent(new Event('error'));
    await waitForLitUpdate(component);
    await nextAnimationFrame();

    expect(figure.dataset['state']).to.equal('error');
    expect(getRetryButton(component)).to.not.equal(null);

    component.retry();
    await waitForLitUpdate(component);

    expect(state.loadCalls).to.equal(1);
    expect(figure.dataset['state']).to.equal('loading');
  });

  it('error state の live region を status paragraph に反映すること', async () => {
    const component = await fixture<UiVideo>(html` <ui-video src="/media/sample.mp4"></ui-video> `);

    await waitForLitUpdate(component);

    const video = expectPresent(getVideoElement(component), 'video');
    installMediaMock(video, {
      currentTime: 0,
      duration: 60,
      bufferedEnd: 0,
      paused: true,
      ended: false,
      volume: 0.5,
      muted: false,
      loadCalls: 0,
      textTracks: [],
    });

    video.dispatchEvent(new Event('error'));
    await waitForLitUpdate(component);

    const liveRegion = expectPresent(getStatusLiveRegion(component), 'status live region');
    expect(liveRegion.getAttribute('role')).to.equal('alert');
    expect(liveRegion.getAttribute('aria-live')).to.equal('assertive');
    expect((liveRegion.textContent ?? '').trim().length > 0).to.equal(true);
  });
});
