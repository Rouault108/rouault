export type LinkKind =
  | 'internal-document'
  | 'internal-fragment'
  | 'internal-resource'
  | 'external-web'
  | 'external-action'
  | 'unsafe';

export type SafeLinkKind = Exclude<LinkKind, 'unsafe'>;

export const isExternalWebLinkKind = (kind: LinkKind): boolean => kind === 'external-web';
export const usesExternalWebIndicator = (kind: LinkKind): boolean => kind === 'external-web';
export const isRouterRoutableLinkKind = (kind: LinkKind): boolean => kind === 'internal-document';
