import { describe, expect, it } from 'vitest';

import { findSearchImportBoundaryViolations } from '../../scripts/assert-search-import-boundary.js';

describe('search import boundary', () => {
  it('search dialog and search adapter keep router imports behind the event boundary', async () => {
    await expect(findSearchImportBoundaryViolations()).resolves.to.deep.equal([]);
  });
});
