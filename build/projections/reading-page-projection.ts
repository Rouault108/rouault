import type { TocChromeProjection, TocHeading } from '../../shared/toc/toc-chrome-projection.js';
import {
  normalizeTocCapabilities,
  normalizeTocHeadings,
} from '../../shared/toc/toc-normalization.js';
import type { TocPresence } from '../../shared/note/toc-presence.js';
import { normalizeNoteDate } from './normalize-note-date.js';
import { validateNoteContentContracts } from '../content/note-content-contracts.js';
import type { SiteUrlContext } from '../../shared/site/site-url-context.js';
import type { RouteClassificationMode } from '../../shared/link/link-annotation.js';
export interface ReadingPageProjectionInput {
  validateContent?: () => void;
  identityKey: string;
  canonicalPathname: string;
  contentHtml: string;
  title: string;
  date?: string;
  updated?: string;
  license?: string;
  tocHeadings: readonly TocHeading[];
  tocCapabilities: TocChromeProjection['capabilities'];
  tocCapabilitySource?: 'inferred' | 'testing-override';
  siteUrlContext: SiteUrlContext;
  routeClassificationMode: RouteClassificationMode;
}
const toSafeDataId = (slug: string): string => slug.replace(/[^a-zA-Z0-9_-]/gu, '-');
const validateTocProjectionContract = (input: {
  slug: string;
  tocPresence: TocPresence;
  headings: readonly TocHeading[];
  tocCapabilities: TocChromeProjection['capabilities'];
  tocCapabilitySource: 'inferred' | 'testing-override' | undefined;
  shouldHydrateToc: boolean;
  tocRuntimeId: string;
  tocOwnerId: string;
  tocSourceId: string;
  contentRootId: string;
}): void => {
  if (input.tocPresence === 'absent') {
    return;
  }

  if (
    input.tocRuntimeId.trim().length === 0 ||
    input.tocOwnerId.trim().length === 0 ||
    input.tocSourceId.trim().length === 0 ||
    input.contentRootId.trim().length === 0
  ) {
    throw new Error(`[projection] note "${input.slug}" の present TOC identity が不完全です。`);
  }

  if (input.tocCapabilitySource === 'testing-override') {
    if (input.headings.length === 0) {
      throw new Error(
        `[projection] note "${input.slug}" の static TOC fixture に heading がありません。`,
      );
    }

    const hasInvalidHeading = input.headings.some(
      (heading) => heading.level < 2 || heading.level > 6,
    );
    if (hasInvalidHeading) {
      throw new Error(
        `[projection] note "${input.slug}" の static TOC fixture に h2-h6 以外があります。`,
      );
    }

    if (
      input.tocCapabilities.activeTracking !== false ||
      input.tocCapabilities.dynamicScopes !== false ||
      input.tocCapabilities.mobilePanel !== false ||
      input.shouldHydrateToc !== false
    ) {
      throw new Error(`[projection] note "${input.slug}" の static TOC capabilities が不正です。`);
    }
    return;
  }

  if (!input.shouldHydrateToc) {
    throw new Error(
      `[projection] note "${input.slug}" has present TOC without hydration outside testing override.`,
    );
  }
};

export function buildReadingPageProjection(input: ReadingPageProjectionInput) {
  const slug = input.identityKey;
  const dataIdBase = toSafeDataId(slug.length > 0 ? slug : 'note');
  const tocSourceId = `toc-source-${dataIdBase}`;
  const tocRuntimeId = tocSourceId;
  const tocOwnerId = `toc-owner-${dataIdBase}`;
  const tocScopeId = 'note-toc';
  const contentRootId = `note-content-${dataIdBase}`;
  const headings = normalizeTocHeadings(input.tocHeadings);
  const tocPresence: TocPresence = headings.length > 0 ? 'present' : 'absent';
  if (tocPresence === 'present' && tocOwnerId.trim().length === 0) {
    throw new Error(`[projection] note "${slug}" の TOC owner candidate が空です。`);
  }
  const tocCapabilities = normalizeTocCapabilities(input.tocCapabilities);
  const shouldHydrateToc =
    tocCapabilities.activeTracking || tocCapabilities.dynamicScopes || tocCapabilities.mobilePanel;
  validateTocProjectionContract({
    slug,
    tocPresence,
    headings,
    tocCapabilities,
    tocCapabilitySource: input.tocCapabilitySource ?? 'inferred',
    shouldHydrateToc,
    tocRuntimeId,
    tocOwnerId,
    tocSourceId,
    contentRootId,
  });
  if (input.validateContent) input.validateContent();
  else
    validateNoteContentContracts({
      kind: 'reader',
      html: input.contentHtml,
      sourceLabel: input.identityKey,
      siteUrlContext: input.siteUrlContext,
      currentUrl: `${input.siteUrlContext.siteOrigin}${input.siteUrlContext.basePath}${input.canonicalPathname}`,
      routeClassificationMode: input.routeClassificationMode,
    });
  const published = normalizeNoteDate(input.date);
  const updated = normalizeNoteDate(input.updated);
  return {
    contentHtml: input.contentHtml,
    tocPresence,
    toc: {
      sourceId: tocSourceId,
      runtimeId: tocRuntimeId,
      ownerId: tocOwnerId,
      scopeId: tocScopeId,
      headings,
      capabilities: tocCapabilities,
      contentRootId,
      homeHref: `${input.siteUrlContext.basePath}/`,
      shouldHydrate: shouldHydrateToc,
    },
    articleHeader: {
      heading: input.title,
      genres: [] as string[],
      ...(published !== null ? { published } : {}),
      ...(updated !== null ? { updated } : {}),
      ...(input.license ? { license: input.license } : {}),
    },
  };
}
