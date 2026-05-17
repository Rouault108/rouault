import type { IntrinsicNote, IntrinsicNotesCollection } from '../../build/data/notes.js';
import { resolveDevelopmentSiteUrlContext, resolveProductionSiteUrlContext } from '../site/site-url-context.js';
import { applyBasePathToRenderHref } from '../../shared/url/normalize-rouault-url.js';
import { buildCorpusPageProjection, type CorpusPageEntry } from './corpus-page-projection.js';
import { buildHomePageProjection, type HomeNoteItem } from './home-page-projection.js';

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
  recentNotes: HomeNoteItem[];
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
  const home = buildHomePageProjection(notes);

  return {
    corpusCount: corpusPages.length,
    noteCount: home.publicNoteCount,
    latestUpdatedDate: home.latestUpdatedDate,
    corpora: corpusPages.map(toCorporaOverviewCorpusItem),
    recentNotes: home.notes,
  };
}
