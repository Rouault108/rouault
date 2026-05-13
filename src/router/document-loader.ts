import { validateOptionalBuildIdInput } from '../../shared/navigation/build-id-contract.js';
import { validateOptionalGeneratedAtInput } from '../../shared/navigation/generated-at-contract.js';
import { HtmlDocumentFetcher } from './html-document-fetcher.js';
import { normalizeDocumentRouteEnvelope } from './document-route-envelope.js';
import { ErrorEnvelopeFactory } from './error-envelope-factory.js';
import { LocationAdapter } from './location-adapter.js';
import { CurrentBuildMetadataInvalidError, NavigationEnvelopeContractError } from './navigation-envelope-errors.js';
import {
  validateLoadedEnvelope,
  validateNavigationEnvelope,
} from './navigation-envelope-validator.js';
import type { StrictLoadedNavigationEnvelope } from './router-types.js';
import { RouteRegistry } from './route-registry.js';
import type { DocumentRouteContext, LoadDocumentResult } from './router-types.js';

export type CurrentMetadataReadResult =
  | { readonly kind: 'valid'; readonly value: string }
  | { readonly kind: 'missing' }
  | { readonly kind: 'empty' }
  | { readonly kind: 'invalid-format'; readonly value: string };

const createCurrentMetadataInvalidError = (
  field: 'buildId' | 'generatedAt',
  result: Exclude<CurrentMetadataReadResult, { readonly kind: 'valid' }>,
): CurrentBuildMetadataInvalidError =>
  new CurrentBuildMetadataInvalidError({
    field,
    reason: result.kind,
    ...(result.kind === 'invalid-format' ? { value: result.value } : {}),
  });

const requireCurrentMetadataValue = (
  field: 'buildId' | 'generatedAt',
  result: CurrentMetadataReadResult,
): string => {
  if (result.kind === 'valid') {
    return result.value;
  }

  throw createCurrentMetadataInvalidError(field, result);
};

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
        const envelope = validateNavigationEnvelope(routeEnvelope);
        const normalizedEnvelope = normalizeDocumentRouteEnvelope(envelope, routeContext);

        return {
          envelope: validateLoadedEnvelope({
            envelope: normalizedEnvelope,
            source: 'document-route',
            currentBuildId: routeContext.currentBuildId,
            currentGeneratedAt: routeContext.currentGeneratedAt,
            normalizedUrl,
          }),
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
    const currentBuildId = requireCurrentMetadataValue('buildId', this.readCurrentBuildId());
    const currentGeneratedAt = requireCurrentMetadataValue(
      'generatedAt',
      this.readCurrentGeneratedAt(),
    );

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

  private readCurrentBuildId(): CurrentMetadataReadResult {
    const result = validateOptionalBuildIdInput(this.readMetaContentRaw('rouault-build-id'));
    if (result.kind === 'valid') {
      return result;
    }
    if (result.kind === 'invalid-format') {
      return { kind: 'invalid-format', value: result.value };
    }
    if (result.kind === 'invalid-type') {
      return { kind: 'invalid-format', value: String(result.value) };
    }
    return { kind: result.kind };
  }

  private readCurrentGeneratedAt(): CurrentMetadataReadResult {
    const result = validateOptionalGeneratedAtInput(
      this.readMetaContentRaw('rouault-generated-at'),
    );
    if (result.kind === 'valid') {
      return result;
    }
    if (result.kind === 'invalid-format') {
      return { kind: 'invalid-format', value: result.value };
    }
    if (result.kind === 'invalid-type') {
      return { kind: 'invalid-format', value: String(result.value) };
    }
    return { kind: result.kind };
  }
}
