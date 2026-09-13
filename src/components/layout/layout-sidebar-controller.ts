import type {
  SidebarMode,
  SidebarState,
  SidebarReturnFocusDescriptor,
  SidebarRuntimeSnapshot,
} from '../../../shared/navigation/sidebar-presentation.js';
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
  returnFocusDescriptor: SidebarReturnFocusDescriptor | null;
  listeners: Set<(snapshot: LayoutSidebarControllerSnapshot) => void>;
  mediaQuery: MediaQueryList | null;
  mediaQueryListener: ((event: MediaQueryListEvent) => void) | null;
  storage: Storage | null;
  hasRuntimeOverlayState: boolean;
  pendingUserPersistence: boolean;
  hasHadSubscriber: boolean;
  cleanupScheduled: boolean;
}

type PersistedOverlayStateMap = Record<string, SidebarState>;

const createEntry = (): Entry => ({
  presentation: 'overlay',
  fixedBreakpoint: NOTE_SIDEBAR_FIXED_BREAKPOINT,
  mode: 'overlay',
  overlayState: 'collapsed',
  returnFocusDescriptor: null,
  listeners: new Set(),
  mediaQuery: null,
  mediaQueryListener: null,
  storage: null,
  hasRuntimeOverlayState: false,
  pendingUserPersistence: false,
  hasHadSubscriber: false,
  cleanupScheduled: false,
});

const toSnapshot = (entry: Entry): LayoutSidebarControllerSnapshot => ({
  mode: entry.mode,
  state: entry.mode === 'fixed' ? 'expanded' : entry.overlayState,
  returnFocusTarget: resolveReturnFocus(entry.returnFocusDescriptor),
});

const resolveReturnFocus = (
  descriptor: SidebarReturnFocusDescriptor | null,
): HTMLElement | null => {
  if (descriptor === null) return null;
  if (descriptor.kind === 'connected-element') {
    return descriptor.element.isConnected &&
      descriptor.element.ownerDocument === globalThis.document
      ? descriptor.element
      : null;
  }
  if (typeof document === 'undefined') return null;
  const matches = [
    ...document.querySelectorAll<HTMLElement>(
      'header[data-layout-header] [data-layout-sidebar-toggle]',
    ),
  ].filter((element) => element.getAttribute('data-sidebar-id') === descriptor.sidebarId);
  return matches.length === 1 ? (matches[0] ?? null) : null;
};

const describeReturnFocus = (
  trigger: HTMLElement,
  sidebarId: string,
): SidebarReturnFocusDescriptor =>
  trigger.matches('[data-layout-sidebar-toggle]') && trigger.closest('header[data-layout-header]')
    ? { kind: 'sidebar-header-trigger', sidebarId }
    : { kind: 'connected-element', element: trigger };

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

    if (!entry.hasRuntimeOverlayState) {
      this.restorePersistedOverlayState(resolvedId);
    }
    if (entry.pendingUserPersistence) this._persistOverlayState(resolvedId, entry);
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
    try {
      listener(toSnapshot(entry));
    } catch (error) {
      entry.listeners.delete(listener);
      this._cleanupIfUnobserved(resolvedId, entry);
      throw error;
    }

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

  readRuntimeSnapshot(id?: string): SidebarRuntimeSnapshot {
    const entry = this._ensure(id);
    return { overlayState: entry.overlayState, returnFocusDescriptor: entry.returnFocusDescriptor };
  }

  restoreRuntimeSnapshot(id: string | undefined, snapshot: SidebarRuntimeSnapshot): void {
    const resolvedId = this._resolveId(id);
    const entry = this._ensure(resolvedId);
    entry.overlayState = snapshot.overlayState;
    entry.returnFocusDescriptor = snapshot.returnFocusDescriptor;
    entry.hasRuntimeOverlayState = true;
    entry.pendingUserPersistence = false;
    this._emit(resolvedId, entry);
  }

  setOverlayStateWithoutPersisting(id: string | undefined, state: SidebarState): void {
    this.restoreRuntimeSnapshot(id, { ...this.readRuntimeSnapshot(id), overlayState: state });
  }

  clearReturnFocusDescriptor(id?: string): void {
    this._ensure(id).returnFocusDescriptor = null;
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
      entry.returnFocusDescriptor = describeReturnFocus(trigger, resolvedId);
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
      entry.returnFocusDescriptor = describeReturnFocus(trigger, resolvedId);
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
      entry.pendingUserPersistence = true;
      return;
    }
    entry.pendingUserPersistence = false;

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
