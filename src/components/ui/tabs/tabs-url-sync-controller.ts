import type { ReactiveController, ReactiveControllerHost } from 'lit';
import {
  findHeadingElement,
  revealHeadingInTabs,
  resolveTabValueForDescendant,
} from '../../../lib/toc/filter-visible-headings.js';
import {
  URL_STATE_CHANGE_EVENT,
  dispatchUrlStateChange,
  readDecodedHash,
  readPrimaryTabValue,
  writePrimaryTabValue,
} from '../../../lib/tabs/url-state.js';
import type { TabsUrlSource, UrlHistoryMode } from './tabs.types.js';

export interface TabsUrlSyncHost {
  getHostElement(): HTMLElement;
  isUrlSyncEnabled(): boolean;
  getActiveValue(): string | null;
  createHistoryStateForUrl(url: string): Record<string, unknown>;
  onUrlStateChanged(): void;
}

export interface UrlDrivenValueResolution {
  value: string | null;
  source: TabsUrlSource;
}

export class TabsUrlSyncController implements ReactiveController {
  private readonly host: ReactiveControllerHost & TabsUrlSyncHost;
  private suppressWrite = false;

  constructor(host: ReactiveControllerHost & TabsUrlSyncHost) {
    this.host = host;
    this.host.addController(this);
  }

  hostConnected(): void {
    if (typeof window === 'undefined') {
      return;
    }

    window.addEventListener('popstate', this.onLocationStateChange);
    window.addEventListener('hashchange', this.onLocationStateChange);
    window.addEventListener(URL_STATE_CHANGE_EVENT, this.onLocationStateChange as EventListener);
  }

  hostDisconnected(): void {
    if (typeof window === 'undefined') {
      return;
    }

    window.removeEventListener('popstate', this.onLocationStateChange);
    window.removeEventListener('hashchange', this.onLocationStateChange);
    window.removeEventListener(URL_STATE_CHANGE_EVENT, this.onLocationStateChange as EventListener);
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

    const queryValue = readPrimaryTabValue(window.location.href);
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
    const currentQueryValue = readPrimaryTabValue(currentUrl);

    let nextUrl = currentUrl;

    if (source === 'hash') {
      nextUrl = writePrimaryTabValue(currentUrl, activeValue);
    } else if (currentQueryValue !== null) {
      nextUrl = writePrimaryTabValue(currentUrl, activeValue);
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
    const nextUrl = writePrimaryTabValue(currentUrl, value);

    this.writeUrlStateInternal(nextUrl, historyMode);
  }

  private resolveValueFromHash(): string | null {
    if (typeof window === 'undefined') {
      return null;
    }

    const hash = readDecodedHash(window.location.href);
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

    const state = this.host.createHistoryStateForUrl(nextUrl);

    if (historyMode === 'push') {
      window.history.pushState(state, '', nextUrl);
    } else {
      window.history.replaceState(state, '', nextUrl);
    }

    dispatchUrlStateChange(previousUrl, nextUrl);
  }

  private readonly onLocationStateChange = (): void => {
    if (!this.host.isUrlSyncEnabled()) {
      return;
    }

    this.withSuppressedWrite(() => {
      this.host.onUrlStateChanged();
    });
  };
}
