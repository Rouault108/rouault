export interface TocMobileSummaryControllerOptions {
  enabled: boolean;
  onVisibilityChange: (visible: boolean) => void;
}

export class TocMobileSummaryController {
  private readonly _enabled: boolean;
  private readonly _onVisibilityChange: (visible: boolean) => void;
  private _mediaQuery: MediaQueryList | null = null;
  private _started = false;

  constructor(options: TocMobileSummaryControllerOptions) {
    this._enabled = options.enabled;
    this._onVisibilityChange = options.onVisibilityChange;
  }

  start(): void {
    if (this._started) {
      return;
    }

    this._started = true;

    if (typeof window === 'undefined' || !this._enabled) {
      this._onVisibilityChange(false);
      return;
    }

    this._mediaQuery = window.matchMedia('(max-width: 639px)');
    this._mediaQuery.addEventListener('change', this._onStateChange);
    window.addEventListener('scroll', this._onStateChange, { passive: true });
    this.refresh();
  }

  destroy(): void {
    if (!this._started) {
      return;
    }

    this._started = false;
    this._mediaQuery?.removeEventListener('change', this._onStateChange);
    this._mediaQuery = null;

    if (typeof window !== 'undefined') {
      window.removeEventListener('scroll', this._onStateChange);
    }
  }

  refresh(): void {
    if (typeof window === 'undefined' || !this._enabled) {
      this._onVisibilityChange(false);
      return;
    }

    const isMobile = this._mediaQuery?.matches ?? false;
    if (!isMobile) {
      this._onVisibilityChange(false);
      return;
    }

    const headerHeightRaw = getComputedStyle(document.documentElement)
      .getPropertyValue('--header-height')
      .trim();
    const headerHeight = Number.parseFloat(headerHeightRaw);
    const threshold = Number.isFinite(headerHeight) ? headerHeight : 48;
    this._onVisibilityChange(window.scrollY > threshold);
  }

  private _onStateChange = (): void => {
    this.refresh();
  };
}
