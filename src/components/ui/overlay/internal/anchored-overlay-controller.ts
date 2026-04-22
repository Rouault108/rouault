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
}

const DEFAULT_EDGE_PADDING = 8;

export class AnchoredOverlayController {
  private readonly _config: AnchoredOverlayControllerConfig;
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

      const roundedX = Math.round(x);
      const roundedY = Math.round(y);
      floating.style.left = `${String(roundedX)}px`;
      floating.style.top = `${String(roundedY)}px`;
      this._config.onPosition?.({
        x: roundedX,
        y: roundedY,
        placement,
        reference,
        floating,
      });
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