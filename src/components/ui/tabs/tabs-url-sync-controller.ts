import type { ReactiveController, ReactiveControllerHost } from 'lit';
import {
  findHeadingElement,
  revealHeadingInTabs,
  resolveTabValueForDescendant,
} from '../../../toc/filter-visible-headings.js';
import { getTabsUrlSyncStrategy } from './tabs-url-sync-strategy.js';
import type { TabsUrlSource, UrlHistoryMode } from './tabs.types.js';

export interface TabsUrlSyncHost {
  getHostElement(): HTMLElement;
  isUrlSyncEnabled(): boolean;
  getActiveValue(): string | null;
  clearControlledSelection(): void;
  onUrlStateChanged(): void;
}

export interface UrlDrivenValueResolution {
  value: string | null;
  source: TabsUrlSource;
}

export class TabsUrlSyncController implements ReactiveController {
  private readonly host: ReactiveControllerHost & TabsUrlSyncHost;
  private suppressWrite = false;
  private changeEventName: string | null = null;

  constructor(host: ReactiveControllerHost & TabsUrlSyncHost) {
    this.host = host;
    this.host.addController(this);
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

    window.removeEventListener('popstate', this.onLocationStateChange);
    window.removeEventListener('hashchange', this.onLocationStateChange);
    if (this.changeEventName !== null) {
      window.removeEventListener(this.changeEventName, this.onLocationStateChange as EventListener);
      this.changeEventName = null;
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

  resolveUrlDrivenValue(): UrlDrivenValueResolution {
    if (!this.host.isUrlSyncEnabled() || typeof window === 'undefined') {
      return {
        value: null,
        source: null,
      };
    }

    const hashValue = this.resolveValueFromHash();
    if (hashValue !== null) {
      return {
        value: hashValue,
        source: 'hash',
      };
    }

    const queryValue = getTabsUrlSyncStrategy()?.readValue(window.location.href) ?? null;
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
    if (!this.host.isUrlSyncEnabled() || typeof window === 'undefined') {
      return;
    }

    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    const strategy = getTabsUrlSyncStrategy();
    if (!strategy) {
      return;
    }

    const currentQueryValue = strategy.readValue(currentUrl);

    let nextUrl = currentUrl;

    if (source === 'hash') {
      nextUrl = strategy.writeValue(currentUrl, activeValue);
    } else if (currentQueryValue !== null) {
      nextUrl = strategy.writeValue(currentUrl, activeValue);
    }

    if (nextUrl !== currentUrl) {
      this.writeUrlStateInternal(nextUrl, 'replace');
    }
  }

  writeSelectedValue(value: string | null, historyMode: UrlHistoryMode): void {
    if (
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

  private resolveValueFromHash(): string | null {
    if (typeof window === 'undefined') {
      return null;
    }

    const hash = getTabsUrlSyncStrategy()?.readHash(window.location.href) ?? '';
    if (hash.length === 0) {
      return null;
    }

    const hostEl = this.host.getHostElement();
    const target = findHeadingElement(hostEl, hash);

    if (!(target instanceof HTMLElement)) {
      return null;
    }

    revealHeadingInTabs(hostEl, target);
    return resolveTabValueForDescendant(hostEl, target);
  }

  private writeUrlStateInternal(nextUrl: string, historyMode: UrlHistoryMode): void {
    if (historyMode === 'none' || typeof window === 'undefined') {
      return;
    }

    const previousUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (previousUrl === nextUrl) {
      return;
    }

    const state: unknown = history.state;
    const strategy = getTabsUrlSyncStrategy();

    if (historyMode === 'push') {
      window.history.pushState(state, '', nextUrl);
    } else {
      window.history.replaceState(state, '', nextUrl);
    }

    strategy?.dispatchChange(previousUrl, nextUrl);
  }

  private syncFromLocationState(): void {
    const strategy = getTabsUrlSyncStrategy();
    const url = typeof window === 'undefined' ? '' : window.location.href;
    const hasQueryValue = (strategy?.readValue(url) ?? null) !== null;
    const hasHashValue = (strategy?.readHash(url) ?? '') !== '';

    this.withSuppressedWrite(() => {
      if (!hasQueryValue && !hasHashValue) {
        this.host.clearControlledSelection();
      }
      this.host.onUrlStateChanged();
    });
  }

  private readonly onLocationStateChange = (): void => {
    if (!this.host.isUrlSyncEnabled()) {
      return;
    }

    // popstate と router の state-only commit は、ブラウザ側 URL 更新と component 側の
    // selected-value / panel state 反映順が前後することがある。
    // 即時・microtask・次フレームの 3 段階で再同期して履歴復元を安定化する。
    this.syncFromLocationState();

    if (typeof window === 'undefined') {
      return;
    }

    queueMicrotask(() => {
      if (!this.host.isUrlSyncEnabled()) {
        return;
      }
      this.syncFromLocationState();
    });

    window.requestAnimationFrame(() => {
      if (!this.host.isUrlSyncEnabled()) {
        return;
      }
      this.syncFromLocationState();
    });
  };
}
