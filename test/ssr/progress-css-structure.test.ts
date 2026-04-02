import { describe, it } from 'vitest';
import { UiProgress } from '../../src/components/ui/progress/progress.js';
import {
  collectCssText,
  expectCssExcludes,
  expectCssIncludes,
} from './css-contract-test-helpers.js';

describe('progress CSS structure contracts', () => {
  it('public token / reduced-motion / forced-colors / print 契約を保持すること', () => {
    const cssText = collectCssText(UiProgress.styles);

    expectCssIncludes(cssText, [
      '.track',
      '.fill',
      '.print-value',
      '--ui-progress-track-size',
      '--ui-progress-fill-color',
      '--ui-progress-track-color',
      '--ui-progress-radius',
      '--ui-progress-duration',
      '--ui-progress-easing',
      '@media (prefers-reduced-motion: reduce)',
      'transition: none',
      '@media (forced-colors: active)',
      'CanvasText',
      'Highlight',
      '@media print',
      'display: none',
      'font-variant-numeric: tabular-nums',
    ]);

    expectCssExcludes(cssText, [
      '--ui-progress-track-height',
      '--ui-progress-bar-background',
      'attr(aria-valuetext)',
    ]);
  });
});
