interface TableScrollState {
  readonly signal: AbortSignal | undefined;
  resizeObserver: ResizeObserver | null;
  rail: HTMLElement | null;
  spacer: HTMLElement | null;
  isSyncing: boolean;
  generatedRootId: string | null;
  removeRailScrollListener: (() => void) | null;
  removeWindowResizeListener: (() => void) | null;
}

const activeTableRoots = new WeakMap<HTMLElement, TableScrollState>();

const SCROLL_EDGE_THRESHOLD = 2;
const TABLE_RAIL_FALLBACK_LABEL = '直後の表の横スクロール補助';
let generatedTableRootIdSequence = 0;

const removeOverflowState = (root: HTMLElement): void => {
  root.removeAttribute('data-overflow');
  root.removeAttribute('data-fade-left');
  root.removeAttribute('data-fade-right');
};

const removeRail = (state: TableScrollState): void => {
  state.removeRailScrollListener?.();
  state.removeRailScrollListener = null;
  state.rail?.remove();
  state.rail = null;
  state.spacer = null;
};

const resolveTableRailLabel = (root: HTMLElement): string => {
  const captionText =
    root.querySelector('table > caption')?.textContent.replace(/\s+/gu, ' ').trim() ?? '';

  return captionText ? `${captionText}の横スクロール補助` : TABLE_RAIL_FALLBACK_LABEL;
};

const createGeneratedTableRootId = (): string => {
  let generatedId = '';

  do {
    generatedTableRootIdSequence += 1;
    generatedId = `rouault-table-root-${generatedTableRootIdSequence.toString()}`;
  } while (document.getElementById(generatedId));

  return generatedId;
};

const ensureRootId = (root: HTMLElement, state: TableScrollState): string => {
  if (root.id) {
    return root.id;
  }

  const generatedId = state.generatedRootId ?? createGeneratedTableRootId();
  state.generatedRootId = generatedId;
  root.id = generatedId;
  return generatedId;
};

const syncScrollLeft = (
  source: HTMLElement,
  target: HTMLElement | null,
  state: TableScrollState,
): void => {
  if (!target || state.isSyncing || target.scrollLeft === source.scrollLeft) {
    return;
  }

  state.isSyncing = true;
  target.scrollLeft = source.scrollLeft;
  state.isSyncing = false;
};

const updateRailMetrics = (root: HTMLElement, state: TableScrollState): void => {
  if (!state.spacer) {
    return;
  }

  state.spacer.style.inlineSize = `${Math.max(root.scrollWidth, root.clientWidth).toString()}px`;
};

const ensureRail = (root: HTMLElement, state: TableScrollState): HTMLElement | null => {
  if (!root.parentElement) {
    return null;
  }

  let rail = state.rail;

  if (!rail?.isConnected) {
    const previousElement = root.previousElementSibling;
    rail =
      previousElement instanceof HTMLElement && previousElement.matches('[data-table-scroll-rail]')
        ? previousElement
        : document.createElement('div');

    rail.dataset['tableScrollRail'] = 'true';

    if (rail.parentElement !== root.parentElement || rail.nextElementSibling !== root) {
      root.before(rail);
    }

    state.rail = rail;
  }

  rail.setAttribute('role', 'region');
  rail.setAttribute('aria-label', resolveTableRailLabel(root));
  rail.setAttribute('aria-controls', ensureRootId(root, state));
  rail.tabIndex = 0;
  rail.removeAttribute('aria-hidden');

  let spacer = rail.querySelector<HTMLElement>(':scope > [data-table-scroll-rail-spacer]');
  if (!spacer) {
    spacer = document.createElement('div');
    spacer.dataset['tableScrollRailSpacer'] = 'true';
    rail.replaceChildren(spacer);
  }

  state.spacer = spacer;

  if (!state.removeRailScrollListener) {
    const handleRailScroll = (): void => {
      syncScrollLeft(rail, root, state);
      updateTableScrollState(root, state);
    };

    rail.addEventListener('scroll', handleRailScroll, { passive: true });
    state.removeRailScrollListener = () => {
      rail.removeEventListener('scroll', handleRailScroll);
    };
  }

  return rail;
};

const updateTableScrollState = (root: HTMLElement, state: TableScrollState): void => {
  const hasOverflow = root.scrollWidth > root.clientWidth + SCROLL_EDGE_THRESHOLD;

  if (!hasOverflow) {
    removeOverflowState(root);
    removeRail(state);
    return;
  }

  root.dataset['overflow'] = 'true';
  const rail = ensureRail(root, state);
  updateRailMetrics(root, state);
  syncScrollLeft(root, rail, state);

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

const disposeTableScrollState = (root: HTMLElement, state: TableScrollState): void => {
  state.resizeObserver?.disconnect();
  state.resizeObserver = null;
  state.removeWindowResizeListener?.();
  state.removeWindowResizeListener = null;
  removeRail(state);
  activeTableRoots.delete(root);
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
      disposeTableScrollState(tableRoot, active);
    }

    const state: TableScrollState = {
      signal,
      resizeObserver: null,
      rail: null,
      spacer: null,
      isSyncing: false,
      generatedRootId: null,
      removeRailScrollListener: null,
      removeWindowResizeListener: null,
    };

    const update = (): void => {
      updateTableScrollState(tableRoot, state);
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
      state.removeWindowResizeListener = () => {
        browserWindow.removeEventListener('resize', update);
      };
    }
    state.resizeObserver = resizeObserver;

    activeTableRoots.set(tableRoot, state);
    signal?.addEventListener(
      'abort',
      () => {
        disposeTableScrollState(tableRoot, state);
      },
      { once: true },
    );
    update();
  }
};
