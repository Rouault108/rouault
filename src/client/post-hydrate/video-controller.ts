import type { IconName } from '../../../shared/icons/icon-paths.js';
export type VideoState =
  | 'EMPTY'
  | 'LOADING'
  | 'PAUSED'
  | 'PLAYING'
  | 'BUFFERING'
  | 'ENDED'
  | 'ERROR';
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

export class VideoController {
  private _status: VideoState = 'EMPTY';

  private _currentTime = 0;

  private _duration = 0;

  private _bufferedEnd = 0;

  private _volume = 1;

  private _isFullscreen = false;

  private _captionsActive = false;

  private _errorMessage = '';

  private _overlayCenterVisible = true;

  private _skipButtonsVisible = false;

  private _isLongPress = false;

  /** 初回再生が開始されたかどうか */
  private _hasStartedPlayback = false;

  /** フローティングバーの表示状態（JS制御） */
  private _floatingBarVisible = false;

  /** スキップインジケータ: 'none' | 'forward' | 'back' */
  private _skipIndicator: 'none' | 'forward' | 'back' = 'none';

  private _videoElement?: HTMLVideoElement;

  private _retryButton: HTMLButtonElement | undefined;

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

  private muted = true;
  private autoplay = false;
  private queued = false;
  private disposed = false;
  private enhanced = false;
  private readonly player: HTMLElement;
  private readonly controls: HTMLElement;

