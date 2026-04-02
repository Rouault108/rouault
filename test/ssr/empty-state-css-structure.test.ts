import { describe, it } from 'vitest';
import { EmptyState } from '../../src/components/ui/empty-state/empty-state.js';
import { collectCssText, expectCssIncludes } from './css-contract-test-helpers.js';

describe('empty-state CSS structure contracts', () => {
  it('print / reduced-motion / forced-colors / token 契約を保持すること', () => {
    const cssText = collectCssText(EmptyState.styles);

    expectCssIncludes(cssText, [
      '.container',
      '.message',
      '.icon',
      '.illustration',
      '.heading',
      '.description',
      '.actions',
      '--fg-default',
      '--fg-muted',
      '--fg-danger',
      '@keyframes empty-state-enter',
      'translateY(var(--space-2, 8px))',
      '@media (prefers-reduced-motion: reduce)',
      'animation-duration: 0.01ms',
      'animation-iteration-count: 1',
      '@media (forced-colors: active)',
      'GrayText',
      'CanvasText',
      '@media print',
      'display: none !important',
      "::slotted(button)",
      "::slotted([role='button'])",
      "::slotted(ui-button)",
    ]);
  });
});