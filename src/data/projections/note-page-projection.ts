import type { TreeNode } from '../../components/ui/file-tree/file-tree.js';
import { injectNoteContentProfiles } from '../../../lib/content/note-content-contracts.js';
import type { NoteNavigationModel } from '../../../lib/content/navigation/index.js';
import type { PagefindDocumentData } from '../../lib/search/build/build-pagefind-document-data.js';
import type { NoteStatus } from '../../types/article-status.js';
import type { NoteContentKind } from '../../types/note-kind.js';
import { resolveNoteSurfacePolicy } from '../../types/note-surface-policy.js';
import type { IntrinsicNote } from '../notes.js';

interface NotePageTocScopeSelection {
  scopeId: string;
  value: string;
}

export interface NotePageTocHeading {
  id: string;
  text: string;
  level: number;
  scopeSelections?: NotePageTocScopeSelection[];
}

export interface NotePageProjectionInput {
  note: IntrinsicNote;
  navigation: NoteNavigationModel;
  pagefindDocument: PagefindDocumentData;
}

export interface NotePageSidebarProjection {
  sourceId: string;
  selectedId: string;
  items: TreeNode[];
  heading: string;
  fixedBreakpoint: string;
}

export interface NotePageTocProjection {
  sourceId: string;
  headings: NotePageTocHeading[];
  capabilities: {
    activeTracking: boolean;
    dynamicScopes: boolean;
    mobileSummary: boolean;
  };
  contentRootId: string;
  homeHref: string;
  shouldHydrate: boolean;
}

export interface NotePageArticleHeaderProjection {
  heading: string;
  published?: string;
  updated?: string;
  status?: NoteStatus;
  source?: string;
  license?: string;
  genres: string[];
  shouldHydrateTags: boolean;
}

export interface NotePagePagefindProjection {
  sortDate: string;
  title: string;
  tokenizedTitle: string;
  description: string;
  tokenizedDescription: string;
  date: string;
  tags: string[];
}

export interface NotePageProjection {
  noteKind: NoteContentKind;
  noteShellSidebarPresence: 'present' | 'absent';
  showSidebar: boolean;
  contentHtml: string;
  sidebar?: NotePageSidebarProjection;
  toc: NotePageTocProjection;
  articleHeader: NotePageArticleHeaderProjection;
  pagefind: NotePagePagefindProjection | null;
}

interface NoteHydrationCounts {
  initial: number;
  postCommit: number;
  visible: number;
  interaction: number;
}

interface NoteHydrationBudget extends NoteHydrationCounts {
  total: number;
}

const NOTE_HYDRATION_BUDGET: NoteHydrationBudget = {
  initial: 6,
  postCommit: 1,
  visible: 2,
  interaction: 1,
  total: 7,
};

function normalizeHeadings(
  value: IntrinsicNote['tocHeadings'],
): NotePageTocHeading[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      const id = typeof item.id === 'string' ? item.id.trim() : '';
      const text = typeof item.text === 'string' ? item.text.trim() : '';
      const level = typeof item.level === 'number' ? Math.trunc(item.level) : Number.NaN;

      if (id.length === 0 || text.length === 0 || !Number.isFinite(level)) {
        return null;
      }

      if (level < 2 || level > 6) {
        return null;
      }

      const scopeSelections = Array.isArray(item.scopeSelections)
        ? item.scopeSelections
            .map((selection) => {
              const scopeId =
                typeof selection.scopeId === 'string' ? selection.scopeId.trim() : '';
              const value = typeof selection.value === 'string' ? selection.value.trim() : '';
              if (scopeId.length === 0 || value.length === 0) {
                return null;
              }
              return { scopeId, value };
            })
            .filter((selection): selection is NotePageTocScopeSelection => selection !== null)
        : [];

      return {
        id,
        text,
        level,
        ...(scopeSelections.length > 0 ? { scopeSelections } : {}),
      };
    })
    .filter((item): item is NotePageTocHeading => item !== null);
}

function normalizeTocCapabilities(value: IntrinsicNote['tocCapabilities']) {
  return {
    activeTracking: value.activeTracking,
    dynamicScopes: value.dynamicScopes,
    mobileSummary: value.mobileSummary,
  };
}

function toSafeDataId(slug: string): string {
  return slug.replace(/[^a-zA-Z0-9_-]/g, '-');
}

function normalizeGenres(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function countHydrationTriggers(value: string): NoteHydrationCounts {
  const counts: NoteHydrationCounts = {
    initial: 0,
    postCommit: 0,
    visible: 0,
    interaction: 0,
  };

  for (const match of value.matchAll(/data-hydration-trigger="([^"]+)"/g)) {
    const trigger = match[1];
    if (trigger === 'initial') {
      counts.initial += 1;
    } else if (trigger === 'post-commit') {
      counts.postCommit += 1;
    } else if (trigger === 'visible') {
      counts.visible += 1;
    } else if (trigger === 'interaction') {
      counts.interaction += 1;
    }
  }

  return counts;
}

