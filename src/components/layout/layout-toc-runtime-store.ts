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
  listeners: Map<object, (snapshot: LayoutTocRuntimeSnapshot) => void>;
  revision: number;
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
  listeners: new Map(),
  revision: 0,
});

class LayoutTocRuntimeStore {
  private _entries = new Map<string, Entry>();

  publish(
    id: string | undefined,
    snapshot: LayoutTocRuntimeSnapshotInput,
  ): LayoutTocRuntimeSnapshot {
    const entry = this._ensure(id);
    return this._commit(entry, this._normalizeSnapshot(snapshot));
  }

  subscribe(
    id: string | undefined,
    listener: (snapshot: LayoutTocRuntimeSnapshot) => void,
  ): () => void {
    const resolvedId = this._resolveId(id);
    const entry = this._ensure(resolvedId);
    const registration = {};
    entry.listeners.set(registration, listener);
    this._notify(listener, entry.snapshot);

    return () => {
      entry.listeners.delete(registration);
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
    return this._commit(entry, {
      ...entry.snapshot,
      panelContentSignature: signature,
    });
  }

  dispose(id: string | undefined): void {
    const resolvedId = this._resolveId(id);
    const entry = this._ensure(resolvedId);
    this._commit(entry, {
      ...entry.snapshot,
      ready: false,
      hasVisibleHeadings: false,
      activeId: null,
      hydrationState: 'disposed',
    });
  }

  reset(id?: string): void {
    if (id === undefined) {
      for (const entry of this._entries.values()) this._invalidate(entry);
      this._entries.clear();
      return;
    }

    const resolvedId = this._resolveId(id);
    const entry = this._entries.get(resolvedId);
    if (entry) this._invalidate(entry);
    this._entries.delete(resolvedId);
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

  private _commit(entry: Entry, snapshot: LayoutTocRuntimeSnapshot): LayoutTocRuntimeSnapshot {
    const previous = entry.snapshot;
    const signature = snapshot.panelContentSignature;
    const previousSignature = previous.panelContentSignature;
    if (
      previous.ready === snapshot.ready &&
      previous.hasVisibleHeadings === snapshot.hasVisibleHeadings &&
      previous.activeId === snapshot.activeId &&
      previous.hydrationState === snapshot.hydrationState &&
      signature?.ownerId === previousSignature?.ownerId &&
      signature?.headingCount === previousSignature?.headingCount &&
      signature?.sourceVersion === previousSignature?.sourceVersion
    ) {
      return previous;
    }

    entry.snapshot = snapshot;
    const revision = ++entry.revision;
    // 再入で新しい状態が確定した後に、古い通知を後続購読者へ渡さない。
    for (const [registration, listener] of [...entry.listeners]) {
      if (entry.revision !== revision) break;
      if (entry.listeners.has(registration)) this._notify(listener, snapshot);
    }
    return snapshot;
  }

  private _notify(
    listener: (snapshot: LayoutTocRuntimeSnapshot) => void,
    snapshot: LayoutTocRuntimeSnapshot,
  ): void {
    try {
      listener(snapshot);
    } catch (error) {
      // 購読側の障害で確定済み状態や他の購読を失わせない。
      try {
        console.warn('TOC runtime subscriber failed', error);
      } catch {
        // 診断先の障害も購読境界の外へ伝播させない。
      }
    }
  }

  private _invalidate(entry: Entry): void {
    entry.revision += 1;
    entry.listeners.clear();
  }

  private _resolveId(id?: string): string {
    const normalized = id?.trim();
    return normalized && normalized.length > 0 ? normalized : DEFAULT_LAYOUT_TOC_RUNTIME_ID;
  }
}

export const layoutTocRuntimeStore = new LayoutTocRuntimeStore();
export { serializeTocPanelContentSignature };
