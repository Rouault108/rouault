import { validateOptionalBuildIdInput } from '../../shared/navigation/build-id-contract.js';
import { validateOptionalGeneratedAtInput } from '../../shared/navigation/generated-at-contract.js';
import { fetchNavigationEnvelopeArtifact } from './navigation-envelope-fetcher.js';
import type { InternalDocumentNormalizedUrl } from './internal-document-normalized-url.js';
import type { SiteUrlContext } from '../../shared/site/site-url-context.js';
import { normalizeDocumentRouteEnvelope } from './document-route-envelope.js';
import { ErrorEnvelopeFactory } from './error-envelope-factory.js';
import {
  CurrentBuildMetadataInvalidError,
  NavigationEnvelopeHttpStatusError,
} from './navigation-envelope-errors.js';
import {
  validateLoadedEnvelope,
  validateNavigationEnvelope,
} from './navigation-envelope-validator.js';
import { RouteRegistry } from './route-registry.js';
import type { DocumentRouteContext, LoadDocumentResult } from './router-types.js';

const isAbortError = (error: unknown): boolean =>
  error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError');

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
  private readonly errorEnvelopeFactory: ErrorEnvelopeFactory;

  constructor(
    private readonly routeRegistry: RouteRegistry,
    private readonly siteUrlContext: SiteUrlContext,
  ) {
    this.errorEnvelopeFactory = new ErrorEnvelopeFactory(siteUrlContext);
  }

  async load(
    normalizedUrl: InternalDocumentNormalizedUrl,
    signal: AbortSignal,
  ): Promise<LoadDocumentResult> {
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
            normalizedUrl: String(normalizedUrl),
          }),
          source: 'document-route',
        };
      }
    } catch (error) {
      if (isAbortError(error)) {
        throw error;
      }
      return this.errorEnvelopeFactory.createExceptionResult(error);
    }

    try {
      const artifact = await fetchNavigationEnvelopeArtifact({
        normalizedUrl,
        siteUrlContext: this.siteUrlContext,
        signal,
      });
      const envelope = validateNavigationEnvelope(artifact);
      return {
        envelope: validateLoadedEnvelope({
          envelope,
          source: 'fetch',
          currentBuildId: routeContext.currentBuildId,
          currentGeneratedAt: routeContext.currentGeneratedAt,
          normalizedUrl: String(normalizedUrl),
        }),
        source: 'fetch',
      };
    } catch (error) {
      if (isAbortError(error)) {
        throw error;
      }
      if (error instanceof NavigationEnvelopeHttpStatusError) {
        return this.errorEnvelopeFactory.createHttpErrorResult(error.status, String(normalizedUrl));
      }
      return this.errorEnvelopeFactory.createExceptionResult(error);
    }
  }

  createExceptionResult(error: unknown): LoadDocumentResult {
    return this.errorEnvelopeFactory.createExceptionResult(error);
  }

  private createRouteContext(
    normalizedUrl: InternalDocumentNormalizedUrl,
    signal: AbortSignal,
  ): DocumentRouteContext {
    const serializedUrl = String(normalizedUrl);
    const parsedUrl = new URL(serializedUrl, window.location.origin);
    const currentBuildId = requireCurrentMetadataValue('buildId', this.readCurrentBuildId());
    const currentGeneratedAt = requireCurrentMetadataValue(
      'generatedAt',
      this.readCurrentGeneratedAt(),
    );

    return {
      url: serializedUrl,
      normalizedUrl,
      pathname: parsedUrl.pathname,
      searchParams: new URLSearchParams(parsedUrl.search),
      hash: parsedUrl.hash,
      signal,
      currentBuildId,
      currentGeneratedAt,
    };
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
