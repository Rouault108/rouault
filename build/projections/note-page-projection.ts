import { buildReadingPageProjection } from './reading-page-projection.js';
import { validateNoteContentContracts } from '../../build/content/note-content-contracts.js';
import type {
  BreadcrumbItem,
  NoteNavigationModel,
} from '../../shared/navigation/navigation-types.js';
import type { NoteStatus } from '../../src/types/article-status.js';
import type { NoteContentKind } from '../../shared/note/note-kind.js';
import { resolveEffectiveNoteChromeProfile } from '../../shared/note/note-chrome-profile.js';
import { resolveNoteChromePolicy } from '../../shared/note/note-chrome-policy.js';
import { shouldRenderArticleHeaderTags } from '../../shared/note/note-publication-policy.js';
import type { TocPresence } from '../../shared/note/toc-presence.js';
import type {
  TocChromeProjection,
  TocHeading,
  TocScopeSelection,
} from '../../shared/toc/toc-chrome-projection.js';
import {
  DEFAULT_SIDEBAR_FIXED_BREAKPOINT_ATTRIBUTE,
  DEFAULT_SIDEBAR_ID,
  DEFAULT_SIDEBAR_PRESENTATION,
  DEFAULT_SIDEBAR_STATE_SCOPE_ID,
} from '../../shared/navigation/sidebar-shell-defaults.js';
import { createSidebarGroupIdPrefixFromSidebarIdentity } from '../../shared/navigation/sidebar-group-id.js';
import { renderNoteSidebarNav } from '../navigation/render-note-sidebar-nav.js';
import {
  resolveDevelopmentSiteUrlContext,
  resolveProductionSiteUrlContext,
} from '../site/site-url-context.js';
import { resolveNoteLinkClassificationContext } from '../content/resolve-note-current-url.js';
import { validateSidebarNavHtmlInvariant } from '../navigation/sidebar-nav-html-invariant.js';
import {
  resolveNoteHydrationBudgetProfile,
  type NoteHydrationCounts,
} from './note-hydration-profile.js';
import { normalizeNoteDate } from './normalize-note-date.js';
import type { IntrinsicNote } from '../../build/data/notes.js';

export type NotePageTocScopeSelection = TocScopeSelection;
export type NotePageTocHeading = TocHeading;

export interface NotePageProjectionInput {
  note: IntrinsicNote;
  navigation: NoteNavigationModel;
}

export interface NotePageSidebarProjection {
  sidebarId: string;
  stateScopeId: string;
  selectedId: string | null;
  initialExpandedIds: readonly string[];
  topologyRevision: string;
  navHtml: string;
  heading: string | null;
  fixedBreakpoint: string;
  presentation: 'auto' | 'fixed' | 'overlay';
}

export type NotePageTocProjection = TocChromeProjection;

export interface NotePageArticleHeaderProjection {
  heading: string;
  breadcrumbs?: BreadcrumbItem[];
  published?: string;
  created?: string;
  updated?: string;
  status?: NoteStatus;
  source?: string;
  license?: string;
  genres: string[];
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

  shellCounts.initial += 1;

