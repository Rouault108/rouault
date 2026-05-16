import { resolveDevelopmentSiteUrlContext, resolveProductionSiteUrlContext } from '../../../site/site-url-context.js';
import type { RouteClassificationMode } from '../../../../shared/link/link-annotation.js';
import { resolveNoteLinkClassificationContext } from '../../../content/resolve-note-current-url.js';
import { resolveNoteSourcePathFromVFile } from '../../../content/note-source-vfile.js';
import type { SiteUrlContext } from '../../../../shared/site/site-url-context.js';
import type { VFileLike } from '../types.js';

export interface NoteDirectiveUrlPolicyContext {
  readonly siteUrlContext: SiteUrlContext;
  readonly currentUrl: string;
  readonly routeClassificationMode: RouteClassificationMode;
}

export const createNoteDirectiveUrlPolicyContext = (
  file?: VFileLike,
): NoteDirectiveUrlPolicyContext => {
  const siteUrlContext = process.env['ROUAULT_SITE_ORIGIN']
    ? resolveProductionSiteUrlContext()
    : resolveDevelopmentSiteUrlContext();
  const noteContext = resolveNoteLinkClassificationContext({
    sourceFilePath: resolveNoteSourcePathFromVFile(file),
    siteUrlContext,
  });
  return {
    siteUrlContext,
    currentUrl: noteContext.currentUrl,
    routeClassificationMode: noteContext.routeClassificationMode,
  };
};
