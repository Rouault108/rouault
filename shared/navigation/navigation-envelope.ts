import type { DocumentRenderSnapshot } from './document-render-snapshot.js';
import type { HydrationPlan } from './hydration-plan.js';
import type { ShellProjectionSnapshot } from './shell-projection.js';

export const NAVIGATION_ENVELOPE_SCHEMA_VERSION = 1 as const;

export interface NavigationEnvelope {
  schemaVersion: typeof NAVIGATION_ENVELOPE_SCHEMA_VERSION;
  buildId?: string | null | undefined;
  generatedAt?: string | null | undefined;
  document: DocumentRenderSnapshot;
  shellProjection: ShellProjectionSnapshot | null;
  hydrationPlan?: HydrationPlan | null | undefined;
}
