import {
  autoUpdate,
  computePosition,
  flip,
  offset as applyOffset,
  shift,
  type Placement,
} from '@floating-ui/dom';

export type AnchoredOverlayDismissReason = 'outside-pointer' | 'escape' | 'scroll';
export type AnchoredOverlayScrollStrategy = 'ignore' | 'close';

export interface AnchoredOverlayPositionContext {
  x: number;
  y: number;
  placement: Placement;
  reference: HTMLElement;
  floating: HTMLElement;
}

export interface AnchoredOverlayCommitSnapshot {
  x: number;
  y: number;
  placement: Placement;
  reference: HTMLElement;
  floating: HTMLElement;
  referenceRect: DOMRectReadOnly;
  floatingWidth: number;
  floatingHeight: number;
}

export interface AnchoredOverlayControllerConfig {
  ownerDocument: Document;
  getReference: () => HTMLElement | null;
  getFloating: () => HTMLElement | null;
  getOpen: () => boolean;
  getPlacement: () => Placement;
  getOffset: () => number;
  edgePadding?: number;
  outsidePointerDismiss?: boolean;
  escapeDismiss?: boolean;
  scrollStrategy?: AnchoredOverlayScrollStrategy;
  shouldDismissOnScroll?: (event: Event) => boolean;
  onDismissRequest?: (reason: AnchoredOverlayDismissReason, event: Event) => void;
  onPosition?: (context: AnchoredOverlayPositionContext) => void;
  onCommit?: (snapshot: AnchoredOverlayCommitSnapshot) => void;
}

const DEFAULT_EDGE_PADDING = 12;

const clampToRange = (value: number, min: number, max: number): number => {
  if (max < min) {
    return min;
  }

  return Math.min(Math.max(value, min), max);
};

const roundViewportCorrection = (delta: number): number => {
  if (!Number.isFinite(delta) || delta === 0) {
    return 0;
  }

  return delta > 0 ? Math.ceil(delta) : Math.floor(delta);
};

export class AnchoredOverlayController {
  private readonly _config: AnchoredOverlayControllerConfig;
  private _lastCommitSnapshot: AnchoredOverlayCommitSnapshot | null = null;
  private _cleanupAutoUpdate: (() => void) | null = null;
  private _cleanupOutsidePointerListener: (() => void) | null = null;
  private _cleanupKeydownListener: (() => void) | null = null;
  private _cleanupScrollListener: (() => void) | null = null;

  constructor(config: AnchoredOverlayControllerConfig) {
    this._config = config;
  }

  syncOpenState(open: boolean): void {
    if (open) {
      this.activate();
      void this.refreshPosition();
      return;
    }

    this.deactivate();
  }

  activate(): void {
    this._setupDismissListeners();
  }

  deactivate(): void {
    this.stopAutoUpdate();
    this._teardownDismissListeners();
  }

  getLastCommitSnapshot(): AnchoredOverlayCommitSnapshot | null {
    return this._lastCommitSnapshot;
  }

  async recomputePosition(): Promise<boolean> {
    const reference = this._config.getReference();
    const floating = this._config.getFloating();

    if (!reference || !floating || !this._config.getOpen()) {
      return false;
    }

    try {
      const { x, y, placement } = await computePosition(reference, floating, {
        strategy: 'fixed',
        placement: this._config.getPlacement(),
        middleware: [
          applyOffset(this._config.getOffset()),
          flip({ padding: this._config.edgePadding ?? DEFAULT_EDGE_PADDING }),
          shift({ padding: this._config.edgePadding ?? DEFAULT_EDGE_PADDING }),
        ],
      });

      const edgePadding = this._config.edgePadding ?? DEFAULT_EDGE_PADDING;
      const visualViewport = this._config.ownerDocument.defaultView?.visualViewport;
      const viewportLeft = visualViewport?.offsetLeft ?? 0;
      const viewportTop = visualViewport?.offsetTop ?? 0;
      const viewportWidth =
        visualViewport?.width ?? this._config.ownerDocument.documentElement.clientWidth;
      const viewportHeight =
        visualViewport?.height ?? this._config.ownerDocument.documentElement.clientHeight;
      const floatingRect = floating.getBoundingClientRect();
      const minX = viewportLeft + edgePadding;
      const minY = viewportTop + edgePadding;
      const maxX = viewportLeft + viewportWidth - floatingRect.width - edgePadding;
      const maxY = viewportTop + viewportHeight - floatingRect.height - edgePadding;
      let resolvedX = Math.round(clampToRange(x, minX, maxX));
      let resolvedY = Math.round(clampToRange(y, minY, maxY));
      floating.style.left = `${String(resolvedX)}px`;
      floating.style.top = `${String(resolvedY)}px`;

      /*
       * WebKit の popover/top-layer 合成では、style 上の fixed 座標と最終 rect が
       * ずれることがある。実測 rect を再 clamp して edge padding 契約を維持する。
       */
      const actualRect = floating.getBoundingClientRect();
      const viewportRight = viewportLeft + viewportWidth;
      const viewportBottom = viewportTop + viewportHeight;
      const overflowLeft = minX - actualRect.left;
      const overflowTop = minY - actualRect.top;
      const overflowRight = actualRect.right - (viewportRight - edgePadding);
      const overflowBottom = actualRect.bottom - (viewportBottom - edgePadding);

      if (overflowLeft > 0) {
        resolvedX += roundViewportCorrection(overflowLeft);
      }
      if (overflowTop > 0) {
        resolvedY += roundViewportCorrection(overflowTop);
      }
      if (overflowRight > 0) {
        resolvedX -= roundViewportCorrection(overflowRight);
      }
      if (overflowBottom > 0) {
        resolvedY -= roundViewportCorrection(overflowBottom);
      }

      const correctedMaxX = viewportRight - actualRect.width - edgePadding;
      const correctedMaxY = viewportBottom - actualRect.height - edgePadding;
      resolvedX = Math.round(clampToRange(resolvedX, minX, correctedMaxX));
      resolvedY = Math.round(clampToRange(resolvedY, minY, correctedMaxY));
      floating.style.left = `${String(resolvedX)}px`;
      floating.style.top = `${String(resolvedY)}px`;
      const referenceRect = reference.getBoundingClientRect();
      const commitSnapshot: AnchoredOverlayCommitSnapshot = {
        x: resolvedX,
        y: resolvedY,
        placement,
        reference,
        floating,
        referenceRect: new DOMRectReadOnly(
          referenceRect.x,
          referenceRect.y,
          referenceRect.width,
          referenceRect.height,
        ),
        floatingWidth: actualRect.width,
        floatingHeight: actualRect.height,
      };
      this._lastCommitSnapshot = commitSnapshot;
      this._config.onPosition?.({
        x: resolvedX,
        y: resolvedY,
        placement,
        reference,
        floating,
      });
      this._config.onCommit?.(commitSnapshot);
      return true;
    } catch {
      return false;
    }
  }

