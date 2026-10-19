import { hasCoordinatePriority } from '../navigation/content-navigation-context.js';
import type { TocHeading as Heading } from './toc-headings.js';
import { decodeHashFragment } from '../router/url-hash.js';
import { readRootScrollY } from '../router/root-scroll.js';
import {
  applyTocScopeSelections,
  findContentRoot,
  type TocCapabilities,
} from './filter-visible-headings.js';
import { readTocViewportSnapshot } from './toc-viewport-snapshot.js';
import {
  isHeadingIntersectingViewport,
  resolveTocActivationOffset,
  type TocScrollMetrics,
  TOC_SCROLL_POSITION_TOLERANCE_PX,
  TOC_SCROLL_SETTLE_TIMEOUT_MS,
} from './toc-scroll-contract.js';

const SCROLL_KEYS = new Set([
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'End',
  'Home',
  'PageDown',
  'PageUp',
  ' ',
]);

export interface TocActiveTrackerOptions {
  contentRootId: string;
  headings: Heading[];
  capabilities: TocCapabilities;
  getActiveId: () => string;
  onSnapshotChange?: (headings: Heading[], activeId: string) => void;
  onVisibleHeadingsChange?: (headings: Heading[]) => void;
  onActiveIdChange?: (id: string) => void;
}

export type TocNavigationCancelReason =
  | 'new-navigation'
  | 'user-scroll'
  | 'popstate'
  | 'hashchange'
  | 'resize'
  | 'target-missing'
  | 'timeout'
  | 'destroy';

export interface TocProgrammaticNavigation {
  targetId: string;
  metrics: TocScrollMetrics;
  startedAtScrollY: number;
  targetY: number;
  phase: 'scrolling' | 'settled-hold';
}

interface TocHashNavigationHold {
  targetId: string;
  expiresAt: number;
  timeoutId: number;
  source: 'initial' | 'hashchange';
}

const HASH_NAVIGATION_HOLD_MS = TOC_SCROLL_SETTLE_TIMEOUT_MS;

const decodeHash = (hash: string): string => decodeHashFragment(hash) ?? '';

const shouldPreserveHashActiveId = (activeId: string): boolean => {
  const hash = hasCoordinatePriority() ? '' : decodeHash(window.location.hash);
  if (hash.length === 0 || hash !== activeId) {
    return false;
  }

  const target = document.getElementById(hash);
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const rect = target.getBoundingClientRect();
  const viewportTop = resolveTocActivationOffset(target);
  const viewportBottom = window.innerHeight;

  /*
   * hash 直アクセス直後は、対象見出しが viewport 内に見えていても
   * active zone へ到達する前の余白位置に配置されることがある。
   * この瞬間に幾何学再計算を優先すると 1 つ前の見出しへ巻き戻るため、
   * hash 対象が画面内に残っている間は現在値を維持する。
   */
  return rect.top > viewportTop && rect.top < viewportBottom && rect.bottom > 0;
};

const isElementRenderable = (element: HTMLElement): boolean => {
  if (element.getClientRects().length === 0) {
    return false;
  }

  const style = getComputedStyle(element);
  return (
    style.display !== 'none' && style.visibility !== 'hidden' && style.visibility !== 'collapse'
  );
};

export class TocActiveTracker {
  private readonly _contentRootId: string;
  private readonly _capabilities: TocCapabilities;
  private readonly _getActiveId: () => string;
  private readonly _onSnapshotChange: TocActiveTrackerOptions['onSnapshotChange'];
  private readonly _onVisibleHeadingsChange: (headings: Heading[]) => void;
  private readonly _onActiveIdChange: (id: string) => void;
  private _allHeadings: Heading[];
  private _contentRoot: HTMLElement | null = null;
  private _mutationObserver: MutationObserver | null = null;
  private _visibleHeadings: Heading[] = [];
  private _started = false;
  private _hasSnapshot = false;
  private _refreshScheduled = false;
  private _viewportSyncScheduled = false;
  private _initialRefreshTimer: number | null = null;
  private _initialViewportSyncFrame: number | null = null;
  private _initialHashStabilizationTimer: number | null = null;
  private _programmaticNavigation: TocProgrammaticNavigation | null = null;
  private _hashNavigationHold: TocHashNavigationHold | null = null;
  private _suppressedHashActivePreservationId: string | null = null;

