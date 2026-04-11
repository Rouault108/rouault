import {
  NAVIGATION_ENVELOPE_SCHEMA_VERSION,
  type NavigationEnvelope,
} from '../../shared/navigation/navigation-envelope.js';
import type { DocumentSnapshot } from './router-types.js';

/**
 * legacy の DocumentSnapshot を envelope 契約へ持ち上げる。
 *
 * document route の移行期間中は route handler が旧契約を返しうるため、
 * router core 入口でこの adapter を一度だけ通す。
 */
export const documentSnapshotToEnvelope = (
  snapshot: DocumentSnapshot,
  options: {
    buildId?: string | null | undefined;
    generatedAt?: string | null | undefined;
  } = {},
): NavigationEnvelope => ({
  schemaVersion: NAVIGATION_ENVELOPE_SCHEMA_VERSION,
  buildId: options.buildId,
  generatedAt: options.generatedAt,
  document: {
    html: snapshot.html,
    title: snapshot.title,
    description: snapshot.metaDescription,
    renderedKind: snapshot.kind,
    announcedTitle: snapshot.announcedTitle,
  },
  shellProjection: snapshot.shell ?? null,
  hydrationPlan: null,
});
