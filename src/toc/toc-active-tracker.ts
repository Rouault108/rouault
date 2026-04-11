import type { Heading } from '../components/ui/toc/toc.js';
import {
  applyTocScopeSelections,
  filterHeadingsByScopeSelections,
  findContentRoot,
  filterVisibleHeadings,
  type TocCapabilities,
  readTocScopeSelectionMap,
} from './filter-visible-headings.js';

export interface TocActiveTrackerOptions {
  contentRootId: string;
  headings: Heading[];
  capabilities: TocCapabilities;
  getActiveId: () => string;
  onVisibleHeadingsChange: (headings: Heading[]) => void;
  onActiveIdChange: (id: string) => void;
}

const decodeHash = (hash: string): string => {
  const normalized = hash.replace(/^#/, '').trim();
  if (normalized.length === 0) {
    return '';
  }

  try {
    return decodeURIComponent(normalized).trim();
  } catch {
    return normalized;
  }
};

const readHeaderOffset = (): number => {
  const headerHeightRaw = getComputedStyle(document.documentElement)
    .getPropertyValue('--header-height')
    .trim();
  const headerHeight = headerHeightRaw ? Number.parseFloat(headerHeightRaw) : Number.NaN;
  return (Number.isFinite(headerHeight) ? headerHeight : 48) + 32;
};

export class TocActiveTracker {
  private readonly _contentRootId: string;
  private readonly _capabilities: TocCapabilities;
  private readonly _getActiveId: () => string;
  private readonly _onVisibleHeadingsChange: (headings: Heading[]) => void;
  private readonly _onActiveIdChange: (id: string) => void;
  private _allHeadings: Heading[];
  private _contentRoot: HTMLElement | null = null;
  private _mutationObserver: MutationObserver | null = null;
  private _visibleHeadings: Heading[] = [];
  private _started = false;
  private _refreshScheduled = false;
  private _viewportSyncScheduled = false;
  private _initialRefreshTimer: number | null = null;
  private _initialViewportSyncFrame: number | null = null;
  private _pendingEmptyVisibleHeadingsTimer: number | null = null;

  constructor(options: TocActiveTrackerOptions) {
    this._contentRootId = options.contentRootId;
    this._allHeadings = options.headings;
    this._capabilities = options.capabilities;
    this._getActiveId = options.getActiveId;
    this._onVisibleHeadingsChange = options.onVisibleHeadingsChange;
    this._onActiveIdChange = options.onActiveIdChange;
  }

  setHeadings(headings: Heading[]): void {
    this._allHeadings = headings;
    if (!this._started) {
      return;
    }

    this.refresh();
  }

  start(): void {
    if (this._started || typeof window === 'undefined') {
      return;
    }

    this._started = true;
    window.addEventListener('hashchange', this._onHashChange);
    window.addEventListener('scroll', this._onViewportChange, { passive: true });
    window.addEventListener('resize', this._onViewportChange);
    window.addEventListener('pageshow', this._onViewportChange);
    document.addEventListener('ui-tab-change', this._onTabChange as EventListener);

    this.refresh();
    this._scheduleViewportSync();

    this._initialRefreshTimer = window.setTimeout(() => {
      this._initialRefreshTimer = null;
      if (!this._started) {
        return;
      }
      this.refresh();
      this._scheduleViewportSync();
    }, 0);

    this._initialViewportSyncFrame = window.requestAnimationFrame(() => {
      this._initialViewportSyncFrame = null;
      if (!this._started) {
        return;
      }
      this._syncActiveHeadingFromViewport();
    });
  }

  destroy(): void {
    if (!this._started || typeof window === 'undefined') {
      return;
    }

    this._started = false;
    window.removeEventListener('hashchange', this._onHashChange);
    window.removeEventListener('scroll', this._onViewportChange);
    window.removeEventListener('resize', this._onViewportChange);
    window.removeEventListener('pageshow', this._onViewportChange);
    document.removeEventListener('ui-tab-change', this._onTabChange as EventListener);
    this._teardownMutationObserver();
    this._refreshScheduled = false;
    this._viewportSyncScheduled = false;

    if (this._initialRefreshTimer !== null) {
      clearTimeout(this._initialRefreshTimer);
      this._initialRefreshTimer = null;
    }

    if (this._initialViewportSyncFrame !== null) {
      cancelAnimationFrame(this._initialViewportSyncFrame);
      this._initialViewportSyncFrame = null;
    }

    if (this._pendingEmptyVisibleHeadingsTimer !== null) {
      clearTimeout(this._pendingEmptyVisibleHeadingsTimer);
      this._pendingEmptyVisibleHeadingsTimer = null;
    }
  }

  refresh(): void {
    this._contentRoot = findContentRoot(this._contentRootId);
    this._setupMutationObserver();
    this._syncVisibleHeadings();
    this._syncActiveHeadingFromHash();
    this._scheduleViewportSync();
  }

  private _syncVisibleHeadings(): void {
    const contentRoot = this._contentRoot;
    const scopedHeadings =
      this._capabilities.dynamicScopes && contentRoot
        ? filterHeadingsByScopeSelections(this._allHeadings, readTocScopeSelectionMap(contentRoot))
        : this._allHeadings;

    const nextVisibleHeadings = contentRoot
      ? filterVisibleHeadings(contentRoot, scopedHeadings)
      : scopedHeadings;

    if (
      contentRoot &&
      !this._capabilities.dynamicScopes &&
      nextVisibleHeadings.length === 0 &&
      this._visibleHeadings.length > 0 &&
      scopedHeadings.length > 0
    ) {
      /*
       * hydration / post-commit 中は heading 要素が一瞬だけ差し替えられ、
       * filterVisibleHeadings() が空配列を返すことがある。
       * ここで TOC を即座に空描画へ戻すと current 同期が途切れるため、
       * 静的 heading 集合では短時間だけ直前値を維持し、空状態の確定を遅延させる。
       */
      this._pendingEmptyVisibleHeadingsTimer ??= window.setTimeout(() => {
        this._pendingEmptyVisibleHeadingsTimer = null;
        this._visibleHeadings = [];
        this._onVisibleHeadingsChange([]);
        if (this._getActiveId().length > 0) {
          this._onActiveIdChange('');
        }
      }, 80);
      return;
    } else {
      if (this._pendingEmptyVisibleHeadingsTimer !== null) {
        clearTimeout(this._pendingEmptyVisibleHeadingsTimer);
        this._pendingEmptyVisibleHeadingsTimer = null;
      }
      this._visibleHeadings = nextVisibleHeadings;
      this._onVisibleHeadingsChange(this._visibleHeadings);
    }

    const currentActiveId = this._getActiveId();
    if (currentActiveId.length === 0) {
      const nextId = this._resolveInitialActiveId();
      if (nextId.length > 0) {
        this._onActiveIdChange(nextId);
      }
      return;
    }

    const isCurrentVisible = this._visibleHeadings.some(
      (heading) => heading.id === currentActiveId,
    );
    if (!isCurrentVisible) {
      const fallbackId = this._resolveInitialActiveId();
      this._onActiveIdChange(fallbackId);
    }
  }

  private _resolveInitialActiveId(): string {
    const hash = decodeHash(window.location.hash);
    if (hash.length > 0 && this._visibleHeadings.some((heading) => heading.id === hash)) {
      return hash;
    }

    return this._visibleHeadings[0]?.id ?? '';
  }

  private _syncActiveHeadingFromHash(): void {
    const hash = decodeHash(window.location.hash);
    if (hash.length === 0) {
      return;
    }

    const targetHeading = this._allHeadings.find((heading) => heading.id === hash);
    if (!targetHeading) {
      return;
    }

    if (
      this._contentRoot &&
      targetHeading.scopeSelections &&
      targetHeading.scopeSelections.length > 0
    ) {
      applyTocScopeSelections(this._contentRoot, targetHeading.scopeSelections);
      this._syncVisibleHeadings();
    }

    if (this._visibleHeadings.some((heading) => heading.id === hash)) {
      this._onActiveIdChange(hash);
    }
  }

  private _resolveActiveHeadingFromViewport(): string {
    if (this._visibleHeadings.length === 0) {
      return '';
    }

    const headingElements = this._visibleHeadings
      .map((heading) => {
        const element = document.getElementById(heading.id);
        return element instanceof HTMLElement ? { heading, element } : null;
      })
      .filter((entry): entry is { heading: Heading; element: HTMLElement } => entry !== null);

    if (headingElements.length === 0) {
      return this._resolveInitialActiveId();
    }

    const viewportTop = readHeaderOffset();
    let candidateId = headingElements[0]?.heading.id ?? '';

    for (const { heading, element } of headingElements) {
      const top = element.getBoundingClientRect().top;
      if (top <= viewportTop) {
        candidateId = heading.id;
        continue;
      }
      break;
    }

    return candidateId;
  }

  private _syncActiveHeadingFromViewport(): void {
    if (!this._started || !this._capabilities.activeTracking) {
      return;
    }

    const nextId = this._resolveActiveHeadingFromViewport();
    if (nextId.length === 0 || nextId === this._getActiveId()) {
      return;
    }

    this._onActiveIdChange(nextId);
  }

  private _scheduleViewportSync(): void {
    if (!this._started || this._viewportSyncScheduled) {
      return;
    }

    this._viewportSyncScheduled = true;
    requestAnimationFrame(() => {
      this._viewportSyncScheduled = false;
      if (!this._started) {
        return;
      }
      this._syncActiveHeadingFromViewport();
    });
  }

  private _setupMutationObserver(): void {
    this._teardownMutationObserver();

    if (!this._contentRoot) {
      return;
    }

    this._mutationObserver = new MutationObserver((records) => {
      if (!records.some((record) => this._shouldRefreshForMutation(record))) {
        return;
      }

      this._scheduleRefresh();
    });

    this._mutationObserver.observe(this._contentRoot, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['hidden', 'aria-hidden', 'selected-value', 'hydrated', 'data-panel-active'],
    });
  }

  private _teardownMutationObserver(): void {
    this._mutationObserver?.disconnect();
    this._mutationObserver = null;
  }

  private _shouldRefreshForMutation(record: MutationRecord): boolean {
    if (record.type === 'childList') {
      return true;
    }

    if (record.type !== 'attributes' || !(record.target instanceof HTMLElement)) {
      return false;
    }

    if (record.target.matches('ui-tabs')) {
      return true;
    }

    return record.target.getAttribute('role') === 'tabpanel';
  }

  private _scheduleRefresh(): void {
    if (!this._started || this._refreshScheduled) {
      return;
    }

    this._refreshScheduled = true;
    queueMicrotask(() => {
      this._refreshScheduled = false;

      if (!this._started) {
        return;
      }

      this.refresh();
    });
  }

  private _onHashChange = (): void => {
    this._syncActiveHeadingFromHash();
    this._scheduleViewportSync();
  };

  private _onTabChange = (event: Event): void => {
    if (!(event instanceof CustomEvent)) {
      return;
    }
    if (!(event.target instanceof Node) || !this._contentRoot?.contains(event.target)) {
      return;
    }

    this.refresh();
  };

  private _onViewportChange = (): void => {
    this._scheduleViewportSync();
  };
}
