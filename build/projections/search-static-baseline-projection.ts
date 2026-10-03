import type { TagPageEntry } from './tag-page-projection.js';
import { buildTagPageUrl } from '../../shared/search/search-url.js';
import type { SiteUrlContext } from '../../shared/site/site-url-context.js';
import { applyBasePathToRenderHref } from '../../shared/url/normalize-rouault-url.js';

export interface SearchStaticBaselineProjection {
  readonly tags: readonly {
    readonly label: string;
    readonly href: string;
    readonly noteCount: number;
  }[];
  readonly corporaHref: string;
}

export const buildSearchStaticBaselineProjection = (
  tagPages: readonly TagPageEntry[],
  siteUrlContext: SiteUrlContext,
): SearchStaticBaselineProjection => ({
  tags: tagPages.map(({ tag, noteCount }) => ({
    label: tag,
    href: applyBasePathToRenderHref({ pathname: buildTagPageUrl(tag), siteUrlContext }),
    noteCount,
  })),
  corporaHref: applyBasePathToRenderHref({ pathname: '/corpora/', siteUrlContext }),
});
