import type {
  HydrationCapability,
  HydrationDiagnostics,
  HydrationIssue,
  HydrationTrigger,
} from './types.js';

interface MutableHydrationDiagnostics {
  degraded: boolean;
  plannedCount: number;
  loadedCount: number;
  upgradedCount: number;
  activatedCount: number;
  skippedCount: number;
  failedCount: number;
  issues: HydrationIssue[];
}

const sortIssues = (issues: readonly HydrationIssue[]): HydrationIssue[] =>
  [...issues].sort((left, right) => {
    if (left.code !== right.code) {
      return left.code.localeCompare(right.code);
    }
    if (left.trigger !== right.trigger) {
      return left.trigger.localeCompare(right.trigger);
    }
    return left.capability.localeCompare(right.capability);
  });

export const createHydrationDiagnostics = (): MutableHydrationDiagnostics => ({
  degraded: false,
  plannedCount: 0,
  loadedCount: 0,
  upgradedCount: 0,
  activatedCount: 0,
  skippedCount: 0,
  failedCount: 0,
  issues: [],
});

export const addHydrationIssue = (
  diagnostics: MutableHydrationDiagnostics,
  issue: {
    code: HydrationIssue['code'];
    trigger: HydrationTrigger;
    capability: HydrationCapability;
    count?: number;
  },
): void => {
  const existing = diagnostics.issues.find(
    (candidate) =>
      candidate.code === issue.code &&
      candidate.trigger === issue.trigger &&
      candidate.capability === issue.capability,
  );

  if (existing) {
    existing.count += issue.count ?? 1;
  } else {
    diagnostics.issues.push({
      code: issue.code,
      trigger: issue.trigger,
      capability: issue.capability,
      count: issue.count ?? 1,
    });
  }

  diagnostics.degraded = true;
};

export const finalizeHydrationDiagnostics = (
  diagnostics: MutableHydrationDiagnostics,
): HydrationDiagnostics => ({
  degraded: diagnostics.degraded || diagnostics.failedCount > 0,
  plannedCount: diagnostics.plannedCount,
  loadedCount: diagnostics.loadedCount,
  upgradedCount: diagnostics.upgradedCount,
  activatedCount: diagnostics.activatedCount,
  skippedCount: diagnostics.skippedCount,
  failedCount: diagnostics.failedCount,
  issues: sortIssues(diagnostics.issues),
});

export type { MutableHydrationDiagnostics };
