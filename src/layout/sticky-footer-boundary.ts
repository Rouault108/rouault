export interface StickyBoundaryMetrics {
  footerTop: number | null;
  stickyTop: number;
  viewportHeight: number;
}

export interface StickyFooterBoundaryOptions {
  minWidth?: number;
}

const clampToNonNegative = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, value);
};

export const computeStickyMaxBlockSize = ({
  stickyTop,
  viewportHeight,
}: StickyBoundaryMetrics): number => {
  return clampToNonNegative(viewportHeight - stickyTop);
};

export const computeStickyFooterOffset = ({
  footerTop,
  viewportHeight,
}: Pick<StickyBoundaryMetrics, 'footerTop' | 'viewportHeight'>): number => {
  if (footerTop === null) {
    return 0;
  }

  return clampToNonNegative(viewportHeight - footerTop);
};

const resolveFooterHost = (): HTMLElement | null =>
  document.querySelector<HTMLElement>('layout-footer');

const readPxCustomProperty = (element: HTMLElement, propertyName: string): number => {
  const rawValue = getComputedStyle(element).getPropertyValue(propertyName).trim();
  if (rawValue.length === 0) {
    return 0;
  }

  const parsed = Number.parseFloat(rawValue);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const attachStickyFooterBoundary = (
  target: HTMLElement,
  options: StickyFooterBoundaryOptions = {},
): (() => void) => {
  if (typeof window === 'undefined') {
    // SSR環境では何もしないクリーンアップ関数を返す
    return (): void => undefined;
  }

  let frameId = 0;
  let footerHost = resolveFooterHost();
  let eventAbortController: AbortController | null = null;
  const mediaQuery =
    typeof options.minWidth === 'number'
      ? window.matchMedia(`(min-width: ${String(options.minWidth)}px)`)
      : null;
  const resizeObserver =
    typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(() => {
          scheduleUpdate();
        });

  const clearStickyStyles = (): void => {
    target.style.removeProperty('--layout-sticky-max-block-size');
    target.style.removeProperty('--layout-sticky-footer-offset');
  };

  const isEnabled = (): boolean => mediaQuery?.matches ?? true;

  const update = (): void => {
    frameId = 0;
    if (!isEnabled()) {
      clearStickyStyles();
      return;
    }

    footerHost ??= resolveFooterHost();

    const stickyTop = readPxCustomProperty(target, '--header-height');
    const footerTop = footerHost?.getBoundingClientRect().top ?? null;
    const maxBlockSize = computeStickyMaxBlockSize({
      footerTop,
      stickyTop,
      viewportHeight: window.innerHeight,
    });
    const footerOffset = computeStickyFooterOffset({
      footerTop,
      viewportHeight: window.innerHeight,
    });

    target.style.setProperty('--layout-sticky-max-block-size', `${String(maxBlockSize)}px`);
    target.style.setProperty('--layout-sticky-footer-offset', `${String(footerOffset)}px`);
  };

  const scheduleUpdate = (): void => {
    if (frameId !== 0) {
      return;
    }

    frameId = window.requestAnimationFrame(update);
  };

  const detachWindowListeners = (): void => {
    eventAbortController?.abort();
    eventAbortController = null;
  };

  const attachWindowListeners = (): void => {
    if (eventAbortController !== null) {
      return;
    }

    eventAbortController = new AbortController();
    window.addEventListener('scroll', scheduleUpdate, {
      passive: true,
      signal: eventAbortController.signal,
    });
    window.addEventListener('resize', scheduleUpdate, {
      passive: true,
      signal: eventAbortController.signal,
    });
  };

  const syncActivation = (): void => {
    if (!isEnabled()) {
      detachWindowListeners();
      if (frameId !== 0) {
        window.cancelAnimationFrame(frameId);
        frameId = 0;
      }
      clearStickyStyles();
      return;
    }

    attachWindowListeners();
    scheduleUpdate();
  };

  mediaQuery?.addEventListener('change', syncActivation);

  resizeObserver?.observe(document.documentElement);
  if (footerHost) {
    resizeObserver?.observe(footerHost);
  }

  syncActivation();

  return () => {
    detachWindowListeners();
    mediaQuery?.removeEventListener('change', syncActivation);
    if (frameId !== 0) {
      window.cancelAnimationFrame(frameId);
    }
    resizeObserver?.disconnect();
    clearStickyStyles();
  };
};
