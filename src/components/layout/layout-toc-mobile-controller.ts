import {
  createTocSourceCleanupDecision,
  type TocSourceCleanupDecision,
} from '../../toc/toc-source-cleanup-directive.js';

export interface LayoutTocMobileSnapshot {
  readonly panelOpen: boolean;
  readonly cleanupDecision: TocSourceCleanupDecision;
}

const DEFAULT_LAYOUT_TOC_RUNTIME_ID = 'page-toc';

interface Entry {
  panelOpen: boolean;
  returnFocusTarget: HTMLElement | null;
  cleanupDecision: TocSourceCleanupDecision;
  listeners: Set<(snapshot: LayoutTocMobileSnapshot) => void>;
}

const createEntry = (): Entry => ({
  panelOpen: false,
  returnFocusTarget: null,
  cleanupDecision: createTocSourceCleanupDecision(null, 'none'),
  listeners: new Set(),
});

const toSnapshot = (entry: Entry): LayoutTocMobileSnapshot => ({
  panelOpen: entry.panelOpen,
  cleanupDecision: entry.cleanupDecision,
});

class LayoutTocMobileController {
  private _entries = new Map<string, Entry>();

  subscribe(
    id: string | undefined,
    listener: (snapshot: LayoutTocMobileSnapshot) => void,
  ): () => void {
    const resolvedId = this._resolveId(id);
    const entry = this._ensure(resolvedId);
    entry.listeners.add(listener);
    listener(toSnapshot(entry));

    return () => {
      const current = this._entries.get(resolvedId);
      current?.listeners.delete(listener);
    };
  }

  getSnapshot(id?: string): LayoutTocMobileSnapshot {
    return toSnapshot(this._ensure(id));
  }

  open(id: string | undefined, trigger?: HTMLElement): void {
    const resolvedId = this._resolveId(id);
    const entry = this._ensure(resolvedId);

    if (trigger instanceof HTMLElement) {
      entry.returnFocusTarget = trigger;
    }
    entry.cleanupDecision = createTocSourceCleanupDecision(resolvedId, 'none');

    if (entry.panelOpen) {
      this._emit(entry);
      return;
    }

    entry.panelOpen = true;
    this._emit(entry);
  }

  close(id: string | undefined): void {
    const resolvedId = this._resolveId(id);
    const entry = this._ensure(resolvedId);
    entry.cleanupDecision = createTocSourceCleanupDecision(resolvedId, 'refresh-panel-content');
    if (!entry.panelOpen) {
      this._emit(entry);
      return;
    }

    entry.panelOpen = false;
    this._emit(entry);
  }

  toggle(id: string | undefined, trigger?: HTMLElement): void {
    const entry = this._ensure(id);
    if (entry.panelOpen) {
      this.close(id);
      return;
    }

    this.open(id, trigger);
  }

  consumeReturnFocusTarget(id?: string): HTMLElement | null {
    const entry = this._ensure(id);
    const target =
      entry.returnFocusTarget instanceof HTMLElement && entry.returnFocusTarget.isConnected
        ? entry.returnFocusTarget
        : null;
    entry.returnFocusTarget = null;
    return target;
  }

  cleanup(id?: string): void {
    const resolvedId = this._resolveId(id);
    const entry = this._ensure(resolvedId);
    entry.panelOpen = false;
    entry.returnFocusTarget = null;
    entry.cleanupDecision = createTocSourceCleanupDecision(resolvedId, 'cleanup-stale-source');
    this._emit(entry);
  }

  reset(id?: string): void {
    if (id === undefined) {
      this._entries.clear();
      return;
    }

    this._entries.delete(this._resolveId(id));
  }

  private _emit(entry: Entry): void {
    const snapshot = toSnapshot(entry);
    for (const listener of entry.listeners) {
      listener(snapshot);
    }
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
    return normalized && normalized.length > 0 ? normalized : DEFAULT_LAYOUT_TOC_RUNTIME_ID;
  }
}

export const layoutTocMobileController = new LayoutTocMobileController();
