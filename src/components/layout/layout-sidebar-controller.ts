import type { SidebarMode, SidebarState } from '../ui/sidebar-shell/sidebar-shell.js';

export const DEFAULT_LAYOUT_SIDEBAR_ID = 'note-primary';

export interface LayoutSidebarControllerSnapshot {
  readonly mode: SidebarMode;
  readonly state: SidebarState;
  readonly isRegistered: boolean;
}

export interface LayoutSidebarControllerAdapter {
  applyOverlayState(state: SidebarState, options?: { trigger?: HTMLElement }): void;
}

interface Entry {
  mode: SidebarMode;
  overlayState: SidebarState;
  adapter: LayoutSidebarControllerAdapter | null;
  listeners: Set<(snapshot: LayoutSidebarControllerSnapshot) => void>;
}

const createEntry = (): Entry => ({
  mode: 'overlay',
  overlayState: 'collapsed',
  adapter: null,
  listeners: new Set(),
});

const toSnapshot = (entry: Entry): LayoutSidebarControllerSnapshot => ({
  mode: entry.mode,
  state: entry.mode === 'fixed' ? 'expanded' : entry.overlayState,
  isRegistered: entry.adapter !== null,
});

class LayoutSidebarController {
  private _entries = new Map<string, Entry>();

  getSnapshot(id?: string): LayoutSidebarControllerSnapshot {
    return toSnapshot(this._ensure(id));
  }

  getOverlayState(id?: string): SidebarState {
    return this._ensure(id).overlayState;
  }

  subscribe(
    id: string | undefined,
    listener: (snapshot: LayoutSidebarControllerSnapshot) => void,
  ): () => void {
    const resolvedId = this._resolveId(id);
    const entry = this._ensure(resolvedId);

    entry.listeners.add(listener);
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

  register(id: string | undefined, adapter: LayoutSidebarControllerAdapter): () => void {
    const resolvedId = this._resolveId(id);
    const entry = this._ensure(resolvedId);

    entry.adapter = adapter;
    adapter.applyOverlayState(entry.overlayState);
    this._emit(resolvedId, entry);

    return () => {
      const current = this._entries.get(resolvedId);
      if (current?.adapter !== adapter) {
        return;
      }

      current.adapter = null;
      this._emit(resolvedId, current);
    };
  }

  report(id: string | undefined, snapshot: { mode: SidebarMode; state: SidebarState }): void {
    const resolvedId = this._resolveId(id);
    const entry = this._ensure(resolvedId);

    entry.mode = snapshot.mode;
    if (snapshot.mode === 'overlay') {
      entry.overlayState = snapshot.state;
    }

    this._emit(resolvedId, entry);
  }

  toggle(id: string | undefined, trigger?: HTMLElement): void {
    const resolvedId = this._resolveId(id);
    const entry = this._ensure(resolvedId);

    if (entry.mode === 'fixed') {
      this._emit(resolvedId, entry);
      return;
    }

    const nextState: SidebarState = entry.overlayState === 'expanded' ? 'collapsed' : 'expanded';

    entry.overlayState = nextState;
    if (trigger instanceof HTMLElement) {
      entry.adapter?.applyOverlayState(nextState, { trigger });
    } else {
      entry.adapter?.applyOverlayState(nextState);
    }
    this._emit(resolvedId, entry);
  }

  reset(id?: string): void {
    if (id === undefined) {
      this._entries.clear();
      return;
    }

    this._entries.delete(this._resolveId(id));
  }

  private _emit(resolvedId: string, entry: Entry): void {
    const snapshot = toSnapshot(entry);

    for (const listener of entry.listeners) {
      listener(snapshot);
    }

    this._cleanupIfUnobserved(resolvedId, entry);
  }

  private _cleanupIfUnobserved(resolvedId: string, entry: Entry): void {
    if (entry.adapter !== null || entry.listeners.size > 0) {
      return;
    }

    if (entry.overlayState === 'collapsed') {
      this._entries.delete(resolvedId);
      return;
    }

    entry.mode = 'overlay';
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
}

export const layoutSidebarController = new LayoutSidebarController();
