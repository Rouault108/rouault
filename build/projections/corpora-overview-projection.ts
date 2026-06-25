import type { IntrinsicNote, IntrinsicNotesCollection } from '../../build/data/notes.js';
import {
  resolveDevelopmentSiteUrlContext,
  resolveProductionSiteUrlContext,
} from '../site/site-url-context.js';
import { applyBasePathToRenderHref } from '../../shared/url/normalize-rouault-url.js';
import { buildCorpusPageProjection, type CorpusPageEntry } from './corpus-page-projection.js';

export type CorporaOverviewSourceNote = IntrinsicNote;

export interface CorporaOverviewCorpusItem {
  key: string;
  label: string;
  href: string;
  renderHref: string;
  noteCount: number;
  latestUpdatedDate: string | null;
}

export interface CorporaOverviewData {
  corpusCount: number;
  noteCount: number;
  latestUpdatedDate: string | null;
  corpora: CorporaOverviewCorpusItem[];
}

const resolveBuildRenderHref = (pathname: string): string => {
  const siteUrlContext = process.env['ROUAULT_SITE_ORIGIN']
    ? resolveProductionSiteUrlContext()
    : resolveDevelopmentSiteUrlContext();
  return applyBasePathToRenderHref({ pathname, search: '', hash: '', siteUrlContext });
};

const toCorporaOverviewCorpusItem = (entry: CorpusPageEntry): CorporaOverviewCorpusItem => ({
  key: entry.key,
  label: entry.label,
  href: entry.href,
  renderHref: resolveBuildRenderHref(entry.href),
  noteCount: entry.noteCount,
  latestUpdatedDate: entry.latestUpdatedDate,
});

export function buildCorporaOverviewProjection(
  notes: IntrinsicNotesCollection | readonly CorporaOverviewSourceNote[],
): CorporaOverviewData {
  const corpusPages = buildCorpusPageProjection(notes);
  const latestUpdatedDate =
    corpusPages
      .map((entry) => entry.latestUpdatedDate)
      .filter((value): value is string => typeof value === 'string' && value.length > 0)
      .sort((left, right) => right.localeCompare(left))[0] ?? null;

  return {
    corpusCount: corpusPages.length,
    noteCount: corpusPages.reduce((sum, entry) => sum + entry.noteCount, 0),
    latestUpdatedDate,
    corpora: corpusPages.map(toCorporaOverviewCorpusItem),
  };
}
