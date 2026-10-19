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
  listeners: Map<object, (snapshot: LayoutTocMobileSnapshot) => void>;
  revision: number;
  notificationRevision: number;
}

const createEntry = (): Entry => ({
  panelOpen: false,
  returnFocusTarget: null,
  cleanupDecision: createTocSourceCleanupDecision(null, 'none'),
  listeners: new Map(),
  revision: 0,
  notificationRevision: 0,
});

const toSnapshot = (entry: Entry): LayoutTocMobileSnapshot => ({
  panelOpen: entry.panelOpen,
  cleanupDecision: entry.cleanupDecision,
});

class LayoutTocMobileController {
  private _entries = new Map<string, Entry>();
  private _revision = 0;

  subscribe(
    id: string | undefined,
    listener: (snapshot: LayoutTocMobileSnapshot) => void,
  ): () => void {
    const resolvedId = this._resolveId(id);
    const entry = this._ensure(resolvedId);
    const registration = {};
    entry.listeners.set(registration, listener);
    this._notify(listener, toSnapshot(entry));

    return () => {
      entry.listeners.delete(registration);
    };
  }

  getSnapshot(id?: string): LayoutTocMobileSnapshot {
    return toSnapshot(this._ensure(id));
  }

  getRevision(id?: string): number {
    return this._ensure(id).revision;
  }

  open(id: string | undefined, trigger?: HTMLElement): void {
    const resolvedId = this._resolveId(id);
    const entry = this._ensure(resolvedId);

    this._commit(
      entry,
      true,
      createTocSourceCleanupDecision(resolvedId, 'none'),
      trigger instanceof HTMLElement ? trigger : entry.returnFocusTarget,
    );
  }

  close(id: string | undefined): void {
    const resolvedId = this._resolveId(id);
    const entry = this._ensure(resolvedId);
    this._commit(
      entry,
      false,
      createTocSourceCleanupDecision(resolvedId, 'refresh-panel-content'),
      entry.returnFocusTarget,
    );
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
    if (entry.returnFocusTarget !== null) {
      entry.returnFocusTarget = null;
      entry.revision = ++this._revision;
    }
    return target;
  }

  cleanup(id?: string): void {
    const resolvedId = this._resolveId(id);
    const entry = this._ensure(resolvedId);
    this._commit(
      entry,
      false,
      createTocSourceCleanupDecision(resolvedId, 'cleanup-stale-source'),
      null,
    );
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

  private _commit(
    entry: Entry,
    panelOpen: boolean,
    cleanupDecision: TocSourceCleanupDecision,
    returnFocusTarget: HTMLElement | null,
  ): void {
    const changed =
      entry.panelOpen !== panelOpen ||
      entry.cleanupDecision.directive !== cleanupDecision.directive ||
      entry.cleanupDecision.sourceId !== cleanupDecision.sourceId ||
      entry.cleanupDecision.allowedDuringHydration !== cleanupDecision.allowedDuringHydration;
    const focusChanged = entry.returnFocusTarget !== returnFocusTarget;
    entry.panelOpen = panelOpen;
    entry.cleanupDecision = cleanupDecision;
    entry.returnFocusTarget = returnFocusTarget;
    if (!changed && !focusChanged) return;
    entry.revision = ++this._revision;
    if (!changed) return;
    const revision = ++entry.notificationRevision;
    const snapshot = toSnapshot(entry);
    // 再入による新しいopen/closeを、外側の古い通知で上書きさせない。
    for (const [registration, listener] of [...entry.listeners]) {
      if (entry.notificationRevision !== revision) break;
      if (entry.listeners.has(registration)) this._notify(listener, snapshot);
    }
  }

  private _notify(
    listener: (snapshot: LayoutTocMobileSnapshot) => void,
    snapshot: LayoutTocMobileSnapshot,
  ): void {
    try {
      listener(snapshot);
    } catch (error) {
      try {
        console.warn('TOC mobile subscriber failed', error);
      } catch {
        // 診断先の障害も購読境界の外へ伝播させない。
      }
    }
  }

  private _invalidate(entry: Entry): void {
    entry.revision = ++this._revision;
    entry.notificationRevision += 1;
    entry.listeners.clear();
  }

  private _ensure(id?: string): Entry {
    const resolvedId = this._resolveId(id);
    const current = this._entries.get(resolvedId);
    if (current) {
      return current;
    }

    const entry = createEntry();
    entry.revision = ++this._revision;
    this._entries.set(resolvedId, entry);
    return entry;
  }

  private _resolveId(id?: string): string {
    const normalized = id?.trim();
    return normalized && normalized.length > 0 ? normalized : DEFAULT_LAYOUT_TOC_RUNTIME_ID;
  }
}

export const layoutTocMobileController = new LayoutTocMobileController();
