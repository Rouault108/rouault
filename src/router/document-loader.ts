import { HtmlDocumentFetcher } from './html-document-fetcher.js';
import { DocumentSnapshotFactory } from './document-snapshot-factory.js';
import { ErrorSnapshotFactory } from './error-snapshot-factory.js';
import { LocationAdapter } from './location-adapter.js';
import { RouteRegistry } from './route-registry.js';
import type { DocumentRouteContext, LoadDocumentResult, ShellAdapter } from './router-types.js';

export class DocumentLoader {
  private readonly fetcher = new HtmlDocumentFetcher();
  private readonly snapshotFactory = new DocumentSnapshotFactory();
  private readonly errorSnapshotFactory = new ErrorSnapshotFactory();

  constructor(
    private readonly routeRegistry: RouteRegistry,
    private readonly location: LocationAdapter,
  ) {}

  async load(
    normalizedUrl: string,
    signal: AbortSignal,
    shellAdapter?: ShellAdapter,
  ): Promise<LoadDocumentResult> {
    const routeContext = this.createRouteContext(normalizedUrl, signal);
    const routeSnapshot = await this.routeRegistry.execute(routeContext);
    if (routeSnapshot !== null) {
      return {
        snapshot: routeSnapshot,
        source: 'document-route',
        errorReason: routeSnapshot.kind === 'error' ? routeSnapshot.reason : undefined,
      };
    }

    const response = await this.fetcher.fetch(
      this.location.resolveContentUrl(normalizedUrl),
      signal,
    );
    if (!response.ok) {
      return this.errorSnapshotFactory.createHttpErrorResult(response.status, normalizedUrl);
    }

    const text = await response.text();
    const documentSnapshot = this.parseHtmlDocument(text);

    try {
      const snapshot = await this.snapshotFactory.create(documentSnapshot, shellAdapter);
      return {
        snapshot,
        source: 'fetch',
      };
    } catch (error) {
      return this.errorSnapshotFactory.createExceptionResult(error);
    }
  }

  createExceptionResult(error: unknown): LoadDocumentResult {
    return this.errorSnapshotFactory.createExceptionResult(error);
  }

  private createRouteContext(normalizedUrl: string, signal: AbortSignal): DocumentRouteContext {
    const parsedUrl = new URL(normalizedUrl, window.location.origin);

    return {
      url: normalizedUrl,
      normalizedUrl,
      pathname: parsedUrl.pathname,
      searchParams: new URLSearchParams(parsedUrl.search),
      hash: parsedUrl.hash,
      signal,
    };
  }

  private parseHtmlDocument(text: string): Document {
    const parser = new DOMParser();
    return parser.parseFromString(text, 'text/html');
  }
}
