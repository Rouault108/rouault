import type { AnchoredOverlayCommitSnapshot } from '../../overlay/internal/anchored-overlay-controller.js';

export type DropdownReadyResult = 'ready' | 'failed' | 'cancelled';

export interface DropdownOpenSequencerDeps {
  recomputePosition: () => Promise<boolean>;
  isStillOpen: () => boolean;
  getLastCommitSnapshot: () => AnchoredOverlayCommitSnapshot | null;
  onReady: () => void;
  onFail: () => void;
}

export interface DropdownOpenSequencerConfig {
  watchdogMs?: number;
  now?: () => number;
  requestAnimationFrame?: typeof requestAnimationFrame;
  cancelAnimationFrame?: typeof cancelAnimationFrame;
}

const DEFAULT_WATCHDOG_MS = 180;
const NEAR_TRIGGER_THRESHOLD = 160;
const DEFAULT_REQUEST_ANIMATION_FRAME: typeof requestAnimationFrame = (...args) =>
  window.requestAnimationFrame(...args);
const DEFAULT_CANCEL_ANIMATION_FRAME: typeof cancelAnimationFrame = (...args) => {
  window.cancelAnimationFrame(...args);
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
  const { x, y, placement, referenceRect, floatingWidth, floatingHeight } = snapshot;
  const side = getPlacementSide(placement);

  switch (side) {
    case 'top':
      return Math.abs(y + floatingHeight - referenceRect.top) < NEAR_TRIGGER_THRESHOLD;
    case 'right':
      return Math.abs(x - referenceRect.right) < NEAR_TRIGGER_THRESHOLD;
    case 'left':
      return Math.abs(x + floatingWidth - referenceRect.left) < NEAR_TRIGGER_THRESHOLD;
    case 'bottom':
    default:
      return Math.abs(y - referenceRect.bottom) < NEAR_TRIGGER_THRESHOLD;
  }
};

const isReadySnapshot = (snapshot: AnchoredOverlayCommitSnapshot | null): boolean => {
  if (!snapshot) {
    return false;
  }

  if (!Number.isFinite(snapshot.x) || !Number.isFinite(snapshot.y)) {
    return false;
  }

  if (snapshot.floatingWidth <= 0 || snapshot.floatingHeight <= 0) {
    return false;
  }

  return isNearTrigger(snapshot);
};

export class DropdownOpenSequencer {
  private readonly _watchdogMs: number;
  private readonly _now: () => number;
  private readonly _requestAnimationFrame: typeof requestAnimationFrame;
  private readonly _cancelAnimationFrame: typeof cancelAnimationFrame;
  private _token = 0;
  private _pendingRafId: number | null = null;

  constructor(config: DropdownOpenSequencerConfig = {}) {
    this._watchdogMs = config.watchdogMs ?? DEFAULT_WATCHDOG_MS;
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
  }

  begin(deps: DropdownOpenSequencerDeps): void {
    this.cancel();
    const token = ++this._token;
    void this._run(token, deps);
  }

  cancel(): void {
    this._token += 1;
    if (this._pendingRafId !== null) {
      this._cancelAnimationFrame(this._pendingRafId);
      this._pendingRafId = null;
    }
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
        await this._waitForAnimationFrame(token);
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

      await this._waitForAnimationFrame(token);
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

  private _waitForAnimationFrame(token: number): Promise<void> {
    return new Promise((resolve) => {
      const rafId = this._requestAnimationFrame(() => {
        if (this._pendingRafId === rafId) {
          this._pendingRafId = null;
        }
        if (token !== this._token) {
          resolve();
          return;
        }
        resolve();
      });
      this._pendingRafId = rafId;
    });
  }
}
