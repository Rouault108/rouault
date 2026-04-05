export class LocationAdapter {
  private static readonly CORPORA_ROOT_PATH = '/corpora';
  private static readonly ABOUT_ROOT_PATH = '/about';

  private sanitizeUrl(url: URL): void {
    url.searchParams.delete('wtr-session-id');
  }

  private toUrl(input?: string | URL): URL {
    if (input instanceof URL) {
      return new URL(input.toString(), window.location.origin);
    }

    if (typeof input === 'string' && input.length > 0) {
      return new URL(input, window.location.origin);
    }

    return new URL(window.location.href);
  }

  readCurrentUrl(): string {
    const currentState: unknown = history.state;
    if (this.isHistoryStateObject(currentState)) {
      const historyUrl = currentState['__routerUrl'];
      if (typeof historyUrl === 'string' && historyUrl.length > 0) {
        return this.normalizeUrl(historyUrl);
      }

      const historyPath = currentState['__routerPath'];
      if (typeof historyPath === 'string' && historyPath.length > 0) {
        const resolved = this.toUrl();
        resolved.pathname = historyPath;
        return this.normalizeUrl(`${resolved.pathname}${resolved.search}${resolved.hash}`);
      }
    }

    return this.normalizeUrl(
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
      __routerPath: parsed.pathname,
    };
  }

  normalizeUrl(url: string): string {
    const normalized = this.toUrl(url);
    this.sanitizeUrl(normalized);
    normalized.pathname = this.normalizePathname(normalized.pathname);
    return `${normalized.pathname}${normalized.search}${normalized.hash}`;
  }

  normalizePathname(pathname: string): string {
    if (pathname === '/') {
      return pathname;
    }

    if (pathname === '/search/' || pathname === '/search') {
      return '/search';
    }

    if (pathname === LocationAdapter.ABOUT_ROOT_PATH) {
      return '/about/';
    }

    if (pathname.startsWith('/about/')) {
      return pathname.endsWith('/') ? pathname : `${pathname}/`;
    }

    if (pathname === LocationAdapter.CORPORA_ROOT_PATH) {
      return '/corpora/';
    }

    if (pathname.startsWith('/corpora/')) {
      return pathname.endsWith('/') ? pathname : `${pathname}/`;
    }

    if (/^\/tags\/[^/]+\/$/u.test(pathname)) {
      return pathname;
    }

    return pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
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
    const pathname = normalized.pathname;
    const lastSegment = pathname.split('/').pop() ?? '';

    if (pathname !== '/' && !pathname.endsWith('/') && !lastSegment.includes('.')) {
      normalized.pathname = `${pathname}/`;
    }

    return `${normalized.pathname}${normalized.search}`;
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
