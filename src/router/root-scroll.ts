export const getRootScrollingElement = (): HTMLElement =>
  (document.scrollingElement as HTMLElement | null) ?? document.documentElement;

export const readRootScrollY = (): number =>
  window.scrollY || getRootScrollingElement().scrollTop || 0;

export const readMaxRootScrollY = (): number => {
  const root = getRootScrollingElement();
  return Math.max(0, root.scrollHeight - root.clientHeight);
};

export const scrollRootTo = (top: number, behavior: ScrollBehavior = 'smooth'): void => {
  window.scrollTo({ top, behavior });
};

export const hasRootScrollReached = (targetY: number, tolerance: number): boolean =>
  Math.abs(readRootScrollY() - targetY) <= tolerance;
