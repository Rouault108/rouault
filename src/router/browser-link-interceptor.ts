import { classifyLinkHref, createManifestLoadedRouteClassificationMode } from '../../shared/link/link-annotation.js';
import type { SiteUrlContext } from '../../shared/site/site-url-context.js';
import { LocationAdapter } from './location-adapter.js';
import type { NavigationResult } from './router-types.js';
import type { LoadedInternalDocumentRouteManifestState } from './internal-document-route-manifest-loader.js';
import type { RouterRuntimeDiagnosticSink } from './router-diagnostics.js';

interface InterceptorRequest {
  url: string;
  historyMode: 'none' | 'push' | 'replace';
}

export interface RouterLinkInterceptorOptions {
  readonly location: LocationAdapter;
  readonly siteUrlContext: SiteUrlContext;
  readonly getCurrentUrl: () => string;
  readonly requestNavigation: (request: InterceptorRequest) => Promise<NavigationResult>;
  readonly routeManifestState: LoadedInternalDocumentRouteManifestState;
  readonly isInternalResourcePathname?: (pathname: string) => boolean;
  readonly diagnosticSink: RouterRuntimeDiagnosticSink;
}

const sanitizeTargetForDiagnostic = (target: string): string =>
  target.replace(/[\u0000-\u001F\u007F]/gu, '').slice(0, 120);

const isInvalidTarget = (target: string): boolean =>
  target.length === 0 || (target !== '_blank' && target !== '_self');

const hasPreviewSandboxAncestor = (event: Event): boolean =>
  event.composedPath().some(
    (item) =>
      item instanceof Element &&
      item.hasAttribute('data-link-contract-sandbox') &&
      item.getAttribute('data-link-contract-sandbox') === 'preview',
  );

const isInteractiveElementBeforeAnchor = (event: Event, anchor: HTMLAnchorElement): boolean => {
  for (const pathItem of event.composedPath()) {
    if (pathItem === anchor) return false;
    if (!(pathItem instanceof Element)) continue;
    if (
      pathItem instanceof HTMLButtonElement ||
      pathItem instanceof HTMLInputElement ||
      pathItem instanceof HTMLSelectElement ||
      pathItem instanceof HTMLTextAreaElement ||
      (pathItem instanceof HTMLElement && pathItem.isContentEditable) ||
      (pathItem instanceof HTMLElement && pathItem.getAttribute('role') === 'button') ||
      (pathItem instanceof HTMLElement && pathItem.localName === 'summary')
    ) {
      return true;
    }
  }
  return false;
};

export class RouterLinkInterceptor {
  private readonly clickHandler: (event: MouseEvent) => void;
  private readonly popstateHandler: () => void;
  private readonly location: LocationAdapter;
  private readonly siteUrlContext: SiteUrlContext;
  private readonly getCurrentUrl: () => string;
  private readonly requestNavigation: (request: InterceptorRequest) => Promise<NavigationResult>;
  private readonly routeManifestState: LoadedInternalDocumentRouteManifestState;
  private readonly isInternalResourcePathname?: (pathname: string) => boolean;
  private readonly diagnosticSink: RouterRuntimeDiagnosticSink;

  constructor(options: RouterLinkInterceptorOptions) {
    this.location = options.location;
    this.siteUrlContext = options.siteUrlContext;
    this.getCurrentUrl = options.getCurrentUrl;
    this.requestNavigation = options.requestNavigation;
    this.routeManifestState = options.routeManifestState;
    this.isInternalResourcePathname = options.isInternalResourcePathname;
    this.diagnosticSink = options.diagnosticSink;
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

  private getCurrentAbsoluteUrl(): string {
    return new URL(
      this.getCurrentUrl(),
      `${this.siteUrlContext.siteOrigin}${this.siteUrlContext.basePath}/`,
    ).toString();
  }

  private handleAnchorClick(event: MouseEvent): void {
    if (event.defaultPrevented) return;
    if (event.button !== 0) return;
    if (event.ctrlKey || event.shiftKey || event.altKey || event.metaKey) return;

    const anchor = this.resolveAnchorFromClickEvent(event);
    if (!anchor) return;

    if (isInteractiveElementBeforeAnchor(event, anchor)) return;

    const target = anchor.getAttribute('target');
    if (target !== null && isInvalidTarget(target)) {
      this.diagnosticSink.record({
        reason: 'invalid-target',
        target: sanitizeTargetForDiagnostic(target),
      });
      return;
    }

    if (hasPreviewSandboxAncestor(event)) return;

    const relValue = anchor.getAttribute('rel');
    const isExternalRel =
      anchor.relList.contains('external') ||
      (typeof relValue === 'string' && relValue.split(/\s+/u).includes('external'));

    if (
      target === '_blank' ||
      anchor.hasAttribute('download') ||
      isExternalRel ||
      anchor.hasAttribute('data-no-router')
    ) {
      return;
    }

    const href = anchor.getAttribute('href');
    if (!href) return;

    const currentAbsoluteUrl = this.getCurrentAbsoluteUrl();
    const annotation = classifyLinkHref({
      href,
      siteUrlContext: this.siteUrlContext,
      currentUrl: currentAbsoluteUrl,
      routeClassificationMode: createManifestLoadedRouteClassificationMode({
        isInternalDocumentPathname: (pathname) => this.routeManifestState.routeSet.has(pathname),
      }),
      ...(this.isInternalResourcePathname
        ? { isInternalResourcePathname: this.isInternalResourcePathname }
        : {}),
      surface: 'navigation',
    });

    if (annotation.isUnsafe || annotation.kind !== 'internal-document') {
      return;
    }

    let targetUrl: URL;
    try {
      targetUrl = new URL(href, currentAbsoluteUrl);
    } catch {
      return;
    }

    const normalizedTargetUrl = this.location.normalizeInternalDocumentUrl(targetUrl.toString());
    const normalizedTargetWithoutHash = this.location.stripHash(normalizedTargetUrl);
    const normalizedCurrentWithoutHash = this.location.stripHash(currentAbsoluteUrl);

    if (normalizedTargetWithoutHash === normalizedCurrentWithoutHash && targetUrl.hash) {
      this.diagnosticSink.record({
        reason: 'return-to-reading-unavailable',
        routeId: `${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`,
      });
      return;
    }

    event.preventDefault();
    void this.requestNavigation({
      url: `${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`,
      historyMode: 'push',
    });
  }

  private resolveAnchorFromClickEvent(event: MouseEvent): HTMLAnchorElement | null {
    for (const pathItem of event.composedPath()) {
      if (pathItem instanceof HTMLAnchorElement) {
        return pathItem;
      }
    }

    const target = event.target;
    if (target instanceof Element) {
      const closestAnchor = target.closest('a');
      if (closestAnchor instanceof HTMLAnchorElement) {
        return closestAnchor;
      }
    }

    return null;
  }
}

export const attachRouterLinkInterceptor = (
  options: RouterLinkInterceptorOptions,
): { readonly dispose: () => void } => {
  const interceptor = new RouterLinkInterceptor(options);
  interceptor.attach();
  return { dispose: () => interceptor.detach() };
};
