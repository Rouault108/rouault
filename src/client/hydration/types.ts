import type { HydrationMarker } from '../../../shared/hydration/hydration-markers.js';
import type {
  HydrationCapability,
  HydrationTrigger,
} from '../../../shared/hydration/hydration-directives.js';

export type {
  HydrationActivationCleanupRegistration,
  HydrationActivationResult,
  HydrationCleanup,
  HydrationSkippedReason,
} from '../../../shared/hydration/hydration-activation.js';
export type {
  HydrationCapability,
  HydrationTrigger,
} from '../../../shared/hydration/hydration-directives.js';

export type HydrationSessionKind = 'shell' | 'content';

export interface HydrationActivationContext {
  readonly element: HTMLElement;
  readonly root: ParentNode;
  readonly signal: AbortSignal;
  readonly sessionId?: string | undefined;
}

export interface HydrationPreloadPolicy {
  readonly when: 'planned';
  readonly scopes?: readonly HydrationSessionKind[];
}

export interface HydrationBootMarkerPolicy {
  readonly attribute: string;
  readonly value?: string;
  readonly remove: 'after-defined' | 'after-upgrade' | 'after-activation';
}

export interface HydrationRegistryEntry {
  readonly tag: string;
  readonly kind?: 'custom-element' | 'enhancer';
  readonly loader: () => Promise<unknown>;
  readonly activate?: (context: HydrationActivationContext) => unknown;
  readonly preload?: HydrationPreloadPolicy;
  readonly bootMarker?: HydrationBootMarkerPolicy;
}

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
  readonly marker?: HydrationMarker;
}

export interface HydrationScopePlan {
  readonly scope: string;
  readonly items: readonly HydrationPlanItem[];
}
