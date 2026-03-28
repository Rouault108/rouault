import { classifyLinkHref, isRoutableLinkKind } from '../../../lib/shared/link-kind.js';
import { LocationAdapter } from './location-adapter.js';
import type { NavigationResult } from './router-types.js';

interface InterceptorRequest {
  url: string;
  historyMode: 'none' | 'push' | 'replace';
}

export class BrowserLinkInterceptor {
  private clickHandler: (event: MouseEvent) => void;
  private popstateHandler: () => void;

  constructor(
    private location: LocationAdapter,
    private getCurrentUrl: () => string,
    private requestNavigation: (request: InterceptorRequest) => Promise<NavigationResult>,
  ) {
    this.clickHandler = (event: MouseEvent) => {
      this.handleAnchorClick(event);
    };
    this.popstateHandler = () => {
      const nextUrl = this.location.readCurrentUrl();
      void this.requestNavigation({
        url: nextUrl,
        historyMode: 'none',
      });
    };
  }

  attach(): void {
    window.addEventListener('popstate', this.popstateHandler);
    document.addEventListener('click', this.clickHandler);
  }

  detach(): void {
    window.removeEventListener('popstate', this.popstateHandler);
    document.removeEventListener('click', this.clickHandler);
  }

  private handleAnchorClick(event: MouseEvent): void {
    if (event.defaultPrevented) return;
    if (event.button !== 0) return;
    if (event.ctrlKey || event.shiftKey || event.altKey || event.metaKey) return;

    const anchor = this.resolveAnchorFromClickEvent(event);
    if (!anchor) return;

    const relValue = anchor.getAttribute('rel');
    const isExternalRel =
      anchor.relList.contains('external') ||
      (typeof relValue === 'string' && relValue.split(/\s+/u).includes('external'));

    if (
      anchor.target ||
      anchor.hasAttribute('download') ||
      isExternalRel ||
      anchor.hasAttribute('data-no-router')
    ) {
      return;
    }

    const href = anchor.getAttribute('href');
    if (!href) return;

    const linkKind = classifyLinkHref(href, {
      siteOrigin: window.location.origin,
      currentUrl: window.location.href,
    });

    if (!isRoutableLinkKind(linkKind)) {
      return;
    }

    let targetUrl: URL;
    try {
      targetUrl = new URL(href, window.location.href);
    } catch {
      return;
    }

    const normalizedTargetUrl = this.location.normalizeUrl(targetUrl.toString());
    const normalizedTargetWithoutHash = this.location.stripHash(normalizedTargetUrl);
    const normalizedCurrentWithoutHash = this.location.stripHash(this.getCurrentUrl());

    if (normalizedTargetWithoutHash === normalizedCurrentWithoutHash && targetUrl.hash) {
      return;
    }

    event.preventDefault();
    void this.requestNavigation({
      url: `${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`,
      historyMode: 'push',
    });
  }

  private resolveAnchorFromClickEvent(event: MouseEvent): HTMLAnchorElement | null {
    const target = event.target;
    if (target instanceof Element) {
      const closestAnchor = target.closest('a');
      if (closestAnchor instanceof HTMLAnchorElement) {
        return closestAnchor;
      }
    }

    for (const pathItem of event.composedPath()) {
      if (pathItem instanceof HTMLAnchorElement) {
        return pathItem;
      }
    }

    return null;
  }
}