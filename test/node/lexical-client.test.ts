import manifest from '../fixtures/search/manifest-v2.json' with { type: 'json' };
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LexicalClient, type LexicalWorkerPort } from '../../src/search/lexical/client.js';
import type { MainMessage } from '../../shared/search/lexical-protocol.js';
import type { SearchRequest } from '../../shared/search/search-types.js';
import type { ArtifactFetch } from '../../src/search/lexical/artifact-loader.js';

const request: SearchRequest = {
  q: 'value',
  mode: 'explore',
  tags: [],
  tagMode: 'and',
  sort: 'relevance',
};
const context = { siteOrigin: 'https://example.test', basePath: '' };
class Port implements LexicalWorkerPort {
  onmessage: LexicalWorkerPort['onmessage'] = null;
  onerror: LexicalWorkerPort['onerror'] = null;
  onmessageerror: LexicalWorkerPort['onmessageerror'] = null;
  sent: MainMessage[] = [];
  terminated = false;
  postMessage(message: MainMessage) {
    this.sent.push(message);
  }
  terminate() {
    this.terminated = true;
  }
  reply(message: MainMessage, type: string, payload: unknown, generation = message.generation) {
    this.onmessage?.({ data: { ...message, generation, type, payload } } as MessageEvent<unknown>);
  }
  ready() {
    const init = this.sent.find((message) => message.type === 'init');
    if (!init) throw new Error('Missing init');
    this.reply(init, 'ready', { identity: init.identity, initMs: 1, wasmMemory: 1, assets: [] });
  }
  result() {
    const query = [...this.sent].reverse().find((message) => message.type === 'search');
    if (!query) throw new Error('Missing query');
    this.reply(query, 'result', {
      candidates: [],
      queryTokens: [],
      traceSha256: 'a'.repeat(64),
      metrics: {},
    });
  }
}
async function setup() {
  const bytes = JSON.stringify(manifest);
  const ports: Port[] = [];
  const fetcher: ArtifactFetch = async () => new Response(bytes);
  const client = new LexicalClient(
    context,
    () => {
      const port = new Port();
      ports.push(port);
      return port;
    },
    fetcher,
  );
  return { client, ports };
}
async function until(predicate: () => boolean) {
  await vi.waitFor(() => expect(predicate()).toBe(true), { interval: 1 });
}
afterEach(() => vi.useRealTimers());
describe('Worker lifetime contract', () => {
  it('resets exhausted retry only after a different verified identity', async () => {
    let buildId = manifest.buildId;
    const ports: Port[] = [];
    const client = new LexicalClient(
      context,
      () => {
        const port = new Port();
        ports.push(port);
        return port;
      },
      async () => new Response(JSON.stringify({ ...manifest, buildId })),
    );
    const signal = new AbortController().signal;
    for (let i = 0; i < 2; i++) {
      const pending = client.search(request, signal),
        failed = expect(pending).rejects.toMatchObject({ kind: 'lexical-worker-failed' });
      await until(() => Boolean(ports[i]?.sent.length));
      ports[i]?.onerror?.({} as ErrorEvent);
      await failed;
    }
    buildId = 'f'.repeat(64);
    await client.refreshIdentity(signal);
    expect(client.state.attempts).toBe(0);
    const next = client.search(request, signal);
    await until(() => Boolean(ports[2]?.sent.length));
    ports[2]?.ready();
    await until(() => Boolean(ports[2]?.sent.some((message) => message.type === 'search')));
    ports[2]?.result();
    await next;
    expect(client.state.attempts).toBe(1);
    client.dispose();
  });
  it('terminates hung initialization at 30s and never resumes after dispose', async () => {
    const { client, ports } = await setup();
    vi.useFakeTimers();
    const pending = client.search(request, new AbortController().signal),
      failed = expect(pending).rejects.toMatchObject({ kind: 'lexical-timeout' });
    await until(() => Boolean(ports[0]?.sent.length));
    await vi.advanceTimersByTimeAsync(30000);
    await failed;
    expect(ports[0]?.terminated).toBe(true);
    client.dispose();
    await expect(client.search(request, new AbortController().signal)).rejects.toMatchObject({
      name: 'AbortError',
    });
    expect(ports).toHaveLength(1);
  });
  it('allows only one fresh retry, and a successful retry does not refill its budget', async () => {
    const { client, ports } = await setup(),
      signal = new AbortController().signal;
    const first = client.search(request, signal),
      firstFailure = expect(first).rejects.toMatchObject({ kind: 'lexical-worker-failed' });
    await until(() => Boolean(ports[0]?.sent.length));
    ports[0]?.onerror?.({} as ErrorEvent);
    await firstFailure;
    expect(ports[0]?.terminated).toBe(true);
    const second = client.search(request, signal);
    await until(() => Boolean(ports[1]?.sent.length));
    ports[1]?.ready();
    await until(() => Boolean(ports[1]?.sent.some((message) => message.type === 'search')));
    ports[1]?.result();
    await second;
    ports[1]?.onerror?.({} as ErrorEvent);
    await expect(client.search(request, signal)).rejects.toMatchObject({
      kind: 'lexical-worker-failed',
    });
    await client.refreshIdentity(signal);
    await expect(client.search(request, signal)).rejects.toMatchObject({
      kind: 'lexical-worker-failed',
    });
    expect(ports).toHaveLength(2);
    expect(client.state.attempts).toBe(2);
    client.dispose();
  });
  it('aborts one request, ignores its late reply and keeps another request alive', async () => {
    const { client, ports } = await setup(),
      abort = new AbortController();
    const first = client.search(request, abort.signal),
      failure = expect(first).rejects.toMatchObject({ name: 'AbortError' });
    await until(() => Boolean(ports[0]?.sent.length));
    ports[0]?.ready();
    await until(() => Boolean(ports[0]?.sent.some((message) => message.type === 'search')));
    const old = ports[0]?.sent.find((message) => message.type === 'search');
    abort.abort();
    await failure;
    const second = client.search(request, new AbortController().signal);
    await until(() => ports[0]?.sent.filter((message) => message.type === 'search').length === 2);
    if (old) ports[0]?.reply(old, 'result', { malformed: true });
    ports[0]?.result();
    await second;
    expect(ports[0]?.terminated).toBe(false);
    expect(client.state.attempts).toBe(1);
    client.dispose();
  });
  it('terminates malformed current replies but ignores an ended generation', async () => {
    const { client, ports } = await setup(),
      signal = new AbortController().signal;
    const first = client.search(request, signal),
      failure = expect(first).rejects.toMatchObject({
        kind: 'lexical-worker-failed',
        stage: 'validate',
      });
    await until(() => Boolean(ports[0]?.sent.length));
    const old = ports[0]?.sent[0];
    if (!old) throw new Error('init');
    ports[0]?.reply(old, 'ready', {});
    await failure;
    const second = client.search(request, signal);
    await until(() => Boolean(ports[1]?.sent.length));
    ports[0]?.reply(old, 'ready', {});
    ports[1]?.ready();
    await until(() => Boolean(ports[1]?.sent.some((message) => message.type === 'search')));
    ports[1]?.result();
    await second;
    expect(client.state.ready).toBe(true);
    client.dispose();
  });
  it('terminates an unresponsive ready Worker at the fixed 30s search deadline', async () => {
    const { client, ports } = await setup();
    const first = client.search(request, new AbortController().signal),
      failure = expect(first).rejects.toMatchObject({ kind: 'lexical-timeout' });
    await until(() => Boolean(ports[0]?.sent.length));
    vi.useFakeTimers();
    ports[0]?.ready();
    await vi.advanceTimersByTimeAsync(30000);
    await failure;
    expect(ports[0]?.terminated).toBe(true);
    expect(client.state.pending).toBe(0);
    client.dispose();
  });
});
