import { createSiteUrlContext, type SiteUrlContext } from '../../shared/site/site-url-context.js';

export type SiteUrlContextData = SiteUrlContext;

export interface LoadSiteUrlContextDataInput {
  readonly siteOrigin: unknown;
  readonly basePath: unknown;
  readonly sourceLabel: string;
}

export const loadSiteUrlContextData = (input: LoadSiteUrlContextDataInput): SiteUrlContextData => {
  try {
    return createSiteUrlContext({
      siteOrigin: input.siteOrigin,
      basePath: input.basePath,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`[siteUrlContext:${input.sourceLabel}] ${message}`);
  }
};
