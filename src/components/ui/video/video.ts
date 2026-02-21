import { css, html, LitElement, nothing, type TemplateResult } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import '../../../lib/icons';

export type VideoState = 'EMPTY' | 'LOADING' | 'PAUSED' | 'PLAYING' | 'BUFFERING' | 'ENDED' | 'ERROR';
export type TrackKind = 'subtitles' | 'captions' | 'descriptions' | 'chapters' | 'metadata';

export interface Track {
  src: string;
  srclang: string;
  label: string;
  kind: TrackKind;
  default?: boolean;
}

const VALID_TRACK_KINDS = new Set<TrackKind>([
  'subtitles',
  'captions',
  'descriptions',
  'chapters',
  'metadata',
]);

let videoUid = 0;

@customElement('ui-video')
export class UiVideo extends LitElement {
  static override styles = css`
    :host {
      display: block;
    }

    .root {
      margin: 0;
    }

    :host-context(.prose) .root {
      width: calc(100% + var(--space-8, 2rem));
      margin-inline: var(--space-n4, -1rem);
    }

    @media (min-width: 768px) {
      :host-context(.prose) .root {
        width: calc(100% + var(--space-16, 4rem));
        margin-inline: var(--space-n8, -2rem);
      }
    }

    .player-shell {
      position: relative;
      display: block;
      overflow: hidden;
      isolation: isolate;
      border: var(--border-width, 1px) solid var(--border-ghost, oklch(20% 0.03 250 / 0.08));
      border-radius: var(--radius-md, 6px);
      background: var(--bg-fill-neutral, oklch(95% 0.01 250));
    }

    .video-element {
      position: absolute;
      inset: 0;
      z-index: 0;
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
      filter: brightness(var(--brightness-dimmed, 0.85));
      transition: filter var(--duration-normal, 150ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9));
    }

    .player-shell.is-playing .video-element,
    .player-shell:hover .video-element,
    .player-shell:focus-within .video-element {
      filter: brightness(1);
    }

    .overlay-center {
      position: absolute;
      inset: 0;
      z-index: 4;
      display: grid;
      place-items: center;
      pointer-events: none;
    }

    .play-button {
      pointer-events: auto;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: calc(var(--control-min-touch, 44px) + var(--space-1, 4px));
      height: calc(var(--control-min-touch, 44px) + var(--space-1, 4px));
      padding: 0;
      border: var(--border-width, 1px) solid var(--video-overlay-border, var(--border-default, oklch(86% 0.01 250)));
      border-radius: var(--radius-full, 999px);
      background: var(--video-overlay-bg, var(--bg-surface-3, oklch(100% 0 0 / 0.88)));
      box-shadow: var(--video-overlay-elevation, var(--elevation-md, 0 4px 12px oklch(0% 0 0 / 0.16)));
      color: var(--fg-default, oklch(20% 0.01 250));
      cursor: pointer;
      transition: transform var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9));
    }

    .play-button iconify-icon {
      font-size: var(--icon-xl, 32px);
      line-height: 1;
    }

    .play-button:hover:not(:disabled) {
      transform: scale(var(--scale-hover-lg, 1.04));
    }

    .play-button:active:not(:disabled) {
      transform: scale(var(--scale-pressed, 0.96));
    }

    .play-button:focus-visible {
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, oklch(60% 0.15 250));
      outline-offset: var(--focus-ring-offset, 2px);
      animation: var(--animation-focus);
    }

    .play-button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }

    .state-layer {
      position: absolute;
      inset: 0;
      z-index: 2;
      display: grid;
      place-items: center;
      pointer-events: none;
    }

    .empty-panel,
    .loading-panel,
    .error-panel {
      display: grid;
      place-items: center;
      gap: var(--space-2, 8px);
      width: 100%;
      height: 100%;
      padding: var(--space-4, 16px);
      box-sizing: border-box;
      text-align: center;
      color: var(--fg-muted, oklch(48% 0.01 250));
      background: color-mix(in oklab, var(--bg-fill-neutral, oklch(95% 0.01 250)) 75%, transparent);
      backdrop-filter: blur(var(--blur-sm, 8px));
      -webkit-backdrop-filter: blur(var(--blur-sm, 8px));
    }

    .empty-panel iconify-icon,
    .error-panel iconify-icon {
      font-size: var(--icon-xl, 32px);
      line-height: 1;
    }

    .error-panel {
      pointer-events: auto;
      gap: var(--space-3, 12px);
    }

    .state-text {
      font-size: var(--text-sm, 13px);
      line-height: var(--line-height-normal, 1.5);
    }

    .retry-button {
      min-height: var(--control-min-touch, 44px);
      padding: 0 var(--space-4, 16px);
      border: var(--border-width, 1px) solid var(--border-default, oklch(86% 0.01 250));
      border-radius: var(--radius-full, 999px);
      background: var(--bg-surface-2, oklch(100% 0 0));
      color: var(--fg-default, oklch(20% 0.01 250));
      font: inherit;
      cursor: pointer;
    }

    .retry-button:focus-visible {
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, oklch(60% 0.15 250));
      outline-offset: var(--focus-ring-offset, 2px);
      animation: var(--animation-focus);
    }

    .loading-spinner {
      width: var(--icon-xl, 32px);
      height: var(--icon-xl, 32px);
      border: 2px solid var(--border-default, oklch(86% 0.01 250));
      border-top-color: var(--primary, oklch(56% 0.16 252));
      border-radius: var(--radius-full, 999px);
      animation: ui-video-spin 0.9s linear infinite;
    }

    .floating-bar {
      position: absolute;
      left: var(--space-4, 16px);
      right: var(--space-4, 16px);
      bottom: var(--space-4, 16px);
      z-index: 4;
      display: grid;
      grid-template-columns: auto minmax(120px, 1fr) auto auto auto;
      align-items: center;
      gap: var(--space-2, 8px);
      padding: var(--space-2, 8px) var(--space-4, 16px);
      border: var(--border-width, 1px) solid var(--video-overlay-border, var(--border-default, oklch(86% 0.01 250)));
      border-radius: var(--radius-full, 999px);
      background: var(--video-overlay-bg, var(--bg-surface-3, oklch(100% 0 0 / 0.88)));
      box-shadow: var(--video-overlay-elevation, var(--elevation-md, 0 4px 12px oklch(0% 0 0 / 0.16)));
      opacity: 1;
      transition: opacity var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9));
    }

    .player-shell[data-state='playing'] .floating-bar {
      opacity: 0;
      pointer-events: none;
    }

    .player-shell[data-state='playing']:hover .floating-bar,
    .player-shell[data-state='playing']:focus-within .floating-bar,
    .player-shell[data-state='buffering'] .floating-bar,
    .player-shell[data-state='paused'] .floating-bar,
    .player-shell[data-state='ended'] .floating-bar,
    .player-shell[data-state='error'] .floating-bar,
    .player-shell[data-state='empty'] .floating-bar {
      opacity: 1;
      pointer-events: auto;
    }

    .control-button {
      min-width: var(--control-min-touch, 44px);
      min-height: var(--control-min-touch, 44px);
      padding: 0;
      border: none;
      border-radius: var(--radius-full, 999px);
      background: transparent;
      color: var(--fg-default, oklch(20% 0.01 250));
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font: inherit;
    }

    .control-button iconify-icon {
      font-size: var(--icon-base, 18px);
      line-height: 1;
    }

    .control-button:focus-visible {
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, oklch(60% 0.15 250));
      outline-offset: var(--focus-ring-offset, 2px);
      animation: var(--animation-focus);
    }

    .control-button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .seek-input,
    .volume-input {
      margin: 0;
      appearance: none;
      -webkit-appearance: none;
      height: var(--space-1, 4px);
      border-radius: var(--radius-full, 999px);
      background: var(--bg-fill-neutral, oklch(95% 0.01 250));
      cursor: pointer;
    }

    .seek-input {
      width: 100%;
      background: linear-gradient(
        to right,
        var(--primary, oklch(56% 0.16 252)) 0%,
        var(--primary, oklch(56% 0.16 252)) var(--seek-progress, 0%),
        var(--border-muted, oklch(82% 0.01 250)) var(--seek-progress, 0%),
        var(--border-muted, oklch(82% 0.01 250)) var(--seek-buffered, 0%),
        var(--bg-fill-neutral, oklch(95% 0.01 250)) var(--seek-buffered, 0%),
        var(--bg-fill-neutral, oklch(95% 0.01 250)) 100%
      );
    }

    .volume-input {
      width: clamp(72px, 14vw, 108px);
      background: linear-gradient(
        to right,
        var(--primary, oklch(56% 0.16 252)) 0%,
        var(--primary, oklch(56% 0.16 252)) var(--volume-progress, 100%),
        var(--bg-fill-neutral, oklch(95% 0.01 250)) var(--volume-progress, 100%),
        var(--bg-fill-neutral, oklch(95% 0.01 250)) 100%
      );
    }

    .seek-input:disabled,
    .volume-input:disabled {
      cursor: not-allowed;
      opacity: 0.7;
    }

    .seek-input:focus-visible,
    .volume-input:focus-visible {
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, oklch(60% 0.15 250));
      outline-offset: var(--focus-ring-offset, 2px);
      animation: var(--animation-focus);
    }

    .seek-input::-webkit-slider-thumb,
    .volume-input::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 12px;
      height: 12px;
      border-radius: var(--radius-full, 999px);
      border: none;
      background: var(--primary, oklch(56% 0.16 252));
      transition: transform var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9));
    }

    .seek-input:hover::-webkit-slider-thumb,
    .seek-input:active::-webkit-slider-thumb,
    .volume-input:hover::-webkit-slider-thumb,
    .volume-input:active::-webkit-slider-thumb {
      transform: scale(1.3333);
    }

    .seek-input::-moz-range-thumb,
    .volume-input::-moz-range-thumb {
      width: 12px;
      height: 12px;
      border-radius: var(--radius-full, 999px);
      border: none;
      background: var(--primary, oklch(56% 0.16 252));
      transition: transform var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9));
    }

    .seek-input:hover::-moz-range-thumb,
    .seek-input:active::-moz-range-thumb,
    .volume-input:hover::-moz-range-thumb,
    .volume-input:active::-moz-range-thumb {
      transform: scale(1.3333);
    }

    .time-label {
      color: var(--fg-muted, oklch(48% 0.01 250));
      font-size: var(--text-xs, 12px);
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }

    .caption {
      margin-block-start: var(--space-2, 8px);
      color: var(--fg-muted, oklch(48% 0.01 250));
      font-size: var(--text-sm, 13px);
      line-height: var(--line-height-relaxed, 1.75);
      text-align: left;
    }

    @media (max-width: 767px) {
      :host-context(.prose) .caption {
        padding-inline: var(--space-4, 1rem);
      }
    }

    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      margin: -1px;
      padding: 0;
      border: 0;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      clip-path: inset(50%);
      white-space: nowrap;
    }

    @media (prefers-reduced-motion: reduce) {
      .video-element,
      .floating-bar,
      .play-button,
      .seek-input::-webkit-slider-thumb,
      .volume-input::-webkit-slider-thumb,
      .seek-input::-moz-range-thumb,
      .volume-input::-moz-range-thumb {
        transition-duration: 0.01ms !important;
      }

      .loading-spinner {
        animation: none;
      }
    }

    @media (forced-colors: active) {
      .floating-bar,
      .play-button,
      .retry-button {
        background: Canvas;
        border: var(--border-width, 1px) solid CanvasText;
        color: CanvasText;
        box-shadow: none;
      }

      .seek-input {
        background: linear-gradient(
          to right,
          Highlight 0%,
          Highlight var(--seek-progress, 0%),
          CanvasText var(--seek-progress, 0%),
          CanvasText var(--seek-buffered, 0%),
          GrayText var(--seek-buffered, 0%),
          GrayText 100%
        );
      }

      .volume-input {
        background: linear-gradient(
          to right,
          Highlight 0%,
          Highlight var(--volume-progress, 100%),
          GrayText var(--volume-progress, 100%),
          GrayText 100%
        );
      }

      .seek-input::-webkit-slider-thumb,
      .volume-input::-webkit-slider-thumb,
      .seek-input::-moz-range-thumb,
      .volume-input::-moz-range-thumb {
        background: CanvasText;
        forced-color-adjust: none;
      }

      .floating-bar :focus-visible,
      .play-button:focus-visible,
      .retry-button:focus-visible {
        outline: 3px solid CanvasText;
        outline-offset: 2px;
        box-shadow: none;
      }
    }

    @media print {
      .player-shell {
        display: none !important;
      }
    }

    @keyframes ui-video-spin {
      to {
        transform: rotate(360deg);
      }
    }
  `;

