import {
  hasRootScrollReached,
  readMaxRootScrollY,
  readRootScrollY,
} from '../router/root-scroll.js';

export interface TocScrollMetrics {
  idealTargetY: number;
  targetY: number;
  activationOffset: number;
  scrollPaddingTop: number;
  scrollMarginTop: number;
  currentScrollY: number;
  maxScrollY: number;
  isTargetStartClamped: boolean;
  isTargetEndClamped: boolean;
}

export const TOC_SCROLL_POSITION_TOLERANCE_PX = 1.5;
export const TOC_SCROLL_SETTLE_STABLE_FRAMES = 2;
export const TOC_SCROLL_SETTLE_TIMEOUT_MS = 800;

export const readComputedPx = (value: string): number => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
};

export const resolveTocActivationOffset = (target: HTMLElement): number => {
  const scrollPaddingTop = readComputedPx(
    getComputedStyle(document.documentElement).scrollPaddingTop,
  );
  const scrollMarginTop = readComputedPx(getComputedStyle(target).scrollMarginTop);
  return scrollPaddingTop + scrollMarginTop;
};

export const resolveTocScrollMetrics = (target: HTMLElement): TocScrollMetrics => {
  const scrollPaddingTop = readComputedPx(
    getComputedStyle(document.documentElement).scrollPaddingTop,
  );
  const scrollMarginTop = readComputedPx(getComputedStyle(target).scrollMarginTop);
  const activationOffset = scrollPaddingTop + scrollMarginTop;
  const currentScrollY = readRootScrollY();
  const maxScrollY = readMaxRootScrollY();
  const idealTargetY = currentScrollY + target.getBoundingClientRect().top - activationOffset;
  const targetY = Math.min(Math.max(idealTargetY, 0), maxScrollY);

  return {
    idealTargetY,
    targetY,
    activationOffset,
    scrollPaddingTop,
    scrollMarginTop,
    currentScrollY,
    maxScrollY,
    isTargetStartClamped: idealTargetY < 0,
    isTargetEndClamped: idealTargetY > maxScrollY,
  };
};

export const hasHeadingPassedTocActivationLine = (target: HTMLElement): boolean =>
  target.getBoundingClientRect().top <= resolveTocActivationOffset(target);

export const isHeadingAlignedToTocStopPosition = (
  target: HTMLElement,
  metrics: TocScrollMetrics,
  tolerance: number = TOC_SCROLL_POSITION_TOLERANCE_PX,
): boolean => Math.abs(target.getBoundingClientRect().top - metrics.activationOffset) <= tolerance;

export const hasRootScrollReachedTocTargetY = (
  metrics: TocScrollMetrics,
  tolerance: number = TOC_SCROLL_POSITION_TOLERANCE_PX,
): boolean => hasRootScrollReached(metrics.targetY, tolerance);

export const isHeadingIntersectingViewport = (target: HTMLElement): boolean => {
  const rect = target.getBoundingClientRect();
  return rect.bottom > 0 && rect.top < window.innerHeight;
};

export const canSkipTocScrollForTarget = (
  target: HTMLElement,
  metrics: TocScrollMetrics,
): boolean => {
  if (metrics.isTargetEndClamped || metrics.isTargetStartClamped) {
    return hasRootScrollReachedTocTargetY(metrics) && isHeadingIntersectingViewport(target);
  }

  return isHeadingAlignedToTocStopPosition(target, metrics);
};

export const hasProgrammaticTargetSettled = (
  target: HTMLElement,
  metrics: TocScrollMetrics,
): boolean => {
  if (metrics.isTargetEndClamped) {
    return hasRootScrollReachedTocTargetY(metrics) && isHeadingIntersectingViewport(target);
  }

  return isHeadingAlignedToTocStopPosition(target, metrics);
};
