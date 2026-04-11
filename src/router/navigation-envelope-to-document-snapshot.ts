import type { NavigationEnvelope } from '../../shared/navigation/navigation-envelope.js';
import type { DocumentSnapshot } from './router-types.js';

export const navigationEnvelopeToDocumentSnapshot = (
  envelope: NavigationEnvelope,
): DocumentSnapshot => {
  const snapshotBase = {
    html: envelope.document.html,
    title: envelope.document.title,
    metaDescription: envelope.document.description,
    shell: envelope.shellProjection ?? null,
    announcedTitle: envelope.document.announcedTitle,
  };

  switch (envelope.document.renderedKind) {
    case 'page':
      return {
        kind: 'page',
        ...snapshotBase,
      };
    case 'not-found':
      return {
        kind: 'not-found',
        ...snapshotBase,
        metaDescription: envelope.document.description ?? '',
      };
    case 'error':
      return {
        kind: 'error',
        reason: 'unexpected',
        ...snapshotBase,
        metaDescription: envelope.document.description ?? '',
      };
  }
};