  @property({ type: String })
  src = '';

  @property({ type: String })
  poster = '';

  @property({ type: Boolean, reflect: true })
  autoplay = false;

  @property({ type: Boolean, reflect: true })
  loop = false;

  @property({ type: Boolean, reflect: true })
  muted = true;

  @property({ type: Boolean, reflect: true, attribute: 'playsinline' })
  playsinline = true;

  @property({ type: Number })
  width?: number;

  @property({ type: Number })
  height?: number;

  @property({ type: String })
  caption = '';

  @property({ attribute: false })
  tracks: Track[] = [];

  @state()
  private _status: VideoState = 'EMPTY';

  @state()
  private _currentTime = 0;

  @state()
  private _duration = 0;

  @state()
  private _bufferedEnd = 0;

  @state()
  private _volume = 1;

  @state()
  private _isFullscreen = false;

  @state()
  private _errorMessage = '';

  @query('video.video-element')
  private _videoElement?: HTMLVideoElement;

  @query('.retry-button')
  private _retryButton?: HTMLButtonElement;

  private readonly _uid = ++videoUid;
  private readonly _captionId = `video-caption-${String(this._uid)}`;
  private readonly _statusId = `video-status-${String(this._uid)}`;

  private _previousStatus: VideoState = 'EMPTY';