function validateNoteHydrationBudget(
  note: IntrinsicNote,
  projection: Pick<NotePageProjection, 'contentHtml' | 'showSidebar' | 'toc' | 'articleHeader'>,
): void {
  const contentCounts = countHydrationTriggers(projection.contentHtml);
  const shellCounts: NoteHydrationCounts = {
    initial: 0,
    postCommit: 0,
    visible: 0,
    interaction: 0,
  };

  if (projection.showSidebar) {
    shellCounts.initial += 1;
  }

  if (projection.toc.shouldHydrate) {
    shellCounts.initial += 1;
  }

  if (projection.articleHeader.shouldHydrateTags) {
    shellCounts.postCommit += 1;
  }

  const counts: NoteHydrationCounts = {
    initial: contentCounts.initial + shellCounts.initial,
    postCommit: contentCounts.postCommit + shellCounts.postCommit,
    visible: contentCounts.visible + shellCounts.visible,
    interaction: contentCounts.interaction + shellCounts.interaction,
  };
  const total = counts.initial + counts.postCommit + counts.visible + counts.interaction;

  if (
    counts.initial <= NOTE_HYDRATION_BUDGET.initial &&
    counts.postCommit <= NOTE_HYDRATION_BUDGET.postCommit &&
    counts.visible <= NOTE_HYDRATION_BUDGET.visible &&
    counts.interaction <= NOTE_HYDRATION_BUDGET.interaction &&
    total <= NOTE_HYDRATION_BUDGET.total
  ) {
    return;
  }

  throw new Error(
    [
      `[markdown] note hydration budget exceeded for "${note.slug}"`,
      `initial=${String(counts.initial)}/${String(NOTE_HYDRATION_BUDGET.initial)}`,
      `post-commit=${String(counts.postCommit)}/${String(NOTE_HYDRATION_BUDGET.postCommit)}`,
      `visible=${String(counts.visible)}/${String(NOTE_HYDRATION_BUDGET.visible)}`,
      `interaction=${String(counts.interaction)}/${String(NOTE_HYDRATION_BUDGET.interaction)}`,
      `total=${String(total)}/${String(NOTE_HYDRATION_BUDGET.total)}`,
    ].join(' '),
  );
}

export function buildNotePageProjection(input: NotePageProjectionInput): NotePageProjection {
  const noteKind = input.note.kind;
  const surfacePolicy = resolveNoteSurfacePolicy(noteKind);
  const showSidebar = surfacePolicy.sidebar;
  const slug = typeof input.note.slug === 'string' ? input.note.slug : '';
  const dataIdBase = toSafeDataId(slug.length > 0 ? slug : 'note');
  const sidebarSourceId = `sidebar-source-${dataIdBase}`;
  const tocSourceId = `toc-source-${dataIdBase}`;
  const contentRootId = `note-content-${dataIdBase}`;
  const headings = normalizeHeadings(input.note.tocHeadings);
  const tocCapabilities = normalizeTocCapabilities(input.note.tocCapabilities);
  const shouldHydrateToc =
    tocCapabilities.activeTracking ||
    tocCapabilities.dynamicScopes ||
    tocCapabilities.mobileSummary;
  const genres = normalizeGenres(input.note.genre);
  const contentHtml = injectNoteContentProfiles(
    typeof input.note.content === 'string' ? input.note.content : '',
    noteKind,
  );
  const projection: NotePageProjection = {
    noteKind,
    noteShellSidebarPresence: showSidebar ? 'present' : 'absent',
    showSidebar,
    contentHtml,
    ...(showSidebar
      ? {
          sidebar: {
            sourceId: sidebarSourceId,
            selectedId: input.navigation.selectedId ?? '',
            items: input.navigation.sidebarTree,
            heading: 'ナビゲーション',
            fixedBreakpoint: '768',
          },
        }
      : {}),
    toc: {
      sourceId: tocSourceId,
      headings,
      capabilities: tocCapabilities,
      contentRootId,
      homeHref: '/',
      shouldHydrate: shouldHydrateToc,
    },
    articleHeader: {
      heading: typeof input.note['title'] === 'string' ? input.note['title'] : '',
      ...(typeof input.note['date'] === 'string' && input.note['date'].length > 0
        ? { published: input.note['date'] }
        : {}),
      ...(typeof input.note['updated'] === 'string' && input.note['updated'].length > 0
        ? { updated: input.note['updated'] }
        : {}),
      ...(typeof input.note.status === 'string' && input.note.status.length > 0
        ? { status: input.note.status }
        : {}),
      ...(typeof input.note['source'] === 'string' && input.note['source'].length > 0
        ? { source: input.note['source'] }
        : {}),
      ...(typeof input.note['license'] === 'string' && input.note['license'].length > 0
        ? { license: input.note['license'] }
        : {}),
      genres,
      shouldHydrateTags: genres.length > 0,
    },
    pagefind: surfacePolicy.pagefind
      ? {
          sortDate: input.pagefindDocument.sortDate,
          title: input.pagefindDocument.title,
          tokenizedTitle: input.pagefindDocument.tokenizedTitle,
          description: input.pagefindDocument.description,
          tokenizedDescription: input.pagefindDocument.tokenizedDescription,
          date: input.pagefindDocument.date,
          tags: input.pagefindDocument.tags,
        }
      : null,
  };

  validateNoteHydrationBudget(input.note, projection);

  return projection;
}
