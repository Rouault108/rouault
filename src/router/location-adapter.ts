import { isDefaultInternalResourcePathname } from '../../shared/link/link-annotation.js';
import { detectUnsafeHref } from '../../shared/link/unsafe-href-detector.js';
import { resolveRouterArtifactPathname } from '../../shared/navigation/router-artifact-path.js';
import { hasAsciiControlCharacter } from '../../shared/string/ascii-control.js';
import { createSharedRouaultUrlPolicy, type UrlPolicy } from './url-policy.js';

export class LocationAdapter {
  constructor(private readonly policy: UrlPolicy = createSharedRouaultUrlPolicy()) {}

  private toUrl(input?: string | URL): URL {
    if (input instanceof URL) {
      return new URL(input.toString(), window.location.origin);
    }

    if (typeof input === 'string' && input.length > 0) {
      return new URL(input, window.location.origin);
    }

    return new URL(window.location.href);
  }

  private readTrustedHistoryRouterUrl(value: unknown): string | null {
    if (typeof value !== 'string' || value.length === 0) {
      return null;
    }

    if (!value.startsWith('/') || value.startsWith('//')) {
      return null;
    }

    if (value.includes('\\') || hasAsciiControlCharacter(value)) {
      return null;
    }

    if (!detectUnsafeHref(value).ok) {
      return null;
    }

    const rawPath = value.split(/[?#]/u, 1)[0] ?? '';
    if (rawPath.split('/').some((segment) => segment === '.' || segment === '..')) {
      return null;
    }

    let parsed: URL;
    try {
      parsed = new URL(value, window.location.origin);
    } catch {
      return null;
    }

    if (parsed.origin !== window.location.origin) {
      return null;
    }

    const normalizedPathname = this.policy.normalizePathname(parsed.pathname);
    if (isDefaultInternalResourcePathname(normalizedPathname)) {
      return null;
    }

    return `${normalizedPathname}${parsed.search}${parsed.hash}`;
  }

  readCurrentUrl(): string {
    const currentState: unknown = history.state;
    if (this.isHistoryStateObject(currentState)) {
      const historyUrl = currentState['__routerUrl'];
      const trustedHistoryUrl = this.readTrustedHistoryRouterUrl(historyUrl);
      if (trustedHistoryUrl !== null) {
        return this.normalizeInternalDocumentUrl(trustedHistoryUrl);
      }
    }

    return this.normalizeInternalDocumentUrl(
      `${window.location.pathname}${window.location.search}${window.location.hash}`,
    );
  }

  createHistoryState(
    state: Record<string, unknown> | undefined,
    normalizedUrl: string,
  ): Record<string, unknown> {
    const parsed = this.toUrl(normalizedUrl);
    const currentState = this.isHistoryStateObject(state) ? state : {};

    return {
      ...currentState,
      __routerUrl: `${parsed.pathname}${parsed.search}${parsed.hash}`,
    };
  }

  normalizeInternalDocumentUrl(url: string): string {
    const normalized = this.toUrl(url);
    this.policy.sanitizeSearchParams(normalized);
    normalized.pathname = this.policy.normalizePathname(normalized.pathname);
    return `${normalized.pathname}${normalized.search}${normalized.hash}`;
  }


  normalizePathname(pathname: string): string {
    return this.policy.normalizePathname(pathname);
  }

  getPath(url: string): string {
    return this.toUrl(url).pathname;
  }

  getHash(url: string): string {
    return this.toUrl(url).hash;
  }

  getSearchParams(url: string): URLSearchParams {
    return new URLSearchParams(this.toUrl(url).search);
  }

  stripHash(url: string): string {
    const normalized = this.toUrl(url);
    return `${normalized.pathname}${normalized.search}`;
  }

  resolveContentUrl(url: string): string {
    const normalized = this.toUrl(url);
    normalized.pathname = this.policy.resolveContentPath(normalized.pathname);

    return `${normalized.pathname}${normalized.search}`;
  }

  resolveSnapshotUrl(url: string): string {
    const contentUrl = this.resolveContentUrl(url);
    const parsed = this.toUrl(contentUrl);
    const snapshotPathname = resolveRouterArtifactPathname(parsed.pathname);

    return `${snapshotPathname}${parsed.search}`;
  }

  push(normalizedUrl: string, state?: Record<string, unknown>): void {
    window.history.pushState(this.createHistoryState(state, normalizedUrl), '', normalizedUrl);
  }

  replace(normalizedUrl: string, state?: Record<string, unknown>): void {
    window.history.replaceState(this.createHistoryState(state, normalizedUrl), '', normalizedUrl);
  }

  private isHistoryStateObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }
}