  constructor(options: TocActiveTrackerOptions) {
    this._contentRootId = options.contentRootId;
    this._allHeadings = options.headings;
    this._capabilities = options.capabilities;
    this._getActiveId = options.getActiveId;
    this._onSnapshotChange = options.onSnapshotChange;
    this._onVisibleHeadingsChange = options.onVisibleHeadingsChange ?? (() => undefined);
    this._onActiveIdChange = options.onActiveIdChange ?? (() => undefined);
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
    window.addEventListener('popstate', this._onPopState);
    window.addEventListener('scroll', this._onViewportChange, { passive: true });
    window.addEventListener('wheel', this._onUserScrollIntent, { passive: true });
    window.addEventListener('touchmove', this._onUserScrollIntent, { passive: true });
    window.addEventListener('keydown', this._onKeydown);
    window.addEventListener('resize', this._onResize);
    window.addEventListener('pageshow', this._onViewportChange);
    document.addEventListener('ui-tab-change', this._onTabChange as EventListener);

    this.refresh();
    this._beginHashNavigationHoldFromCurrentHash('initial');
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

    this._initialHashStabilizationTimer = window.setTimeout(() => {
      this._initialHashStabilizationTimer = null;
      if (!this._started) {
        return;
      }

      this._syncInitialHashActiveId();
    }, 120);
  }

  destroy(): void {
    if (!this._started || typeof window === 'undefined') {
      return;
    }

    this._started = false;
    window.removeEventListener('hashchange', this._onHashChange);
    window.removeEventListener('popstate', this._onPopState);
    window.removeEventListener('scroll', this._onViewportChange);
    window.removeEventListener('wheel', this._onUserScrollIntent);
    window.removeEventListener('touchmove', this._onUserScrollIntent);
    window.removeEventListener('keydown', this._onKeydown);
    window.removeEventListener('resize', this._onResize);
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

    if (this._initialHashStabilizationTimer !== null) {
      clearTimeout(this._initialHashStabilizationTimer);
      this._initialHashStabilizationTimer = null;
    }

    this._cancelHashNavigationHold();
    this.cancelProgrammaticNavigation('destroy');
  }

  beginProgrammaticNavigation(targetId: string, metrics: TocScrollMetrics): void {
    this._programmaticNavigation = {
      targetId,
      metrics,
      startedAtScrollY: readRootScrollY(),
      targetY: metrics.targetY,
      phase: 'scrolling',
    };
  }

  finishProgrammaticNavigation(targetId: string): void {
    if (this._programmaticNavigation?.targetId !== targetId) {
      return;
    }

    this._programmaticNavigation = null;
  }

  beginPostSettlementHold(targetId: string, metrics: TocScrollMetrics): void {
    this._programmaticNavigation = {
      targetId,
      metrics,
      startedAtScrollY: readRootScrollY(),
      targetY: metrics.targetY,
      phase: 'settled-hold',
    };
  }

  cancelProgrammaticNavigation(_reason: TocNavigationCancelReason): void {
    this._programmaticNavigation = null;
  }

  canHoldProgrammaticTarget(targetId: string, target: HTMLElement): boolean {
    const contentRoot = this._contentRoot;
    return (
      contentRoot !== null &&
      contentRoot.contains(target) &&
      this._visibleHeadings.some((heading) => heading.id === targetId) &&
      isElementRenderable(target) &&
      isHeadingIntersectingViewport(target)
    );
  }

  refresh(): void {
    this._contentRoot = findContentRoot(this._contentRootId);
    this._setupMutationObserver();
    this._revealCurrentHashTarget();
    this._syncViewportSnapshot(!this._hasSnapshot);
    this._scheduleViewportSync();
  }

  private _commitSnapshot(
    headings: Heading[],
    activeId: string,
    previousHeadings: readonly Heading[],
  ): void {
    const unchanged =
      this._hasSnapshot &&
      activeId === this._getActiveId() &&
      headings.length === previousHeadings.length &&
      headings.every((heading, index) => heading.id === previousHeadings[index]?.id);
    this._visibleHeadings = headings;
    if (unchanged) {
      return;
    }
    this._hasSnapshot = true;
    if (this._onSnapshotChange) {
      this._onSnapshotChange(headings, activeId);
      return;
    }

    // 既存利用者にも同じ確定値を渡し、controllerは一括callbackだけを使う。
    this._onVisibleHeadingsChange(headings);
    if (activeId !== this._getActiveId()) {
      this._onActiveIdChange(activeId);
    }
  }

