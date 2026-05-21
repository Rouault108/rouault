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
  document.querySelector<HTMLElement>('[data-layout-footer]');

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
  let observedFooterHost: HTMLElement | null = null;
  let eventAbortController: AbortController | null = null;
  let lastAppliedMaxBlockSize: string | null = null;
  let lastAppliedFooterOffset: string | null = null;

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
    lastAppliedMaxBlockSize = null;
    lastAppliedFooterOffset = null;
  };

  const applyStickyStyles = (maxBlockSize: number, footerOffset: number): void => {
    const nextMaxBlockSize = `${String(maxBlockSize)}px`;
    const nextFooterOffset = `${String(footerOffset)}px`;

    if (lastAppliedMaxBlockSize !== nextMaxBlockSize) {
      target.style.setProperty('--layout-sticky-max-block-size', nextMaxBlockSize);
      lastAppliedMaxBlockSize = nextMaxBlockSize;
    }

    if (lastAppliedFooterOffset !== nextFooterOffset) {
      target.style.setProperty('--layout-sticky-footer-offset', nextFooterOffset);
      lastAppliedFooterOffset = nextFooterOffset;
    }
  };

  const isEnabled = (): boolean => mediaQuery?.matches ?? true;

  const observeFooterHost = (): void => {
    if (resizeObserver === null || footerHost === null) {
      return;
    }

    if (observedFooterHost === footerHost) {
      return;
    }

    if (observedFooterHost !== null) {
      resizeObserver.unobserve(observedFooterHost);
    }

    resizeObserver.observe(footerHost);
    observedFooterHost = footerHost;
  };

  const update = (): void => {
    frameId = 0;

    if (!isEnabled()) {
      clearStickyStyles();
      return;
    }

    footerHost ??= resolveFooterHost();
    observeFooterHost();

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

    applyStickyStyles(maxBlockSize, footerOffset);
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

  resizeObserver?.observe(target);
  observeFooterHost();

  syncActivation();

  return () => {
    detachWindowListeners();
    mediaQuery?.removeEventListener('change', syncActivation);

    if (frameId !== 0) {
      window.cancelAnimationFrame(frameId);
      frameId = 0;
    }

    if (resizeObserver !== null && observedFooterHost !== null) {
      resizeObserver.unobserve(observedFooterHost);
    }

    resizeObserver?.disconnect();
    clearStickyStyles();
  };
};
