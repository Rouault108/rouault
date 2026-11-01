import { describe, expect, it } from 'vitest';
import { safeCspRunnerLine } from '../../scripts/testing/run-csp-tests.js';

describe('CSP runner output boundary', () => {
  it('only forwards bounded status codes and fixed case IDs', () => {
    expect(safeCspRunnerLine('[csp-tests] passed: 14 passed, 0 not passed')).not.toBeNull();
    expect(safeCspRunnerLine('[csp-tests] webkit-csp observer-faults: failed')).not.toBeNull();
    for (const line of [
      'Error: http://127.0.0.1/?q=private',
      '[csp-tests] passed: private',
      '[csp-tests] webkit-csp private: failed',
      '[csp-tests] passed: 14 passed, 0 not passed extra',
      '[csp-tests] webkit-csp observer-faults: failed\nprivate',
    ])
      expect(safeCspRunnerLine(line)).toBeNull();
  });
});
