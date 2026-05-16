import { describe, expect, it } from 'vitest';
import { validateGeneratedPageHtmlLinkContracts } from '../../build/content/page-html-link-contracts.js';

describe('page HTML link contracts', () => {
  it('unsafe href を拒否すること', () => {
    expect(() => validateGeneratedPageHtmlLinkContracts({ html: '<a href="javascript:alert(1)" data-link-kind="unsafe" data-link-surface="prose">x</a>', sourceLabel: 'test' })).toThrow();
  });
});
