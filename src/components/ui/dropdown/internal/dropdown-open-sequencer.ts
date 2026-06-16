import type { AnchoredOverlayCommitSnapshot } from '../../overlay/internal/anchored-overlay-controller.js';

export type DropdownReadyResult = 'ready' | 'failed' | 'cancelled';

export interface DropdownOpenSequencerDeps {
  recomputePosition: () => Promise<boolean>;
  isStillOpen: () => boolean;
  getLastCommitSnapshot: () => AnchoredOverlayCommitSnapshot | null;
  onReady: () => void;
  onFail: () => void;
}

type DropdownTimeoutHandler = () => void;
type DropdownTimeoutId = number;
type DropdownSetTimeout = (handler: DropdownTimeoutHandler, timeout?: number) => DropdownTimeoutId;
type DropdownClearTimeout = (timeoutId: DropdownTimeoutId) => void;

export interface DropdownOpenSequencerConfig {
  watchdogMs?: number;
  fallbackDelayMs?: number;
  now?: () => number;
  requestAnimationFrame?: typeof requestAnimationFrame;
  cancelAnimationFrame?: typeof cancelAnimationFrame;
  setTimeout?: DropdownSetTimeout;
  clearTimeout?: DropdownClearTimeout;
}

const DEFAULT_WATCHDOG_MS = 320;
const DEFAULT_FALLBACK_DELAY_MS = 32;
const NEAR_TRIGGER_THRESHOLD = 160;
const DEFAULT_REQUEST_ANIMATION_FRAME: typeof requestAnimationFrame = (...args) =>
  window.requestAnimationFrame(...args);
const DEFAULT_CANCEL_ANIMATION_FRAME: typeof cancelAnimationFrame = (...args) => {
  window.cancelAnimationFrame(...args);
};
const DEFAULT_SET_TIMEOUT: DropdownSetTimeout = (handler, timeout) =>
  window.setTimeout(handler, timeout);
const DEFAULT_CLEAR_TIMEOUT: DropdownClearTimeout = (timeoutId) => {
  window.clearTimeout(timeoutId);
};

const getPlacementSide = (placement: string): 'top' | 'right' | 'bottom' | 'left' => {
  if (placement.startsWith('top')) {
    return 'top';
  }
  if (placement.startsWith('right')) {
    return 'right';
  }
  if (placement.startsWith('left')) {
    return 'left';
  }
  return 'bottom';
};

const isNearTrigger = (snapshot: AnchoredOverlayCommitSnapshot): boolean => {
  const { placement, referenceRect, measuredRect } = snapshot;
  const side = getPlacementSide(placement);

  switch (side) {
    case 'top':
      return Math.abs(measuredRect.bottom - referenceRect.top) < NEAR_TRIGGER_THRESHOLD;
    case 'right':
      return Math.abs(measuredRect.left - referenceRect.right) < NEAR_TRIGGER_THRESHOLD;
    case 'left':
      return Math.abs(measuredRect.right - referenceRect.left) < NEAR_TRIGGER_THRESHOLD;
    case 'bottom':
    default:
      return Math.abs(measuredRect.top - referenceRect.bottom) < NEAR_TRIGGER_THRESHOLD;
  }
};

const isReadySnapshot = (snapshot: AnchoredOverlayCommitSnapshot | null): boolean => {
  if (!snapshot) {
    return false;
  }

  if (!Number.isFinite(snapshot.x) || !Number.isFinite(snapshot.y)) {
    return false;
  }

  if (snapshot.measuredRect.width <= 0 || snapshot.measuredRect.height <= 0) {
    return false;
  }

  return isNearTrigger(snapshot);
};

export class DropdownOpenSequencer {
  private readonly _watchdogMs: number;
  private readonly _fallbackDelayMs: number;
  private readonly _now: () => number;
  private readonly _requestAnimationFrame: typeof requestAnimationFrame;
  private readonly _cancelAnimationFrame: typeof cancelAnimationFrame;
  private readonly _setTimeout: DropdownSetTimeout;
  private readonly _clearTimeout: DropdownClearTimeout;
  private _token = 0;
  private _pendingRafId: number | null = null;
  private _pendingTimeoutId: DropdownTimeoutId | null = null;

  constructor(config: DropdownOpenSequencerConfig = {}) {
    this._watchdogMs = config.watchdogMs ?? DEFAULT_WATCHDOG_MS;
    this._fallbackDelayMs = config.fallbackDelayMs ?? DEFAULT_FALLBACK_DELAY_MS;
    this._now =
      config.now ??
      (() => {
        if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
          return performance.now();
        }
        return Date.now();
      });
    this._requestAnimationFrame = config.requestAnimationFrame ?? DEFAULT_REQUEST_ANIMATION_FRAME;
    this._cancelAnimationFrame = config.cancelAnimationFrame ?? DEFAULT_CANCEL_ANIMATION_FRAME;
    this._setTimeout = config.setTimeout ?? DEFAULT_SET_TIMEOUT;
    this._clearTimeout = config.clearTimeout ?? DEFAULT_CLEAR_TIMEOUT;
  }

  begin(deps: DropdownOpenSequencerDeps): void {
    this.cancel();
    const token = ++this._token;
    void this._run(token, deps);
  }

  cancel(): void {
    this._token += 1;
    this._clearPendingTick();
  }

  private async _run(token: number, deps: DropdownOpenSequencerDeps): Promise<void> {
    const deadline = this._now() + this._watchdogMs;
    let hadSuccessfulRecompute = false;

    while (this._isActive(token, deps)) {
      const positioned = await deps.recomputePosition();
      if (!this._isActive(token, deps)) {
        return;
      }

      hadSuccessfulRecompute ||= positioned;

      const latestSnapshot = deps.getLastCommitSnapshot();
      if (positioned && isReadySnapshot(latestSnapshot)) {
        await this._waitForNextTick(token);
        if (!this._isActive(token, deps)) {
          return;
        }

        if (isReadySnapshot(deps.getLastCommitSnapshot())) {
          deps.onReady();
          return;
        }
      }

      if (this._now() >= deadline) {
        break;
      }

      await this._waitForNextTick(token);
    }

    if (this._isActive(token, deps) && !hadSuccessfulRecompute) {
      deps.onFail();
      return;
    }

    if (this._isActive(token, deps) && !isReadySnapshot(deps.getLastCommitSnapshot())) {
      deps.onFail();
    }
  }

  private _isActive(token: number, deps: DropdownOpenSequencerDeps): boolean {
    return token === this._token && deps.isStillOpen();
  }

  private _waitForNextTick(token: number): Promise<void> {
    return new Promise((resolve) => {
      let settled = false;
      const settle = (): void => {
        if (settled) {
          return;
        }

        settled = true;
        this._clearPendingTick();
        resolve();
      };

      const rafId = this._requestAnimationFrame(() => {
        if (token !== this._token) {
          settle();
          return;
        }

        settle();
      });
      const timeoutId = this._setTimeout(() => {
        if (token !== this._token) {
          settle();
          return;
        }

        settle();
      }, this._fallbackDelayMs);

      this._pendingRafId = rafId;
      this._pendingTimeoutId = timeoutId;
    });
  }

  private _clearPendingTick(): void {
    if (this._pendingRafId !== null) {
      this._cancelAnimationFrame(this._pendingRafId);
      this._pendingRafId = null;
    }

    if (this._pendingTimeoutId !== null) {
      this._clearTimeout(this._pendingTimeoutId);
      this._pendingTimeoutId = null;
    }
  }
}
