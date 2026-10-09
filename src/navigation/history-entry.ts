export interface HistoryEntry {
  readonly version: 1;
  readonly id: string;
}
export interface HistoryEntryChange {
  readonly mode: 'push' | 'replace' | 'adopt';
  readonly previousUrl: string;
  readonly url: string;
  readonly previousEntry: HistoryEntry | null;
  readonly entry: HistoryEntry | null;
  readonly owner: 'router' | 'feature' | 'native';
}
const field = '__rouaultHistoryEntry';
let counter = 0;
const nonce = Math.random().toString(36).slice(2);
const beforeObservers = new Set<(change: HistoryEntryChange) => void>();
const afterObservers = new Set<(change: HistoryEntryChange) => void>();

export const readAddress = (): string =>
  `${window.location.pathname}${window.location.search}${window.location.hash}`;
export const isPlainHistoryState = (state: unknown): state is Record<string, unknown> => {
  if (state === null || typeof state !== 'object') return false;
  const prototype: unknown = Object.getPrototypeOf(state);
  return prototype === Object.prototype || prototype === null;
};
export const readHistoryEntry = (
  state: unknown = typeof history === 'undefined' ? null : history.state,
): HistoryEntry | null => {
  if (!isPlainHistoryState(state)) return null;
  const entry = state[field];
  if (
    !isPlainHistoryState(entry) ||
    entry['version'] !== 1 ||
    typeof entry['id'] !== 'string' ||
    entry['id'].length === 0
  )
    return null;
  return { version: 1, id: entry['id'] };
};
const manageable = (state: unknown): boolean =>
  state === null ||
  state === undefined ||
  (isPlainHistoryState(state) && (!(field in state) || readHistoryEntry(state) !== null));
const createEntry = (): HistoryEntry => {
  const runtimeCrypto: { randomUUID?: () => string } | undefined =
    typeof crypto === 'undefined' ? undefined : crypto;
  return {
    version: 1,
    id:
      runtimeCrypto && typeof runtimeCrypto.randomUUID === 'function'
        ? runtimeCrypto.randomUUID()
        : `${nonce}-${String(++counter)}`,
  };
};
const notify = (observers: typeof beforeObservers, change: HistoryEntryChange): void => {
  for (const observer of observers) {
    try {
      observer(change);
    } catch {
      /* 観測失敗をHistory APIの成否へ混ぜない。 */
    }
  }
};
export const observeHistoryEntries = (
  before: (change: HistoryEntryChange) => void,
  after: (change: HistoryEntryChange) => void,
): (() => void) => {
  beforeObservers.add(before);
  afterObservers.add(after);
  return () => {
    beforeObservers.delete(before);
    afterObservers.delete(after);
  };
};
export const writeHistoryEntry = (options: {
  mode: 'push' | 'replace';
  url: string;
  owner: 'router' | 'feature';
  state?: unknown;
  onDurable?: () => void;
  beforeWrite?: () => void;
}): HistoryEntry | null => {
  const previousEntry = readHistoryEntry();
  const state: unknown =
    options.state === undefined
      ? options.owner === 'router' && options.mode === 'push'
        ? {}
        : history.state
      : options.state;
  const entry =
    manageable(state) && (options.mode === 'push' || manageable(history.state))
      ? options.mode === 'push'
        ? createEntry()
        : (previousEntry ?? createEntry())
      : null;
  let nextState: unknown = state;
  if (entry !== null) {
    nextState = {
      ...(isPlainHistoryState(state) ? state : {}),
      [field]: entry,
      ...(options.owner === 'router' || (isPlainHistoryState(state) && '__routerUrl' in state)
        ? { __routerUrl: options.url }
        : {}),
    };
  }
  const change: HistoryEntryChange = {
    mode: options.mode,
    previousUrl: readAddress(),
    url: options.url,
    previousEntry,
    entry,
    owner: options.owner,
  };
  notify(beforeObservers, change);
  options.beforeWrite?.();
  history[options.mode === 'push' ? 'pushState' : 'replaceState'](nextState, '', options.url);
  // durable flagを外部observerより先に確定する。
  options.onDurable?.();
  notify(afterObservers, change);
  return entry;
};
export const adoptHistoryEntry = (fresh = false): HistoryEntry | null => {
  const current = readHistoryEntry();
  if ((!fresh && current !== null) || !manageable(history.state)) return current;
  const entry = createEntry();
  const state: unknown = typeof history === 'undefined' ? null : history.state;
  const url = readAddress();
  try {
    history.replaceState(
      {
        ...(isPlainHistoryState(state) ? state : {}),
        [field]: entry,
        ...(isPlainHistoryState(state) && '__routerUrl' in state ? { __routerUrl: url } : {}),
      },
      '',
      url,
    );
  } catch {
    return null;
  }
  return entry;
};

export interface BrowserAddressChange {
  readonly url: string;
  readonly entry: HistoryEntry | null;
  readonly cause: 'traverse' | 'native-fragment-unidentified' | 'untracked-traverse';
  readonly serial: number;
}
export const observeBrowserAddressChange = (options: {
  getDisplayedUrl(): string;
  getEntryId(): string | null;
  onChange(change: BrowserAddressChange): void;
}): (() => void) => {
  let lastUrl = readAddress();
  let lastId = readHistoryEntry()?.id ?? null;
  let serial = 0;
  const observe = (event: Event): void => {
    const url = readAddress();
    const state: unknown = event instanceof PopStateEvent ? event.state : history.state;
    const entry = readHistoryEntry(state);
    if (url === lastUrl && (entry?.id ?? null) === lastId) return;
    lastUrl = url;
    lastId = entry?.id ?? null;
    const displayed = new URL(options.getDisplayedUrl(), window.location.origin);
    const address = new URL(url, window.location.origin);
    const cause =
      entry !== null && entry.id !== options.getEntryId()
        ? 'traverse'
        : entry === null &&
            displayed.hash !== address.hash &&
            displayed.pathname === address.pathname &&
            displayed.search === address.search
          ? 'native-fragment-unidentified'
          : 'untracked-traverse';
    const adopted =
      cause === 'native-fragment-unidentified'
        ? adoptHistoryEntry(true)
        : (entry ?? adoptHistoryEntry());
    lastId = adopted?.id ?? null;
    options.onChange({ url, entry: adopted, cause, serial: ++serial });
  };
  window.addEventListener('popstate', observe, true);
  window.addEventListener('hashchange', observe, true);
  const stopWriter = observeHistoryEntries(
    () => {
      /* 書込後だけaddressの重複観測を更新する。 */
    },
    () => {
      lastUrl = readAddress();
      lastId = readHistoryEntry()?.id ?? null;
    },
  );
  return () => {
    window.removeEventListener('popstate', observe, true);
    window.removeEventListener('hashchange', observe, true);
    stopWriter();
  };
};