  override connectedCallback(): void {
    super.connectedCallback();
    if (typeof document !== 'undefined') {
      document.addEventListener('fullscreenchange', this._onFullscreenChange);
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    if (typeof document !== 'undefined') {
      document.removeEventListener('fullscreenchange', this._onFullscreenChange);
    }
  }

  override willUpdate(changedProperties: Map<PropertyKey, unknown>): void {
    super.willUpdate(changedProperties);

    if (changedProperties.has('src')) {
      this._currentTime = 0;
      this._duration = 0;
      this._bufferedEnd = 0;
      this._errorMessage = '';
      this._status = this._hasMediaSource ? 'LOADING' : 'EMPTY';
    }

    if (changedProperties.has('autoplay') || changedProperties.has('muted')) {
      if (this.autoplay && !this.muted) {
        this.muted = true;
      }
    }

    if (!Array.isArray(this.tracks)) {
      this.tracks = [];
    }
  }

  override updated(): void {
    if (this._previousStatus !== this._status && this._status === 'ERROR') {
      requestAnimationFrame(() => {
        this._retryButton?.focus();
      });
    }

    this._previousStatus = this._status;
  }

  async playVideo(): Promise<void> {
    if (this._isDisabled) return;
    if (this._status === 'ERROR') return;

    const video = this._videoElement;
    if (!video) return;

    if (this._status === 'ENDED') {
      video.currentTime = 0;
      this._currentTime = 0;
    }

    try {
      await video.play();
    } catch (error: unknown) {
      this._errorMessage = this._resolvePlayErrorMessage(error);
      this._status = 'ERROR';
    }
  }

  pauseVideo(): void {
    const video = this._videoElement;
    if (!video) return;
    video.pause();
  }

  retry(): void {
    if (!this._hasMediaSource) return;
    const video = this._videoElement;
    if (!video) return;

    this._errorMessage = '';
    this._status = 'LOADING';
    video.load();
  }

  private _onRetryClick = (): void => {
    this.retry();
  };

  private get _resolvedSrc(): string {
    return this.src.trim();
  }

  private get _resolvedPoster(): string {
    return this.poster.trim();
  }

  private get _resolvedCaption(): string {
    return this.caption.trim();
  }

  private get _hasMediaSource(): boolean {
    return this._resolvedSrc !== '';
  }

  private get _resolvedWidth(): number | null {
    return this._normalizeDimension(this.width);
  }

  private get _resolvedHeight(): number | null {
    return this._normalizeDimension(this.height);
  }

  private get _aspectRatioStyle(): string {
    if (this._resolvedWidth !== null && this._resolvedHeight !== null) {
      return `aspect-ratio: ${String(this._resolvedWidth)} / ${String(this._resolvedHeight)};`;
    }

    return 'aspect-ratio: 16 / 9;';
  }

  private get _captionRef(): string | undefined {
    return this._resolvedCaption === '' ? undefined : this._captionId;
  }

  private get _isBusy(): boolean {
    return this._status === 'LOADING' || this._status === 'BUFFERING';
  }

  private get _isDisabled(): boolean {
    return this._status === 'EMPTY';
  }

  private get _isPlayingLike(): boolean {
    return this._status === 'PLAYING' || this._status === 'BUFFERING';
  }

  private get _canRetry(): boolean {
    return this._hasMediaSource;
  }

  private get _statusRole(): 'status' | 'alert' {
    if (this._status === 'ERROR' && !this._canRetry) return 'alert';
    return 'status';
  }

  private get _statusLive(): 'polite' | 'assertive' {
    return this._statusRole === 'alert' ? 'assertive' : 'polite';
  }

  private get _statusMessage(): string {
    if (this._status === 'EMPTY') return '動画ソースが未設定です。';
    if (this._status === 'LOADING') return '動画を読み込み中です。';
    if (this._status === 'BUFFERING') return '再生を継続するためにバッファリング中です。';
    if (this._status === 'PAUSED') return '動画は一時停止中です。';
    if (this._status === 'PLAYING') return '動画を再生中です。';
    if (this._status === 'ENDED') return '動画の再生が終了しました。';
    return this._errorMessage === '' ? '動画を再生できませんでした。' : this._errorMessage;
  }

  private get _playButtonLabel(): string {
    if (this._status === 'ENDED') return '動画を最初から再生';
    if (this._isPlayingLike) return '一時停止';
    return '再生';
  }

  private get _playButtonIcon(): string {
    if (this._isPlayingLike) return 'lucide:pause';
    if (this._status === 'ENDED') return 'lucide:rotate-ccw';
    return 'lucide:play';
  }

  private get _seekMax(): number {
    return this._duration > 0 ? this._duration : 0;
  }

  private get _seekNow(): number {
    const max = this._seekMax;
    return max > 0 ? Math.min(Math.max(this._currentTime, 0), max) : 0;
  }

  private get _seekProgress(): number {
    const max = this._seekMax;
    if (max <= 0) return 0;
    return (this._seekNow / max) * 100;
  }

  private get _seekBufferedProgress(): number {
    const max = this._seekMax;
    if (max <= 0) return 0;
    return (Math.min(Math.max(this._bufferedEnd, 0), max) / max) * 100;
  }

  private get _seekValueText(): string {
    if (this._seekMax <= 0) return `${this._formatClock(this._seekNow)} / 不明`;
    return `${this._formatClock(this._seekNow)} / ${this._formatClock(this._seekMax)}`;
  }

  private get _volumeProgress(): number {
    return Math.min(Math.max(this._volume, 0), 1) * 100;
  }

  private get _muteButtonLabel(): string {
    return this.muted || this._volume === 0 ? 'ミュート解除' : 'ミュート';
  }

  private get _muteButtonIcon(): string {
    if (this.muted || this._volume === 0) return 'lucide:volume-x';
    if (this._volume < 0.5) return 'lucide:volume-1';
    return 'lucide:volume-2';
  }

  private get _fullscreenButtonLabel(): string {
    return this._isFullscreen ? '全画面を終了' : '全画面表示';
  }

  private get _fullscreenButtonIcon(): string {
    return this._isFullscreen ? 'lucide:minimize' : 'lucide:maximize';
  }

  private get _controlDisabled(): boolean {
    return this._isDisabled || this._status === 'ERROR';
  }

  private get _resolvedTracks(): Track[] {
    const normalizedTracks: Track[] = [];

    for (const track of this.tracks) {
      const normalized = this._normalizeTrack(track);
      if (normalized) normalizedTracks.push(normalized);
    }

    return normalizedTracks;
  }

  private _normalizeTrack(track: Track): Track | null {
    const src = track.src.trim();
    const srclang = track.srclang.trim();
    const label = track.label.trim();

    if (src === '' || srclang === '' || label === '') return null;
    if (!VALID_TRACK_KINDS.has(track.kind)) return null;

    return {
      src,
      srclang,
      label,
      kind: track.kind,
      default: Boolean(track.default),
    };
  }

  private _normalizeDimension(value: number | undefined): number | null {
    if (typeof value !== 'number' || !Number.isFinite(value)) return null;
    const normalized = Math.trunc(value);
    return normalized > 0 ? normalized : null;
  }

  private _clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }

