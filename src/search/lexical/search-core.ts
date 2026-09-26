import { LexicalClient } from './client.js';
import { createCatalogFallback } from './catalog-fallback.js';
import { lexicalResponse, emptyLexicalResponse } from './response.js';
import { normalizeSearchTags } from '../../../shared/search/search-url.js';
import {
  LexicalFailure,
  LEXICAL_TIMEOUTS,
  type LexicalContext,
  type LexicalResult,
} from '../../../shared/search/lexical-protocol.js';
import type { SearchRequest, SearchResponse } from '../../../shared/search/search-types.js';
import type {
  LexicalDiagnostics,
  LexicalSearchResponse,
  LexicalResultItem,
  LexicalReason,
  LexicalDiagnosticIssue,
} from '../../../shared/search/lexical-response.js';

export interface LexicalSearchPort {
  search(request: SearchRequest, signal: AbortSignal): Promise<LexicalResult>;
  dispose(): void;
}
export function createLexicalSearchCore(options: {
  context: LexicalContext;
  isInternalDocumentPathname: (path: string) => boolean;
  client?: LexicalSearchPort;
  catalog?: (request: SearchRequest, signal: AbortSignal) => Promise<SearchResponse>;
}) {
  const client = options.client ?? new LexicalClient(options.context);
  const catalog =
    options.catalog ?? createCatalogFallback(options.context, options.isInternalDocumentPathname);
  let active: AbortController | undefined,
    disposed = false;
  return {
    async search(
      input: SearchRequest,
      execution: { signal?: AbortSignal } = {},
    ): Promise<LexicalSearchResponse> {
      if (disposed) throw new DOMException('Disposed search core', 'AbortError');
      execution.signal?.throwIfAborted();
      active?.abort(new DOMException('Stale search', 'AbortError'));
      const controller = new AbortController();
      active = controller;
      const abort = (): void => {
        controller.abort(execution.signal?.reason);
      };
      execution.signal?.addEventListener('abort', abort, { once: true });
      const { signal } = controller;
      const request = { ...input, q: input.q.trim(), tags: normalizeSearchTags(input.tags) };
      try {
        if (!request.q && !request.tags.length) return emptyLexicalResponse(request);
        try {
          const result = await client.search(request, signal);
          signal.throwIfAborted();
          return lexicalResponse(
            request,
            result,
            options.context,
            options.isInternalDocumentPathname,
          );
        } catch (error: unknown) {
          signal.throwIfAborted();
          const failure =
            error instanceof LexicalFailure
              ? error
              : new LexicalFailure('lexical-worker-failed', 'validate', 'Invalid lexical result');
          const diagnostics: LexicalDiagnostics = {
            degraded: true,
            activeSources: [],
            failures: [failure.kind],
            issues: [
              {
                code: 'source-failed',
                severity: 'error',
                stage: failure.stage,
                source: 'lexical',
                count: 1,
              },
            ],
          };
          const fallbackController = new AbortController();
          let timer: ReturnType<typeof setTimeout> | undefined;
          const abortFallback = (): void => {
            fallbackController.abort(signal.reason);
          };
          signal.addEventListener('abort', abortFallback, { once: true });
          try {
            const timeout = new Promise<never>((_, reject) => {
              timer = setTimeout(() => {
                fallbackController.abort();
                reject(new Error('Catalog deadline'));
              }, LEXICAL_TIMEOUTS.catalogFetch);
            });
            const canceled = new Promise<never>((_, reject) => {
              fallbackController.signal.addEventListener(
                'abort',
                () => {
                  reject(new Error('Catalog canceled'));
                },
                { once: true },
              );
            });
            const response = await Promise.race([
              catalog(request, fallbackController.signal),
              timeout,
              canceled,
            ]);
            signal.throwIfAborted();
            const issue = (
              item: (typeof response.diagnostics.issues)[number],
            ): LexicalDiagnosticIssue => {
              if (item.source && item.source !== 'catalog')
                throw new Error('Unexpected Catalog source');
              const { source, ...rest } = item;
              return source ? { ...rest, source: 'catalog' } : rest;
            };
            diagnostics.issues.push(...response.diagnostics.issues.map(issue));
            if (!response.diagnostics.activeSources.includes('catalog')) {
              const kind = response.diagnostics.failures.includes('catalog-normalize-failed')
                ? 'catalog-normalize-failed'
                : 'catalog-fetch-failed';
              diagnostics.failures.push(kind, 'all-sources-failed');
              return emptyLexicalResponse(request, diagnostics);
            }
            diagnostics.activeSources = ['catalog'];
            const items: LexicalResultItem[] = response.items.map((item) => ({
              ...item,
              reasons: item.reasons.map((reason): LexicalReason => {
                if (reason.source && reason.source !== 'catalog')
                  throw new Error('Unexpected Catalog reason');
                const { source, ...rest } = reason;
                return source ? { ...rest, source: 'catalog' } : rest;
              }),
            }));
            const base = {
              items,
              total: response.total,
              rankingProfileId: 'rouault-search-v3' as const,
              diagnostics,
            };
            return response.mode === 'explore'
              ? {
                  ...base,
                  mode: 'explore',
                  tagCounts: response.tagCounts,
                  allTagCounts: response.allTagCounts,
                }
              : { ...base, mode: 'navigate' };
          } catch {
            signal.throwIfAborted();
            diagnostics.failures.push('catalog-fetch-failed', 'all-sources-failed');
            diagnostics.issues.push({
              code: 'source-failed',
              severity: 'error',
              stage: 'fetch',
              source: 'catalog',
              count: 1,
            });
            return emptyLexicalResponse(request, diagnostics);
          } finally {
            if (timer) clearTimeout(timer);
            signal.removeEventListener('abort', abortFallback);
          }
        }
      } finally {
        execution.signal?.removeEventListener('abort', abort);
        if (active === controller) active = undefined;
      }
    },
    dispose(): void {
      if (disposed) return;
      disposed = true;
      active?.abort(new DOMException('Disposed search', 'AbortError'));
      client.dispose();
    },
  };
}
