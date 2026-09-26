import { LexicalRuntime } from '../../../src/search/lexical/runtime.js';
import { observeLexicalPerformance } from '../../../shared/search/lexical-performance.js';
import '../../../src/search/lexical/worker.js';

const search = LexicalRuntime.prototype.search;
LexicalRuntime.prototype.search = async function (...args) {
  const phases: Record<
    string,
    { milliseconds: number; calls: number; counters: Record<string, number> }
  > = {};
  observeLexicalPerformance((event) => {
    const bucket = (phases[event.phase] ??= { milliseconds: 0, calls: 0, counters: {} });
    bucket.milliseconds += event.milliseconds;
    bucket.calls++;
    for (const [key, value] of Object.entries(event.counters ?? {}))
      bucket.counters[key] = (bucket.counters[key] ?? 0) + value;
  });
  try {
    const result = await search.apply(this, args);
    result.metrics['performancePhases'] = phases;
    return result;
  } finally {
    observeLexicalPerformance(undefined);
  }
};
