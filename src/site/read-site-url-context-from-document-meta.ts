import {
  createSiteUrlContext,
  type SiteUrlContext,
} from '../../shared/site/site-url-context.js';

const getMetaContent = (document: Document, name: string): string | null =>
  document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)?.content ?? null;

export const readSiteUrlContextFromDocumentMeta = (document: Document): SiteUrlContext | null => {
  const siteOrigin = getMetaContent(document, 'rouault-site-origin');
  const basePath = getMetaContent(document, 'rouault-base-path');
  if (siteOrigin === null || basePath === null) {
    return null;
  }

  try {
    return createSiteUrlContext({ siteOrigin, basePath });
  } catch {
    return null;
  }
};
