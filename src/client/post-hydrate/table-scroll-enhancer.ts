export interface TableGeometryPreparationOptions {
  readonly isCurrent: () => boolean;
  readonly beforeGeometryChange: () => void;
  readonly canPrepare?: () => boolean;
  readonly signal?: AbortSignal;
}

export interface PreparedTableGeometry {
  readonly root: HTMLElement;
  readonly table: HTMLTableElement;
  readonly rail: HTMLElement | null;
  readonly spacer: HTMLElement | null;
  readonly generation: number;
  readonly geometryVersion: number;
  readonly phase: 'prepared' | 'active';
  readonly rootId: string;
  readonly generatedRootId: string | null;
}

interface TableMetrics {
  readonly width: number;
  readonly scrollWidth: number;
  readonly height: number;
  readonly rows: number;
  readonly scrollLeft: number;
}

interface ActivationLease {
  readonly signal: AbortSignal | undefined;
  readonly pendingScrollEchoes: Map<HTMLElement, number>;
  readonly cleanups: (() => void)[];
  disposed: boolean;
  resizeObserver: ResizeObserver | null;
  removeRailScrollListener: (() => void) | null;
}

interface TableScrollState {
  readonly root: HTMLElement;
  readonly table: HTMLTableElement | null;
  readonly options: TableGeometryPreparationOptions;
  readonly generation: number;
  geometryVersion: number;
  preparing: boolean;
  disposed: boolean;
  rail: HTMLElement | null;
  spacer: HTMLElement | null;
  metrics: TableMetrics | null;
  lease: ActivationLease | null;
  removeOwnerAbortListener: (() => void) | null;
}

const activeTableRoots = new WeakMap<HTMLElement, TableScrollState>();
const implicitTableStates = new WeakSet<TableScrollState>();
const railOwners = new WeakMap<HTMLElement, TableScrollState>();
// DOM の接頭辞を所有証明にせず、同じ root の再採用でも生成 ID を維持する。
const generatedRootIds = new WeakMap<HTMLElement, string>();
const SCROLL_EDGE_THRESHOLD = 2;
const TOP_RAIL_MIN_TABLE_ROW_COUNT = 16;
const TOP_RAIL_MIN_CLIENT_HEIGHT_PX = 640;
const TABLE_RAIL_FALLBACK_LABEL = '直後の表の横スクロール補助';
let generatedTableRootIdSequence = 0;
let tableStateGeneration = 0;

const getOwnedTable = (root: HTMLElement): HTMLTableElement | null =>
  root.querySelector<HTMLTableElement>(':scope > table');

const isRail = (element: Element | null): element is HTMLElement =>
  element instanceof HTMLElement && element.hasAttribute('data-table-scroll-rail');

const ownsState = (state: TableScrollState): boolean =>
  !state.disposed && activeTableRoots.get(state.root) === state;

const isCurrent = (state: TableScrollState, lease?: ActivationLease): boolean => {
  try {
    return (
      ownsState(state) &&
      state.root.isConnected &&
      getOwnedTable(state.root) === state.table &&
      state.options.signal?.aborted !== true &&
      state.lease?.signal?.aborted !== true &&
      state.lease?.disposed !== true &&
      state.options.isCurrent() &&
      (!state.preparing || state.options.canPrepare?.() !== false) &&
      (!lease || state.lease === lease)
    );
  } catch {
    return false;
  }
};

const ownsRail = (state: TableScrollState): boolean =>
  state.rail !== null && railOwners.get(state.rail) === state;

const hasUniqueRootId = (root: HTMLElement): boolean =>
  root.id !== '' && root.ownerDocument.querySelectorAll(`#${CSS.escape(root.id)}`).length === 1;

const resolveRailLabel = (table: HTMLTableElement): string => {
  const caption = table.caption?.textContent.replace(/\s+/gu, ' ').trim() ?? '';
  return caption ? `${caption}の横スクロール補助` : TABLE_RAIL_FALLBACK_LABEL;
};

const findTableRoots = (root: ParentNode): HTMLElement[] => {
  const roots = new Set<HTMLElement>();
  if (root instanceof HTMLElement && root.matches('[data-table-root]')) roots.add(root);
  for (const tableRoot of root.querySelectorAll<HTMLElement>('[data-table-root]')) {
    roots.add(tableRoot);
  }
  return [...roots];
};

