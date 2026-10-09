import {
  captureFeatureSource,
  beginFeatureNavigation,
  isFeatureSourceCurrent,
  isFeatureTokenCurrent,
  writeFeatureHistoryEntry,
  type FeatureSource,
  type FeatureToken,
} from '../../../navigation/content-navigation-context.js';
import { getTabsUrlSyncStrategy } from './tabs-url-sync-strategy.js';
import type { TabsUrlSource, UrlHistoryMode } from './tabs.types.js';

export interface TabsUrlSyncHost {
  getHostElement(): HTMLElement;
  isUrlSyncEnabled(): boolean;
  getActiveValue(): string | null;
  resolveTabValueForHash(decodedHash: string): string | null;
  clearControlledSelection(): void;
  onUrlStateChanged(): void;
}

export interface UrlDrivenValueResolution {
  value: string | null;
  source: TabsUrlSource;
}

export class TabsUrlSyncController {
  private readonly host: TabsUrlSyncHost;
  private suppressWrite = false;
  private readonly source: FeatureSource;
  private operation: FeatureToken | null = null;
  private changeEventName: string | null = null;
  private locationSyncGeneration = 0;
  private locationSyncRafId: number | null = null;

  constructor(host: TabsUrlSyncHost) {
    this.host = host;
    this.source = captureFeatureSource(host.getHostElement());
  }

  hostConnected(): void {
    if (typeof window === 'undefined') {
      return;
    }

    const strategy = getTabsUrlSyncStrategy();
    this.changeEventName = strategy?.changeEventName ?? null;

    window.addEventListener('popstate', this.onLocationStateChange);
    window.addEventListener('hashchange', this.onLocationStateChange);
    if (this.changeEventName !== null) {
      window.addEventListener(this.changeEventName, this.onLocationStateChange as EventListener);
    }
  }

  hostDisconnected(): void {
    if (typeof window === 'undefined') {
      return;
    }

    this.locationSyncGeneration += 1;
    window.removeEventListener('popstate', this.onLocationStateChange);
    window.removeEventListener('hashchange', this.onLocationStateChange);
    if (this.changeEventName !== null) {
      window.removeEventListener(this.changeEventName, this.onLocationStateChange as EventListener);
      this.changeEventName = null;
    }
    if (this.locationSyncRafId !== null) {
      cancelAnimationFrame(this.locationSyncRafId);
      this.locationSyncRafId = null;
    }
  }

  withSuppressedWrite<T>(fn: () => T): T {
    this.suppressWrite = true;
    try {
      return fn();
    } finally {
      this.suppressWrite = false;
    }
  }

  canSync(): boolean {
    return isFeatureSourceCurrent(this.source);
  }

  beginSelection(historyMode: UrlHistoryMode): boolean {
    if (!this.host.isUrlSyncEnabled()) return this.canSync();
    this.operation = beginFeatureNavigation(
      this.source,
      historyMode === 'none' ? 'url-sync' : 'user-navigation',
    );
    return this.operation !== null;
  }

  resolveUrlDrivenValue(): UrlDrivenValueResolution {
    if (!this.canSync() || !this.host.isUrlSyncEnabled() || typeof window === 'undefined') {
      return {
        value: null,
        source: null,
      };
    }

    const currentUrl = window.location.href;
    const strategy = getTabsUrlSyncStrategy();
    const hashValue = strategy?.readHash(currentUrl) ?? '';
    if (hashValue !== '') {
      const hashTabValue = this.host.resolveTabValueForHash(hashValue);
      if (hashTabValue !== null) {
        return {
          value: hashTabValue,
          source: 'hash',
        };
      }
    }

    const queryValue = strategy?.readValue(currentUrl) ?? null;
    if (queryValue !== null) {
      return {
        value: queryValue,
        source: 'query',
      };
    }

    return {
      value: null,
      source: null,
    };
  }

