import { css, html, LitElement, nothing, type TemplateResult } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import '../../../lib/icons';
import '../button/button';

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

/** 長押し判定の閾値（ミリ秒） */
const LONG_PRESS_THRESHOLD = 500;

/** オーバーレイ自動非表示の遅延（ミリ秒） */
const OVERLAY_HIDE_DELAY = 1000;

/** スキップインジケータ表示時間（ミリ秒） */
const SKIP_INDICATOR_DURATION = 600;

/** フローチングバー自動非表示の遅延（ミリ秒） */
const FLOATING_BAR_HIDE_DELAY = 3000;

/** ダブルタッチ判定の閾値（ミリ秒） */
const DOUBLE_TAP_THRESHOLD = 300;

/** スキップ秒数 */
const SKIP_SECONDS = 10;

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
      border: var(--border-width, 1px) solid var(--border-ghost, oklch(20% 0 0 / 0.08));
      border-radius: var(--radius-md, 6px);
      background: var(--bg-fill-neutral, oklch(95% 0 0));
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

    .skip-row {
      display: flex;
      align-items: center;
      gap: var(--space-4, 16px);
    }

    .play-button {
      pointer-events: auto;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: calc(var(--control-min-touch, 24px) + var(--space-1, 4px));
      height: calc(var(--control-min-touch, 24px) + var(--space-1, 4px));
      padding: 0;
      border: var(--border-width, 1px) solid var(--video-overlay-border, var(--border-default, oklch(86% 0 0)));
      border-radius: var(--radius-full, 999px);
      background: var(--video-overlay-bg, var(--bg-surface-3, oklch(100% 0 0 / 0.88)));
      box-shadow: var(--video-overlay-elevation, var(--elevation-md, 0 4px 12px oklch(0% 0 0 / 0.16)));
      color: var(--fg-default, oklch(20% 0 0));
      cursor: pointer;
      transition:
        transform var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)),
        opacity var(--duration-normal, 150ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9));
    }

    .play-button iconify-icon {
      font-size: var(--icon-xl, 32px);
      line-height: 1;
    }

    .play-button.is-hidden {
      opacity: 0;
      pointer-events: none;
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

    /* スキップボタン（10秒戻る/進む） */
    .skip-button {
      pointer-events: auto;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: var(--control-min-touch, 24px);
      height: var(--control-min-touch, 24px);
      padding: 0;
      border: var(--border-width, 1px) solid var(--video-overlay-border, var(--border-default, oklch(86% 0 0)));
      border-radius: var(--radius-full, 999px);
      background: var(--video-overlay-bg, var(--bg-surface-3, oklch(100% 0 0 / 0.88)));
      box-shadow: var(--video-overlay-elevation, var(--elevation-md, 0 4px 12px oklch(0% 0 0 / 0.16)));
      color: var(--fg-default, oklch(20% 0 0));
      cursor: pointer;
      opacity: 0;
      pointer-events: none;
      transition:
        opacity var(--duration-normal, 150ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)),
        transform var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9));
    }

    .skip-button iconify-icon {
      font-size: var(--icon-md, 18px);
      line-height: 1;
    }

    .skip-button:hover:not(:disabled) {
      transform: scale(var(--scale-hover-lg, 1.04));
    }

    .skip-button:active:not(:disabled) {
      transform: scale(var(--scale-pressed, 0.96));
    }

    .skip-button:focus-visible {
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, oklch(60% 0.15 250));
      outline-offset: var(--focus-ring-offset, 2px);
      animation: var(--animation-focus);
    }

    /* 全画面 + モバイル (< 768px) でのみスキップボタンを表示 */
    .player-shell.is-fullscreen .skip-button.is-visible {
      opacity: 1;
      pointer-events: auto;
    }

    @media (min-width: 768px) {
      .player-shell.is-fullscreen .skip-button.is-visible {
        opacity: 0;
        pointer-events: none;
      }
    }

    /* 2倍速バッジ */
    .speed-badge {
      position: absolute;
      top: var(--space-3, 12px);
      left: 50%;
      transform: translateX(-50%);
      z-index: 5;
      padding: var(--space-1, 4px) var(--space-2, 8px);
      border-radius: var(--radius-full, 999px);
      background: oklch(0% 0 0 / 0.65);
      color: var(--fg-on-primary, var(--on-primary, oklch(100% 0 0)));
      font-family: var(--font-sans, 'Noto Sans JP Variable', sans-serif);
      font-weight: var(--font-semibold, 600);
      font-size: var(--text-xs, 12px);
      line-height: 1;
      pointer-events: none;
      opacity: 0;
      transition: opacity var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9));
    }

    .speed-badge.is-active {
      opacity: 1;
    }

    /* 全画面キャプションタイトル */
    .fullscreen-caption {
      position: absolute;
      top: var(--space-4, 16px);
      left: var(--space-4, 16px);
      z-index: 5;
      max-width: 60%;
      font-family: var(--font-sans, 'Noto Sans JP Variable', sans-serif);
      font-weight: var(--font-semibold, 600);
      font-size: var(--text-lg, 16px);
      color: var(--fg-on-primary, var(--on-primary, oklch(100% 0 0)));
      line-height: var(--line-height-normal, 1.5);
      pointer-events: none;
      text-shadow: 0 1px 3px oklch(0% 0 0 / 0.5);
      opacity: 0;
      transition: opacity var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9));
    }

    .player-shell.is-fullscreen .fullscreen-caption.has-content {
      opacity: 1;
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
      color: var(--fg-muted, oklch(48% 0 0));
      background: color-mix(in oklab, var(--bg-fill-neutral, oklch(95% 0 0)) 75%, transparent);
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
      min-height: var(--control-min-touch, 24px);
      padding: 0 var(--space-4, 16px);
      border: var(--border-width, 1px) solid var(--border-default, oklch(86% 0 0));
      border-radius: var(--radius-full, 999px);
      background: var(--bg-surface-2, oklch(100% 0 0));
      color: var(--fg-default, oklch(20% 0 0));
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
      border: 2px solid var(--border-default, oklch(86% 0 0));
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
      display: flex;
      flex-direction: column;
      gap: var(--space-1, 4px);
      padding: var(--space-3, 12px) var(--space-4, 16px);
      border: var(--border-width, 1px) solid var(--video-overlay-border, var(--border-default, oklch(86% 0 0)));
      border-radius: var(--radius-lg, 10px);
      background: var(--video-overlay-bg, var(--bg-surface-3, oklch(100% 0 0 / 0.88)));
      box-shadow: var(--video-overlay-elevation, var(--elevation-md, 0 4px 12px oklch(0% 0 0 / 0.16)));
      opacity: 1;
      transition: opacity var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9));
    }

    /* 初回再生前は非表示 */
    .floating-bar.is-pre-play {
      opacity: 0;
      pointer-events: none;
    }

    /* JS制御による非表示 */
    .floating-bar.is-bar-hidden {
      opacity: 0;
      pointer-events: none;
    }

    .bar-row {
      display: flex;
      align-items: center;
      gap: var(--space-2, 8px);
    }

    .bar-row-top {
      gap: var(--space-3, 12px);
    }

    .bar-row-bottom {
      justify-content: space-between;
    }

    .bar-group-left,
    .bar-group-right {
      display: flex;
      align-items: center;
      gap: var(--space-1, 4px);
    }

    .floating-bar ui-button {
      --fg-muted: var(--fg-default, oklch(20% 0 0));
    }

    .seek-input,
    .volume-input {
      margin: 0;
      appearance: none;
      -webkit-appearance: none;
      height: var(--space-1, 4px);
      border-radius: var(--radius-full, 999px);
      background: var(--bg-fill-neutral, oklch(95% 0 0));
      cursor: pointer;
    }

    .seek-input {
      flex: 1;
      min-width: 0;
      background: linear-gradient(
        to right,
        var(--primary, oklch(56% 0.16 252)) 0%,
        var(--primary, oklch(56% 0.16 252)) var(--seek-progress, 0%),
        var(--border-muted, oklch(82% 0 0)) var(--seek-progress, 0%),
        var(--border-muted, oklch(82% 0 0)) var(--seek-buffered, 0%),
        var(--bg-fill-neutral, oklch(95% 0 0)) var(--seek-buffered, 0%),
        var(--bg-fill-neutral, oklch(95% 0 0)) 100%
      );
    }

    .volume-input {
      width: clamp(72px, 14vw, 108px);
      background: linear-gradient(
        to right,
        var(--primary, oklch(56% 0.16 252)) 0%,
        var(--primary, oklch(56% 0.16 252)) var(--volume-progress, 100%),
        var(--bg-fill-neutral, oklch(95% 0 0)) var(--volume-progress, 100%),
        var(--bg-fill-neutral, oklch(95% 0 0)) 100%
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
      color: var(--fg-muted, oklch(48% 0 0));
      font-size: var(--text-xs, 12px);
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }

    .caption {
      margin-block-start: var(--space-2, 8px);
      color: var(--fg-muted, oklch(48% 0 0));
      font-size: var(--text-sm, 13px);
      line-height: var(--line-height-relaxed, 1.75);
      text-align: left;
    }

    :host-context(.prose) .caption {
      padding-inline: var(--space-4, 1rem);
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

    /* スキップインジケータ */
    .skip-indicator {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      z-index: 5;
      padding: var(--space-2, 8px) var(--space-3, 12px);
      border-radius: var(--radius-full, 999px);
      background: oklch(0% 0 0 / 0.55);
      color: var(--fg-on-primary, var(--on-primary, oklch(100% 0 0)));
      font-family: var(--font-sans, 'Noto Sans JP Variable', sans-serif);
      font-weight: var(--font-semibold, 600);
      font-size: var(--text-sm, 13px);
      line-height: 1;
      pointer-events: none;
      opacity: 0;
      transition: opacity var(--duration-normal, 150ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9));
    }

    .skip-indicator-left {
      left: var(--space-8, 32px);
    }

    .skip-indicator-right {
      right: var(--space-8, 32px);
    }

    .skip-indicator.is-active {
      opacity: 1;
    }

    @media (prefers-reduced-motion: reduce) {
      .video-element,
      .floating-bar,
      .play-button,
      .skip-button,
      .speed-badge,
      .fullscreen-caption,
      .skip-indicator,
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
      .skip-button,
      .retry-button {
        background: Canvas;
        border: var(--border-width, 1px) solid CanvasText;
        color: CanvasText;
        box-shadow: none;
      }

      .speed-badge,
      .skip-indicator {
        background: Canvas;
        color: CanvasText;
        border: var(--border-width, 1px) solid CanvasText;
      }

      .fullscreen-caption {
        color: CanvasText;
        text-shadow: none;
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

      .play-button:focus-visible,
      .skip-button:focus-visible,
      .retry-button:focus-visible,
      .seek-input:focus-visible,
      .volume-input:focus-visible {
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
  private _captionsActive = false;

  @state()
  private _errorMessage = '';

  @state()
  private _overlayCenterVisible = true;

  @state()
  private _skipButtonsVisible = false;

  @state()
  private _isLongPress = false;

  /** 初回再生が開始されたかどうか */
  @state()
  private _hasStartedPlayback = false;

  /** フローティングバーの表示状態（JS制御） */
  @state()
  private _floatingBarVisible = false;

  /** スキップインジケータ: 'none' | 'forward' | 'back' */
  @state()
  private _skipIndicator: 'none' | 'forward' | 'back' = 'none';

  @query('video.video-element')
  private _videoElement?: HTMLVideoElement;

  @query('.retry-button')
  private _retryButton?: HTMLButtonElement;

  private readonly _uid = ++videoUid;
  private readonly _captionId = `video-caption-${String(this._uid)}`;
  private readonly _statusId = `video-status-${String(this._uid)}`;

  private _previousStatus: VideoState = 'EMPTY';

  /** ミュート前の音量を保存 */
  private _volumeBeforeMute = 1;

  /** オーバーレイ自動非表示タイマー */
  private _hideOverlayTimer: ReturnType<typeof setTimeout> | null = null;

  /** スキップボタン自動非表示タイマー */
  private _hideSkipTimer: ReturnType<typeof setTimeout> | null = null;

  /** 長押し判定タイマー */
  private _longPressTimer: ReturnType<typeof setTimeout> | null = null;

  /** フローティングバー自動非表示タイマー */
  private _floatingBarTimer: ReturnType<typeof setTimeout> | null = null;

  /** スキップインジケータ非表示タイマー */
  private _skipIndicatorTimer: ReturnType<typeof setTimeout> | null = null;

  /** ダブルタップ検出用: 直前タッチ時刻 */
  private _lastTapTime = 0;

  /** シングルタップ実行タイマー */
  private _singleTapTimer: ReturnType<typeof setTimeout> | null = null;

  /** デスクトップ判定用MediaQuery */
  private _desktopMQ: MediaQueryList | null = null;

  /** 初回再生時にミュートを強制するためのフラグ */
  private _didApplyInitialPlaybackMute = false;

  private _suppressOverlayOnNextPause = false;

  /** 長押し終了直後のクリックを無視するためのフラグ */
  private _wasLongPress = false;

  override connectedCallback(): void {
    super.connectedCallback();
    if (typeof document !== 'undefined') {
      document.addEventListener('fullscreenchange', this._onFullscreenChange);
      document.addEventListener('click', this._onDocumentClick);
    }
    if (typeof window !== 'undefined') {
      this._desktopMQ = window.matchMedia('(min-width: 768px)');
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    if (typeof document !== 'undefined') {
      document.removeEventListener('fullscreenchange', this._onFullscreenChange);
      document.removeEventListener('click', this._onDocumentClick);
    }
    // タイマーをすべてクリア
    this._cancelOverlayHide();
    this._cancelSkipHide();
    this._cancelLongPress();
    this._cancelFloatingBarHide();
    this._cancelSkipIndicator();
    if (this._singleTapTimer !== null) {
      clearTimeout(this._singleTapTimer);
      this._singleTapTimer = null;
    }
  }

  override willUpdate(changedProperties: Map<PropertyKey, unknown>): void {
    super.willUpdate(changedProperties);

    if (changedProperties.has('src')) {
      this._currentTime = 0;
      this._duration = 0;
      this._bufferedEnd = 0;
      this._errorMessage = '';
      this._hasStartedPlayback = false;
      this._floatingBarVisible = false;
      this._skipIndicator = 'none';
      this._didApplyInitialPlaybackMute = false;
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

    if (!this._didApplyInitialPlaybackMute) {
      this._didApplyInitialPlaybackMute = true;
      if (!video.muted && video.volume > 0) {
        this._volumeBeforeMute = video.volume;
      }
      video.muted = true;
      this.muted = true;
      this._volume = 0;
    }

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

  // ─── 算出プロパティ ───

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

  private get _hasTracks(): boolean {
    // 字幕・キャプション種別のトラックのみを対象とする
    const hasResolvedCaptionTracks = this._resolvedTracks.some(
      (t) => t.kind === 'captions' || t.kind === 'subtitles',
    );
    if (hasResolvedCaptionTracks) return true;

    // slot 経由で追加されたネイティブトラックも確認
    const video = this._videoElement;
    if (!video) return false;
    for (const track of Array.from(video.textTracks)) {
      if (track.kind === 'captions' || track.kind === 'subtitles') return true;
    }
    return false;
  }

  private get _captionToggleLabel(): string {
    return this._captionsActive ? '字幕をオフ' : '字幕をオン';
  }

  private get _captionToggleIcon(): string {
    return this._captionsActive ? 'lucide:captions' : 'lucide:captions-off';
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

  /** 全画面時に表示するキャプションタイトル */
  private get _fullscreenTitle(): string {
    return this._isFullscreen && this._resolvedCaption !== '' ? this._resolvedCaption : '';
  }

  // ─── ユーティリティ ───

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
      return 'サポートされていない動画形式です。';
    }

    return '動画の再生に失敗しました。';
  }

  private _resolvePlayErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message.trim() !== '') {
      return `再生を開始できませんでした: ${error.message}`;
    }

    return '再生を開始できませんでした。';
  }

  // ─── オーバーレイ表示/非表示制御 ───

  private _scheduleOverlayHide(): void {
    this._cancelOverlayHide();
    this._hideOverlayTimer = setTimeout(() => {
      this._overlayCenterVisible = false;
      this._skipButtonsVisible = false;
      this._hideOverlayTimer = null;
    }, OVERLAY_HIDE_DELAY);
  }

  private _cancelOverlayHide(): void {
    if (this._hideOverlayTimer !== null) {
      clearTimeout(this._hideOverlayTimer);
      this._hideOverlayTimer = null;
    }
  }

  private _showOverlayControls(): void {
    this._overlayCenterVisible = true;
    this._skipButtonsVisible = true;
  }

  private _cancelSkipHide(): void {
    if (this._hideSkipTimer !== null) {
      clearTimeout(this._hideSkipTimer);
      this._hideSkipTimer = null;
    }
  }

  // ─── フローティングバー表示/非表示制御 ───

  private get _isDesktop(): boolean {
    return this._desktopMQ?.matches ?? true;
  }

  private _showFloatingBar(): void {
    this._floatingBarVisible = true;
    this._cancelFloatingBarHide();
  }

  private _hideFloatingBar(): void {
    this._floatingBarVisible = false;
    this._cancelFloatingBarHide();
  }

  private _scheduleFloatingBarHide(): void {
    this._cancelFloatingBarHide();
    this._floatingBarTimer = setTimeout(() => {
      this._floatingBarVisible = false;
      // モバイルでは再生中にセンターボタンも隠す
      if (!this._isDesktop && this._isPlayingLike) {
        this._overlayCenterVisible = false;
      }
      this._floatingBarTimer = null;
    }, FLOATING_BAR_HIDE_DELAY);
  }

  private _cancelFloatingBarHide(): void {
    if (this._floatingBarTimer !== null) {
      clearTimeout(this._floatingBarTimer);
      this._floatingBarTimer = null;
    }
  }

  private get _floatingBarClasses(): string {
    // エラー時はフローティングバーを非表示
    if (this._status === 'ERROR') return 'floating-bar is-bar-hidden';

    const isPrePlayBeforeFirstStart =
      !this.autoplay &&
      !this._didApplyInitialPlaybackMute &&
      !this._isPlayingLike &&
      this._currentTime === 0;
    if (isPrePlayBeforeFirstStart || (this._status === 'PAUSED' && this._currentTime === 0)) {
      return 'floating-bar is-pre-play';
    }
    if (!this._floatingBarVisible && this._isPlayingLike) return 'floating-bar is-bar-hidden';
    return 'floating-bar';
  }

  // ─── スキップインジケータ制御 ───

  private _showSkipIndicator(direction: 'forward' | 'back'): void {
    this._skipIndicator = direction;
    this._cancelSkipIndicator();
    this._skipIndicatorTimer = setTimeout(() => {
      this._skipIndicator = 'none';
      this._skipIndicatorTimer = null;
    }, SKIP_INDICATOR_DURATION);
  }

  private _cancelSkipIndicator(): void {
    if (this._skipIndicatorTimer !== null) {
      clearTimeout(this._skipIndicatorTimer);
      this._skipIndicatorTimer = null;
    }
  }

  // ─── ドキュメントクリック（外部クリック検出） ───

  private _onDocumentClick = (event: MouseEvent): void => {
    const shell = this.shadowRoot?.querySelector('.player-shell');
    if (!shell) return;
    if (!this._hasStartedPlayback) return;
    if (event.composedPath().includes(shell)) return;
    this._hideFloatingBar();
    if (!this._isDesktop && this._isPlayingLike) {
      this._overlayCenterVisible = false;
    }
  };

  // ─── シェルイベントハンドラ（フローティングバー連動） ───

  private _onShellMouseMove = (): void => {
    if (!this._hasStartedPlayback) return;
    if (!this._isDesktop) return;
    this._showFloatingBar();
    if (this._isPlayingLike) {
      this._scheduleFloatingBarHide();
    }
  };

  private _onShellPointerEnter = (): void => {
    if (!this._hasStartedPlayback) return;
    if (!this._isDesktop) return;
    this._showFloatingBar();
    if (this._isPlayingLike) {
      this._scheduleFloatingBarHide();
    }
  };

  private _onShellPointerLeave = (): void => {
    if (!this._hasStartedPlayback) return;
    this._hideFloatingBar();
    if (!this._isDesktop && this._isPlayingLike) {
      this._overlayCenterVisible = false;
    }
  };

  // ─── ダブルタッチ / シングルタッチ検出 ───

  private _onShellClick = (event: MouseEvent): void => {
    const path = event.composedPath();

    const isFloatingBarTarget = path.some(
      (el) => el instanceof HTMLElement && el.classList.contains('floating-bar'),
    );
    if (isFloatingBarTarget) return;

    const hasInteractive = path.some(
      (el) =>
        el instanceof HTMLButtonElement ||
        el instanceof HTMLInputElement ||
        (el instanceof HTMLElement && el.localName === 'ui-button'),
    );
    if (hasInteractive) return;
    if (!this._hasStartedPlayback) return;

    // 長押し直後のクリックは再生トグルをスキップ
    if (this._wasLongPress) {
      this._wasLongPress = false;
      return;
    }

    const now = Date.now();
    const timeDelta = now - this._lastTapTime;

    if (timeDelta < DOUBLE_TAP_THRESHOLD && timeDelta > 0) {
      if (this._singleTapTimer !== null) {
        clearTimeout(this._singleTapTimer);
        this._singleTapTimer = null;
      }
      this._handleDoubleTap(event);
      this._lastTapTime = 0;
      return;
    }

    this._lastTapTime = now;
    this._singleTapTimer = setTimeout(() => {
      this._togglePlayback();
      this._singleTapTimer = null;
    }, DOUBLE_TAP_THRESHOLD);
  };

  private _onShellKeyDown = (event: KeyboardEvent): void => {
    if (event.defaultPrevented) return;
    if (event.metaKey || event.ctrlKey || event.altKey) return;

    const target = event.target;
    if (
      target instanceof HTMLButtonElement ||
      target instanceof HTMLInputElement ||
      (target instanceof HTMLElement && target.localName === 'ui-button')
    ) {
      return;
    }

    switch (event.key) {
      case ' ':
      case 'Enter':
      case 'k':
        event.preventDefault();
        this._togglePlayback();
        break;
      case 'j':
        event.preventDefault();
        if (!this._hasStartedPlayback) break;
        this._seekBy(-SKIP_SECONDS);
        this._showSkipIndicator('back');
        break;
      case 'l':
        event.preventDefault();
        if (!this._hasStartedPlayback) break;
        this._seekBy(SKIP_SECONDS);
        this._showSkipIndicator('forward');
        break;
      case 'ArrowRight':
        event.preventDefault();
        this._seekBy(SKIP_SECONDS / 2);
        break;
      case 'ArrowLeft':
        event.preventDefault();
        this._seekBy(-SKIP_SECONDS / 2);
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
        event.preventDefault();
        this._toggleMuted();
        break;
      case 'f':
        event.preventDefault();
        void this._toggleFullscreen();
        break;
      case 'c':
        if (this._hasTracks) {
          event.preventDefault();
          this._toggleCaptions();
        }
        break;
      default:
        break;
    }
  };
  private _handleDoubleTap(event: MouseEvent): void {
    const shell = this.shadowRoot?.querySelector<HTMLElement>('.player-shell');
    if (!shell) return;

    // 長押し判定をキャンセル
    this._cancelLongPress();

    if (this._isDesktop) {
      // デスクトップ: ダブルクリックで全画面トグル
      void this._toggleFullscreen();
    } else {
      // モバイル: ダブルタップでスキップ
      const rect = shell.getBoundingClientRect();
      const midX = rect.left + rect.width / 2;
      if (event.clientX >= midX) {
        this._seekBy(SKIP_SECONDS);
        this._showSkipIndicator('forward');
      } else {
        this._seekBy(-SKIP_SECONDS);
        this._showSkipIndicator('back');
      }
    }
  }

  // ─── 再生操作 ───

  private _togglePlayback = (): void => {
    // オーバーレイを一時的に表示
    this._showOverlayControls();

    if (this._isPlayingLike) {
      this.pauseVideo();
      // 一時停止時はボタンを表示したまま
      this._cancelOverlayHide();
      return;
    }

    void this.playVideo();
    // 再生開始後、1秒でボタンを自動非表示
    this._scheduleOverlayHide();
  };

  /** フローティングバーからの再生操作 */
  private _onFloatingBarPlay = (): void => {
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

  private _onSkipBack = (): void => {
    this._seekBy(-10);
    this._showOverlayControls();
    this._scheduleOverlayHide();
  };

  private _onSkipForward = (): void => {
    this._seekBy(10);
    this._showOverlayControls();
    this._scheduleOverlayHide();
  };

  private _onFloatingBarSkipBack = (): void => {
    this._seekBy(-10);
    this._showFloatingBar();
    if (this._isPlayingLike) {
      this._scheduleFloatingBarHide();
    }
  };

  private _onFloatingBarSkipForward = (): void => {
    this._seekBy(10);
    this._showFloatingBar();
    if (this._isPlayingLike) {
      this._scheduleFloatingBarHide();
    }
  };

  private _adjustVolume(delta: number): void {
    const video = this._videoElement;
    if (!video) return;

    const next = this._clamp(video.volume + delta, 0, 1);
    video.volume = next;
    this._volume = next;
    if (next === 0) {
      video.muted = true;
      this.muted = true;
    } else if (video.muted) {
      video.muted = false;
      this.muted = false;
    }
  }

  private _toggleMuted = (): void => {
    const video = this._videoElement;
    if (!video) return;

    if (!video.muted) {
      // ミュートに入る直前のボリュームを保存
      this._volumeBeforeMute = video.volume > 0 ? video.volume : this._volumeBeforeMute;
      video.muted = true;
      this.muted = true;
      // スライダーを視覚的に 0 へ
      this._volume = 0;
    } else {
      // ミュート解除: 保存してボリュームを復元
      const restore = this._volumeBeforeMute > 0 ? this._volumeBeforeMute : 0.5;
      video.muted = false;
      video.volume = restore;
      this.muted = false;
      this._volume = restore;
    }
  };

  /** テキストトラックのモードを _captionsActive に同期する */
  private _syncTextTrackModes(video: HTMLVideoElement): void {
    for (const track of Array.from(video.textTracks)) {
      if (track.kind === 'captions' || track.kind === 'subtitles') {
        track.mode = this._captionsActive ? 'showing' : 'hidden';
      }
    }
  }

  private _toggleCaptions = (): void => {
    const video = this._videoElement;
    if (!video) return;

    const nextActive = !this._captionsActive;
    this._captionsActive = nextActive;

    // TextTrackList の全トラックに対してモードを切り替え
    for (const track of Array.from(video.textTracks)) {
      if (track.kind === 'captions' || track.kind === 'subtitles') {
        track.mode = nextActive ? 'showing' : 'hidden';
      }
    }
  };

  // ─── 全画面制御 ───
  // Shadow DOM 内の要素が requestFullscreen() すると、
  // document.fullscreenElement はシャドウホスト（this）を返す。
  private _toggleFullscreen = async (): Promise<void> => {
    if (typeof document === 'undefined') return;
    const shell = this.shadowRoot?.querySelector<HTMLElement>('.player-shell');
    if (!shell) return;

    try {
      if (this._isFullscreen) {
        // 全画面状態の時: 終了する
        await document.exitFullscreen();
        return;
      }
      // 非全画面状態のとき: 開始する      
      await shell.requestFullscreen();
    } catch {
      // 操作環境により全画面APIが拒否されるため握りつぶす。
    }
  };

  private _onFullscreenChange = (): void => {
    if (typeof document === 'undefined') return;
    // document.fullscreenElement は Shadow DOM 境界を越えないため、
    // ホスト要素 (this) を確認する。
    this._isFullscreen =
      document.fullscreenElement === this ||
      (this.shadowRoot !== null && this.shadowRoot.fullscreenElement !== null);
  };

  // ─── 長押し2倍速───

  private _onPointerDown = (event: PointerEvent): void => {
    // コンポーザードパスにボタンやスライダーが含まれる場合はスキップ
    const path = event.composedPath();
    const hasInteractiveTarget = path.some(
      (el) =>
        el instanceof HTMLButtonElement ||
        el instanceof HTMLInputElement ||
        (el instanceof HTMLElement && el.localName === 'ui-button'),
    );
    if (hasInteractiveTarget) return;

    if (this._longPressTimer !== null) clearTimeout(this._longPressTimer);
    this._longPressTimer = setTimeout(() => {
      this._activateLongPress();
      this._longPressTimer = null;
    }, LONG_PRESS_THRESHOLD);
  };

  private _onPointerUp = (): void => {
    this._cancelLongPress();
  };

  private _onPointerLeave = (): void => {
    this._cancelLongPress();
    this._onShellPointerLeave();
  };

  private _activateLongPress(): void {
    const video = this._videoElement;
    if (!video) return;
    // 再生中のみ 2x を有効にする
    if (!this._isPlayingLike) return;
    this._isLongPress = true;
    video.playbackRate = 2;
  }

  private _cancelLongPress(): void {
    if (this._longPressTimer !== null) {
      clearTimeout(this._longPressTimer);
      this._longPressTimer = null;
    }
    if (this._isLongPress) {
      this._isLongPress = false;
      this._wasLongPress = true;
      const video = this._videoElement;
      if (video) video.playbackRate = 1;
    }
  }

  // ─── メディアイベントハンドラ ───

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
    this._volume = video.muted ? 0 : this._clamp(video.volume, 0, 1);
    this.muted = video.muted;

    this._status = video.autoplay && !video.paused ? 'PLAYING' : 'PAUSED';

    // default 属性付きトラックをブラウザが自動表示するため、
    // _captionsActive の初期状態に合わせてモードを強制設定する
    this._syncTextTrackModes(video);
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
    this._hasStartedPlayback = true;
    // 再生開始時にオーバーレイを自動非表示スケジュール
    this._scheduleOverlayHide();
    // フローティングバーを表示後、自動非表示をスケジュール
    this._showFloatingBar();
    this._scheduleFloatingBarHide();
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
    const suppressOverlay = this._suppressOverlayOnNextPause;
    this._suppressOverlayOnNextPause = false;
    // 一時停止時にオーバーレイを表示する
    this._cancelOverlayHide();
    if (!suppressOverlay) {
      this._showOverlayControls();
    }
    // フローティングバーを表示し、非表示タイマーをキャンセル
    this._showFloatingBar();
    this._cancelFloatingBarHide();
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
    // ミュート中はスライダーを 0 に固定し、実際の volume 値は反映しない
    if (video.muted) {
      this._volume = 0;
    } else {
      this._volume = this._clamp(video.volume, 0, 1);
    }
    this.muted = video.muted;
  };

  private _onEnded = (event: Event): void => {
    const video = event.currentTarget;
    if (!(video instanceof HTMLVideoElement)) return;

    this._currentTime = this._seekMax > 0 ? this._seekMax : video.currentTime;
    this._status = 'ENDED';
    // 終了時はオーバーレイを表示
    this._cancelOverlayHide();
    this._showOverlayControls();
    this._showFloatingBar();
    this._cancelFloatingBarHide();
  };

  private _onVideoError = (event: Event): void => {
    const video = event.currentTarget;
    if (!(video instanceof HTMLVideoElement)) return;

    this._errorMessage = this._resolveMediaErrorMessage(video.error);
    this._status = 'ERROR';
  };

  // ─── レンダリング ───

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

  private _renderOverlayCenter(): TemplateResult | typeof nothing {
    // エラー時はオーバーレイを完全にDOMから除去する
    if (this._status === 'ERROR') return nothing;

    const isPressed = this._isPlayingLike;
    return html`
      <div class="overlay-center">
        <div class="skip-row">
          <button
            type="button"
            class="skip-button ${this._skipButtonsVisible ? 'is-visible' : ''}"
            tabindex="-1"
            aria-label="10秒戻る"
            ?disabled="${this._controlDisabled}"
            @click="${this._onSkipBack}"
          >
            <iconify-icon icon="lucide:rotate-ccw" aria-hidden="true"></iconify-icon>
          </button>

          <button
            type="button"
            class="play-button ${this._overlayCenterVisible ? '' : 'is-hidden'}"
            tabindex="-1"
            aria-label="${this._playButtonLabel}"
            aria-pressed="${String(isPressed)}"
            ?disabled="${this._controlDisabled}"
            @click="${this._togglePlayback}"
          >
            <iconify-icon icon="${this._playButtonIcon}" aria-hidden="true"></iconify-icon>
          </button>

          <button
            type="button"
            class="skip-button ${this._skipButtonsVisible ? 'is-visible' : ''}"
            tabindex="-1"
            aria-label="10秒進む"
            ?disabled="${this._controlDisabled}"
            @click="${this._onSkipForward}"
          >
            <iconify-icon icon="lucide:rotate-cw" aria-hidden="true"></iconify-icon>
          </button>
        </div>
      </div>
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
    const shellClasses = [
      'player-shell',
      this._isPlayingLike ? 'is-playing' : 'is-paused',
      this._isFullscreen ? 'is-fullscreen' : '',
    ]
      .filter(Boolean)
      .join(' ');

    return html`
      <figure
        class="root"
        data-state="${this._status.toLowerCase()}"
        aria-busy="${String(this._isBusy)}"
        aria-disabled="${String(this._isDisabled)}"
      >
        <div
          class="${shellClasses}"
          data-state="${this._status.toLowerCase()}"
          style="${this._aspectRatioStyle}"
          aria-describedby="${ifDefined(this._captionRef)}"
          @pointerdown="${this._onPointerDown}"
          @pointerup="${this._onPointerUp}"
          @pointerleave="${this._onPointerLeave}"
          @mousemove="${this._onShellMouseMove}"
          @pointerenter="${this._onShellPointerEnter}"
          @click="${this._onShellClick}"
          @keydown="${this._onShellKeyDown}"
        >
          <video
            class="video-element"
            src="${ifDefined(this._hasMediaSource ? this._resolvedSrc : undefined)}"
            poster="${ifDefined(this._resolvedPoster === '' ? undefined : this._resolvedPoster)}"
            preload="metadata"
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

          <!-- 2倍速バッジ -->
          <div class="speed-badge ${this._isLongPress ? 'is-active' : ''}" aria-hidden="true">2x</div>

          <!-- スキップインジケータ -->
          <div class="skip-indicator skip-indicator-left ${this._skipIndicator === 'back' ? 'is-active' : ''}" aria-hidden="true">
            -${String(SKIP_SECONDS)}
          </div>
          <div class="skip-indicator skip-indicator-right ${this._skipIndicator === 'forward' ? 'is-active' : ''}" aria-hidden="true">
            +${String(SKIP_SECONDS)}
          </div>

          <!-- 全画面キャプションタイトル -->
          <div
            class="fullscreen-caption ${this._fullscreenTitle !== '' ? 'has-content' : ''}"
            aria-hidden="true"
          >
            ${this._fullscreenTitle}
          </div>

          ${this._renderOverlayCenter()}

          <div class="${this._floatingBarClasses}">
            <div class="bar-row bar-row-top">
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
            </div>

            <div class="bar-row bar-row-bottom">
              <div class="bar-group-left">
                <ui-button
                  variant="ghost"
                  size="sm"
                  icon-only
                  aria-label="${this._playButtonLabel}"
                  ?pressed="${this._isPlayingLike}"
                  ?disabled="${this._controlDisabled}"
                  @click="${this._onFloatingBarPlay}"
                >
                  <iconify-icon icon="${this._playButtonIcon}" aria-hidden="true"></iconify-icon>
                </ui-button>

                <ui-button
                  variant="ghost"
                  size="sm"
                  icon-only
                  aria-label="10秒戻る"
                  ?disabled="${this._controlDisabled}"
                  @click="${this._onFloatingBarSkipBack}"
                >
                  <iconify-icon icon="lucide:rewind" aria-hidden="true"></iconify-icon>
                </ui-button>

                <ui-button
                  variant="ghost"
                  size="sm"
                  icon-only
                  aria-label="10秒進む"
                  ?disabled="${this._controlDisabled}"
                  @click="${this._onFloatingBarSkipForward}"
                >
                  <iconify-icon icon="lucide:fast-forward" aria-hidden="true"></iconify-icon>
                </ui-button>

                <ui-button
                  variant="ghost"
                  size="sm"
                  icon-only
                  aria-label="${this._muteButtonLabel}"
                  ?disabled="${this._controlDisabled}"
                  @click="${this._toggleMuted}"
                >
                  <iconify-icon icon="${this._muteButtonIcon}" aria-hidden="true"></iconify-icon>
                </ui-button>

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
              </div>

              <div class="bar-group-right">
                ${this._hasTracks
                  ? html`
                      <ui-button
                        variant="ghost"
                        size="sm"
                        icon-only
                        aria-label="${this._captionToggleLabel}"
                        aria-pressed="${String(this._captionsActive)}"
                        .pressed="${this._captionsActive}"
                        ?disabled="${this._controlDisabled}"
                        @click="${this._toggleCaptions}"
                      >
                        <iconify-icon icon="${this._captionToggleIcon}" aria-hidden="true"></iconify-icon>
                      </ui-button>
                    `
                  : nothing}

                <ui-button
                  variant="ghost"
                  size="sm"
                  icon-only
                  class="fullscreen-button"
                  aria-label="${this._fullscreenButtonLabel}"
                  ?disabled="${this._controlDisabled}"
                  @click="${this._toggleFullscreen}"
                >
                  <iconify-icon icon="${this._fullscreenButtonIcon}" aria-hidden="true"></iconify-icon>
                </ui-button>
              </div>
            </div>
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
