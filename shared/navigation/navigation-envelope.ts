import type { DocumentRenderSnapshot } from './document-render-snapshot.js';
import type { HydrationPlan } from './hydration-plan.js';
import type { NavigationShellSnapshot } from './navigation-shell-snapshot.js';

export const NAVIGATION_ENVELOPE_SCHEMA_VERSION = 2 as const;

export interface NavigationEnvelope {
  schemaVersion: typeof NAVIGATION_ENVELOPE_SCHEMA_VERSION;
  buildId?: string | null | undefined;
  generatedAt?: string | null | undefined;
  document: DocumentRenderSnapshot;
  shell: NavigationShellSnapshot;
  hydrationPlan?: HydrationPlan | null | undefined;
}
