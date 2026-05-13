import type { SidebarMode, SidebarState } from '../ui/sidebar-shell/sidebar-shell.js';
import {
  DEFAULT_SIDEBAR_ID,
  DEFAULT_SIDEBAR_FIXED_BREAKPOINT as NOTE_SIDEBAR_FIXED_BREAKPOINT,
} from '../../../shared/navigation/sidebar-shell-defaults.js';

export const DEFAULT_LAYOUT_SIDEBAR_ID = DEFAULT_SIDEBAR_ID;

const OVERLAY_STATE_STORAGE_KEY = 'rouault.note-sidebar.overlay-state';
const MIN_BREAKPOINT = 320;

export type LayoutSidebarPresentation = 'auto' | 'fixed' | 'overlay';

export interface LayoutSidebarControllerSnapshot {
  readonly mode: SidebarMode;
  readonly state: SidebarState;
  readonly returnFocusTarget: HTMLElement | null;
}

export interface LayoutSidebarStoreInitializeOptions {
  readonly presentation: LayoutSidebarPresentation;
  readonly fixedBreakpoint: number;
  readonly storage?: Storage | null;
}

interface Entry {
  presentation: LayoutSidebarPresentation;
  fixedBreakpoint: number;
  mode: SidebarMode;
  overlayState: SidebarState;
  returnFocusTarget: HTMLElement | null;
  listeners: Set<(snapshot: LayoutSidebarControllerSnapshot) => void>;
  mediaQuery: MediaQueryList | null;
  mediaQueryListener: ((event: MediaQueryListEvent) => void) | null;
  storage: Storage | null;
  hasRuntimeOverlayState: boolean;
  hasHadSubscriber: boolean;
  cleanupScheduled: boolean;
}

type PersistedOverlayStateMap = Record<string, SidebarState>;

const createEntry = (): Entry => ({
  presentation: 'overlay',
  fixedBreakpoint: NOTE_SIDEBAR_FIXED_BREAKPOINT,
  mode: 'overlay',
  overlayState: 'collapsed',
  returnFocusTarget: null,
  listeners: new Set(),
  mediaQuery: null,
  mediaQueryListener: null,
  storage: null,
  hasRuntimeOverlayState: false,
  hasHadSubscriber: false,
  cleanupScheduled: false,
});

const toSnapshot = (entry: Entry): LayoutSidebarControllerSnapshot => ({
  mode: entry.mode,
  state: entry.mode === 'fixed' ? 'expanded' : entry.overlayState,
  returnFocusTarget:
    entry.returnFocusTarget instanceof HTMLElement && entry.returnFocusTarget.isConnected
      ? entry.returnFocusTarget
      : null,
});

const normalizeFixedBreakpoint = (value: number): number => {
  if (!Number.isFinite(value)) {
    return NOTE_SIDEBAR_FIXED_BREAKPOINT;
  }

  const normalized = Math.trunc(value);
  return normalized >= MIN_BREAKPOINT ? normalized : MIN_BREAKPOINT;
};

class LayoutSidebarController {
  private _entries = new Map<string, Entry>();

  initialize(id: string | undefined, options: LayoutSidebarStoreInitializeOptions): void {
    const resolvedId = this._resolveId(id);
    const entry = this._ensure(resolvedId);

    entry.presentation = options.presentation;
    entry.fixedBreakpoint = normalizeFixedBreakpoint(options.fixedBreakpoint);
    entry.storage = options.storage ?? null;

    if (entry.hasRuntimeOverlayState) {
      this._persistOverlayState(resolvedId, entry);
    } else {
      this.restorePersistedOverlayState(resolvedId);
    }
    this._initMediaQuery(resolvedId, entry);
    this._emit(resolvedId, entry);
  }

  subscribe(
    id: string | undefined,
    listener: (snapshot: LayoutSidebarControllerSnapshot) => void,
  ): () => void {
    const resolvedId = this._resolveId(id);
    const entry = this._ensure(resolvedId);

    entry.listeners.add(listener);
    entry.hasHadSubscriber = true;
    listener(toSnapshot(entry));

    return () => {
      const current = this._entries.get(resolvedId);
      current?.listeners.delete(listener);

      if (current === undefined) {
        return;
      }

      this._cleanupIfUnobserved(resolvedId, current);
    };
  }

  getSnapshot(id?: string): LayoutSidebarControllerSnapshot {
    return toSnapshot(this._ensure(id));
  }

  setViewportMode(id: string | undefined, mode: SidebarMode): void {
    const resolvedId = this._resolveId(id);
    const entry = this._ensure(resolvedId);

    if (entry.mode === mode) {
      return;
    }

    entry.mode = mode;
    this._emit(resolvedId, entry);
  }

  open(id: string | undefined, trigger?: HTMLElement): void {
    const resolvedId = this._resolveId(id);
    const entry = this._ensure(resolvedId);

    if (entry.mode !== 'overlay') {
      this._emit(resolvedId, entry);
      return;
    }

    if (trigger instanceof HTMLElement) {
      entry.returnFocusTarget = trigger;
    }

    entry.hasRuntimeOverlayState = true;

    if (entry.overlayState === 'expanded') {
      this._persistOverlayState(resolvedId, entry);
      this._emit(resolvedId, entry);
      return;
    }

    entry.overlayState = 'expanded';
    this._persistOverlayState(resolvedId, entry);
    this._emit(resolvedId, entry);
  }

