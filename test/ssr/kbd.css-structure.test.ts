import { describe, it } from 'vitest';
import { Kbd } from '../../src/components/ui/kbd/kbd.js';
import {
  collectCssText,
  expectCssExcludes,
  expectCssIncludes,
} from './css-contract-test-helpers.js';

describe('ui-kbd css structure contract', () => {
  it('single / combo / media / token 契約を保持すること', () => {
    const cssText = collectCssText(Kbd.styles);

    expectCssIncludes(cssText, [
      ':host',
      '.kbd-key',
      '.kbd-combo',
      '.kbd-separator',
      '.sr-only',
      'display: inline',
      'vertical-align: baseline',
      'font-size: max(0.75rem, var(--text-xs, 12px))',
      'min-inline-size: var(--space-3, 12px)',
      'min-block-size: calc(0.75em + var(--space-3, 12px))',
      'white-space: nowrap',
      'background: var(--bg-fill-muted',
      'border: var(--border-width, 1px) solid',
      'border-radius: var(--radius-md, 6px)',
      'padding-inline: var(--space-2, 8px)',
      '@media (forced-colors: active)',
      'forced-color-adjust: auto',
      '@media print',
      'background: transparent !important',
      'box-shadow: none !important',
    ]);

    expectCssExcludes(cssText, ['@media (prefers-color-scheme: dark)', 'prefers-color-scheme']);
  });
});
