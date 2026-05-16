import type { InternalDocumentNormalizedUrl } from './internal-document-normalized-url.js';
import type { SiteUrlContext } from '../../shared/site/site-url-context.js';
import { applyBasePathToRenderHref, stripBasePathFromPathname } from '../../shared/url/normalize-rouault-url.js';
import { validateJsonContentType as validateSharedJsonContentType } from '../../shared/http/media-type.js';

export interface FetchNavigationEnvelopeArtifactOptions {
  readonly normalizedUrl: InternalDocumentNormalizedUrl;
  readonly siteUrlContext: SiteUrlContext;
  readonly signal?: AbortSignal;
}

export const resolveNavigationEnvelopeArtifactUrl = (options: { readonly normalizedUrl: InternalDocumentNormalizedUrl; readonly siteUrlContext: SiteUrlContext }): string => {
  const publicUrl = new URL(String(options.normalizedUrl), options.siteUrlContext.siteOrigin);
  const routePathname = stripBasePathFromPathname(publicUrl.pathname, options.siteUrlContext.basePath);
  const artifactPathname = routePathname.endsWith('/') ? `${routePathname}index.router.json` : `${routePathname}/index.router.json`;
  return applyBasePathToRenderHref({ pathname: `/__router${artifactPathname}`, search: publicUrl.search, hash: '', siteUrlContext: options.siteUrlContext });
};

export const validateNavigationEnvelopeJsonContentType = (contentType: string | null): boolean =>
  validateSharedJsonContentType(contentType).ok;

export const fetchNavigationEnvelopeArtifact = async (options: FetchNavigationEnvelopeArtifactOptions): Promise<unknown> => {
  const response = await fetch(resolveNavigationEnvelopeArtifactUrl({ normalizedUrl: options.normalizedUrl, siteUrlContext: options.siteUrlContext }), {
    redirect: 'manual',
    credentials: 'same-origin',
    signal: options.signal,
  });
  if (response.type === 'opaqueredirect' || response.status >= 300 && response.status < 400) {
    throw new Error('navigation-envelope-invalid');
  }
  if (!response.ok) throw new Error('navigation-envelope-unavailable');
  const contentType = response.headers.get('content-type');
  if (!validateNavigationEnvelopeJsonContentType(contentType)) {
    throw new Error('navigation-envelope-invalid');
  }
  return response.json();
};
