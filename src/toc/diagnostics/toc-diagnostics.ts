import type { HydrationDiagnostics } from '../../client/hydration/types.js';
import type { TocControllerSyncDiagnosticPayload } from '../toc-controller-sync-diagnostics.js';
import type { TocHydrationSession } from '../toc-hydration-session.js';

export interface TocTestingDiagnostics {
  readonly ownerId: string;
  readonly hydrationState: TocHydrationSession['state'];
  readonly syncDiagnostics: readonly TocControllerSyncDiagnosticPayload[];
}

export const createTocTestingDiagnostics = (
  session: TocHydrationSession,
  syncDiagnostics: readonly TocControllerSyncDiagnosticPayload[] = [],
): TocTestingDiagnostics => ({
  ownerId: session.ownerId,
  hydrationState: session.state,
  syncDiagnostics,
});

export const hasHydrationFailures = (diagnostics: HydrationDiagnostics): boolean =>
  diagnostics.failedCount > 0 || diagnostics.issues.length > 0;