  private _syncViewportSnapshot(preferHash = false): void {
    const contentRoot = this._contentRoot;
    if (contentRoot === null) {
      return;
    }
    const snapshot = readTocViewportSnapshot(contentRoot, this._allHeadings, this._capabilities);
    if (snapshot === null) {
      return;
    }
    const headings = snapshot.visibleHeadings;
    // 新しい可視集合でholdを判定し、visible/currentを一括で公開する。
    const previousHeadings = this._visibleHeadings;
    this._visibleHeadings = headings;
    const visible = (id: string): boolean => headings.some((heading) => heading.id === id);
    const currentId = this._getActiveId();
    const hash = hasCoordinatePriority() ? '' : decodeHash(window.location.hash);
    const forcedId = hasCoordinatePriority() ? '' : this._resolveProgrammaticActiveId();
    const holdId = this._resolveHashNavigationHoldActiveId();
    let activeId = snapshot.activeId;
    if (visible(forcedId)) {
      activeId = forcedId;
    } else if (preferHash && visible(hash)) {
      activeId = hash;
    } else if (visible(holdId)) {
      activeId = holdId;
    } else if (
      visible(currentId) &&
      (!this._capabilities.activeTracking || this._shouldPreserveCurrentHashActiveId())
    ) {
      activeId = currentId;
    }
    this._commitSnapshot(headings, activeId, previousHeadings);
  }

  private _revealCurrentHashTarget(): void {
    const hash = hasCoordinatePriority() ? '' : decodeHash(window.location.hash);
    const targetHeading = this._allHeadings.find((heading) => heading.id === hash);
    if (this._contentRoot && targetHeading?.scopeSelections?.length) {
      applyTocScopeSelections(this._contentRoot, targetHeading.scopeSelections, {
        historyMode: 'none',
      });
    }
  }

  private _syncActiveHeadingFromHash(): void {
    this._revealCurrentHashTarget();
    this._syncViewportSnapshot(true);
  }

  private _beginHashNavigationHoldFromCurrentHash(source: 'initial' | 'hashchange'): void {
    this._cancelHashNavigationHold();

    if (!this._capabilities.activeTracking) {
      return;
    }

    const target = this._resolveHoldableHashTarget();
    if (target === null) {
      return;
    }

    this._suppressedHashActivePreservationId = null;

    const targetId = target.id;
    const expiresAt = performance.now() + HASH_NAVIGATION_HOLD_MS;
    const timeoutId = window.setTimeout(() => {
      const hold = this._hashNavigationHold;
      if (hold?.targetId !== targetId || hold.timeoutId !== timeoutId) {
        return;
      }

      this._cancelHashNavigationHold();
      this._scheduleViewportSync();
    }, HASH_NAVIGATION_HOLD_MS);

    this._hashNavigationHold = {
      targetId,
      expiresAt,
      timeoutId,
      source,
    };
  }

  private _cancelHashNavigationHold(): void {
    if (this._hashNavigationHold === null) {
      return;
    }

    clearTimeout(this._hashNavigationHold.timeoutId);
    this._hashNavigationHold = null;
  }

  private _resolveHashNavigationHoldActiveId(): string {
    const hold = this._hashNavigationHold;
    if (hold === null) {
      return '';
    }

    if (performance.now() > hold.expiresAt) {
      this._cancelHashNavigationHold();
      return '';
    }

    const target = this._resolveHoldableHashTarget();
    if (target?.id !== hold.targetId) {
      this._cancelHashNavigationHold();
      return '';
    }

    if (hold.source === 'initial' && !shouldPreserveHashActiveId(hold.targetId)) {
      this._cancelHashNavigationHold();
      return '';
    }

    return target.id;
  }

  private _resolveHoldableHashTarget(): { id: string; element: HTMLElement } | null {
    const targetId = hasCoordinatePriority() ? '' : decodeHash(window.location.hash);
    const contentRoot = this._contentRoot;
    if (targetId.length === 0 || contentRoot === null) {
      return null;
    }

    const target = this._resolveHeadingElement(targetId);
    if (
      !(target instanceof HTMLElement) ||
      !contentRoot.contains(target) ||
      !this._visibleHeadings.some((heading) => heading.id === targetId) ||
      !isElementRenderable(target)
    ) {
      return null;
    }

    return { id: targetId, element: target };
  }

