import { injectNoteContentProfiles } from '../../build/content/note-content-contracts.js';
import type {
  BreadcrumbItem,
  NoteNavigationModel,
} from '../../shared/navigation/navigation-types.js';
import type { PagefindDocumentData } from '../../build/search/build-pagefind-document-data.js';
import type { NoteStatus } from '../../src/types/article-status.js';
import type { NoteContentKind } from '../../shared/note/note-kind.js';
import { resolveNoteSurfacePolicy } from '../../shared/note/note-surface-policy.js';
import type { TocPresence } from '../../shared/note/toc-presence.js';
import { NOTE_SIDEBAR_FIXED_BREAKPOINT_ATTRIBUTE } from '../../src/layout/note-sidebar-breakpoint.js';
import { renderNoteSidebarNav } from '../navigation/render-note-sidebar-nav.js';
import {
  resolveNoteHydrationBudgetProfile,
  type NoteHydrationCounts,
} from './note-hydration-profile.js';
import { normalizeNoteDate } from './normalize-note-date.js';
import type { IntrinsicNote } from '../../build/data/notes.js';

interface NotePageTocScopeSelection {
  scopeId: string;
  value: string;
}

interface RawTocScopeSelection {
  scopeId?: unknown;
  value?: unknown;
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
  stateScopeId: string;
  selectedId: string | null;
  initialExpandedIds: readonly string[];
  topologyRevision: string;
  navHtml: string;
  heading: string | null;
  fixedBreakpoint: string;
}

export interface NotePageTocProjection {
  sourceId: string;
  headings: NotePageTocHeading[];
  capabilities: {
    activeTracking: boolean;
    dynamicScopes: boolean;
    mobilePanel: boolean;
  };
  contentRootId: string;
  homeHref: string;
  shouldHydrate: boolean;
}

export interface NotePageArticleHeaderProjection {
  heading: string;
  breadcrumbs?: BreadcrumbItem[];
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
  tocPresence: TocPresence;
  showSidebar: boolean;
  contentHtml: string;
  sidebar?: NotePageSidebarProjection | null;
  toc: NotePageTocProjection;
  articleHeader: NotePageArticleHeaderProjection;
  pagefind: NotePagePagefindProjection | null;
}

function normalizeHeadings(value: IntrinsicNote['tocHeadings']): NotePageTocHeading[] {
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
            .map((selection: RawTocScopeSelection) => {
              const scopeId = typeof selection.scopeId === 'string' ? selection.scopeId.trim() : '';
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
    mobilePanel: value.mobilePanel,
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
  projection: Pick<
    NotePageProjection,
    'contentHtml' | 'showSidebar' | 'toc' | 'tocPresence' | 'articleHeader'
  >,
): void {
  const profile = resolveNoteHydrationBudgetProfile(note);

  if (profile === null) {
    return;
  }

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

  if (projection.tocPresence === 'present' && projection.toc.shouldHydrate) {
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
  const { budget } = profile;

  if (
    counts.initial <= budget.initial &&
    counts.postCommit <= budget.postCommit &&
    counts.visible <= budget.visible &&
    counts.interaction <= budget.interaction &&
    total <= budget.total
  ) {
    return;
  }

  throw new Error(
    [
      `[markdown] note hydration budget exceeded for "${note.slug}"`,
      `profile="${profile.name}"`,
      `initial=${String(counts.initial)}/${String(budget.initial)}`,
      `post-commit=${String(counts.postCommit)}/${String(budget.postCommit)}`,
      `visible=${String(counts.visible)}/${String(budget.visible)}`,
      `interaction=${String(counts.interaction)}/${String(budget.interaction)}`,
      `total=${String(total)}/${String(budget.total)}`,
    ].join(' '),
  );
}

export function buildNotePageProjection(input: NotePageProjectionInput): NotePageProjection {
  const noteKind = input.note.kind;
  const surfacePolicy = resolveNoteSurfacePolicy(noteKind);
  const showSidebar = surfacePolicy.sidebar;
  const slug = typeof input.note.slug === 'string' ? input.note.slug : '';
  const dataIdBase = toSafeDataId(slug.length > 0 ? slug : 'note');
  const tocSourceId = `toc-source-${dataIdBase}`;
  const contentRootId = `note-content-${dataIdBase}`;
  const headings = normalizeHeadings(input.note.tocHeadings);
  const tocPresence: TocPresence = headings.length > 0 ? 'present' : 'absent';
  const tocCapabilities = normalizeTocCapabilities(input.note.tocCapabilities);
  const shouldHydrateToc =
    tocCapabilities.activeTracking ||
    tocCapabilities.dynamicScopes ||
    tocCapabilities.mobilePanel;
  const genres = normalizeGenres(input.note.genre);
  const contentHtml = injectNoteContentProfiles(
    typeof input.note.content === 'string' ? input.note.content : '',
    noteKind,
  );
  const normalizedPublished = normalizeNoteDate(input.note.date);
  const normalizedUpdated = normalizeNoteDate(input.note.updated);

  const projection: NotePageProjection = {
    noteKind,
    noteShellSidebarPresence: showSidebar ? 'present' : 'absent',
    tocPresence,
    showSidebar,
    contentHtml,
    ...(showSidebar
      ? {
          sidebar: {
            stateScopeId: 'note-navigation',
            selectedId: input.navigation.selectedId,
            initialExpandedIds: input.navigation.initialExpandedIds,
            topologyRevision: input.navigation.topologyRevision,
            navHtml: renderNoteSidebarNav(input.navigation.sidebarRows, {
              ariaLabel: 'ノートナビゲーション',
              topologyRevision: input.navigation.topologyRevision,
            }),
            heading: null,
            fixedBreakpoint: NOTE_SIDEBAR_FIXED_BREAKPOINT_ATTRIBUTE,
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
      heading: typeof input.note.title === 'string' ? input.note.title : '',
      ...(input.navigation.breadcrumbs.length > 0
        ? { breadcrumbs: input.navigation.breadcrumbs }
        : {}),
      ...(normalizedPublished !== null ? { published: normalizedPublished } : {}),
      ...(normalizedUpdated !== null ? { updated: normalizedUpdated } : {}),
      ...(typeof input.note.status === 'string' && input.note.status.length > 0
        ? { status: input.note.status }
        : {}),
      ...(typeof input.note.source === 'string' && input.note.source.length > 0
        ? { source: input.note.source }
        : {}),
      ...(typeof input.note.license === 'string' && input.note.license.length > 0
        ? { license: input.note.license }
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