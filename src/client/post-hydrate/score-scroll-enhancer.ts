interface ScoreScrollState {
  readonly signal: AbortSignal | undefined;
  readonly update: () => void;
  readonly resizeObserver: ResizeObserver | null;
}

const activeScrolls = new WeakMap<HTMLElement, ScoreScrollState>();

const updateScrollState = (scroll: HTMLElement): void => {
  const threshold = 2;
  const hasOverflow = scroll.scrollWidth > scroll.clientWidth + threshold;
  if (!hasOverflow) {
    scroll.removeAttribute('data-overflow');
    scroll.removeAttribute('data-fade-left');
    scroll.removeAttribute('data-fade-right');
    return;
  }
  scroll.dataset['overflow'] = 'true';
  if (scroll.scrollLeft > threshold) {
    scroll.dataset['fadeLeft'] = 'true';
  } else {
    scroll.removeAttribute('data-fade-left');
  }
  if (scroll.scrollLeft + scroll.clientWidth < scroll.scrollWidth - threshold) {
    scroll.dataset['fadeRight'] = 'true';
  } else {
    scroll.removeAttribute('data-fade-right');
  }
};

const findScrollTargets = (root: ParentNode): HTMLElement[] => {
  if (root instanceof HTMLElement && root.matches('[data-score-scroll]')) {
    return [root];
  }
  if (root instanceof HTMLElement && root.matches('figure.score[data-score]')) {
    const scroll = root.querySelector<HTMLElement>('[data-score-scroll]');
    return scroll ? [scroll] : [];
  }
  return [...root.querySelectorAll<HTMLElement>('[data-score-scroll]')];
};

export const enhanceScoreScroll = (root: ParentNode = document, signal?: AbortSignal): void => {
  const isSignalAborted = signal?.aborted === true;
  if (isSignalAborted) {
    return;
  }

  for (const scroll of findScrollTargets(root)) {
    const active = activeScrolls.get(scroll);
    if (active && active.signal?.aborted !== true) {
      continue;
    }
    if (active?.signal?.aborted === true) {
      active.resizeObserver?.disconnect();
      activeScrolls.delete(scroll);
    }

    const update = (): void => {
      updateScrollState(scroll);
    };
    const listenerOptions = signal ? { signal, passive: true } : { passive: true };
    scroll.addEventListener('scroll', update, listenerOptions);

    let resizeObserver: ResizeObserver | null = null;
    const browserWindow: Window = window;
    if ('ResizeObserver' in browserWindow) {
      resizeObserver = new ResizeObserver(update);
      resizeObserver.observe(scroll);
    } else {
      browserWindow.addEventListener('resize', update, signal ? { signal } : undefined);
    }

    activeScrolls.set(scroll, { signal, update, resizeObserver });
    signal?.addEventListener(
      'abort',
      () => {
        resizeObserver?.disconnect();
        activeScrolls.delete(scroll);
      },
      { once: true },
    );
    update();
  }
};