const releaseLease = (lease: ActivationLease): void => {
  lease.disposed = true;
  lease.resizeObserver?.disconnect();
  lease.removeRailScrollListener?.();
  for (const cleanup of lease.cleanups) cleanup();
  lease.pendingScrollEchoes.clear();
};

const releaseActivation = (state: TableScrollState): void => {
  const lease = state.lease;
  state.lease = null;
  if (lease) releaseLease(lease);
};

const disposeTableScrollState = (state: TableScrollState): void => {
  releaseActivation(state);
  state.removeOwnerAbortListener?.();
  state.removeOwnerAbortListener = null;
  if (!ownsState(state)) return;
  // 新しい state に移った rail や隣接する未知の rail は旧 abort の対象外にする。
  const rail = state.rail;
  if (rail && railOwners.get(rail) === state) {
    if (isCurrent(state)) {
      state.geometryVersion += 1;
      try {
        state.options.beforeGeometryChange();
      } catch {
        // 失効通知が失敗しても、自分の部分準備を残さない。
      }
    }
    if (!ownsState(state) || railOwners.get(rail) !== state) return;
    rail.remove();
    railOwners.delete(rail);
  }
  state.disposed = true;
  state.rail = null;
  state.spacer = null;
  activeTableRoots.delete(state.root);
};

const ensureRootId = (state: TableScrollState, mutate: (write: () => void) => boolean): boolean => {
  const root = state.root;
  if (root.id) return hasUniqueRootId(root);
  let id = generatedRootIds.get(root);
  if (!id || root.ownerDocument.getElementById(id)) {
    do {
      generatedTableRootIdSequence += 1;
      id = `rouault-table-root-${generatedTableRootIdSequence.toString()}`;
    } while (root.ownerDocument.getElementById(id));
    generatedRootIds.set(root, id);
  }
  const generatedId = id;
  return (
    mutate(() => {
      root.id = generatedId;
    }) && hasUniqueRootId(root)
  );
};

const setAttribute = (
  element: HTMLElement,
  name: string,
  value: string | null,
  mutate: (write: () => void) => boolean,
): boolean => {
  if (element.getAttribute(name) === value) return true;
  return mutate(() => {
    if (value === null) element.removeAttribute(name);
    else element.setAttribute(name, value);
  });
};

const setRailInteraction = (state: TableScrollState, active: boolean): void => {
  const rail = state.rail;
  if (!rail || !ownsRail(state)) return;
  const write = (operation: () => void): boolean => {
    if (!isCurrent(state)) return false;
    operation();
    return isCurrent(state);
  };
  // 準備だけの rail は同じ box を保ち、購読前の操作面として公開しない。
  if (!setAttribute(rail, 'inert', active ? null : '', write)) return;
  if (!setAttribute(rail, 'aria-hidden', active ? null : 'true', write)) return;
  if (!setAttribute(rail, 'tabindex', active ? '0' : '-1', write)) return;
  if (active && rail.style.pointerEvents === 'none')
    write(() => rail.style.removeProperty('pointer-events'));
  else if (!active && rail.style.pointerEvents !== 'none')
    write(() => {
      rail.style.pointerEvents = 'none';
    });
};

const syncScrollLeft = (
  source: HTMLElement,
  target: HTMLElement,
  state: TableScrollState,
  lease: ActivationLease,
): void => {
  if (!isCurrent(state, lease) || target.scrollLeft === source.scrollLeft) return;
  const previous = target.scrollLeft;
  target.scrollLeft = source.scrollLeft;
  if (isCurrent(state, lease) && target.scrollLeft !== previous) {
    lease.pendingScrollEchoes.set(target, target.scrollLeft);
  }
};

const consumeScrollEcho = (source: HTMLElement, lease: ActivationLease): boolean => {
  const expected = lease.pendingScrollEchoes.get(source);
  lease.pendingScrollEchoes.delete(source);
  return expected !== undefined && source.scrollLeft === expected;
};

