import { expect } from '@open-wc/testing';

import { ErrorEnvelopeFactory } from '../../src/router/error-envelope-factory.js';
import {
  CurrentBuildMetadataInvalidError,
  NavigationEnvelopeContractError,
  NavigationEnvelopeMetadataMismatchError,
} from '../../src/router/navigation-envelope-errors.js';

describe('router error fallback source contract', () => {
  it('metadata mismatch / current metadata invalid / contract error を error-fallback source に統一すること', () => {
    const factory = new ErrorEnvelopeFactory();
    const errors = [
      new NavigationEnvelopeMetadataMismatchError({
        kind: 'buildId',
        currentValue: 'current',
        envelopeValue: 'stale',
        normalizedUrl: '/notes/a',
      }),
      new CurrentBuildMetadataInvalidError({ field: 'generatedAt', reason: 'missing' }),
      new NavigationEnvelopeContractError('invalid envelope'),
    ];

    for (const error of errors) {
      const result = factory.createExceptionResult(error);
      expect(result.source).to.equal('error-fallback');
      expect(result.envelope.document.renderedKind).to.equal('error');
      expect(result.error).to.equal(error);
    }
  });
});
