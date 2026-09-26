import { loadLexicalManifest, type ArtifactFetch } from './artifact-loader.js';
import {
  LexicalFailure,
  LEXICAL_TIMEOUTS,
  parseHeader,
  parseWorkerMessage,
  type IdentityHeader,
  type LexicalContext,
  type LexicalResult,
  type MainMessage,
  type WorkerMessage,
} from '../../../shared/search/lexical-protocol.js';
import type { SearchRequest } from '../../../shared/search/search-types.js';

type Verified = Awaited<ReturnType<typeof loadLexicalManifest>>;
export interface LexicalWorkerPort {
  postMessage(message: MainMessage): void;
  terminate(): void;
  onmessage: ((event: MessageEvent<unknown>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  onmessageerror: ((event: MessageEvent<unknown>) => void) | null;
}
interface Pending {
  type: 'init' | 'search';
  resolve: (message: WorkerMessage) => void;
  reject: (error: unknown) => void;
  cleanup: () => void;
}
const abortError = (): DOMException => new DOMException('Obsolete lexical request', 'AbortError');

export class LexicalClient {
  private worker: LexicalWorkerPort | undefined;
  private verified: Verified | undefined;
  private initializing: Promise<void> | undefined;
  private readonly pending = new Map<number, Pending>();
  private generation = 0;
  private requestId = 0;
  private attempts = 0;
  private ready = false;
  private disposed = false;
  private lifetime = new AbortController();
  private lastFailure = new LexicalFailure('lexical-worker-failed', 'fetch', 'Worker unavailable');
  constructor(
    readonly context: LexicalContext,
    private readonly createWorker: () => LexicalWorkerPort = () =>
      new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' }),
    private readonly fetcher: ArtifactFetch = fetch,
  ) {}

  get state() {
    return {
      generation: this.generation,
      attempts: this.attempts,
      ready: this.ready,
      identity: this.verified?.identity ?? null,
      pending: this.pending.size,
    };
  }
  private invalidate(error: unknown): void {
    this.worker?.terminate();
    this.worker = undefined;
    this.ready = false;
    this.generation++;
    this.lifetime.abort(error);
    this.lifetime = new AbortController();
    this.initializing = undefined;
    for (const pending of this.pending.values()) {
      pending.cleanup();
      pending.reject(error);
    }
    this.pending.clear();
  }
  private fail(error: LexicalFailure): void {
    this.lastFailure = error;
    this.invalidate(error);
  }
  private receive = (event: MessageEvent<unknown>): void => {
    try {
      const header = parseHeader(event.data);
      if (header.generation < this.generation) return;
      if (header.generation > this.generation)
        throw new LexicalFailure('lexical-worker-failed', 'validate', 'Future generation');
      const pending = this.pending.get(header.requestId);
      if (!pending) return;
      if (header.identity !== this.verified?.identity)
        throw new LexicalFailure('lexical-worker-failed', 'validate', 'Message identity');
      const message = parseWorkerMessage(event.data);
      if (message.type === 'failure') {
        const stage = message.payload.message;
        if (stage !== 'fetch' && stage !== 'validate' && stage !== 'normalize' && stage !== 'rank')
          throw new LexicalFailure('lexical-worker-failed', 'validate', 'Failure discriminator');
        this.fail(new LexicalFailure(message.payload.kind, stage, 'Worker failed'));
        return;
      }
      if (
        (pending.type === 'init' && message.type !== 'ready') ||
        (pending.type === 'search' && message.type !== 'result')
      )
        throw new LexicalFailure('lexical-worker-failed', 'validate', 'Unexpected reply');
      this.pending.delete(header.requestId);
      pending.cleanup();
      pending.resolve(message);
    } catch (error: unknown) {
      this.fail(
        error instanceof LexicalFailure
          ? error
          : new LexicalFailure('lexical-worker-failed', 'validate', 'Malformed reply'),
      );
    }
  };
  private send(message: MainMessage, timeout: number, signal: AbortSignal): Promise<WorkerMessage> {
    signal.throwIfAborted();
    return new Promise((resolve, reject) => {
      const abort = (): void => {
        const pending = this.pending.get(message.requestId);
        if (!pending) return;
        this.pending.delete(message.requestId);
        pending.cleanup();
        reject(signal.reason instanceof Error ? signal.reason : abortError());
        try {
          this.worker?.postMessage({ ...message, type: 'cancel', payload: null });
        } catch {
          /* 破棄済みrequestはfailureへ昇格しない。 */
        }
      };
      const timer = setTimeout(
        () => {
          this.fail(new LexicalFailure('lexical-timeout', 'fetch', 'Worker deadline'));
        },
        Math.max(0, timeout),
      );
      const cleanup = (): void => {
        clearTimeout(timer);
        signal.removeEventListener('abort', abort);
      };
      if (message.type !== 'init' && message.type !== 'search') {
        cleanup();
        reject(new Error('Invalid RPC'));
        return;
      }
      this.pending.set(message.requestId, { type: message.type, resolve, reject, cleanup });
      signal.addEventListener('abort', abort, { once: true });
      try {
        if (!this.worker) throw new Error('Missing Worker');
        this.worker.postMessage(message);
      } catch {
        this.fail(new LexicalFailure('lexical-worker-failed', 'fetch', 'Worker transport'));
      }
    });
  }
  private header(): IdentityHeader {
    if (!this.verified)
      throw new LexicalFailure('lexical-load-failed', 'validate', 'Missing verified identity');
    return {
      protocolVersion: 1,
      generation: this.generation,
      requestId: ++this.requestId,
      identity: this.verified.identity,
    };
  }
  private ensureReady(): Promise<void> {
    if (this.ready) return Promise.resolve();
    if (this.initializing) return this.initializing;
    if (this.attempts >= 2) return Promise.reject(this.lastFailure);
    this.attempts++;
    const lifetime = this.lifetime.signal;
    this.initializing = (async () => {
      await Promise.resolve();
      try {
        this.verified ??= await loadLexicalManifest(this.context, lifetime, this.fetcher);
        lifetime.throwIfAborted();
        try {
          this.worker = this.createWorker();
        } catch {
          throw new LexicalFailure('lexical-worker-failed', 'fetch', 'Worker construction');
        }
        this.generation++;
        const worker = this.worker;
        worker.onmessage = (event) => {
          if (this.worker === worker) this.receive(event);
        };
        worker.onerror = () => {
          if (this.worker === worker)
            this.fail(new LexicalFailure('lexical-worker-failed', 'fetch', 'Worker crash'));
        };
        worker.onmessageerror = () => {
          if (this.worker === worker)
            this.fail(new LexicalFailure('lexical-worker-failed', 'fetch', 'Worker transport'));
        };
        await this.send(
          {
            ...this.header(),
            type: 'init',
            payload: { context: this.context, manifestSha: this.verified.manifestSha },
          },
          LEXICAL_TIMEOUTS.workerInit,
          lifetime,
        );
        lifetime.throwIfAborted();
        this.ready = true;
      } catch (error: unknown) {
        if (!lifetime.aborted)
          this.fail(
            error instanceof LexicalFailure
              ? error
              : new LexicalFailure('lexical-load-failed', 'validate', 'Initialization failed'),
          );
        throw error;
      }
    })();
    return this.initializing;
  }
  async search(request: SearchRequest, signal: AbortSignal): Promise<LexicalResult> {
    signal.throwIfAborted();
    if (this.disposed) throw abortError();
    const start = performance.now();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let abort: (() => void) | undefined;
    const canceled = new Promise<never>((_, reject) => {
      abort = () => {
        reject(signal.reason instanceof Error ? signal.reason : abortError());
      };
      signal.addEventListener('abort', abort, { once: true });
      timer = setTimeout(() => {
        const error = new LexicalFailure('lexical-timeout', 'fetch', 'Lexical total deadline');
        this.fail(error);
        reject(error);
      }, LEXICAL_TIMEOUTS.lexicalRequestTotal);
    });
    try {
      await Promise.race([this.ensureReady(), canceled]);
      signal.throwIfAborted();
      const remaining = LEXICAL_TIMEOUTS.lexicalRequestTotal - (performance.now() - start);
      const response = await Promise.race([
        this.send(
          { ...this.header(), type: 'search', payload: request },
          Math.min(LEXICAL_TIMEOUTS.workerSearch, remaining),
          signal,
        ),
        canceled,
      ]);
      if (response.type !== 'result')
        throw new LexicalFailure('lexical-worker-failed', 'validate', 'Search reply');
      signal.throwIfAborted();
      return response.payload;
    } finally {
      if (timer) clearTimeout(timer);
      if (abort) signal.removeEventListener('abort', abort);
    }
  }
  async refreshIdentity(signal: AbortSignal): Promise<void> {
    if (this.disposed) throw abortError();
    const verified = await loadLexicalManifest(this.context, signal, this.fetcher);
    signal.throwIfAborted();
    if (verified.identity !== this.verified?.identity) {
      this.invalidate(abortError());
      this.verified = verified;
      this.attempts = 0;
    }
  }
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.invalidate(abortError());
  }
}
