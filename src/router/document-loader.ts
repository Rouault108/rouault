import { normalizeBuildId } from '../../shared/navigation/build-id-contract.js';
import { normalizeGeneratedAt } from '../../shared/navigation/generated-at-contract.js';
import { HtmlDocumentFetcher } from './html-document-fetcher.js';
import { ErrorEnvelopeFactory } from './error-envelope-factory.js';
import { LocationAdapter } from './location-adapter.js';
import { CurrentBuildMetadataInvalidError, NavigationEnvelopeContractError } from './navigation-envelope-errors.js';
import {
  validateLoadedEnvelope,
  validateNavigationEnvelope,
  type StrictLoadedNavigationEnvelope,
} from './navigation-envelope-validator.js';
import { RouteRegistry } from './route-registry.js';
import type { DocumentRouteContext, LoadDocumentResult } from './router-types.js';

export class DocumentLoader {
  private readonly fetcher = new HtmlDocumentFetcher();
  private readonly errorEnvelopeFactory = new ErrorEnvelopeFactory();

  constructor(
    private readonly routeRegistry: RouteRegistry,
    private readonly location: LocationAdapter,
  ) {}

  async load(normalizedUrl: string, signal: AbortSignal): Promise<LoadDocumentResult> {
    let routeContext: DocumentRouteContext;
    try {
      routeContext = this.createRouteContext(normalizedUrl, signal);
    } catch (error) {
      return this.errorEnvelopeFactory.createExceptionResult(error);
    }

    try {
      const routeEnvelope = await this.routeRegistry.execute(routeContext);
      if (routeEnvelope !== null) {
        return {
          envelope: this.normalizeDocumentRouteEnvelope(routeEnvelope, routeContext),
          source: 'document-route',
        };
      }
    } catch (error) {
      return this.errorEnvelopeFactory.createExceptionResult(error);
    }

    const snapshotUrl = this.location.resolveSnapshotUrl(normalizedUrl);
    const snapshotResponse = await this.fetcher.fetch(snapshotUrl, signal);
    if (snapshotResponse.ok) {
      try {
        const responseText = await snapshotResponse.text();
        const envelope = this.decodeSnapshotResponse(responseText, normalizedUrl, routeContext);
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
    const currentBuildId = this.readCurrentBuildId();
    const currentGeneratedAt = this.readCurrentGeneratedAt();

    return {
      url: normalizedUrl,
      normalizedUrl,
      pathname: parsedUrl.pathname,
      searchParams: new URLSearchParams(parsedUrl.search),
      hash: parsedUrl.hash,
      signal,
      currentBuildId,
      currentGeneratedAt,
    };
  }

  private normalizeDocumentRouteEnvelope(
    envelope: unknown,
    context: DocumentRouteContext,
  ): StrictLoadedNavigationEnvelope {
    const validated = validateNavigationEnvelope(envelope);
    return validateLoadedEnvelope({
      envelope: {
        ...validated,
        buildId: validated.buildId ?? context.currentBuildId,
        generatedAt: validated.generatedAt ?? context.currentGeneratedAt,
      },
      source: 'document-route',
      currentBuildId: context.currentBuildId,
      currentGeneratedAt: context.currentGeneratedAt,
      normalizedUrl: context.normalizedUrl,
    });
  }

  private decodeSnapshotResponse(
    text: string,
    normalizedUrl: string,
    context: DocumentRouteContext,
  ): StrictLoadedNavigationEnvelope {
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
    return validateLoadedEnvelope({
      envelope,
      source: 'fetch',
      currentBuildId: context.currentBuildId,
      currentGeneratedAt: context.currentGeneratedAt,
      normalizedUrl,
    });
  }

  private readMetaContentRaw(name: string): string | null {
    return document.querySelector(`meta[name="${name}"]`)?.getAttribute('content') ?? null;
  }

  private readCurrentBuildId(): string {
    const raw = this.readMetaContentRaw('rouault-build-id');
    try {
      return normalizeBuildId(raw);
    } catch {
      throw new CurrentBuildMetadataInvalidError(
        'buildId',
        raw === null ? 'missing' : raw.trim().length === 0 ? 'empty' : 'invalid-format',
      );
    }
  }

  private readCurrentGeneratedAt(): string {
    const raw = this.readMetaContentRaw('rouault-generated-at');
    try {
      return normalizeGeneratedAt(raw);
    } catch {
      throw new CurrentBuildMetadataInvalidError(
        'generatedAt',
        raw === null ? 'missing' : raw.trim().length === 0 ? 'empty' : 'invalid-format',
      );
    }
  }
}
