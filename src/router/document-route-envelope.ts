import type { NavigationEnvelope } from '../../shared/navigation/navigation-envelope.js';
import type { DocumentRouteContext } from './router-types.js';

export const normalizeDocumentRouteEnvelope = (
  envelope: NavigationEnvelope,
  context: Pick<DocumentRouteContext, 'currentBuildId' | 'currentGeneratedAt'>,
): NavigationEnvelope => ({
  ...envelope,
  buildId: envelope.buildId ?? context.currentBuildId,
  generatedAt: envelope.generatedAt ?? context.currentGeneratedAt,
});
