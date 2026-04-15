import { HtmlDocumentFetcher } from './html-document-fetcher.js';
import { ErrorEnvelopeFactory } from './error-envelope-factory.js';
import { LocationAdapter } from './location-adapter.js';
import {
  NavigationEnvelopeBuildMismatchError,
  NavigationEnvelopeContractError,
} from './navigation-envelope-errors.js';
import { validateNavigationEnvelope } from './navigation-envelope-validator.js';
import { RouteRegistry } from './route-registry.js';
import type { DocumentRouteContext, LoadDocumentResult } from './router-types.js';

export class DocumentLoader {
  private readonly fetcher = new HtmlDocumentFetcher();
  private readonly errorEnvelopeFactory = new ErrorEnvelopeFactory();

  constructor(
    private readonly routeRegistry: RouteRegistry,
    private readonly location: LocationAdapter,
  ) {}

  async load(
    normalizedUrl: string,
    signal: AbortSignal,
  ): Promise<LoadDocumentResult> {
    const routeContext = this.createRouteContext(normalizedUrl, signal);
    const routeEnvelope = await this.routeRegistry.execute(routeContext);
    if (routeEnvelope !== null) {
      return {
        envelope: routeEnvelope,
        source: 'document-route',
      };
    }

    const snapshotUrl = this.location.resolveSnapshotUrl(normalizedUrl);
    const snapshotResponse = await this.fetcher.fetch(snapshotUrl, signal);
    if (snapshotResponse.ok) {
      try {
        const responseText = await snapshotResponse.text();
        const envelope = this.decodeSnapshotResponse(responseText, normalizedUrl);
        return {
          envelope,
          source: 'fetch',
        };
      } catch (error) {
        return this.errorEnvelopeFactory.createExceptionResult(error);
      }
    }

    return this.errorEnvelopeFactory.createHttpErrorResult(snapshotResponse.status, normalizedUrl);
  }

  createExceptionResult(error: unknown): LoadDocumentResult {
    return this.errorEnvelopeFactory.createExceptionResult(error);
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

  private decodeSnapshotResponse(
    text: string,
    normalizedUrl: string,
  ): LoadDocumentResult['envelope'] {
    const trimmed = text.trimStart();
    if (trimmed.startsWith('<')) {
      throw new NavigationEnvelopeContractError(
        'router artifact は JSON NavigationEnvelope である必要があります。',
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch (error) {
      throw new NavigationEnvelopeContractError(
        error instanceof Error
          ? `router artifact JSON の decode に失敗しました: ${error.message}`
          : 'router artifact JSON の decode に失敗しました。',
      );
    }

    const envelope = validateNavigationEnvelope(parsed);
    this.assertBuildIdMatches(envelope.buildId, normalizedUrl);
    return envelope;
  }

  private assertBuildIdMatches(
    envelopeBuildId: string | null | undefined,
    normalizedUrl: string,
  ): void {
    const currentBuildId = this.readCurrentBuildId();
    if (!currentBuildId || !envelopeBuildId || currentBuildId === envelopeBuildId) {
      return;
    }

    throw new NavigationEnvelopeBuildMismatchError({
      currentBuildId,
      envelopeBuildId,
      normalizedUrl,
    });
  }

  private readCurrentBuildId(): string | null {
    const metaBuildId = document
      .querySelector('meta[name="rouault-build-id"]')
      ?.getAttribute('content')
      ?.trim();
    if (metaBuildId) {
      return metaBuildId;
    }

    const footerBuildId = document
      .querySelector('layout-footer[build-label]')
      ?.getAttribute('build-label')
      ?.trim();
    return footerBuildId && footerBuildId.length > 0 ? footerBuildId : null;
  }
}