const bindRailScroll = (state: TableScrollState): void => {
  const lease = state.lease;
  const rail = state.rail;
  if (!lease || !rail || lease.removeRailScrollListener || !isCurrent(state, lease)) return;
  const handleScroll = (): void => {
    if (!isCurrent(state, lease) || state.rail !== rail || !ownsRail(state)) return;
    if (consumeScrollEcho(rail, lease)) return;
    if (state.root.scrollLeft !== rail.scrollLeft) {
      state.geometryVersion += 1;
      state.options.beforeGeometryChange();
      if (!isCurrent(state, lease)) return;
    }
    syncScrollLeft(rail, state.root, state, lease);
    updateTableScrollState(state, lease);
  };
  lease.removeRailScrollListener = () => {
    rail.removeEventListener('scroll', handleScroll);
  };
  rail.addEventListener('scroll', handleScroll, { passive: true });
  if (!isCurrent(state, lease) || state.rail !== rail) {
    rail.removeEventListener('scroll', handleScroll);
  }
};

const updateTableScrollState = (state: TableScrollState, lease?: ActivationLease): boolean => {
  if (!isCurrent(state, lease)) return false;
  const root = state.root;
  const metrics: TableMetrics = {
    width: root.clientWidth,
    scrollWidth: root.scrollWidth,
    height: root.clientHeight,
    rows: state.table?.rows.length ?? 0,
    scrollLeft: root.scrollLeft,
  };
  if (!isCurrent(state, lease)) return false;
  const overflow = metrics.scrollWidth > metrics.width + SCROLL_EDGE_THRESHOLD;
  const needsRail =
    overflow &&
    state.table !== null &&
    (metrics.rows >= TOP_RAIL_MIN_TABLE_ROW_COUNT ||
      metrics.height >= TOP_RAIL_MIN_CLIENT_HEIGHT_PX);
  let invalidated = false;
  const mutate = (write: () => void): boolean => {
    if (!isCurrent(state, lease)) return false;
    if (!invalidated) {
      invalidated = true;
      state.geometryVersion += 1;
      state.options.beforeGeometryChange();
      if (!isCurrent(state, lease)) return false;
    }
    write();
    return isCurrent(state, lease);
  };
  const previous = state.metrics;
  if (
    previous &&
    Object.keys(metrics).some(
      (key) => metrics[key as keyof TableMetrics] !== previous[key as keyof TableMetrics],
    )
  ) {
    // UA の既発生 layout は取り消せないが、後続のアプリ書込みより前に証跡を失効する。
    if (!mutate(() => undefined)) return false;
  }
  if (!setAttribute(root, 'data-overflow', overflow ? 'true' : null, mutate)) return false;
  if (
    !setAttribute(
      root,
      'data-fade-left',
      overflow && metrics.scrollLeft > SCROLL_EDGE_THRESHOLD ? 'true' : null,
      mutate,
    )
  )
    return false;
  if (
    !setAttribute(
      root,
      'data-fade-right',
      overflow && metrics.scrollLeft + metrics.width < metrics.scrollWidth - SCROLL_EDGE_THRESHOLD
        ? 'true'
        : null,
      mutate,
    )
  )
    return false;

  if (!needsRail || !ensureRootId(state, mutate)) {
    const rail = state.rail;
    if (rail && ownsRail(state)) {
      if (
        !mutate(() => {
          rail.remove();
        })
      )
        return false;
      railOwners.delete(rail);
    }
    state.lease?.removeRailScrollListener?.();
    if (state.lease) state.lease.removeRailScrollListener = null;
    state.rail = null;
    state.spacer = null;
    state.metrics = metrics;
    return !needsRail;
  }

  if (!state.rail?.isConnected || !ownsRail(state)) {
    state.lease?.removeRailScrollListener?.();
    if (state.lease) state.lease.removeRailScrollListener = null;
    if (state.rail && railOwners.get(state.rail) === state) railOwners.delete(state.rail);
    const rail = root.ownerDocument.createElement('div');
    rail.dataset['tableScrollRail'] = 'true';
    state.rail = rail;
    state.spacer = null;
    railOwners.set(rail, state);
  }
  const rail = state.rail;
  if (!isCurrent(state, lease)) return false;
  if (rail.parentElement !== root.parentElement || rail.nextElementSibling !== root) {
    if (
      !mutate(() => {
        root.before(rail);
      })
    )
      return false;
  }
  if (!setAttribute(rail, 'role', 'region', mutate)) return false;
  if (!setAttribute(rail, 'aria-label', resolveRailLabel(state.table), mutate)) return false;
  if (!setAttribute(rail, 'aria-controls', root.id, mutate)) return false;
  if (
    !state.spacer?.isConnected ||
    state.spacer.parentElement !== rail ||
    rail.childElementCount !== 1
  ) {
    const spacer = root.ownerDocument.createElement('div');
    spacer.dataset['tableScrollRailSpacer'] = 'true';
    if (
      !mutate(() => {
        rail.replaceChildren(spacer);
      })
    )
      return false;
    state.spacer = spacer;
  }
  const spacer = state.spacer;
  const inlineSize = `${Math.max(metrics.scrollWidth, metrics.width).toString()}px`;
  if (
    spacer.style.inlineSize !== inlineSize &&
    !mutate(() => {
      spacer.style.inlineSize = inlineSize;
    })
  )
    return false;
  if (rail.scrollLeft !== root.scrollLeft) {
    if (
      !mutate(() => {
        if (state.lease) syncScrollLeft(root, rail, state, state.lease);
        else rail.scrollLeft = root.scrollLeft;
      })
    )
      return false;
  }
  setRailInteraction(state, state.lease !== null);
  bindRailScroll(state);
  state.metrics = metrics;
  return isCurrent(state, lease);
};

