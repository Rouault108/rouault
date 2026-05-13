import {
  validateLoadedEnvelope,
  validateNavigationEnvelope,
} from './navigation-envelope-validator.js';
import type {
  DocumentRouteContext,
  StrictLoadedNavigationEnvelope,
} from './router-types.js';

export const normalizeDocumentRouteEnvelope = (
  envelope: unknown,
  context: Pick<DocumentRouteContext, 'currentBuildId' | 'currentGeneratedAt' | 'normalizedUrl'>,
): StrictLoadedNavigationEnvelope => {
  const validated = validateNavigationEnvelope(envelope);
  return validateLoadedEnvelope({
    envelope: {
      ...validated,
      buildId: validated.buildId ?? context.currentBuildId,
      generatedAt: validated.generatedAt ?? context.currentGeneratedAt,
    },
    source: 'document-route',
    currentBuildId: context.currentBuildId,
    currentGeneratedAt: context.currentGeneratedAt,
    normalizedUrl: context.normalizedUrl,
  });
};
