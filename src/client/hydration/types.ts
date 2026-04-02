export type HydrationTrigger = 'initial' | 'post-commit' | 'visible' | 'interaction';

export type HydrationCapability = 'static' | 'progressive' | 'interactive' | 'sandboxed';

export type HydrationStage =
  | 'planned'
  | 'loaded'
  | 'upgraded'
  | 'activated'
  | 'skipped'
  | 'failed'
  | 'aborted';

export interface HydrationIssue {
  code: 'module-load-failed' | 'upgrade-failed' | 'activation-failed' | 'missing-directive';
  trigger: HydrationTrigger;
  capability: HydrationCapability;
  count: number;
}

export interface HydrationDiagnostics {
  degraded: boolean;
  plannedCount: number;
  loadedCount: number;
  upgradedCount: number;
  activatedCount: number;
  skippedCount: number;
  failedCount: number;
  issues: HydrationIssue[];
}

export interface HydrationPlanItem {
  readonly tag: string;
  readonly element: HTMLElement;
  readonly scope: string;
  readonly trigger: HydrationTrigger;
  readonly capability: HydrationCapability;
}

export interface HydrationScopePlan {
  readonly scope: string;
  readonly items: readonly HydrationPlanItem[];
}