  constructor(
    private readonly root: HTMLElement,
    private readonly signal: AbortSignal,
  ) {
    const media = root.querySelector<HTMLVideoElement>(':scope > [data-video-player] > video');
    const player = root.querySelector<HTMLElement>(':scope > [data-video-player]');
    const controls = player?.querySelector<HTMLElement>(':scope > [data-video-enhanced-controls]');
    if (!media || !player || !controls)
      throw new Error('[video] native media / controls が必要です');
    for (const action of ['play', 'back', 'forward', 'mute', 'captions', 'fullscreen', 'retry']) {
      if (!controls.querySelector(`button[data-video-action="${action}"]`))
        throw new Error(`[video] native ${action} control が必要です`);
    }
    for (const range of ['seek', 'volume']) {
      if (!controls.querySelector(`input[type="range"][data-video-${range}]`))
        throw new Error(`[video] native ${range} range が必要です`);
    }
    this._videoElement = media;
    this.player = player;
    this.controls = controls;
    this._retryButton =
      controls.querySelector<HTMLButtonElement>('[data-video-action="retry"]') ?? undefined;
    this.autoplay = media.autoplay;
    this.muted = media.muted;
    this._volume = media.muted ? 0 : media.volume;
    this._volumeBeforeMute = media.volume > 0 ? media.volume : 1;
    this._duration = Number.isFinite(media.duration) ? media.duration : 0;
    this._currentTime = media.currentTime;
    this._bufferedEnd = this._getBufferedEnd(media);
    this._captionsActive = Array.from(media.textTracks).some(
      (track) =>
        (track.kind === 'captions' || track.kind === 'subtitles') && track.mode === 'showing',
    );
    this._hasStartedPlayback = media.played.length > 0 || !media.paused || media.currentTime > 0;
    this._didApplyInitialPlaybackMute = this._hasStartedPlayback || !media.muted;
    this._status = !this._hasMediaSource
      ? 'EMPTY'
      : media.error
        ? 'ERROR'
        : media.ended
          ? 'ENDED'
          : !media.paused
            ? 'PLAYING'
            : media.readyState >= 1
              ? 'PAUSED'
              : 'LOADING';
    this._previousStatus = this._status;
    this._errorMessage = media.error ? this._resolveMediaErrorMessage(media.error) : '';
    this._desktopMQ = root.ownerDocument.defaultView?.matchMedia('(min-width: 768px)') ?? null;
    const mediaEvents: Readonly<Record<string, (event: Event) => void>> = {
      loadedmetadata: this._onLoadedMetadata,
      canplay: this._onCanPlay,
      playing: this._onPlaying,
      waiting: this._onWaiting,
      pause: this._onPause,
      timeupdate: this._onTimeUpdate,
      progress: this._onProgress,
      durationchange: this._onDurationChange,
      volumechange: this._onVolumeChange,
      ended: this._onEnded,
      error: this._onVideoError,
    };
    for (const [name, handler] of Object.entries(mediaEvents))
      media.addEventListener(name, handler, { signal });
    media.textTracks.addEventListener(
      'change',
      () => {
        this._captionsActive = Array.from(media.textTracks).some(
          (track) =>
            (track.kind === 'captions' || track.kind === 'subtitles') && track.mode === 'showing',
        );
        this.scheduleProjection();
      },
      { signal },
    );
    root.ownerDocument.addEventListener('fullscreenchange', this._onFullscreenChange, { signal });
    root.ownerDocument.addEventListener('click', this._onDocumentClick, { signal });
    player.addEventListener('mousemove', this._onShellMouseMove, { signal });
    player.addEventListener('pointerenter', this._onShellPointerEnter, { signal });
    player.addEventListener('pointerleave', this._onPointerLeave, { signal });
    player.addEventListener(
      'pointerdown',
      (event) => {
        if (this.enhanced) this._onPointerDown(event);
      },
      { signal },
    );
    player.addEventListener(
      'pointerup',
      () => {
        if (this.enhanced) this._onPointerUp();
      },
      { signal },
    );
    player.addEventListener(
      'pointercancel',
      () => {
        if (this.enhanced) this._onPointerUp();
      },
      { signal },
    );
    player.addEventListener(
      'click',
      (event) => {
        if (this.enhanced) this._onShellClick(event);
      },
      { signal },
    );
    player.addEventListener(
      'keydown',
      (event) => {
        if (this.enhanced) this._onShellKeyDown(event);
      },
      { signal },
    );
    for (const button of controls.querySelectorAll<HTMLButtonElement>('[data-video-action]')) {
      button.addEventListener(
        'click',
        () => {
          const floating = button.closest('.floating-bar') !== null;
          switch (button.dataset['videoAction']) {
            case 'play':
              if (floating) this._onFloatingBarPlay();
              else this._togglePlayback();
              break;
            case 'back':
              if (floating) this._onFloatingBarSkipBack();
              else this._onSkipBack();
              break;
            case 'forward':
              if (floating) this._onFloatingBarSkipForward();
              else this._onSkipForward();
              break;
            case 'mute':
              this._toggleMuted();
              break;
            case 'captions':
              this._toggleCaptions();
              break;
            case 'fullscreen':
              void this._toggleFullscreen();
              break;
            case 'retry':
              this._onRetryClick();
              break;
          }
        },
        { signal },
      );
    }
    controls
      .querySelector('[data-video-seek]')
      ?.addEventListener('input', this._onSeekInput, { signal });
    controls
      .querySelector('[data-video-volume]')
      ?.addEventListener('input', this._onVolumeInput, { signal });
    // 起動判定ではなくnative controlからのfocus handoffだけを待つ。
    media.addEventListener(
      'focusout',
      () => {
        queueMicrotask(() => {
          this.commitEnhancement();
        });
      },
      { signal },
    );
    this.commitEnhancement();
  }

  private commitEnhancement(): void {
    const media = this._videoElement;
    if (
      !media ||
      this.enhanced ||
      this.disposed ||
      this.signal.aborted ||
      this.root.ownerDocument.activeElement === media
    )
      return;
    this.project();
    this.controls.hidden = false;
    this.root.setAttribute('data-video-enhanced', '');
    media.controls = false;
    this.enhanced = true;
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
      this.scheduleProjection();
      this._volume = 0;
      this.scheduleProjection();
    }

    if (this._status === 'ENDED') {
      video.currentTime = 0;
      this._currentTime = 0;
      this.scheduleProjection();
    }

    try {
      await video.play();
    } catch (error: unknown) {
      this._errorMessage = this._resolvePlayErrorMessage(error);
      this.scheduleProjection();
      this._status = 'ERROR';
      this.scheduleProjection();
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
    this.scheduleProjection();
    this._status = 'LOADING';
    this.scheduleProjection();
    video.load();
  }