  close(id: string | undefined): void {
    const resolvedId = this._resolveId(id);
    const entry = this._ensure(resolvedId);

    if (entry.mode !== 'overlay') {
      this._emit(resolvedId, entry);
      return;
    }

    entry.hasRuntimeOverlayState = true;

    if (entry.overlayState === 'collapsed') {
      this._persistOverlayState(resolvedId, entry);
      this._emit(resolvedId, entry);
      return;
    }

    entry.overlayState = 'collapsed';
    this._persistOverlayState(resolvedId, entry);
    this._emit(resolvedId, entry);
  }

  toggle(id: string | undefined, trigger?: HTMLElement): void {
    const resolvedId = this._resolveId(id);
    const entry = this._ensure(resolvedId);

    if (entry.mode !== 'overlay') {
      this._emit(resolvedId, entry);
      return;
    }

    entry.hasRuntimeOverlayState = true;

    if (entry.overlayState === 'expanded') {
      entry.overlayState = 'collapsed';
      this._persistOverlayState(resolvedId, entry);
      this._emit(resolvedId, entry);
      return;
    }

    if (trigger instanceof HTMLElement) {
      entry.returnFocusTarget = trigger;
    }

    entry.overlayState = 'expanded';
    this._persistOverlayState(resolvedId, entry);
    this._emit(resolvedId, entry);
  }

  restorePersistedOverlayState(id?: string): void {
    const resolvedId = this._resolveId(id);
    const entry = this._ensure(resolvedId);
    const storage = entry.storage;
    if (storage === null) {
      return;
    }

    try {
      const raw = storage.getItem(OVERLAY_STATE_STORAGE_KEY);
      if (raw === null) {
        return;
      }

      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        return;
      }

      const state = (parsed as PersistedOverlayStateMap)[resolvedId];
      if (state === 'expanded' || state === 'collapsed') {
        entry.overlayState = state;
      }
    } catch {
      // localStorage が使えない環境では永続化を無視する。
    }
  }

  reset(id?: string): void {
    if (id === undefined) {
      for (const entry of this._entries.values()) {
        this._destroyMediaQuery(entry);
      }
      this._entries.clear();
      return;
    }

    const resolvedId = this._resolveId(id);
    const entry = this._entries.get(resolvedId);
    if (entry) {
      this._destroyMediaQuery(entry);
    }
    this._entries.delete(resolvedId);
  }

  private _emit(resolvedId: string, entry: Entry): void {
    const snapshot = toSnapshot(entry);

    for (const listener of entry.listeners) {
      listener(snapshot);
    }

    this._scheduleCleanupIfUnobserved(resolvedId, entry);
  }

  private _cleanupIfUnobserved(resolvedId: string, entry: Entry): void {
    if (entry.listeners.size > 0) {
      return;
    }

    if (!entry.hasHadSubscriber && entry.hasRuntimeOverlayState) {
      return;
    }

    if (!entry.hasHadSubscriber && entry.mediaQuery === null) {
      return;
    }

    this._destroyMediaQuery(entry);
    this._entries.delete(resolvedId);
  }

  private _scheduleCleanupIfUnobserved(resolvedId: string, entry: Entry): void {
    if (entry.cleanupScheduled) {
      return;
    }

    entry.cleanupScheduled = true;
    queueMicrotask(() => {
      entry.cleanupScheduled = false;
      if (this._entries.get(resolvedId) !== entry) {
        return;
      }

      this._cleanupIfUnobserved(resolvedId, entry);
    });
  }

  private _ensure(id?: string): Entry {
    const resolvedId = this._resolveId(id);
    const current = this._entries.get(resolvedId);
    if (current) {
      return current;
    }

    const entry = createEntry();
    this._entries.set(resolvedId, entry);
    return entry;
  }

  private _resolveId(id?: string): string {
    const normalized = id?.trim();
    return normalized && normalized.length > 0 ? normalized : DEFAULT_LAYOUT_SIDEBAR_ID;
  }

  private _initMediaQuery(resolvedId: string, entry: Entry): void {
    this._destroyMediaQuery(entry);

    if (entry.presentation === 'fixed') {
      entry.mode = 'fixed';
      return;
    }

    if (entry.presentation === 'overlay') {
      entry.mode = 'overlay';
      return;
    }

    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      entry.mode = 'overlay';
      return;
    }

    const mediaQuery = window.matchMedia(`(min-width: ${String(entry.fixedBreakpoint)}px)`);
    const listener = (event: MediaQueryListEvent): void => {
      this.setViewportMode(resolvedId, event.matches ? 'fixed' : 'overlay');
    };

    entry.mediaQuery = mediaQuery;
    entry.mediaQueryListener = listener;
    entry.mode = mediaQuery.matches ? 'fixed' : 'overlay';
    mediaQuery.addEventListener('change', listener);
  }

  private _destroyMediaQuery(entry: Entry): void {
    if (entry.mediaQuery && entry.mediaQueryListener) {
      entry.mediaQuery.removeEventListener('change', entry.mediaQueryListener);
    }

    entry.mediaQuery = null;
    entry.mediaQueryListener = null;
  }

  private _persistOverlayState(resolvedId: string, entry: Entry): void {
    const storage = entry.storage;
    if (storage === null) {
      return;
    }

    try {
      const raw = storage.getItem(OVERLAY_STATE_STORAGE_KEY);
      const parsed: unknown = raw === null ? {} : JSON.parse(raw);
      const nextValue: PersistedOverlayStateMap =
        typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
          ? { ...(parsed as PersistedOverlayStateMap) }
          : {};

      nextValue[resolvedId] = entry.overlayState;
      storage.setItem(OVERLAY_STATE_STORAGE_KEY, JSON.stringify(nextValue));
    } catch {
      // localStorage が使えない環境では永続化を無視する。
    }
  }
}

export const layoutSidebarController = new LayoutSidebarController();