  private _syncInitialHashActiveId(): void {
    const hash = hasCoordinatePriority() ? '' : decodeHash(window.location.hash);
    if (hash.length === 0 || this._getActiveId() === hash) {
      return;
    }

    if (!this._visibleHeadings.some((heading) => heading.id === hash)) {
      return;
    }

    const target = document.getElementById(hash);
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const rect = target.getBoundingClientRect();
    if (rect.bottom <= 0 || rect.top >= window.innerHeight) {
      return;
    }

    /*
     * 初回 hash 直アクセスでは、router 側の hash scroll と
     * TOC hydration の開始順がブラウザ差で前後し得る。
     * scroll 後に対象見出しが viewport 内へ入っているなら、
     * 初期 current は hash を正本に戻してから通常の viewport 同期へ委ねる。
     */
    this._syncViewportSnapshot(true);
    this._scheduleViewportSync();
  }

  private _syncActiveHeadingFromViewport(): void {
    if (
      !this._started ||
      (!this._capabilities.activeTracking && this._programmaticNavigation === null)
    ) {
      return;
    }
    this._syncViewportSnapshot();
  }

  private _shouldPreserveCurrentHashActiveId(): boolean {
    const hash = hasCoordinatePriority() ? '' : decodeHash(window.location.hash);
    if (hash.length === 0) {
      this._suppressedHashActivePreservationId = null;
      return false;
    }

    if (this._suppressedHashActivePreservationId !== null) {
      if (this._suppressedHashActivePreservationId === hash) {
        return false;
      }

      this._suppressedHashActivePreservationId = null;
    }

    return shouldPreserveHashActiveId(this._getActiveId());
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
      attributeFilter: ['hidden', 'aria-hidden', 'data-selected-value', 'data-tabs-enhanced'],
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

    if (record.target.matches('[data-tabs-root]')) {
      return true;
    }

    return record.target.hasAttribute('data-tab-panel');
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
    this._suppressedHashActivePreservationId = null;
    this.cancelProgrammaticNavigation('hashchange');
    this._syncActiveHeadingFromHash();
    this._beginHashNavigationHoldFromCurrentHash('hashchange');
    this._scheduleViewportSync();
  };

  private _onPopState = (): void => {
    this.cancelProgrammaticNavigation('popstate');
    this._scheduleViewportSync();
  };

  private _onResize = (): void => {
    this.cancelProgrammaticNavigation('resize');
    this._cancelHashNavigationHold();
    this._scheduleViewportSync();
  };

  private _onUserScrollIntent = (): void => {
    let shouldSync = false;

    if (this._hashNavigationHold !== null) {
      this._cancelHashNavigationHold();
      shouldSync = true;
    }

    const hash = hasCoordinatePriority() ? '' : decodeHash(window.location.hash);
    if (hash.length > 0 && this._getActiveId() === hash) {
      this._suppressedHashActivePreservationId = hash;
      shouldSync = true;
    }

    if (this._programmaticNavigation?.phase === 'settled-hold') {
      this.cancelProgrammaticNavigation('user-scroll');
      shouldSync = true;
    }

    if (shouldSync) {
      this._scheduleViewportSync();
    }
  };

  private _onKeydown = (event: KeyboardEvent): void => {
    if (!SCROLL_KEYS.has(event.key)) {
      return;
    }

    this._onUserScrollIntent();
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
    if (this._programmaticNavigation?.phase === 'settled-hold') {
      const distance = Math.abs(readRootScrollY() - this._programmaticNavigation.startedAtScrollY);
      if (distance > TOC_SCROLL_POSITION_TOLERANCE_PX) {
        this.cancelProgrammaticNavigation('user-scroll');
      }
    }
    this._scheduleViewportSync();
  };

  private _resolveProgrammaticActiveId(): string {
    const navigation = this._programmaticNavigation;
    if (navigation === null) {
      return '';
    }

    if (navigation.phase === 'scrolling') {
      return navigation.targetId;
    }

    const target = this._resolveHeadingElement(navigation.targetId);
    if (
      !(target instanceof HTMLElement) ||
      !this.canHoldProgrammaticTarget(navigation.targetId, target)
    ) {
      this.cancelProgrammaticNavigation('target-missing');
      return '';
    }

    const distance = Math.abs(readRootScrollY() - navigation.startedAtScrollY);
    if (distance > TOC_SCROLL_POSITION_TOLERANCE_PX) {
      this.cancelProgrammaticNavigation('user-scroll');
      return '';
    }

    return navigation.targetId;
  }

  private _resolveHeadingElement(id: string): HTMLElement | null {
    const root = this._contentRoot;
    const matches = Array.from((root ?? document).querySelectorAll<HTMLElement>('[id]')).filter(
      (element) => element.id === id,
    );
    return matches.length === 1 ? (matches[0] ?? null) : null;
  }
}
