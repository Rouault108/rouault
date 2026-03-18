export class LocationAdapter {
  getQuery(currentUrl: string): Record<string, string> {
    const params: Record<string, string> = {};
    const searchParams = new URL(currentUrl, window.location.origin).searchParams;

    searchParams.forEach((value, key) => {
      if (key !== 'wtr-session-id') {
        params[key] = value;
      }
    });

    return params;
  }

  getPath(currentUrl: string): string {
    return new URL(currentUrl, window.location.origin).pathname;
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
        const resolved = new URL(window.location.href);
        resolved.pathname = historyPath;
        return this.normalizeUrl(`${resolved.pathname}${resolved.search}${resolved.hash}`);
      }
    }

    return this.normalizeUrl(`${window.location.pathname}${window.location.search}${window.location.hash}`);
  }

  createHistoryState(
    state: Record<string, unknown> | undefined,
    normalizedUrl: string,
  ): Record<string, unknown> {
    const currentState = this.isHistoryStateObject(state) ? state : {};
    const parsedUrl = new URL(normalizedUrl, window.location.origin);

    return {
      ...currentState,
      __routerUrl: `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`,
      __routerPath: parsedUrl.pathname,
    };
  }

  normalizeUrl(url: string): string {
    const normalized = new URL(url, window.location.href);
    normalized.pathname = this.normalizePathname(normalized.pathname);
    return `${normalized.pathname}${normalized.search}${normalized.hash}`;
  }

  normalizePathname(pathname: string): string {
    if (pathname === '/') {
      return pathname;
    }

    return pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
  }

  stripHash(url: string): string {
    const normalized = new URL(url, window.location.origin);
    return `${normalized.pathname}${normalized.search}`;
  }

  resolveContentUrl(url: string): string {
    const normalized = new URL(url, window.location.origin);
    const pathname = normalized.pathname;
    const lastSegment = pathname.split('/').pop() ?? '';

    if (pathname !== '/' && !pathname.endsWith('/') && !lastSegment.includes('.')) {
      normalized.pathname = `${pathname}/`;
    }

    return `${normalized.pathname}${normalized.search}${normalized.hash}`;
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