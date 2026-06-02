import { describe, expect, it } from 'vitest';
import { validateStaticHeaderHtmlFragment } from '../../build/navigation/static-header-parse5-validator.js';
import {
  STATIC_HEADER_CONTRACT_ACCEPTED_HTML,
  STATIC_HEADER_CONTRACT_REJECTED_CASES,
} from '../fixtures/static-header-contract-cases.js';

describe('static header parse5 validator', () => {
  it('runtime DOM validator と共有する accepted fixture を受け付けること', () => {
    expect(() => validateStaticHeaderHtmlFragment(STATIC_HEADER_CONTRACT_ACCEPTED_HTML)).not.toThrow();
  });

  it.each(STATIC_HEADER_CONTRACT_REJECTED_CASES)(
    'runtime DOM validator と共有する rejected fixture を拒否すること: $label',
    ({ html }) => {
      expect(() => validateStaticHeaderHtmlFragment(html)).toThrow();
    },
  );
});
