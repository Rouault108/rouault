interface TableScrollState {
  readonly signal: AbortSignal | undefined;
  readonly resizeObserver: ResizeObserver | null;
}

const activeTableRoots = new WeakMap<HTMLElement, TableScrollState>();

const SCROLL_EDGE_THRESHOLD = 2;

const removeOverflowState = (root: HTMLElement): void => {
  root.removeAttribute('data-overflow');
  root.removeAttribute('data-fade-left');
  root.removeAttribute('data-fade-right');
};

const updateTableScrollState = (root: HTMLElement): void => {
  const hasOverflow = root.scrollWidth > root.clientWidth + SCROLL_EDGE_THRESHOLD;

  if (!hasOverflow) {
    removeOverflowState(root);
    return;
  }

  root.dataset['overflow'] = 'true';

  if (root.scrollLeft > SCROLL_EDGE_THRESHOLD) {
    root.dataset['fadeLeft'] = 'true';
  } else {
    root.removeAttribute('data-fade-left');
  }

  if (root.scrollLeft + root.clientWidth < root.scrollWidth - SCROLL_EDGE_THRESHOLD) {
    root.dataset['fadeRight'] = 'true';
  } else {
    root.removeAttribute('data-fade-right');
  }
};

const findTableRoots = (root: ParentNode): HTMLElement[] => {
  const roots = new Set<HTMLElement>();

  if (root instanceof HTMLElement && root.matches('[data-table-root]')) {
    roots.add(root);
  }

  for (const tableRoot of root.querySelectorAll<HTMLElement>('[data-table-root]')) {
    roots.add(tableRoot);
  }

  return [...roots];
};

export const enhanceTableScroll = (root: ParentNode = document, signal?: AbortSignal): void => {
  if (signal?.aborted === true) {
    return;
  }

  for (const tableRoot of findTableRoots(root)) {
    const active = activeTableRoots.get(tableRoot);
    if (active && active.signal?.aborted !== true) {
      continue;
    }
    if (active?.signal?.aborted === true) {
      active.resizeObserver?.disconnect();
      activeTableRoots.delete(tableRoot);
    }

    const update = (): void => {
      updateTableScrollState(tableRoot);
    };

    tableRoot.addEventListener(
      'scroll',
      update,
      signal ? { signal, passive: true } : { passive: true },
    );

    let resizeObserver: ResizeObserver | null = null;
    const browserWindow: Window = window;
    if ('ResizeObserver' in browserWindow) {
      resizeObserver = new ResizeObserver(update);
      resizeObserver.observe(tableRoot);
      const table = tableRoot.querySelector('table');
      if (table) {
        resizeObserver.observe(table);
      }
    } else {
      browserWindow.addEventListener('resize', update, signal ? { signal } : undefined);
    }

    activeTableRoots.set(tableRoot, { signal, resizeObserver });
    signal?.addEventListener(
      'abort',
      () => {
        resizeObserver?.disconnect();
        activeTableRoots.delete(tableRoot);
      },
      { once: true },
    );
    update();
  }
};
