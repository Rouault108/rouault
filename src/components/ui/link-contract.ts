import type { LinkKind } from '../../../shared/link/link-kind.js';
import type { LinkSurface } from '../../../shared/link/link-surface.js';

export interface ComponentLinkContract {
  readonly allowedKinds: readonly LinkKind[];
  readonly surface: LinkSurface;
  readonly unsafePolicy: 'contract-error' | 'drop-link' | 'fallback-node';
}

export const componentLinkContracts = {
  footerSiteName: {
    allowedKinds: ['internal-document', 'external-web'],
    surface: 'navigation',
    unsafePolicy: 'contract-error',
  },
  card: {
    allowedKinds: ['internal-document', 'external-web'],
    surface: 'card',
    unsafePolicy: 'fallback-node',
  },
  pagination: {
    allowedKinds: ['internal-document'],
    surface: 'navigation',
    unsafePolicy: 'contract-error',
  },
  tag: { allowedKinds: ['internal-document'], surface: 'control', unsafePolicy: 'fallback-node' },
} as const satisfies Record<string, ComponentLinkContract>;
