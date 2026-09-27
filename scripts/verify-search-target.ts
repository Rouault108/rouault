import { readFile, writeFile } from 'node:fs/promises';
import { resolve, join, sep } from 'node:path';
import { createBuildAnalyzer } from '../build/search/create-build-analyzer.js';
import { LexicalRuntime } from '../src/search/lexical/runtime.js';
import { loadLexicalManifest, type ArtifactFetch } from '../src/search/lexical/artifact-loader.js';
import { parseMainMessage } from '../shared/search/lexical-protocol.js';
import { lexicalResponse } from '../src/search/lexical/response.js';
import golden from '../test/fixtures/search/adopted-golden.json' with { type: 'json' };

const root = resolve(process.argv[2] ?? '.generated/search-foundation');
const context = { siteOrigin: 'http://localhost', basePath: '' };
const fetcher: ArtifactFetch = async (url, init) => {
  init.signal?.throwIfAborted();
  const file = resolve(root, new URL(url).pathname.slice(1));
  if (!file.startsWith(root + sep)) throw new Error('Artifact path escapes root');
  try {
    return new Response(new Uint8Array(await readFile(file)), {
      headers: { 'Content-Type': file.endsWith('.wasm') ? 'application/wasm' : 'application/json' },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
};
const signal = new AbortController().signal;
const verified = await loadLexicalManifest(context, signal, fetcher);
const runtime = new LexicalRuntime(fetcher, async () => createBuildAnalyzer());
const init = await runtime.initialize(context, verified.manifestSha, verified.identity, signal);
const results: {
  id: string;
  critical: boolean;
  pass: boolean;
  checks: { canonical: string; maxRank: number; rank: number; pass: boolean }[];
  allowedPass: boolean;
  response: ReturnType<typeof lexicalResponse>;
  result: Awaited<ReturnType<LexicalRuntime['search']>>;
  traces: NonNullable<LexicalRuntime['lastRanking']>['traces'] | undefined;
}[] = [];
try {
  for (const query of golden.queries) {
    const parsed = parseMainMessage({
      protocolVersion: 1,
      generation: 1,
      requestId: 1,
      identity: verified.identity,
      type: 'search',
      payload: query,
    });
    if (parsed.type !== 'search') throw new Error('Expected search');
    const result = await runtime.search(parsed.payload, signal);
    const response = lexicalResponse(parsed.payload, result, context, () => true);
    const rank = (canonical: string): number => {
      const index = response.items.findIndex((item) => item.canonicalPathname === canonical);
      return index < 0 ? Infinity : index + 1;
    };
    const checks = query.expectedRanks.map((expected) => ({
      ...expected,
      rank: rank(expected.canonical),
      pass: rank(expected.canonical) <= expected.maxRank,
    }));
    const allowed = query.allowedSet;
    const allowedPass =
      !allowed ||
      allowed.canonical.filter((canonical) => rank(canonical) <= allowed.maxRank).length >=
        allowed.minHits;
    results.push({
      id: query.id,
      critical: query.critical,
      pass: checks.every((check) => check.pass) && allowedPass,
      checks,
      allowedPass,
      response,
      result,
      traces: runtime.lastRanking?.traces,
    });
  }
  const labels = golden.labels.map((label) => {
    const query = results.find((result) => result.id === label.queryId),
      candidate = query?.result.candidates.find(
        (candidate) => candidate.canonicalPathname === label.canonicalPathname,
      );
    return { id: label.id, expectation: label.expectation, candidate: candidate ?? null };
  });
  const report = {
    identity: verified.identity,
    init,
    goldenPass: results.filter((result) => result.pass).length,
    goldenCount: results.length,
    criticalPass: results.filter((result) => result.critical && result.pass).length,
    criticalCount: results.filter((result) => result.critical).length,
    results,
    labels,
  };
  await writeFile(
    process.argv[3] ?? join(root, 'target-verification.json'),
    JSON.stringify(report, null, 2) + '\n',
  );
  console.log(
    JSON.stringify(
      {
        golden: `${String(report.goldenPass)}/${String(report.goldenCount)}`,
        critical: `${String(report.criticalPass)}/${String(report.criticalCount)}`,
        failures: results
          .filter((result) => !result.pass)
          .map((result) => ({ id: result.id, checks: result.checks })),
        labels: labels.map((label) => ({
          id: label.id,
          text: label.candidate?.snippet?.text,
          source: label.candidate?.source,
        })),
      },
      null,
      2,
    ),
  );
} finally {
  runtime.dispose();
}
