import { resolveTocHydrationState, type TocHydrationState } from '../../toc/toc-hydration-state.js';
import {
  createTocPanelContentSignature,
  serializeTocPanelContentSignature,
  type TocPanelContentSignature,
} from '../../toc/toc-panel-content-signature.js';

export interface LayoutTocRuntimeSnapshot {
  readonly ready: boolean;
  readonly hasVisibleHeadings: boolean;
  readonly activeId: string | null;
  readonly hydrationState?: TocHydrationState;
  readonly panelContentSignature?: TocPanelContentSignature | null;
}

const DEFAULT_LAYOUT_TOC_RUNTIME_ID = 'page-toc';

export type LayoutTocRuntimeSnapshotInput = Pick<
  LayoutTocRuntimeSnapshot,
  'ready' | 'hasVisibleHeadings' | 'activeId'
> &
  Partial<Pick<LayoutTocRuntimeSnapshot, 'hydrationState' | 'panelContentSignature'>>;

interface Entry {
  snapshot: LayoutTocRuntimeSnapshot;
  listeners: Set<(snapshot: LayoutTocRuntimeSnapshot) => void>;
}

const createDefaultSnapshot = (): LayoutTocRuntimeSnapshot => ({
  ready: false,
  hasVisibleHeadings: false,
  activeId: null,
  hydrationState: 'unhydrated',
  panelContentSignature: null,
});

const createEntry = (): Entry => ({
  snapshot: createDefaultSnapshot(),
  listeners: new Set(),
});

class LayoutTocRuntimeStore {
  private _entries = new Map<string, Entry>();

  publish(id: string | undefined, snapshot: LayoutTocRuntimeSnapshotInput): void {
    const entry = this._ensure(id);
    entry.snapshot = this._normalizeSnapshot(snapshot);

    this._emit(entry);
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

  publishPanelContent(
    id: string | undefined,
    input: {
      readonly ownerId: string | null | undefined;
      readonly headingCount: number;
      readonly sourceVersion?: string | null;
    },
  ): LayoutTocRuntimeSnapshot {
    const entry = this._ensure(id);
    const signature = createTocPanelContentSignature(input);
    entry.snapshot = {
      ...entry.snapshot,
      panelContentSignature: signature,
    };
    this._emit(entry);
    return entry.snapshot;
  }

  dispose(id: string | undefined): void {
    const resolvedId = this._resolveId(id);
    const entry = this._ensure(resolvedId);
    entry.snapshot = {
      ...entry.snapshot,
      ready: false,
      hasVisibleHeadings: false,
      activeId: null,
      hydrationState: 'disposed',
    };
    this._emit(entry);
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

  private _normalizeSnapshot(snapshot: LayoutTocRuntimeSnapshotInput): LayoutTocRuntimeSnapshot {
    const panelContentSignature =
      snapshot.panelContentSignature ??
      (snapshot.hasVisibleHeadings
        ? createTocPanelContentSignature({
            ownerId: DEFAULT_LAYOUT_TOC_RUNTIME_ID,
            headingCount: 1,
            sourceVersion: snapshot.activeId ?? 'current',
          })
        : null);

    return {
      ready: snapshot.ready,
      hasVisibleHeadings: snapshot.hasVisibleHeadings,
      activeId: snapshot.activeId,
      hydrationState:
        snapshot.hydrationState ?? resolveTocHydrationState({ ready: snapshot.ready }),
      panelContentSignature,
    };
  }

  private _emit(entry: Entry): void {
    const snapshot = entry.snapshot;
    for (const listener of entry.listeners) {
      listener(snapshot);
    }
  }

  private _resolveId(id?: string): string {
    const normalized = id?.trim();
    return normalized && normalized.length > 0 ? normalized : DEFAULT_LAYOUT_TOC_RUNTIME_ID;
  }
}

export const layoutTocRuntimeStore = new LayoutTocRuntimeStore();
export { serializeTocPanelContentSignature };
