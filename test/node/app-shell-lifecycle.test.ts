import { afterEach, describe, expect, it } from 'vitest';
import {
  commitShellGeneration,
  readCurrentShellCommitId,
  reserveShellCommitId,
  resetShellLifecycleForTest,
  restoreShellGeneration,
} from '../../src/components/app/shell/app-shell-lifecycle.js';

describe('app shell lifecycle', () => {
  afterEach(() => {
    resetShellLifecycleForTest();
  });

  it('SSR shell を 0 とし、予約 ID を単調増加させ rollback で現行世代だけを戻すこと', () => {
    expect(readCurrentShellCommitId()).toBe(0);
    const first = reserveShellCommitId();
    const second = reserveShellCommitId();
    expect([first, second]).toEqual([1, 2]);
    commitShellGeneration(second);
    expect(readCurrentShellCommitId()).toBe(2);
    restoreShellGeneration(0);
    expect(readCurrentShellCommitId()).toBe(0);
    expect(reserveShellCommitId()).toBe(3);
  });
});
