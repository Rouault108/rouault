import { describe, expect, it } from 'vitest';
import { findProductionImportBoundaryViolations } from '../../scripts/import-boundary-graph.js';

describe('production import boundary', () => {
  it('production source does not import test modules', async () => {
    await expect(findProductionImportBoundaryViolations()).resolves.to.deep.equal([]);
  });
});
