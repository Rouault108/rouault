import type { NavigationEnvelope } from '../../shared/navigation/navigation-envelope.js';
import type { DocumentRouteContext } from './router-types.js';

export const normalizeDocumentRouteEnvelope = (
  envelope: NavigationEnvelope,
  context: Pick<DocumentRouteContext, 'currentBuildId' | 'currentGeneratedAt'>,
): NavigationEnvelope => {
  const hasBuildId = envelope.buildId !== undefined && envelope.buildId !== null;
  const hasGeneratedAt = envelope.generatedAt !== undefined && envelope.generatedAt !== null;

  if (hasBuildId || hasGeneratedAt) {
    return envelope;
  }

  return {
    ...envelope,
    buildId: context.currentBuildId,
    generatedAt: context.currentGeneratedAt,
  };
};
