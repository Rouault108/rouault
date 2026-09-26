import {
  parseMainMessage,
  LexicalFailure,
  type IdentityHeader,
  type WorkerMessage,
} from '../../../shared/search/lexical-protocol.js';
import { LexicalRuntime } from './runtime.js';

const runtime = new LexicalRuntime();
let owner: IdentityHeader | undefined;
let lastRequest = 0;
let queue = Promise.resolve();
let ended = false;
const controllers = new Map<number, AbortController>();
const isActive = (signal: AbortSignal): boolean => !ended && !signal.aborted;
const shutdown = (): void => {
  ended = true;
  for (const controller of controllers.values()) controller.abort();
  controllers.clear();
  runtime.dispose();
};
self.addEventListener('message', (event: MessageEvent<unknown>) => {
  if (ended) return;
  let message;
  try {
    message = parseMainMessage(event.data);
  } catch {
    self.postMessage({ type: 'invalid-protocol' });
    shutdown();
    return;
  }
  if (owner && (message.generation !== owner.generation || message.identity !== owner.identity)) {
    if (message.generation < owner.generation) return;
    self.postMessage({ type: 'invalid-identity' });
    shutdown();
    return;
  }
  if (message.type === 'dispose') {
    shutdown();
    return;
  }
  if (message.type === 'cancel') {
    controllers.get(message.requestId)?.abort();
    return;
  }
  if (message.requestId <= lastRequest) return;
  lastRequest = message.requestId;
  if (message.type === 'init') {
    if (owner) {
      self.postMessage({ type: 'duplicate-init' });
      shutdown();
      return;
    }
    owner = message;
  } else if (!owner) {
    self.postMessage({ type: 'search-before-init' });
    shutdown();
    return;
  }
  const controller = new AbortController();
  controllers.set(message.requestId, controller);
  const request = message;
  queue = queue.then(async () => {
    if (ended || controller.signal.aborted) {
      controllers.delete(request.requestId);
      return;
    }
    try {
      let reply: WorkerMessage;
      if (request.type === 'init')
        reply = {
          ...request,
          type: 'ready',
          payload: await runtime.initialize(
            request.payload.context,
            request.payload.manifestSha,
            request.identity,
            controller.signal,
          ),
        };
      else if (request.type === 'search')
        reply = {
          ...request,
          type: 'result',
          payload: await runtime.search(request.payload, controller.signal),
        };
      else return;
      if (isActive(controller.signal)) self.postMessage(reply);
    } catch (error: unknown) {
      if (isActive(controller.signal)) {
        const failure =
          error instanceof LexicalFailure
            ? error
            : new LexicalFailure('lexical-load-failed', 'validate', 'Worker initialization');
        // stageだけをwireへ渡し、例外原文はpublic diagnosticsへ露出させない。
        const reply: WorkerMessage = {
          ...request,
          type: 'failure',
          payload: { kind: failure.kind, message: failure.stage },
        };
        self.postMessage(reply);
        shutdown();
      }
    } finally {
      controllers.delete(request.requestId);
    }
  });
});
