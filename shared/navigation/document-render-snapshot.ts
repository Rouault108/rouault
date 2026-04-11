export type RenderedDocumentKind = 'page' | 'not-found' | 'error';

export interface DocumentRenderSnapshot {
  html: string;
  title: string;
  description: string | null;
  renderedKind: RenderedDocumentKind;
  announcedTitle?: string | null | undefined;
}
