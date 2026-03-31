export interface StickyBoundaryMetrics {
  footerTop: number | null;
  stickyTop: number;
  viewportHeight: number;
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

export const attachStickyFooterBoundary = (target: HTMLElement): (() => void) => {
  if (typeof window === 'undefined') {
    // SSR環境では何もしないクリーンアップ関数を返す
    return (): void => undefined;
  }

  let frameId = 0;
  let footerHost = resolveFooterHost();
  const abortController = new AbortController();
  const resizeObserver =
    typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(() => {
          scheduleUpdate();
        });

  const update = (): void => {
    frameId = 0;
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

  window.addEventListener('scroll', scheduleUpdate, {
    passive: true,
    signal: abortController.signal,
  });
  window.addEventListener('resize', scheduleUpdate, {
    passive: true,
    signal: abortController.signal,
  });

  resizeObserver?.observe(document.documentElement);
  if (footerHost) {
    resizeObserver?.observe(footerHost);
  }

  scheduleUpdate();

  return () => {
    abortController.abort();
    if (frameId !== 0) {
      window.cancelAnimationFrame(frameId);
    }
    resizeObserver?.disconnect();
    target.style.removeProperty('--layout-sticky-max-block-size');
    target.style.removeProperty('--layout-sticky-footer-offset');
  };
};
