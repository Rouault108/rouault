import { describe, expect, it } from 'vitest';
import {
  createSearchDiagnosticSink,
  createSearchEventDiagnosticSink,
} from '../../shared/search/search-diagnostics.js';

describe('search diagnostics', () => {
  it('response-scoped diagnostic は reason だけを保存すること', () => {
    const sink = createSearchDiagnosticSink();
    sink.record({ stage: 'normalize', code: 'invalid-catalog-item' });
    expect(sink.read()).toHaveLength(1);
  });

  it('event diagnostic は response-scoped SearchDiagnostics と分離すること', () => {
    const sink = createSearchEventDiagnosticSink();
    sink.addIssue({ stage: 'event', code: 'search-event-render-href-mismatch' });
    expect(sink.snapshot().issues).toHaveLength(1);
    sink.clear();
    expect(sink.snapshot().issues).toHaveLength(0);
  });
});
