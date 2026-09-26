import { describe, expect, it } from 'vitest';
import { LexicalClient } from '../../src/search/lexical/client.js';
import { lexicalResponse } from '../../src/search/lexical/response.js';
import {
  parseMainMessage,
  parseWorkerMessage,
  type LexicalResult,
} from '../../shared/search/lexical-protocol.js';
import golden from '../fixtures/search/adopted-golden.json' with { type: 'json' };

const context = { siteOrigin: location.origin, basePath: '/__search-target/healthy' };
function request(query: unknown) {
  const message = parseMainMessage({
    protocolVersion: 1,
    generation: 1,
    requestId: 1,
    identity: 'a'.repeat(64),
    type: 'search',
    payload: query,
  });
  if (message.type !== 'search') throw new Error('Expected search');
  return message.payload;
}
function baselineResult(value: unknown, id: string): LexicalResult {
  if (!value || typeof value !== 'object' || !('results' in value) || !Array.isArray(value.results))
    throw new Error('Missing Node evidence');
  const item: unknown = value.results.find(
    (entry: unknown) => entry && typeof entry === 'object' && 'id' in entry && entry.id === id,
  );
  if (!item || typeof item !== 'object' || !('result' in item)) throw new Error('Missing query');
  const parsed = parseWorkerMessage({
    protocolVersion: 1,
    generation: 1,
    requestId: 1,
    identity: 'a'.repeat(64),
    type: 'result',
    payload: item.result,
  });
  if (parsed.type !== 'result') throw new Error('Expected result');
  return parsed.payload;
}
describe('Stage 2 actual Worker and Node-generated artifacts', () => {
  it('preserves all 30 queries, native/fusion evidence, two passage IDs and snippets on cold/warm queries', async () => {
    const baseline: unknown = await (
      await fetch('/__search-target/healthy/target-verification.json')
    ).json();
    const client = new LexicalClient(
        context,
        () =>
          new Worker(new URL('./helpers/lexical-target-worker.ts', import.meta.url), {
            type: 'module',
          }),
      ),
      signal = new AbortController().signal;
    const observations: { id: string; coldMs: number; warmMs: number; result: LexicalResult }[] =
      [];
    try {
      for (const query of golden.queries) {
        const input = request(query),
          start = performance.now();
        const result = await client.search(input, signal),
          coldMs = performance.now() - start;
        const expected = baselineResult(baseline, query.id);
        expect(result.candidates, query.id).toEqual(expected.candidates);
        if (result.traceSha256 !== expected.traceSha256) {
          if (
            !baseline ||
            typeof baseline !== 'object' ||
            !('results' in baseline) ||
            !Array.isArray(baseline.results)
          )
            throw new Error('Missing baseline');
          const node: unknown = baseline.results.find(
            (entry: unknown) =>
              entry && typeof entry === 'object' && 'id' in entry && entry.id === query.id,
          );
          if (!node || typeof node !== 'object' || !('traces' in node))
            throw new Error('Missing native traces');
          const strip = (value: unknown): unknown => {
            if (Array.isArray(value)) return value.map(strip);
            if (value && typeof value === 'object')
              return Object.fromEntries(
                Object.entries(value).map(([key, item]) => [
                  key,
                  key === 'nativeScore' && typeof item === 'number'
                    ? Number(item.toPrecision(13))
                    : strip(item),
                ]),
              );
            return value;
          };
          expect(
            strip(result.metrics['nativeTrace']),
            `${query.id} native final-bit comparison`,
          ).toEqual(strip(node.traces));
        }
        expect(result.queryTokens, query.id).toEqual(expected.queryTokens);
        const response = lexicalResponse(input, result, context, () => true);
        for (const expectedRank of query.expectedRanks) {
          const rank = response.items.findIndex(
            (item) => item.canonicalPathname === expectedRank.canonical,
          );
          expect(rank, query.id).toBeGreaterThanOrEqual(0);
          expect(rank + 1, query.id).toBeLessThanOrEqual(expectedRank.maxRank);
        }
        if (query.allowedSet)
          expect(
            response.items
              .slice(0, query.allowedSet.maxRank)
              .filter((item) => query.allowedSet?.canonical.includes(item.canonicalPathname))
              .length,
          ).toBeGreaterThanOrEqual(query.allowedSet.minHits);
        const warmStart = performance.now(),
          warm = await client.search(input, signal);
        expect(warm.candidates, `${query.id} warm`).toEqual(result.candidates);
        expect(warm.traceSha256).toBe(result.traceSha256);
        observations.push({ id: query.id, coldMs, warmMs: performance.now() - warmStart, result });
      }
      const browser = navigator.userAgent.includes('Firefox')
        ? 'firefox'
        : navigator.userAgent.includes('Chrome')
          ? 'chromium'
          : 'webkit';
      expect(
        (
          await fetch(`/__search-target-report/${browser}`, {
            method: 'POST',
            body: JSON.stringify({ identity: client.state.identity, observations }),
          })
        ).ok,
      ).toBe(true);
    } finally {
      client.dispose();
    }
  }, 300_000);
});
