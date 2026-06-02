import { classifyLinkHref, createManifestLoadedRouteClassificationMode } from '../../shared/link/link-annotation.js';
import type { SiteUrlContext } from '../../shared/site/site-url-context.js';
import { LocationAdapter } from './location-adapter.js';
import type { NavigationResult } from './router-types.js';
import type { LoadedInternalDocumentRouteManifestState } from './internal-document-route-manifest-loader.js';
import type { RouterRuntimeDiagnosticSink } from './router-diagnostics.js';
import { stripAsciiControlCharacters } from '../../shared/string/ascii-control.js';
import {
  isPlainPrimaryAnchorActivation,
  resolveAnchorFromActivationEvent,
} from './plain-primary-anchor-activation.js';

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
  stripAsciiControlCharacters(target).slice(0, 120);
const isInvalidTarget = (target: string): boolean =>
  target.length === 0 || (target !== '_blank' && target !== '_self');

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
    if (options.isInternalResourcePathname !== undefined) {
      this.isInternalResourcePathname = options.isInternalResourcePathname;
    }
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
    const anchor = resolveAnchorFromActivationEvent(event);
    if (!anchor) return;
    const target = anchor.getAttribute('target');
    if (target !== null && isInvalidTarget(target)) {
      this.diagnosticSink.record({
        reason: 'invalid-target',
        target: sanitizeTargetForDiagnostic(target),
      });
      return;
    }
    if (!isPlainPrimaryAnchorActivation(event, anchor)) return;

    const relValue = anchor.getAttribute('rel');
    const isExternalRel =
      anchor.relList.contains('external') ||
      (typeof relValue === 'string' && relValue.split(/\s+/u).includes('external'));

    if (
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
}

export const attachRouterLinkInterceptor = (
  options: RouterLinkInterceptorOptions,
): { readonly dispose: () => void } => {
  const interceptor = new RouterLinkInterceptor(options);
  interceptor.attach();
  return { dispose: () => { interceptor.detach(); } };
};
