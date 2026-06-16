import type { SiteUrlContext } from '../site/site-url-context.js';
import { isPathnameInsideBasePath } from '../site/site-url-context.js';
import {
  applyBasePathToRenderHref,
  stripBasePathFromPathname,
} from '../url/normalize-rouault-url.js';

export interface ValidateCorpusHrefForRenderOptions {
  readonly href: string;
  readonly siteUrlContext: SiteUrlContext;
  readonly inputKind?: 'corpus-route-root' | 'active-render';
}

export const validateCorpusRouteRootHrefForRender = (
  options: Omit<ValidateCorpusHrefForRenderOptions, 'inputKind'>,
): string | null => validateCorpusHrefForRender({ ...options, inputKind: 'corpus-route-root' });

export const validateCorpusHrefForRender = (
  options: ValidateCorpusHrefForRenderOptions,
): string | null => {
  const normalized = options.href.trim();
  if (normalized.length === 0 || normalized.startsWith('//')) {
    return null;
  }

  let parsed: URL;
  try {
    parsed = new URL(
      normalized,
      `${options.siteUrlContext.siteOrigin}${options.siteUrlContext.basePath || '/'}`,
    );
  } catch {
    return null;
  }

  if (
    (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') ||
    parsed.username.length > 0 ||
    parsed.password.length > 0 ||
    parsed.origin !== options.siteUrlContext.siteOrigin
  ) {
    return null;
  }

  if (
    options.inputKind === 'active-render' &&
    !isPathnameInsideBasePath(parsed.pathname, options.siteUrlContext.basePath)
  ) {
    return null;
  }

  const pathname =
    options.inputKind === 'active-render'
      ? stripBasePathFromPathname(parsed.pathname, options.siteUrlContext.basePath)
      : parsed.pathname;

  if (!pathname.startsWith('/corpora/')) {
    return null;
  }

  return applyBasePathToRenderHref({
    pathname,
    search: parsed.search,
    hash: parsed.hash,
    siteUrlContext: options.siteUrlContext,
  });
};
