import type { TocHydrationState } from './toc-hydration-state.js';
import { resolveTocRuntimeId } from './toc-source-id-resolution.js';

const DEFAULT_LAYOUT_TOC_RUNTIME_ID = 'page-toc';

export interface TocHydrationSession {
  readonly state: TocHydrationState;
  readonly ownerId: string;
  readonly sourceId: string | null;
  readonly generation: number;
  readonly signal: AbortSignal;
}

export class TocHydrationSessionController {
  private _generation = 0;
  private _controller: AbortController | null = null;
  private _session: TocHydrationSession | null = null;

  get current(): TocHydrationSession | null {
    return this._session;
  }

  start(input: {
    readonly ownerId?: string | null | undefined;
    readonly sourceId?: string | null | undefined;
    readonly contentRootId?: string | null | undefined;
  }): TocHydrationSession {
    this.abort();

    const ownerId = resolveTocRuntimeId(
      input.ownerId ?? '',
      input.sourceId ?? '',
      input.contentRootId ?? '',
      DEFAULT_LAYOUT_TOC_RUNTIME_ID,
    );
    const sourceId = input.sourceId?.trim();
    const controller = new AbortController();
    const session: TocHydrationSession = {
      state: 'hydrating',
      ownerId,
      sourceId: sourceId === undefined || sourceId.length === 0 ? null : sourceId,
      generation: this._generation + 1,
      signal: controller.signal,
    };

    this._generation = session.generation;
    this._controller = controller;
    this._session = session;
    return session;
  }

  markHydrated(): TocHydrationSession | null {
    if (this._session === null || this._session.signal.aborted) {
      return null;
    }

    this._session = {
      ...this._session,
      state: 'hydrated',
    };
    return this._session;
  }

  abort(): void {
    this._controller?.abort();
    this._controller = null;
  }

  dispose(): TocHydrationSession | null {
    this.abort();
    if (this._session === null) {
      return null;
    }

    this._session = {
      ...this._session,
      state: 'disposed',
    };
    return this._session;
  }
}
