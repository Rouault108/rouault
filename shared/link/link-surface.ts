export const LINK_SURFACES = [
  'prose',
  'metadata',
  'navigation',
  'card',
  'structural',
  'control',
] as const;

export type LinkSurface = (typeof LINK_SURFACES)[number];

export const isLinkSurface = (value: string): value is LinkSurface =>
  LINK_SURFACES.includes(value as LinkSurface);