  async refreshPosition(): Promise<boolean> {
    const positioned = await this.recomputePosition();

    if (!positioned) {
      this.stopAutoUpdate();
      return false;
    }

    this.startAutoUpdate();
    return true;
  }

  startAutoUpdate(): boolean {
    const reference = this._config.getReference();
    const floating = this._config.getFloating();

    if (!reference || !floating || !this._config.getOpen()) {
      this.stopAutoUpdate();
      return false;
    }

    if (this._cleanupAutoUpdate !== null) {
      return true;
    }

    this._cleanupAutoUpdate = autoUpdate(reference, floating, () => {
      void this.recomputePosition();
    });
    return true;
  }

  stopAutoUpdate(): void {
    this._cleanupAutoUpdate?.();
    this._cleanupAutoUpdate = null;
  }

  destroy(): void {
    this.deactivate();
  }

  private _setupDismissListeners(): void {
    if (this._config.outsidePointerDismiss && this._cleanupOutsidePointerListener === null) {
      const handlePointerDown = (event: PointerEvent): void => {
        if (!this._config.getOpen()) {
          return;
        }
        if (event.defaultPrevented) {
          return;
        }
        if (typeof event.button === 'number' && event.button !== 0) {
          return;
        }

        const reference = this._config.getReference();
        const floating = this._config.getFloating();
        const path = event.composedPath();
        if (reference && path.includes(reference)) {
          return;
        }
        if (floating && path.includes(floating)) {
          return;
        }

        this._config.onDismissRequest?.('outside-pointer', event);
      };

      this._config.ownerDocument.addEventListener('pointerdown', handlePointerDown, true);
      this._cleanupOutsidePointerListener = (): void => {
        this._config.ownerDocument.removeEventListener('pointerdown', handlePointerDown, true);
        this._cleanupOutsidePointerListener = null;
      };
    }

    if (this._config.escapeDismiss && this._cleanupKeydownListener === null) {
      const handleKeyDown = (event: KeyboardEvent): void => {
        if (!this._config.getOpen()) {
          return;
        }
        if (event.defaultPrevented || event.key !== 'Escape') {
          return;
        }

        this._config.onDismissRequest?.('escape', event);
      };

      this._config.ownerDocument.addEventListener('keydown', handleKeyDown);
      this._cleanupKeydownListener = (): void => {
        this._config.ownerDocument.removeEventListener('keydown', handleKeyDown);
        this._cleanupKeydownListener = null;
      };
    }

    if (
      this._config.scrollStrategy === 'close' &&
      this._cleanupScrollListener === null &&
      this._config.ownerDocument.defaultView
    ) {
      const view = this._config.ownerDocument.defaultView;
      const handleScroll = (event: Event): void => {
        if (!this._config.getOpen()) {
          return;
        }
        if (this._config.shouldDismissOnScroll && !this._config.shouldDismissOnScroll(event)) {
          return;
        }

        this._config.onDismissRequest?.('scroll', event);
      };

      view.addEventListener('scroll', handleScroll, { capture: true, passive: true });
      this._cleanupScrollListener = (): void => {
        view.removeEventListener('scroll', handleScroll, true);
        this._cleanupScrollListener = null;
      };
    }
  }

  private _teardownDismissListeners(): void {
    this._cleanupOutsidePointerListener?.();
    this._cleanupKeydownListener?.();
    this._cleanupScrollListener?.();
  }
}