  normalizeActiveValue(source: TabsUrlSource, activeValue: string | null): void {
    if (!this.canSync() || !this.host.isUrlSyncEnabled() || typeof window === 'undefined') {
      return;
    }

    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    const strategy = getTabsUrlSyncStrategy();
    if (!strategy) {
      return;
    }

    let nextUrl = currentUrl;

    if (source === 'hash') {
      nextUrl = strategy.writeValue(currentUrl, activeValue);
    }

    if (source === 'query' && strategy.readValue(currentUrl) !== activeValue) {
      nextUrl = strategy.writeValue(currentUrl, activeValue);
    }

    if (nextUrl !== currentUrl) {
      this.operation = null;
      this.writeUrlStateInternal(nextUrl, 'replace');
    }
  }

  writeSelectedValue(value: string | null, historyMode: UrlHistoryMode): void {
    if (
      !this.canSync() ||
      !this.host.isUrlSyncEnabled() ||
      this.suppressWrite ||
      historyMode === 'none' ||
      typeof window === 'undefined'
    ) {
      return;
    }

    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    const strategy = getTabsUrlSyncStrategy();
    if (!strategy) {
      return;
    }

    const nextUrl = strategy.writeValue(currentUrl, value);

    this.writeUrlStateInternal(nextUrl, historyMode);
  }

  private writeUrlStateInternal(nextUrl: string, historyMode: UrlHistoryMode): void {
    if (!this.canSync() || historyMode === 'none' || typeof window === 'undefined') {
      return;
    }

    const previousUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (previousUrl === nextUrl) {
      this.operation = null;
      return;
    }

    const token = this.operation ?? beginFeatureNavigation(this.source, 'normalization');
    if (!token || !isFeatureTokenCurrent(this.source, token)) return;
    const state: unknown = history.state;
    const strategy = getTabsUrlSyncStrategy();

    const adopted = writeFeatureHistoryEntry(this.source, token, {
      mode: historyMode,
      url: nextUrl,
      state,
    });
    this.operation = null;
    if (!adopted) return;
    strategy?.dispatchChange(previousUrl, nextUrl);
  }

  private syncFromLocationState(token: FeatureToken): void {
    if (!isFeatureTokenCurrent(this.source, token)) return;
    const strategy = getTabsUrlSyncStrategy();
    const url = typeof window === 'undefined' ? '' : window.location.href;
    const hasQueryValue = (strategy?.readValue(url) ?? null) !== null;
    const hashValue = strategy?.readHash(url) ?? '';
    const hasHostOwnedHash =
      hashValue !== '' && this.host.resolveTabValueForHash(hashValue) !== null;

    this.withSuppressedWrite(() => {
      if (!hasQueryValue && !hasHostOwnedHash) {
        this.host.clearControlledSelection();
      }
      this.host.onUrlStateChanged();
    });
  }

  private readonly onLocationStateChange = (): void => {
    if (!this.canSync() || !this.host.isUrlSyncEnabled()) {
      return;
    }

    // popstate と router の state-only commit は、ブラウザ側 URL 更新と component 側の
    // selected-value / panel state 反映順が前後することがある。
    // 即時・microtask・次フレームの 3 段階で再同期して履歴復元を安定化する。
    const token = beginFeatureNavigation(this.source, 'url-sync');
    if (!token) return;
    this.syncFromLocationState(token);

    if (typeof window === 'undefined') {
      return;
    }

    const syncGeneration = ++this.locationSyncGeneration;

    queueMicrotask(() => {
      if (
        syncGeneration !== this.locationSyncGeneration ||
        !this.host.getHostElement().isConnected ||
        !this.host.isUrlSyncEnabled()
      ) {
        return;
      }
      this.syncFromLocationState(token);
    });

    if (this.locationSyncRafId !== null) {
      cancelAnimationFrame(this.locationSyncRafId);
    }

    this.locationSyncRafId = window.requestAnimationFrame(() => {
      this.locationSyncRafId = null;
      if (
        syncGeneration !== this.locationSyncGeneration ||
        !this.host.getHostElement().isConnected ||
        !this.host.isUrlSyncEnabled()
      ) {
        return;
      }
      this.syncFromLocationState(token);
    });
  };
}
