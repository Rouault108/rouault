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
const TOP_RAIL_MIN_TABLE_ROW_COUNT = 16;
const TOP_RAIL_MIN_CLIENT_HEIGHT_PX = 640;
const TABLE_RAIL_FALLBACK_LABEL = '直後の表の横スクロール補助';
let generatedTableRootIdSequence = 0;

const removeOverflowState = (root: HTMLElement): void => {
  root.removeAttribute('data-overflow');
  root.removeAttribute('data-fade-left');
  root.removeAttribute('data-fade-right');
};

const isTableScrollRailElement = (element: Element | null): element is HTMLElement => {
  return element instanceof HTMLElement && element.hasAttribute('data-table-scroll-rail');
};

const getAdjacentTableScrollRail = (root: HTMLElement): HTMLElement | null => {
  const previous = root.previousElementSibling;
  return isTableScrollRailElement(previous) ? previous : null;
};

const removeContiguousTableScrollRailsBefore = (anchor: HTMLElement): void => {
  let previous = anchor.previousElementSibling;

  while (isTableScrollRailElement(previous)) {
    const rail = previous;
    previous = rail.previousElementSibling;
    rail.remove();
  }
};

const getOwnedTable = (root: HTMLElement): HTMLTableElement | null => {
  return root.querySelector<HTMLTableElement>(':scope > table');
};

const isTopRailEligibleTable = (root: HTMLElement): boolean => {
  const table = getOwnedTable(root);

  if (!table) {
    return false;
  }

  return (
    table.rows.length >= TOP_RAIL_MIN_TABLE_ROW_COUNT ||
    root.clientHeight >= TOP_RAIL_MIN_CLIENT_HEIGHT_PX
  );
};

const removeRail = (state: TableScrollState, root: HTMLElement): void => {
  state.removeRailScrollListener?.();
  state.removeRailScrollListener = null;
  state.rail?.remove();
  state.rail = null;
  state.spacer = null;
  removeContiguousTableScrollRailsBefore(root);
};

const resolveTableRailLabel = (root: HTMLElement): string => {
  const captionText =
    getOwnedTable(root)?.caption?.textContent?.replace(/\s+/gu, ' ').trim() ?? '';

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

  const previousRail = state.rail;
  const adjacentRail = getAdjacentTableScrollRail(root);
  const activeRail = previousRail?.isConnected ? previousRail : document.createElement('div');

  if (activeRail !== previousRail) {
    state.removeRailScrollListener?.();
    state.removeRailScrollListener = null;
    state.spacer = null;
  }

  activeRail.dataset['tableScrollRail'] = 'true';

  if (adjacentRail && adjacentRail !== activeRail) {
    removeContiguousTableScrollRailsBefore(root);
  }

  if (activeRail.parentElement !== root.parentElement || activeRail.nextElementSibling !== root) {
    root.before(activeRail);
  }

  removeContiguousTableScrollRailsBefore(activeRail);
  state.rail = activeRail;

  activeRail.setAttribute('role', 'region');
  activeRail.setAttribute('aria-label', resolveTableRailLabel(root));
  activeRail.setAttribute('aria-controls', ensureRootId(root, state));
  activeRail.tabIndex = 0;
  activeRail.removeAttribute('aria-hidden');

  const currentSpacerIsValid =
    state.spacer?.isConnected === true &&
    state.spacer.parentElement === activeRail &&
    state.spacer.matches('[data-table-scroll-rail-spacer]');
  let spacer = currentSpacerIsValid
    ? state.spacer
    : activeRail.querySelector<HTMLElement>(':scope > [data-table-scroll-rail-spacer]');
  if (!spacer) {
    spacer = document.createElement('div');
    spacer.dataset['tableScrollRailSpacer'] = 'true';
    activeRail.replaceChildren(spacer);
  }

  state.spacer = spacer;

  if (!state.removeRailScrollListener) {
    const handleRailScroll = (): void => {
      syncScrollLeft(activeRail, root, state);
      updateTableScrollState(root, state);
    };

    activeRail.addEventListener('scroll', handleRailScroll, { passive: true });
    state.removeRailScrollListener = () => {
      activeRail.removeEventListener('scroll', handleRailScroll);
    };
  }

  return activeRail;
};

const updateTableScrollState = (root: HTMLElement, state: TableScrollState): void => {
  const hasOverflow = root.scrollWidth > root.clientWidth + SCROLL_EDGE_THRESHOLD;

  if (!hasOverflow) {
    removeOverflowState(root);
    removeRail(state, root);
    return;
  }

  root.dataset['overflow'] = 'true';
  const rail = isTopRailEligibleTable(root) ? ensureRail(root, state) : null;
  if (rail) {
    updateRailMetrics(root, state);
    syncScrollLeft(root, rail, state);
  } else {
    removeRail(state, root);
  }

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
  removeRail(state, root);
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
      const table = getOwnedTable(tableRoot);
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