const createState = (
  root: HTMLElement,
  options: TableGeometryPreparationOptions,
): TableScrollState => {
  const previous = activeTableRoots.get(root);
  const table = getOwnedTable(root);
  const canAdoptRail =
    previous?.table === table &&
    previous.rail &&
    railOwners.get(previous.rail) === previous &&
    previous.rail.isConnected &&
    previous.rail.parentElement === root.parentElement &&
    previous.rail.nextElementSibling === root;
  const rail = canAdoptRail ? previous.rail : null;
  const spacer = rail && previous?.spacer?.parentElement === rail ? previous.spacer : null;
  if (previous) {
    releaseActivation(previous);
    previous.removeOwnerAbortListener?.();
    if (!rail) disposeTableScrollState(previous);
    const current = activeTableRoots.get(root);
    if (current && current !== previous) {
      throw new Error('Table preparation owner changed during cleanup');
    }
  }
  const state: TableScrollState = {
    root,
    table,
    options,
    generation: ++tableStateGeneration,
    geometryVersion: previous?.geometryVersion ?? 0,
    preparing: true,
    disposed: false,
    rail,
    spacer,
    metrics: rail ? (previous?.metrics ?? null) : null,
    lease: null,
    removeOwnerAbortListener: null,
  };
  activeTableRoots.set(root, state);
  if (rail) railOwners.set(rail, state);
  if (previous) previous.disposed = true;
  if (options.signal) {
    const abort = (): void => {
      disposeTableScrollState(state);
    };
    options.signal.addEventListener('abort', abort, { once: true });
    state.removeOwnerAbortListener = () => options.signal?.removeEventListener('abort', abort);
  }
  return state;
};

export const prepareTableGeometry = (
  root: ParentNode,
  options: TableGeometryPreparationOptions,
): boolean => {
  const states: TableScrollState[] = [];
  try {
    if (options.signal?.aborted || !options.isCurrent() || options.canPrepare?.() === false)
      return false;
    for (const tableRoot of findTableRoots(root)) {
      if (!options.isCurrent() || options.canPrepare?.() === false || options.signal?.aborted)
        break;
      const state = createState(tableRoot, options);
      states.push(state);
      const prepared = updateTableScrollState(state);
      state.preparing = false;
      if (!prepared) {
        for (const owned of states) disposeTableScrollState(owned);
        return false;
      }
    }
    if (options.isCurrent() && options.canPrepare?.() !== false && !options.signal?.aborted)
      return true;
  } catch {
    // 準備の失敗は受理済み本文の commit 失敗へ変換しない。
  }
  for (const state of states) disposeTableScrollState(state);
  return false;
};

