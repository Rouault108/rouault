import { classifyLinkHref, type ClassifyLinkOptions } from '../../shared/link/link-annotation.js';
import type { LinkSurface } from '../../shared/link/link-surface.js';
import type { SafeLinkKind } from '../../shared/link/link-kind.js';
import { hasForbiddenRelToken, parseRelTokens, serializeRelTokens } from '../../shared/link/rel-tokens.js';

export type LitLinkAttributes =
  | {
      readonly isUnsafe: false;
      readonly href: string;
      readonly dataLinkKind: SafeLinkKind;
      readonly dataLinkSurface: LinkSurface;
      readonly dataExternal?: 'true';
      readonly rel?: string;
      readonly target?: '_blank' | '_self';
      readonly download?: true | string;
      readonly dataNoRouter?: true;
    }
  | { readonly isUnsafe: true; readonly kind: 'unsafe' };

export interface BuildLitLinkAttributesOptions extends Omit<ClassifyLinkOptions, 'surface'> {
  readonly href: string;
  readonly surface: LinkSurface;
  readonly target?: '_blank' | '_self';
  readonly rel?: string;
  readonly noRouter?: boolean;
  readonly download?: boolean | string;
}

const validateDownload = (value: boolean | string | undefined): boolean | string | undefined => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (
    trimmed.length === 0 ||
    trimmed === '.' ||
    trimmed === '..' ||
    /[\u0000-\u001f\u007f/\\]/u.test(trimmed) ||
    [...trimmed].length > 255
  ) {
    throw new Error('invalid-download');
  }
  return trimmed;
};

export const buildLitLinkAttributes = (options: BuildLitLinkAttributesOptions): LitLinkAttributes => {
  const annotation = classifyLinkHref({ ...options, surface: options.surface });
  if (annotation.isUnsafe) return { isUnsafe: true, kind: 'unsafe' };
  const relTokens = parseRelTokens(options.rel);
  if (hasForbiddenRelToken(relTokens)) throw new Error('forbidden-rel-token');
  const rel = options.target === '_blank' ? serializeRelTokens([...relTokens, 'noopener']) : serializeRelTokens(relTokens);
  const download = validateDownload(options.download);
  return {
    isUnsafe: false,
    href: annotation.renderHref,
    dataLinkKind: annotation.kind,
    dataLinkSurface: annotation.surface,
    ...(annotation.isExternalWeb ? { dataExternal: 'true' as const } : {}),
    ...(options.target ? { target: options.target } : {}),
    ...(rel.length > 0 ? { rel } : {}),
    ...(options.noRouter ? { dataNoRouter: true as const } : {}),
    ...(download === true ? { download: true as const } : typeof download === 'string' ? { download } : {}),
  };
};
