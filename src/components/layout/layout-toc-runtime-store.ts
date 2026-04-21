export interface LayoutTocRuntimeSnapshot {
  readonly ready: boolean;
  readonly hasVisibleHeadings: boolean;
  readonly activeId: string | null;
}

const DEFAULT_LAYOUT_TOC_RUNTIME_ID = 'page-toc';

interface Entry {
  snapshot: LayoutTocRuntimeSnapshot;
  listeners: Set<(snapshot: LayoutTocRuntimeSnapshot) => void>;
}

const createDefaultSnapshot = (): LayoutTocRuntimeSnapshot => ({
  ready: false,
  hasVisibleHeadings: false,
  activeId: null,
});

const createEntry = (): Entry => ({
  snapshot: createDefaultSnapshot(),
  listeners: new Set(),
});

class LayoutTocRuntimeStore {
  private _entries = new Map<string, Entry>();

  publish(id: string | undefined, snapshot: LayoutTocRuntimeSnapshot): void {
    const entry = this._ensure(id);
    entry.snapshot = snapshot;

    for (const listener of entry.listeners) {
      listener(snapshot);
    }
  }

  subscribe(
    id: string | undefined,
    listener: (snapshot: LayoutTocRuntimeSnapshot) => void,
  ): () => void {
    const resolvedId = this._resolveId(id);
    const entry = this._ensure(resolvedId);
    entry.listeners.add(listener);
    listener(entry.snapshot);

    return () => {
      const current = this._entries.get(resolvedId);
      current?.listeners.delete(listener);
    };
  }

  getSnapshot(id?: string): LayoutTocRuntimeSnapshot {
    return this._ensure(id).snapshot;
  }

  reset(id?: string): void {
    if (id === undefined) {
      this._entries.clear();
      return;
    }

    this._entries.delete(this._resolveId(id));
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

export const layoutTocRuntimeStore = new LayoutTocRuntimeStore();