export const readPreparedTableGeometry = (root: HTMLElement): PreparedTableGeometry | null => {
  const state = activeTableRoots.get(root);
  if (
    !state?.table ||
    !state.metrics ||
    state.preparing ||
    !isCurrent(state) ||
    implicitTableStates.has(state)
  )
    return null;
  if (root.id && !hasUniqueRootId(root)) return null;
  const rail = state.rail;
  if (rail) {
    if (
      !ownsRail(state) ||
      rail.parentElement !== root.parentElement ||
      rail.nextElementSibling !== root ||
      isRail(rail.previousElementSibling) ||
      !hasUniqueRootId(root) ||
      rail.getAttribute('aria-controls') !== root.id ||
      rail.getAttribute('role') !== 'region' ||
      rail.getAttribute('aria-label') !== resolveRailLabel(state.table) ||
      rail.hasAttribute('inert') !== (state.lease === null) ||
      rail.getAttribute('aria-hidden') !== (state.lease ? null : 'true') ||
      rail.getAttribute('tabindex') !== (state.lease ? '0' : '-1') ||
      rail.style.pointerEvents !== (state.lease ? '' : 'none') ||
      rail.style.getPropertyPriority('pointer-events') !== '' ||
      state.spacer?.parentElement !== rail ||
      rail.childElementCount !== 1
    )
      return null;
  } else if (isRail(root.previousElementSibling)) return null;
  return Object.freeze({
    root,
    table: state.table,
    rail,
    spacer: state.spacer,
    generation: state.generation,
    geometryVersion: state.geometryVersion,
    phase: state.lease ? 'active' : 'prepared',
    rootId: root.id,
    generatedRootId: generatedRootIds.get(root) === root.id ? root.id : null,
  });
};

export const enhanceTableScroll = (root: ParentNode = document, signal?: AbortSignal): void => {
  if (signal?.aborted) return;
  for (const tableRoot of findTableRoots(root)) {
    let state = activeTableRoots.get(tableRoot);
    if (!state || !isCurrent(state)) {
      // 明示された本文世代を、旧 activation が無条件の owner へ置き換えてはいけない。
      if (state && !implicitTableStates.has(state)) continue;
      if (
        !prepareTableGeometry(tableRoot, {
          isCurrent: () => true,
          beforeGeometryChange: () => undefined,
        })
      )
        continue;
      state = activeTableRoots.get(tableRoot);
      if (state) implicitTableStates.add(state);
    }
    if (!state || !isCurrent(state)) continue;
    if (state.lease && (!signal || state.lease.signal === signal)) continue;
    releaseActivation(state);
    const lease: ActivationLease = {
      signal,
      pendingScrollEchoes: new Map(),
      cleanups: [],
      disposed: false,
      resizeObserver: null,
      removeRailScrollListener: null,
    };
    state.lease = lease;
    const currentState = state;
    const update = (): void => {
      if (isCurrent(currentState, lease)) updateTableScrollState(currentState, lease);
    };
    const handleRootScroll = (): void => {
      if (!isCurrent(currentState, lease) || consumeScrollEcho(tableRoot, lease)) return;
      update();
    };
    lease.cleanups.push(() => {
      tableRoot.removeEventListener('scroll', handleRootScroll);
    });
    tableRoot.addEventListener('scroll', handleRootScroll, { passive: true });
    if (!isCurrent(currentState, lease)) {
      tableRoot.removeEventListener('scroll', handleRootScroll);
      releaseLease(lease);
      continue;
    }
    const browserWindow: Window = window;
    if ('ResizeObserver' in browserWindow) {
      const observer = new ResizeObserver(update);
      lease.resizeObserver = observer;
      observer.observe(tableRoot);
      if (!isCurrent(currentState, lease)) {
        releaseLease(lease);
        continue;
      }
      if (state.table) observer.observe(state.table);
    } else {
      browserWindow.addEventListener('resize', update);
      lease.cleanups.push(() => {
        browserWindow.removeEventListener('resize', update);
      });
    }
    if (!isCurrent(currentState, lease)) {
      releaseLease(lease);
      continue;
    }
    if (signal) {
      const abort = (): void => {
        if (currentState.lease === lease) disposeTableScrollState(currentState);
      };
      signal.addEventListener('abort', abort, { once: true });
      lease.cleanups.push(() => {
        signal.removeEventListener('abort', abort);
      });
    }
    if (!isCurrent(currentState, lease)) {
      releaseLease(lease);
      continue;
    }
    update();
  }
};
