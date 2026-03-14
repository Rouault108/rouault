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
  footerTop,
  stickyTop,
  viewportHeight,
}: StickyBoundaryMetrics): number => {
  const viewportAvailable = clampToNonNegative(viewportHeight - stickyTop);
  if (footerTop === null) {
    return viewportAvailable;
  }

  const footerAvailable = clampToNonNegative(footerTop - stickyTop);
  return Math.min(viewportAvailable, footerAvailable);
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
  propertyName = '--layout-sticky-max-block-size',
): (() => void) => {
  if (typeof window === 'undefined') {
    return () => {};
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
    const available = computeStickyMaxBlockSize({
      footerTop,
      stickyTop,
      viewportHeight: window.innerHeight,
    });

    target.style.setProperty(propertyName, `${available}px`);
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
    target.style.removeProperty(propertyName);
  };
};