  private _formatClock(value: number): string {
    const safe = Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
    const hours = Math.floor(safe / 3600);
    const minutes = Math.floor((safe % 3600) / 60);
    const seconds = safe % 60;

    if (hours > 0) {
      return `${String(hours)}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  private _getBufferedEnd(video: HTMLVideoElement): number {
    if (video.buffered.length === 0) return 0;

    const lastRangeIndex = video.buffered.length - 1;
    return video.buffered.end(lastRangeIndex);
  }

  private _resolveMediaErrorMessage(error: MediaError | null): string {
    if (!error) return '動画の読み込み中にエラーが発生しました。';

    if (error.code === MediaError.MEDIA_ERR_ABORTED) return '動画の読み込みが中断されました。';
    if (error.code === MediaError.MEDIA_ERR_NETWORK) return 'ネットワークの問題で動画を読み込めませんでした。';
    if (error.code === MediaError.MEDIA_ERR_DECODE) return '動画をデコードできませんでした。';
    if (error.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) {
      return 'この動画形式はサポートされていません。';
    }

    return '動画の再生に失敗しました。';
  }

  private _resolvePlayErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message.trim() !== '') {
      return `再生を開始できませんでした: ${error.message}`;
    }

    return '再生を開始できませんでした。';
  }

  private _togglePlayback = (): void => {
    if (this._isPlayingLike) {
      this.pauseVideo();
      return;
    }

    void this.playVideo();
  };

  private _seekBy(seconds: number): void {
    const video = this._videoElement;
    if (!video) return;
    if (this._seekMax <= 0) return;

    const next = this._clamp(video.currentTime + seconds, 0, this._seekMax);
    video.currentTime = next;
    this._currentTime = next;

    if (this._status === 'ENDED' && next < this._seekMax) {
      this._status = 'PAUSED';
    }
  }

  private _adjustVolume(step: number): void {
    const video = this._videoElement;
    if (!video) return;

    const next = this._clamp(video.volume + step, 0, 1);
    video.volume = next;

    if (next > 0 && video.muted) video.muted = false;
    if (next === 0) video.muted = true;

    this._volume = next;
    this.muted = video.muted;
  }

  private _toggleMuted = (): void => {
    const video = this._videoElement;
    if (!video) return;

    video.muted = !video.muted;
    this.muted = video.muted;

    if (!video.muted && video.volume === 0) {
      video.volume = 0.5;
      this._volume = 0.5;
    }
  };

  private _toggleFullscreen = async (): Promise<void> => {
    if (typeof document === 'undefined') return;
    const shell = this.shadowRoot?.querySelector<HTMLElement>('.player-shell');
    if (!shell) return;

    try {
      if (document.fullscreenElement === shell) {
        await document.exitFullscreen();
        return;
      }

      if (document.fullscreenElement === null) {
        await shell.requestFullscreen();
      }
    } catch {
      // 操作環境により全画面APIが拒否されるため握りつぶす。
    }
  };

  private _onFullscreenChange = (): void => {
    if (typeof document === 'undefined') return;
    const shell = this.shadowRoot?.querySelector<HTMLElement>('.player-shell');
    this._isFullscreen = shell !== undefined && document.fullscreenElement === shell;
  };

  private _onContainerKeyDown = (event: KeyboardEvent): void => {
    if (event.defaultPrevented) return;
    if (event.metaKey || event.ctrlKey || event.altKey) return;

    const target = event.target;
    if (target instanceof HTMLInputElement && target.type === 'range') {
      if (event.key === 'm' || event.key === 'M') {
        event.preventDefault();
        this._toggleMuted();
      }
      if (event.key === 'f' || event.key === 'F') {
        event.preventDefault();
        void this._toggleFullscreen();
      }
      return;
    }

    switch (event.key) {
      case ' ':
      case 'Enter':
        event.preventDefault();
        this._togglePlayback();
        break;
      case 'ArrowRight':
        event.preventDefault();
        this._seekBy(5);
        break;
      case 'ArrowLeft':
        event.preventDefault();
        this._seekBy(-5);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this._adjustVolume(0.1);
        break;
      case 'ArrowDown':
        event.preventDefault();
        this._adjustVolume(-0.1);
        break;
      case 'm':
      case 'M':
        event.preventDefault();
        this._toggleMuted();
        break;
      case 'f':
      case 'F':
        event.preventDefault();
        void this._toggleFullscreen();
        break;
      default:
        break;
    }
  };

  private _onSeekInput = (event: Event): void => {
    const input = event.currentTarget;
    if (!(input instanceof HTMLInputElement)) return;

    const video = this._videoElement;
    if (!video) return;

    const next = Number.parseFloat(input.value);
    if (!Number.isFinite(next)) return;

    video.currentTime = this._clamp(next, 0, this._seekMax);
    this._currentTime = video.currentTime;

    if (this._status === 'ENDED' && this._currentTime < this._seekMax) {
      this._status = 'PAUSED';
    }
  };

  private _onVolumeInput = (event: Event): void => {
    const input = event.currentTarget;
    if (!(input instanceof HTMLInputElement)) return;

    const video = this._videoElement;
    if (!video) return;

    const next = Number.parseFloat(input.value);
    if (!Number.isFinite(next)) return;

    video.volume = this._clamp(next, 0, 1);
    video.muted = video.volume === 0;

    this._volume = video.volume;
    this.muted = video.muted;
  };

  private _onLoadedMetadata = (event: Event): void => {
    const video = event.currentTarget;
    if (!(video instanceof HTMLVideoElement)) return;

    this._duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0;
    this._currentTime = this._clamp(video.currentTime, 0, this._duration > 0 ? this._duration : Infinity);
    this._bufferedEnd = this._duration > 0 ? this._getBufferedEnd(video) : 0;
    this._volume = this._clamp(video.volume, 0, 1);
    this.muted = video.muted;

    this._status = video.autoplay && !video.paused ? 'PLAYING' : 'PAUSED';
  };

  private _onCanPlay = (event: Event): void => {
    const video = event.currentTarget;
    if (!(video instanceof HTMLVideoElement)) return;
    if (this._status === 'ERROR') return;

    this._duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : this._duration;
    this._bufferedEnd = this._duration > 0 ? this._getBufferedEnd(video) : this._bufferedEnd;

    if (!video.paused && !video.ended) {
      this._status = 'PLAYING';
      return;
    }

    if (this._status === 'LOADING' || this._status === 'BUFFERING') {
      this._status = 'PAUSED';
    }
  };

  private _onPlaying = (): void => {
    if (this._status === 'ERROR' || this._status === 'EMPTY') return;
    this._status = 'PLAYING';
  };

  private _onWaiting = (): void => {
    if (this._status !== 'PLAYING') return;
    this._status = 'BUFFERING';
  };

  private _onPause = (event: Event): void => {
    const video = event.currentTarget;
    if (!(video instanceof HTMLVideoElement)) return;
    if (video.ended) return;
    if (this._status === 'ERROR' || this._status === 'EMPTY') return;

    this._status = 'PAUSED';
  };

  private _onTimeUpdate = (event: Event): void => {
    const video = event.currentTarget;
    if (!(video instanceof HTMLVideoElement)) return;
    this._currentTime = this._clamp(video.currentTime, 0, this._seekMax > 0 ? this._seekMax : Infinity);
  };

  private _onProgress = (event: Event): void => {
    const video = event.currentTarget;
    if (!(video instanceof HTMLVideoElement)) return;

    if (this._seekMax <= 0) {
      this._bufferedEnd = 0;
      return;
    }

    this._bufferedEnd = this._clamp(this._getBufferedEnd(video), 0, this._seekMax);
  };

  private _onDurationChange = (event: Event): void => {
    const video = event.currentTarget;
    if (!(video instanceof HTMLVideoElement)) return;
    if (!Number.isFinite(video.duration) || video.duration <= 0) return;
    this._duration = video.duration;
  };

  private _onVolumeChange = (event: Event): void => {
    const video = event.currentTarget;
    if (!(video instanceof HTMLVideoElement)) return;
    this._volume = this._clamp(video.volume, 0, 1);
    this.muted = video.muted;
  };

  private _onEnded = (event: Event): void => {
    const video = event.currentTarget;
    if (!(video instanceof HTMLVideoElement)) return;

    this._currentTime = this._seekMax > 0 ? this._seekMax : video.currentTime;
    this._status = 'ENDED';
  };

  private _onVideoError = (event: Event): void => {
    const video = event.currentTarget;
    if (!(video instanceof HTMLVideoElement)) return;

    this._errorMessage = this._resolveMediaErrorMessage(video.error);
    this._status = 'ERROR';
  };

  private _renderTrackElements(): TemplateResult | typeof nothing {
    const tracks = this._resolvedTracks;
    if (tracks.length === 0) return nothing;

    return html`
      ${tracks.map(
        (track) => html`
          <track
            src="${track.src}"
            srclang="${track.srclang}"
            label="${track.label}"
            kind="${track.kind}"
            ?default="${track.default ?? false}"
          />
        `,
      )}
    `;
  }

  private _renderStateLayer(): TemplateResult | typeof nothing {
    if (this._status === 'EMPTY') {
      return html`
        <div class="state-layer">
          <div class="empty-panel" role="status" aria-live="polite">
            <iconify-icon icon="lucide:film" aria-hidden="true"></iconify-icon>
            <span class="state-text">動画ソースが設定されていません</span>
          </div>
        </div>
      `;
    }

    if (this._isBusy) {
      return html`
        <div class="state-layer" aria-hidden="true">
          <div class="loading-panel">
            <span class="loading-spinner"></span>
          </div>
        </div>
      `;
    }

    if (this._status === 'ERROR') {
      return html`
        <div class="state-layer">
          <div class="error-panel" role="${this._statusRole}" aria-live="${this._statusLive}" aria-atomic="true">
            <iconify-icon icon="lucide:triangle-alert" aria-hidden="true"></iconify-icon>
            <span class="state-text">${this._statusMessage}</span>
            <button type="button" class="retry-button" @click="${this._onRetryClick}">再試行</button>
          </div>
        </div>
      `;
    }

    return nothing;
  }

  override render(): TemplateResult {
    const caption = this._resolvedCaption;
    const isPressed = this._isPlayingLike;

    return html`
      <figure
        class="root"
        data-state="${this._status.toLowerCase()}"
        aria-busy="${String(this._isBusy)}"
        aria-disabled="${String(this._isDisabled)}"
      >
        <div
          class="player-shell ${this._isPlayingLike ? 'is-playing' : 'is-paused'}"
          data-state="${this._status.toLowerCase()}"
          style="${this._aspectRatioStyle}"
          aria-describedby="${ifDefined(this._captionRef)}"
          @keydown="${this._onContainerKeyDown}"
        >
          <video
            class="video-element"
            src="${ifDefined(this._hasMediaSource ? this._resolvedSrc : undefined)}"
            poster="${ifDefined(this._resolvedPoster === '' ? undefined : this._resolvedPoster)}"
            preload="none"
            ?autoplay="${this.autoplay}"
            ?loop="${this.loop}"
            ?muted="${this.muted}"
            ?playsinline="${this.playsinline}"
            aria-describedby="${ifDefined(this._captionRef)}"
            @loadedmetadata="${this._onLoadedMetadata}"
            @canplay="${this._onCanPlay}"
            @playing="${this._onPlaying}"
            @waiting="${this._onWaiting}"
            @pause="${this._onPause}"
            @timeupdate="${this._onTimeUpdate}"
            @progress="${this._onProgress}"
            @durationchange="${this._onDurationChange}"
            @volumechange="${this._onVolumeChange}"
            @ended="${this._onEnded}"
            @error="${this._onVideoError}"
          >
            ${this._renderTrackElements()}
            <slot name="tracks"></slot>
          </video>

          ${this._renderStateLayer()}

          <div class="overlay-center">
            <button
              type="button"
              class="play-button"
              aria-label="${this._playButtonLabel}"
              aria-pressed="${String(isPressed)}"
              ?disabled="${this._controlDisabled}"
              @click="${this._togglePlayback}"
            >
              <iconify-icon icon="${this._playButtonIcon}" aria-hidden="true"></iconify-icon>
            </button>
          </div>

          <div class="floating-bar">
            <button
              type="button"
              class="control-button"
              aria-label="${this._playButtonLabel}"
              aria-pressed="${String(isPressed)}"
              ?disabled="${this._controlDisabled}"
              @click="${this._togglePlayback}"
            >
              <iconify-icon icon="${this._playButtonIcon}" aria-hidden="true"></iconify-icon>
            </button>

            <input
              class="seek-input"
              type="range"
              min="0"
              max="${String(this._seekMax)}"
              step="0.1"
              .value="${String(this._seekNow)}"
              style="--seek-progress: ${String(this._seekProgress)}%; --seek-buffered: ${String(this._seekBufferedProgress)}%;"
              aria-label="再生位置"
              aria-valuemin="0"
              aria-valuemax="${String(this._seekMax)}"
              aria-valuenow="${String(this._seekNow)}"
              aria-valuetext="${this._seekValueText}"
              ?disabled="${this._controlDisabled || this._seekMax <= 0}"
              @input="${this._onSeekInput}"
            />

            <span class="time-label">${this._seekValueText}</span>

            <button
              type="button"
              class="control-button"
              aria-label="${this._muteButtonLabel}"
              ?disabled="${this._controlDisabled}"
              @click="${this._toggleMuted}"
            >
              <iconify-icon icon="${this._muteButtonIcon}" aria-hidden="true"></iconify-icon>
            </button>

            <input
              class="volume-input"
              type="range"
              min="0"
              max="1"
              step="0.05"
              .value="${String(this._volume)}"
              style="--volume-progress: ${String(this._volumeProgress)}%;"
              aria-label="音量"
              aria-valuemin="0"
              aria-valuemax="1"
              aria-valuenow="${String(this._volume)}"
              aria-valuetext="${`${String(Math.round(this._volume * 100))}%`}"
              ?disabled="${this._controlDisabled}"
              @input="${this._onVolumeInput}"
            />

            <button
              type="button"
              class="control-button fullscreen-button"
              aria-label="${this._fullscreenButtonLabel}"
              ?disabled="${this._controlDisabled}"
              @click="${this._toggleFullscreen}"
            >
              <iconify-icon icon="${this._fullscreenButtonIcon}" aria-hidden="true"></iconify-icon>
            </button>
          </div>
        </div>

        ${caption === ''
          ? nothing
          : html`
              <figcaption id="${this._captionId}" class="caption">${caption}</figcaption>
            `}

        <p
          id="${this._statusId}"
          class="sr-only"
          role="${this._statusRole}"
          aria-live="${this._statusLive}"
          aria-atomic="true"
        >
          ${this._statusMessage}
        </p>
      </figure>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-video': UiVideo;
  }
}
