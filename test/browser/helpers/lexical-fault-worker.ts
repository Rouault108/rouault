import { parseMainMessage, WORKER_FAILURE_KINDS } from '../../../shared/search/lexical-protocol.js';

const fault = new URL(location.href).searchParams.get('fault');
self.addEventListener('message', (event: MessageEvent<unknown>) => {
  const message = parseMainMessage(event.data);
  if (message.type === 'init') {
    self.postMessage({
      ...message,
      type: 'ready',
      payload: { identity: message.identity, initMs: 0, wasmMemory: 0, assets: [] },
    });
    return;
  }
  if (message.type !== 'search') return;
  if (message.payload.q === 'warm') {
    self.postMessage({
      ...message,
      type: 'result',
      payload: { candidates: [], queryTokens: [], traceSha256: 'a'.repeat(64), metrics: {} },
    });
    return;
  }
  if (fault === 'cpu') {
    for (;;) {
      /* main deadlineによる実Worker terminateを検証する。 */
    }
  }
  if (fault === 'crash') throw new Error('Injected Worker crash');
  if (fault === 'identity') {
    self.postMessage({ ...message, identity: 'f'.repeat(64), type: 'result', payload: {} });
    return;
  }
  if (fault === 'malformed') {
    self.postMessage({ ...message, type: 'result', payload: {} });
    return;
  }
  const kind = WORKER_FAILURE_KINDS.find((kind) => kind === fault);
  if (!kind) throw new Error('Unknown fault');
  const stage =
    kind === 'lexical-analyzer-unavailable'
      ? 'normalize'
      : kind === 'lexical-search-failed'
        ? 'rank'
        : kind === 'lexical-load-failed'
          ? 'validate'
          : 'fetch';
  self.postMessage({ ...message, type: 'failure', payload: { kind, message: stage } });
});
