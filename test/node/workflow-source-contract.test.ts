import { describe, expect, it } from 'vitest';

import { assertWorkflowSourceContract } from '../../scripts/ci/assert-workflow-source-contract.js';

describe('workflow source contract', () => {
  it('pins external actions to reviewed Node 24 commit snapshots', async () => {
    const report = await assertWorkflowSourceContract();

    expect(report.actionEvidence.length).toBeGreaterThan(0);
    expect(report.actionEvidence.every((evidence) => evidence.runsUsing === 'node24')).toBe(true);
  });
});
