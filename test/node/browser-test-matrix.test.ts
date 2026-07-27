import { describe, expect, it } from 'vitest';
import { resolveBrowserTestBrowsers } from '../../scripts/testing/browser-test-matrix.js';

describe('browser test matrix', () => {
  it('uses Chromium and Firefox locally by default', () => {
    expect(resolveBrowserTestBrowsers(undefined, false)).toEqual(['chromium', 'firefox']);
  });

  it('adds WebKit to the default CI matrix', () => {
    expect(resolveBrowserTestBrowsers(undefined, true)).toEqual([
      'chromium',
      'firefox',
      'webkit',
    ]);
  });

  it('uses an explicit local selection', () => {
    expect(resolveBrowserTestBrowsers('webkit', false)).toEqual(['webkit']);
  });

  it('normalizes selection order, trims tokens, ignores empty segments, and removes duplicates', () => {
    expect(resolveBrowserTestBrowsers(' firefox,chromium,, firefox ', false)).toEqual([
      'chromium',
      'firefox',
    ]);
  });

  it('adds WebKit to an explicit CI selection', () => {
    expect(resolveBrowserTestBrowsers('firefox', true)).toEqual(['firefox', 'webkit']);
  });

  it.each(['', ',', ' , ', 'Chrome', 'chromium,unknown'])(
    'rejects invalid selection %s',
    (value) => {
      expect(() => resolveBrowserTestBrowsers(value, false)).toThrow(TypeError);
    },
  );
});
