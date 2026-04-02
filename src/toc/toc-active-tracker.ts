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

export class TocActiveTracker {
  private readonly _contentRootId: string;
  private readonly _capabilities: TocCapabilities;
  private readonly _getActiveId: () => string;
  private readonly _onVisibleHeadingsChange: (headings: Heading[]) => void;
  private readonly _onActiveIdChange: (id: string) => void;
  private _allHeadings: Heading[];
  private _contentRoot: HTMLElement | null = null;
  private _observer: IntersectionObserver | null = null;
  private _mutationObserver: MutationObserver | null = null;
  private _visibleIds = new Set<string>();
  private _visibleHeadings: Heading[] = [];
  private _started = false;
  private _refreshScheduled = false;
  private _initialRefreshTimer: number | null = null;

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
    document.addEventListener('ui-tab-change', this._onTabChange as EventListener);
    this.refresh();
    this._initialRefreshTimer = window.setTimeout(() => {
      this._initialRefreshTimer = null;
      if (!this._started) {
        return;
      }
      this.refresh();
    }, 0);
  }

  destroy(): void {
    if (!this._started || typeof window === 'undefined') {
      return;
    }

    this._started = false;
    window.removeEventListener('hashchange', this._onHashChange);
    document.removeEventListener('ui-tab-change', this._onTabChange as EventListener);
    this._teardownMutationObserver();
    this._teardownObserver();
    this._refreshScheduled = false;
    if (this._initialRefreshTimer !== null) {
      clearTimeout(this._initialRefreshTimer);
      this._initialRefreshTimer = null;
    }
  }

  refresh(): void {
    this._contentRoot = findContentRoot(this._contentRootId);
    this._setupMutationObserver();
    this._syncVisibleHeadings();
    this._syncActiveHeadingFromHash();
    this._setupObserver();
  }

  private _syncVisibleHeadings(): void {
    const contentRoot = this._contentRoot;
    const scopedHeadings =
      this._capabilities.dynamicScopes && contentRoot
        ? filterHeadingsByScopeSelections(this._allHeadings, readTocScopeSelectionMap(contentRoot))
        : this._allHeadings;

    this._visibleHeadings = contentRoot
      ? filterVisibleHeadings(contentRoot, scopedHeadings)
      : scopedHeadings;
    this._visibleIds.clear();
    this._onVisibleHeadingsChange(this._visibleHeadings);

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

  private _setupObserver(): void {
    this._teardownObserver();

    if (
      !this._capabilities.activeTracking ||
      !this._contentRoot ||
      this._visibleHeadings.length === 0
    ) {
      return;
    }

    const headerHeightRaw = getComputedStyle(document.documentElement)
      .getPropertyValue('--header-height')
      .trim();
    const headerHeight = headerHeightRaw ? parseFloat(headerHeightRaw) : 0;
    const topMargin = headerHeight + 32 - 1;

    this._observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            this._visibleIds.add(entry.target.id);
          } else {
            this._visibleIds.delete(entry.target.id);
          }
        }

        const activeHeading = this._visibleHeadings.find((heading) =>
          this._visibleIds.has(heading.id),
        );
        if (activeHeading && activeHeading.id !== this._getActiveId()) {
          this._onActiveIdChange(activeHeading.id);
        }
      },
      {
        rootMargin: `-${String(topMargin)}px 0px -70% 0px`,
        threshold: 0,
      },
    );

    for (const heading of this._visibleHeadings) {
      const element = document.getElementById(heading.id);
      if (element instanceof HTMLElement) {
        this._observer.observe(element);
      }
    }
  }

  private _teardownObserver(): void {
    this._observer?.disconnect();
    this._observer = null;
    this._visibleIds.clear();
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
}