  if (projection.tocPresence === 'present' && projection.toc.shouldHydrate) {
    shellCounts.initial += 1;
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
  const chromeProfile = resolveEffectiveNoteChromeProfile(noteKind, input.note.chromeProfile);
  const chromePolicy = resolveNoteChromePolicy(chromeProfile);
  const showSidebar = chromePolicy.sidebar;
  const slug = typeof input.note.slug === 'string' ? input.note.slug : '';
  const genres = shouldRenderArticleHeaderTags(input.note) ? normalizeGenres(input.note.genre) : [];
  const contentHtml = typeof input.note.content === 'string' ? input.note.content : '';
  const siteUrlContext = process.env['ROUAULT_SITE_ORIGIN']
    ? resolveProductionSiteUrlContext()
    : resolveDevelopmentSiteUrlContext();
  const noteLinkContext = resolveNoteLinkClassificationContext({
    sourceFilePath: `${input.note.sourceRoot ?? 'content/notes'}/${slug}.md`,
    siteUrlContext,
  });
  const reading = buildReadingPageProjection({
    validateContent: () => {
      validateNoteContentContracts({
        kind: noteKind,
        html: contentHtml,
        sourceLabel: `${slug}:page-projection`,
        siteUrlContext,
        currentUrl: noteLinkContext.currentUrl,
        routeClassificationMode: noteLinkContext.routeClassificationMode,
        ...(input.note.testingArea !== undefined ? { testingArea: input.note.testingArea } : {}),
      });
    },
    identityKey: slug,
    canonicalPathname: input.note.permalink,
    contentHtml,
    title: input.note.title ?? '',
    tocHeadings: input.note.tocHeadings,
    tocCapabilities: input.note.tocCapabilities,
    tocCapabilitySource: input.note.tocCapabilitySource,
    siteUrlContext,
    routeClassificationMode: noteLinkContext.routeClassificationMode,
    ...(input.note.date ? { date: input.note.date } : {}),
    ...(input.note.updated ? { updated: input.note.updated } : {}),
    ...(input.note.license ? { license: input.note.license } : {}),
  });
  const normalizedCreated = normalizeNoteDate(input.note.created);

  if (showSidebar && input.navigation.sidebarRows.length === 0) {
    throw new Error(`[projection] note "${slug}" は sidebar enabled ですが sidebarRows が空です。`);
  }

  const sidebarId = DEFAULT_SIDEBAR_ID;
  const stateScopeId = DEFAULT_SIDEBAR_STATE_SCOPE_ID;
  const sidebarNavHtml = showSidebar
    ? renderNoteSidebarNav(input.navigation.sidebarRows, {
        basePath: siteUrlContext.basePath,
        ariaLabel: 'ノートナビゲーション',
        sidebarId,
        topologyRevision: input.navigation.topologyRevision,
        groupIdPrefix: createSidebarGroupIdPrefixFromSidebarIdentity(stateScopeId, sidebarId),
      })
    : null;

  validateSidebarNavHtmlInvariant({
    mode: 'ssr-build',
    sidebarPresent: showSidebar,
    navHtml: sidebarNavHtml,
    selectedId: showSidebar ? input.navigation.selectedId : null,
    sidebarId: showSidebar ? sidebarId : null,
    stateScopeId: showSidebar ? stateScopeId : null,
    initialExpandedIds: showSidebar ? input.navigation.initialExpandedIds : [],
    topologyRevision: showSidebar ? input.navigation.topologyRevision : null,
    ...(showSidebar ? { sidebarRows: input.navigation.sidebarRows } : {}),
    sourceLabel: `note-page:${slug}`,
  });

  let sidebarProjection: NotePageSidebarProjection | null = null;
  if (showSidebar) {
    if (sidebarNavHtml === null) {
      throw new Error(`[projection] note "${slug}" の sidebar navHtml が生成されませんでした。`);
    }

    sidebarProjection = {
      sidebarId,
      stateScopeId,
      selectedId: input.navigation.selectedId,
      initialExpandedIds: input.navigation.initialExpandedIds,
      topologyRevision: input.navigation.topologyRevision,
      navHtml: sidebarNavHtml,
      heading: null,
      fixedBreakpoint: DEFAULT_SIDEBAR_FIXED_BREAKPOINT_ATTRIBUTE,
      presentation: DEFAULT_SIDEBAR_PRESENTATION,
    };
  }

  const projection: NotePageProjection = {
    noteKind,
    noteShellSidebarPresence: showSidebar ? 'present' : 'absent',
    tocPresence: reading.tocPresence,
    showSidebar,
    contentHtml,
    ...(sidebarProjection !== null ? { sidebar: sidebarProjection } : {}),
    toc: reading.toc,
    articleHeader: {
      ...reading.articleHeader,
      heading: typeof input.note.title === 'string' ? input.note.title : '',
      ...(input.navigation.breadcrumbs.length > 0
        ? {
            breadcrumbs: input.navigation.breadcrumbs.map((item) => ({
              ...item,
              ...(item.href ? { href: `${siteUrlContext.basePath}${item.href}` } : {}),
            })),
          }
        : {}),
      ...(normalizedCreated !== null ? { created: normalizedCreated } : {}),
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
    },
  };

  validateNoteHydrationBudget(input.note, projection);

  return projection;
}
