import { describe, it } from 'vitest';
import { DIVIDER_SCOPE_SELECTOR, DOCUMENT_CSS } from '../../src/components/ui/divider/divider.js';
import { expectCssExcludes, expectCssIncludes } from './css-contract-test-helpers.js';

describe('divider CSS structure contracts', () => {
  it('selector / forced-colors / print / token / low-specificity 契約を保持すること', () => {
    const cssText = DOCUMENT_CSS;

    expectCssIncludes(cssText, [
      DIVIDER_SCOPE_SELECTOR,
      ':where(.prose hr, ui-divider > hr, hr[data-divider-variant="layout"])',
      '--border-style-subtle',
      '--border-default',
      '--border-ghost',
      '--space-12',
      '@media (forced-colors: active)',
      'forced-color-adjust: auto',
      '@media print',
      'break-inside: avoid',
      'page-break-inside: avoid',
    ]);

    expectCssExcludes(cssText, ['prefers-color-scheme']);
  });
});
