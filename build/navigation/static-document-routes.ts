import { createInternalDocumentRouteSet } from '../../shared/navigation/internal-document-route-set.js';

export const STATIC_DOCUMENT_ROUTES = ['/', '/about/', '/search/', '/corpora/'] as const;

export type StaticDocumentRoute = (typeof STATIC_DOCUMENT_ROUTES)[number];

export const staticDocumentRouteSet = createInternalDocumentRouteSet(STATIC_DOCUMENT_ROUTES);

export const isStaticDocumentRoute = (pathname: string): pathname is StaticDocumentRoute =>
  STATIC_DOCUMENT_ROUTES.includes(pathname as StaticDocumentRoute);
