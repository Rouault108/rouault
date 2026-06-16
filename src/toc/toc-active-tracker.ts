import type { Heading } from '../components/ui/toc/toc.js';
import { decodeHashFragment } from '../router/url-hash.js';
import { readRootScrollY } from '../router/root-scroll.js';
import {
  applyTocScopeSelections,
  filterHeadingsByScopeSelections,
  findContentRoot,
  filterVisibleHeadings,
  type TocCapabilities,
  readTocScopeSelectionMap,
} from './filter-visible-headings.js';
import {
  hasHeadingPassedTocActivationLine,
  isHeadingIntersectingViewport,
  resolveTocActivationOffset,
  type TocScrollMetrics,
  TOC_SCROLL_POSITION_TOLERANCE_PX,
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
  onVisibleHeadingsChange: (headings: Heading[]) => void;
  onActiveIdChange: (id: string) => void;
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

const decodeHash = (hash: string): string => decodeHashFragment(hash) ?? '';

const shouldPreserveHashActiveId = (activeId: string): boolean => {
  const hash = decodeHash(window.location.hash);
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
  private _initialHashStabilizationTimer: number | null = null;
  private _pendingEmptyVisibleHeadingsTimer: number | null = null;
  private _programmaticNavigation: TocProgrammaticNavigation | null = null;

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
    window.addEventListener('popstate', this._onPopState);
    window.addEventListener('scroll', this._onViewportChange, { passive: true });
    window.addEventListener('wheel', this._onUserScrollIntent, { passive: true });
    window.addEventListener('touchmove', this._onUserScrollIntent, { passive: true });
    window.addEventListener('keydown', this._onKeydown);
    window.addEventListener('resize', this._onResize);
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

    if (this._pendingEmptyVisibleHeadingsTimer !== null) {
      clearTimeout(this._pendingEmptyVisibleHeadingsTimer);
      this._pendingEmptyVisibleHeadingsTimer = null;
    }
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
      applyTocScopeSelections(this._contentRoot, targetHeading.scopeSelections, {
        historyMode: 'none',
      });
      this._syncVisibleHeadings();
    }

    if (this._visibleHeadings.some((heading) => heading.id === hash)) {
      this._onActiveIdChange(hash);
    }
  }

  private _syncInitialHashActiveId(): void {
    const hash = decodeHash(window.location.hash);
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
    this._onActiveIdChange(hash);
    this._scheduleViewportSync();
  }

  private _resolveActiveHeadingFromViewport(): string {
    if (this._visibleHeadings.length === 0) {
      return '';
    }

    const headingElements = this._visibleHeadings
      .map((heading) => {
        const element = this._resolveHeadingElement(heading.id);
        return element instanceof HTMLElement ? { heading, element } : null;
      })
      .filter((entry): entry is { heading: Heading; element: HTMLElement } => entry !== null);

    if (headingElements.length === 0) {
      return this._resolveInitialActiveId();
    }

    let candidateId = headingElements[0]?.heading.id ?? '';

    for (const { heading, element } of headingElements) {
      if (hasHeadingPassedTocActivationLine(element)) {
        candidateId = heading.id;
        continue;
      }
      break;
    }

    return candidateId;
  }

  private _syncActiveHeadingFromViewport(): void {
    if (!this._started) {
      return;
    }

    const forcedId = this._resolveProgrammaticActiveId();
    if (forcedId.length > 0) {
      if (forcedId !== this._getActiveId()) {
        this._onActiveIdChange(forcedId);
      }
      return;
    }

    if (!this._capabilities.activeTracking) {
      return;
    }

    if (shouldPreserveHashActiveId(this._getActiveId())) {
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
    this.cancelProgrammaticNavigation('hashchange');
    this._syncActiveHeadingFromHash();
    this._scheduleViewportSync();
  };

  private _onPopState = (): void => {
    this.cancelProgrammaticNavigation('popstate');
    this._scheduleViewportSync();
  };

  private _onResize = (): void => {
    this.cancelProgrammaticNavigation('resize');
    this._scheduleViewportSync();
  };

  private _onUserScrollIntent = (): void => {
    if (this._programmaticNavigation?.phase !== 'settled-hold') {
      return;
    }

    this.cancelProgrammaticNavigation('user-scroll');
    this._scheduleViewportSync();
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
