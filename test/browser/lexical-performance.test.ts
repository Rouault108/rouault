import { expect, it } from 'vitest';
import { LexicalClient } from '../../src/search/lexical/client.js';
import { parseMainMessage, type LexicalResult } from '../../shared/search/lexical-protocol.js';
import golden from '../fixtures/search/adopted-golden.json' with { type: 'json' };

it('profiles fixed Q-030/Q-026/Q-018 and verifies instrumentation against the plain Worker', async () => {
  const baseline: unknown = await (
    await fetch('/__search-target/healthy/target-verification.json')
  ).json();
  if (
    !baseline ||
    typeof baseline !== 'object' ||
    !('results' in baseline) ||
    !Array.isArray(baseline.results)
  )
    throw new Error('Node baseline');
  const runs: {
    kind: string;
    id: string;
    repeat: number;
    wallMs: number;
    result: LexicalResult;
  }[] = [];
  const browser = navigator.userAgent.includes('Firefox')
    ? 'firefox'
    : navigator.userAgent.includes('Chrome')
      ? 'chromium'
      : 'webkit';
  try {
    for (const kind of ['diagnostic', 'plain']) {
      const context = { siteOrigin: location.origin, basePath: '/__search-target/healthy' };
      const client =
        kind === 'diagnostic'
          ? new LexicalClient(
              context,
              () =>
                new Worker(new URL('./helpers/lexical-performance-worker.ts', import.meta.url), {
                  type: 'module',
                }),
            )
          : new LexicalClient(context);
      try {
        for (const id of ['Q-030', 'Q-026', 'Q-018']) {
          const query = golden.queries.find((query) => query.id === id);
          const parsed = parseMainMessage({
            protocolVersion: 1,
            generation: 1,
            requestId: 1,
            identity: 'a'.repeat(64),
            type: 'search',
            payload: query,
          });
          if (parsed.type !== 'search') throw new Error('Query');
          const expected: unknown = baseline.results.find(
            (entry: unknown) =>
              entry && typeof entry === 'object' && 'id' in entry && entry.id === id,
          );
          if (
            !expected ||
            typeof expected !== 'object' ||
            !('result' in expected) ||
            !expected.result ||
            typeof expected.result !== 'object' ||
            !('candidates' in expected.result) ||
            !('traceSha256' in expected.result)
          )
            throw new Error('Expected result');
          for (let repeat = 0; repeat < 2; repeat++) {
            const start = performance.now(),
              result = await client.search(parsed.payload, new AbortController().signal);
            runs.push({ kind, id, repeat, wallMs: performance.now() - start, result });
            expect(result.candidates, `${kind} ${id}`).toEqual(expected.result.candidates);
            if (browser !== 'webkit') expect(result.traceSha256).toBe(expected.result.traceSha256);
          }
        }
      } finally {
        client.dispose();
      }
    }
  } finally {
    expect(
      (
        await fetch(`/__search-target-report/performance-${browser}`, {
          method: 'POST',
          body: JSON.stringify({ browser, runs }),
        })
      ).ok,
    ).toBe(true);
  }
}, 400000);