  private _onRetryClick = (): void => {
    this.retry();
  };

  private get _hasMediaSource(): boolean {
    return this._videoElement?.hasAttribute('src') === true;
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

  private get _statusRole(): 'status' | 'alert' {
    if (this._status === 'ERROR') return 'alert';
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

  private get _playButtonIcon(): IconName {
    if (this._isPlayingLike) return 'pause';
    if (this._status === 'ENDED') return 'rotate-ccw';
    return 'play';
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

  private get _muteButtonIcon(): IconName {
    if (this.muted || this._volume === 0) return 'volume-x';
    if (this._volume < 0.5) return 'volume-1';
    return 'volume-2';
  }

  private get _fullscreenButtonLabel(): string {
    return this._isFullscreen ? '全画面を終了' : '全画面表示';
  }

  private get _fullscreenButtonIcon(): IconName {
    return this._isFullscreen ? 'minimize' : 'maximize';
  }

  private get _hasTracks(): boolean {
    return Array.from(this._videoElement?.textTracks ?? []).some(
      (track) => track.kind === 'captions' || track.kind === 'subtitles',
    );
  }
  private get _captionToggleLabel(): string {
    return this._captionsActive ? '字幕をオフ' : '字幕をオン';
  }

  private get _captionToggleIcon(): IconName {
    return this._captionsActive ? 'captions' : 'captions-off';
  }

  private get _controlDisabled(): boolean {
    return this._isDisabled || this._status === 'ERROR';
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
    if (error.code === MediaError.MEDIA_ERR_NETWORK)
      return 'ネットワークの問題で動画を読み込めませんでした。';
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
      this.scheduleProjection();
      this._skipButtonsVisible = false;
      this.scheduleProjection();
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
    this.scheduleProjection();
    this._skipButtonsVisible = true;
    this.scheduleProjection();
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
    this.scheduleProjection();
    this._cancelFloatingBarHide();
  }

  private _hideFloatingBar(): void {
    this._floatingBarVisible = false;
    this.scheduleProjection();
    this._cancelFloatingBarHide();
  }

  private _scheduleFloatingBarHide(): void {
    this._cancelFloatingBarHide();
    this._floatingBarTimer = setTimeout(() => {
      this._floatingBarVisible = false;
      this.scheduleProjection();
      // モバイルでは再生中にセンターボタンも隠す
      if (!this._isDesktop && this._isPlayingLike) {
        this._overlayCenterVisible = false;
        this.scheduleProjection();
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
    this.scheduleProjection();
    this._cancelSkipIndicator();
    this._skipIndicatorTimer = setTimeout(() => {
      this._skipIndicator = 'none';
      this.scheduleProjection();
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
    const shell = this.root.querySelector('.player-shell');
    if (!shell) return;
    if (!this._hasStartedPlayback) return;
    if (event.composedPath().includes(shell)) return;
    this._hideFloatingBar();
    if (!this._isDesktop && this._isPlayingLike) {
      this._overlayCenterVisible = false;
      this.scheduleProjection();
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
      this.scheduleProjection();
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
      (el) => el instanceof HTMLButtonElement || el instanceof HTMLInputElement,
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
    if (target instanceof HTMLButtonElement || target instanceof HTMLInputElement) {
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
    const shell = this.root.querySelector<HTMLElement>('.player-shell');
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
    this.scheduleProjection();

    if (this._status === 'ENDED' && next < this._seekMax) {
      this._status = 'PAUSED';
      this.scheduleProjection();
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
    this.scheduleProjection();
    if (next === 0) {
      video.muted = true;
      this.muted = true;
      this.scheduleProjection();
    } else if (video.muted) {
      video.muted = false;
      this.muted = false;
      this.scheduleProjection();
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
      this.scheduleProjection();
      // スライダーを視覚的に 0 へ
      this._volume = 0;
      this.scheduleProjection();
    } else {
      // ミュート解除: 保存してボリュームを復元
      const restore = this._volumeBeforeMute > 0 ? this._volumeBeforeMute : 0.5;
      video.muted = false;
      video.volume = restore;
      this.muted = false;
      this.scheduleProjection();
      this._volume = restore;
      this.scheduleProjection();
    }
  };

  private _toggleCaptions = (): void => {
    const video = this._videoElement;
    if (!video) return;

    const nextActive = !this._captionsActive;
    this._captionsActive = nextActive;
    this.scheduleProjection();

    // TextTrackList の全トラックに対してモードを切り替え
    for (const track of Array.from(video.textTracks)) {
      if (track.kind === 'captions' || track.kind === 'subtitles') {
        track.mode = nextActive ? 'showing' : 'hidden';
      }
    }
  };

  // ─── 全画面制御 ───
  private _toggleFullscreen = async (): Promise<void> => {
    if (typeof document === 'undefined') return;
    const shell = this.root.querySelector<HTMLElement>('.player-shell');
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
    this._isFullscreen = document.fullscreenElement === this.player;
    this.scheduleProjection();
  };

  // ─── 長押し2倍速───

  private _onPointerDown = (event: PointerEvent): void => {
    // コンポーザードパスにボタンやスライダーが含まれる場合はスキップ
    const path = event.composedPath();
    const hasInteractiveTarget = path.some(
      (el) => el instanceof HTMLButtonElement || el instanceof HTMLInputElement,
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
    this.scheduleProjection();
    video.playbackRate = 2;
  }

  private _cancelLongPress(): void {
    if (this._longPressTimer !== null) {
      clearTimeout(this._longPressTimer);
      this._longPressTimer = null;
    }
    if (this._isLongPress) {
      this._isLongPress = false;
      this.scheduleProjection();
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
    this.scheduleProjection();

    if (this._status === 'ENDED' && this._currentTime < this._seekMax) {
      this._status = 'PAUSED';
      this.scheduleProjection();
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
    this.scheduleProjection();
    this.muted = video.muted;
    this.scheduleProjection();
  };

  private _onLoadedMetadata = (event: Event): void => {
    const video = event.currentTarget;
    if (!(video instanceof HTMLVideoElement)) return;

    this._duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0;
    this.scheduleProjection();
    this._currentTime = this._clamp(
      video.currentTime,
      0,
      this._duration > 0 ? this._duration : Infinity,
    );
    this.scheduleProjection();
    this._bufferedEnd = this._duration > 0 ? this._getBufferedEnd(video) : 0;
    this.scheduleProjection();
    this._volume = video.muted ? 0 : this._clamp(video.volume, 0, 1);
    this.scheduleProjection();
    this.muted = video.muted;
    this.scheduleProjection();

    this._status = video.ended ? 'ENDED' : !video.paused ? 'PLAYING' : 'PAUSED';
    this.scheduleProjection();

    this._captionsActive = Array.from(video.textTracks).some(
      (track) =>
        track.mode === 'showing' && (track.kind === 'captions' || track.kind === 'subtitles'),
    );
    this.scheduleProjection();
  };

  private _onCanPlay = (event: Event): void => {
    const video = event.currentTarget;
    if (!(video instanceof HTMLVideoElement)) return;
    if (this._status === 'ERROR') return;

    this._duration =
      Number.isFinite(video.duration) && video.duration > 0 ? video.duration : this._duration;
    this._bufferedEnd = this._duration > 0 ? this._getBufferedEnd(video) : this._bufferedEnd;
    this.scheduleProjection();

    if (!video.paused && !video.ended) {
      this._status = 'PLAYING';
      this.scheduleProjection();
      return;
    }

    if (this._status === 'LOADING' || this._status === 'BUFFERING') {
      this._status = 'PAUSED';
      this.scheduleProjection();
    }
  };

  private _onPlaying = (): void => {
    if (this._status === 'ERROR' || this._status === 'EMPTY') return;
    this._status = 'PLAYING';
    this.scheduleProjection();
    this._hasStartedPlayback = true;
    this.scheduleProjection();
    // 再生開始時にオーバーレイを自動非表示スケジュール
    this._scheduleOverlayHide();
    // フローティングバーを表示後、自動非表示をスケジュール
    this._showFloatingBar();
    this._scheduleFloatingBarHide();
  };

  private _onWaiting = (): void => {
    if (this._status !== 'PLAYING') return;
    this._status = 'BUFFERING';
    this.scheduleProjection();
  };

  private _onPause = (event: Event): void => {
    const video = event.currentTarget;
    if (!(video instanceof HTMLVideoElement)) return;
    if (video.ended) return;
    if (this._status === 'ERROR' || this._status === 'EMPTY') return;

    this._status = 'PAUSED';
    this.scheduleProjection();
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
    this._currentTime = this._clamp(
      video.currentTime,
      0,
      this._seekMax > 0 ? this._seekMax : Infinity,
    );
    this.scheduleProjection();
  };

  private _onProgress = (event: Event): void => {
    const video = event.currentTarget;
    if (!(video instanceof HTMLVideoElement)) return;

    if (this._seekMax <= 0) {
      this._bufferedEnd = 0;
      this.scheduleProjection();
      return;
    }

    this._bufferedEnd = this._clamp(this._getBufferedEnd(video), 0, this._seekMax);
    this.scheduleProjection();
  };

  private _onDurationChange = (event: Event): void => {
    const video = event.currentTarget;
    if (!(video instanceof HTMLVideoElement)) return;
    if (!Number.isFinite(video.duration) || video.duration <= 0) return;
    this._duration = video.duration;
    this.scheduleProjection();
  };

  private _onVolumeChange = (event: Event): void => {
    const video = event.currentTarget;
    if (!(video instanceof HTMLVideoElement)) return;
    // ミュート中はスライダーを 0 に固定し、実際の volume 値は反映しない
    if (video.muted) {
      this._volume = 0;
      this.scheduleProjection();
    } else {
      this._volume = this._clamp(video.volume, 0, 1);
      this.scheduleProjection();
    }
    this.muted = video.muted;
    this.scheduleProjection();
  };

  private _onEnded = (event: Event): void => {
    const video = event.currentTarget;
    if (!(video instanceof HTMLVideoElement)) return;

    this._currentTime = this._seekMax > 0 ? this._seekMax : video.currentTime;
    this.scheduleProjection();
    this._status = 'ENDED';
    this.scheduleProjection();
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
    this.scheduleProjection();
    this._status = 'ERROR';
    this.scheduleProjection();
  };

  private scheduleProjection(): void {
    if (this.queued || this.disposed) return;
    this.queued = true;
    queueMicrotask(() => {
      this.queued = false;
      if (!this.disposed && !this.signal.aborted) this.project();
    });
  }

  private project(): void {
    const query = (selector: string): HTMLElement | null =>
      this.controls.querySelector<HTMLElement>(selector);
    this.root.dataset['state'] = this._status.toLowerCase();
    this.root.setAttribute('aria-busy', String(this._isBusy));
    this.root.setAttribute('aria-disabled', String(this._isDisabled));
    this.player.dataset['state'] = this._status.toLowerCase();
    this.player.classList.toggle('is-playing', this._isPlayingLike);
    this.player.classList.toggle('is-paused', !this._isPlayingLike);
    this.player.classList.toggle('is-fullscreen', this._isFullscreen);
    this.player.classList.toggle('is-long-press', this._isLongPress);
    for (const [selector, visible] of [
      ['[data-video-empty]', this._status === 'EMPTY'],
      ['[data-video-loading]', this._isBusy],
      ['[data-video-error]', this._status === 'ERROR'],
    ] as const) {
      const element = query(selector);
      if (element) element.hidden = !visible;
    }
    const error = query('[data-video-error-text]');
    if (error) error.textContent = this._errorMessage;
    const live = this.player.querySelector('[data-video-live-region]');
    if (live) {
      live.setAttribute('role', this._statusRole);
      live.setAttribute('aria-live', this._statusLive);
      if (live.textContent !== this._statusMessage) live.textContent = this._statusMessage;
    }
    for (const button of this.controls.querySelectorAll<HTMLButtonElement>('[data-video-action]')) {
      const action = button.dataset['videoAction'];
      button.disabled = action === 'retry' ? !this._hasMediaSource : this._controlDisabled;
      let icon: IconName | undefined;
      if (action === 'play') {
        button.setAttribute('aria-label', this._playButtonLabel);
        button.setAttribute('aria-pressed', String(this._isPlayingLike));
        icon = this._playButtonIcon;
      } else if (action === 'mute') {
        button.setAttribute('aria-label', this._muteButtonLabel);
        icon = this._muteButtonIcon;
      } else if (action === 'captions') {
        button.hidden = !this._hasTracks;
        button.setAttribute('aria-label', this._captionToggleLabel);
        button.setAttribute('aria-pressed', String(this._captionsActive));
        icon = this._captionToggleIcon;
      } else if (action === 'fullscreen') {
        button.setAttribute('aria-label', this._fullscreenButtonLabel);
        icon = this._fullscreenButtonIcon;
      }
      if (icon)
        for (const variant of button.querySelectorAll('[data-video-icon]')) {
          variant.toggleAttribute('hidden', variant.getAttribute('data-video-icon') !== icon);
        }
    }
    const seek = this.controls.querySelector<HTMLInputElement>('[data-video-seek]');
    if (seek) {
      seek.max = String(this._seekMax);
      seek.value = String(this._seekNow);
      seek.disabled = this._controlDisabled || this._seekMax <= 0;
      seek.setAttribute('aria-valuemax', String(this._seekMax));
      seek.setAttribute('aria-valuenow', String(this._seekNow));
      seek.setAttribute('aria-valuetext', this._seekValueText);
      seek.style.setProperty('--seek-progress', `${String(this._seekProgress)}%`);
      seek.style.setProperty('--seek-buffered', `${String(this._seekBufferedProgress)}%`);
    }
    const volume = this.controls.querySelector<HTMLInputElement>('[data-video-volume]');
    if (volume) {
      volume.value = String(this._volume);
      volume.disabled = this._controlDisabled;
      volume.setAttribute('aria-valuenow', String(this._volume));
      volume.setAttribute('aria-valuetext', `${String(Math.round(this._volume * 100))}%`);
      volume.style.setProperty('--volume-progress', `${String(this._volumeProgress)}%`);
    }
    const time = query('.time-label');
    if (time) time.textContent = this._seekValueText;
    const bar = query('.floating-bar');
    if (bar) bar.className = this._floatingBarClasses;
    const center = query('.overlay-center');
    if (center) {
      center.hidden = this._status === 'ERROR';
      center
        .querySelector('.play-button')
        ?.classList.toggle('is-hidden', !this._overlayCenterVisible);
    }
    for (const button of this.controls.querySelectorAll<HTMLElement>('.skip-button')) {
      button.classList.toggle('is-visible', this._skipButtonsVisible);
    }
    query('.speed-badge')?.classList.toggle('is-active', this._isLongPress);
    query('.skip-indicator-left')?.classList.toggle('is-active', this._skipIndicator === 'back');
    query('.skip-indicator-right')?.classList.toggle(
      'is-active',
      this._skipIndicator === 'forward',
    );
    query('.fullscreen-caption')?.classList.toggle('is-visible', this._isFullscreen);
    if (this._previousStatus !== this._status && this._status === 'ERROR' && this.enhanced) {
      this._retryButton?.focus();
    }
    this._previousStatus = this._status;
  }

  destroy(): void {
    this.disposed = true;
    this._cancelOverlayHide();
    this._cancelSkipHide();
    this._cancelLongPress();
    this._cancelFloatingBarHide();
    this._cancelSkipIndicator();
    if (this._singleTapTimer !== null) clearTimeout(this._singleTapTimer);
    if (this._videoElement?.isConnected) this._videoElement.controls = true;
    this.controls.hidden = true;
    this.root.removeAttribute('data-video-enhanced');
  }
}
