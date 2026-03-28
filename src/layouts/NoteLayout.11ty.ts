/**
 * ノート用レイアウト。
 *
 * BaseLayout を layout chain で継承し、
 * サイドバー + 本文 + TOC の3カラム構成を提供する。
 */

import { buildSidebarTree } from '../../lib/content/build-sidebar-tree.js';
import { tokenizeSearchText } from '../lib/search/query-preprocessor.js';
import type { NoteStatus } from '../types/article-status.js';
import type { IconName } from '../icons/catalog.js';

interface TocHeading {
  id?: string;
  text?: string;
  level?: number;
}

interface SidebarNoteLike {
  slug?: string;
  title?: string;
  permalink?: string;
  noteKind?: 'leaf' | 'directory-index';
  directoryPath?: string;
  sidebarResolvedIcon?: IconName;
  sidebarDirectoryIcons?: Record<string, IconName>;
}

interface NoteData extends SidebarNoteLike {
  description?: string;
  date?: string;
  updated?: string;
  genre?: string[];
  source?: string;
  license?: string;
  licenseNote?: string;
  sidebarRoot?: string;
  status?: NoteStatus;
  tocHeadings?: TocHeading[];
}

interface NoteLayoutData {
  content: string;
  note?: NoteData;
  notes?: SidebarNoteLike[];
}

/**
 * HTML属性値のエスケープ。XSS防止のために使用。
 */
function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * script[type="application/json"] 向けにJSON文字列を安全化する。
 */
function escapeJsonForScript(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}

function normalizeHeadings(
  value: TocHeading[] | undefined,
): { id: string; text: string; level: number }[] {
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
      return { id, text, level };
    })
    .filter((item): item is { id: string; text: string; level: number } => item !== null);
}

function toSafeDataId(slug: string): string {
  return slug.replace(/[^a-zA-Z0-9_-]/g, '-');
}

function normalizePagefindSortDate(value: string | undefined): string {
  const normalized = typeof value === 'string' ? value.trim() : '';
  return normalized.length > 0 ? normalized : '0000-00-00';
}

function buildTokenizedPagefindText(value: string | undefined): string {
  const normalized = typeof value === 'string' ? value.trim() : '';
  if (normalized.length === 0) {
    return '';
  }

  const tokenized = tokenizeSearchText(normalized);
  if (
    tokenized.segmentedText.length === 0 ||
    tokenized.segmentedText === tokenized.normalizedText
  ) {
    return '';
  }

  return escapeHtml(tokenized.segmentedText);
}

function mergeCurrentNoteIntoSidebarNotes(
  note: NoteData | undefined,
  notes: SidebarNoteLike[] | undefined,
): SidebarNoteLike[] {
  const base: SidebarNoteLike[] = Array.isArray(notes) ? [...notes] : [];

  if (!note || typeof note.slug !== 'string') {
    return base;
  }

  const slug = note.slug.trim();
  if (slug.length === 0) {
    return base;
  }

  const permalink =
    typeof note.permalink === 'string' && note.permalink.trim().length > 0
      ? note.permalink.trim()
      : `/notes/${slug}`;

  const currentNote: SidebarNoteLike = {
    slug,
    permalink,
  };

  if (typeof note.title === 'string' && note.title.trim().length > 0) {
    currentNote.title = note.title.trim();
  }

  if (note.noteKind === 'leaf' || note.noteKind === 'directory-index') {
    currentNote.noteKind = note.noteKind;
  }

  if (typeof note.sidebarResolvedIcon === 'string' && note.sidebarResolvedIcon.trim().length > 0) {
    currentNote.sidebarResolvedIcon = note.sidebarResolvedIcon;
  }

  if (note.sidebarDirectoryIcons && typeof note.sidebarDirectoryIcons === 'object') {
    currentNote.sidebarDirectoryIcons = note.sidebarDirectoryIcons;
  }

  if (typeof note.directoryPath === 'string' && note.directoryPath.trim().length > 0) {
    currentNote.directoryPath = note.directoryPath.trim();
  } else if (note.noteKind === 'directory-index') {
    currentNote.directoryPath = slug;
  }

  const alreadyIncluded = base.some((item: SidebarNoteLike) => {
    const itemSlug = typeof item.slug === 'string' ? item.slug.trim() : '';
    const itemDirectoryPath =
      typeof item.directoryPath === 'string' ? item.directoryPath.trim() : '';

    if (currentNote.noteKind === 'directory-index') {
      return (
        item.noteKind === 'directory-index' &&
        itemSlug === slug &&
        itemDirectoryPath === (currentNote.directoryPath ?? slug)
      );
    }

    return itemSlug === slug && item.noteKind !== 'directory-index';
  });

  if (!alreadyIncluded) {
    base.push(currentNote);
  }

  return base;
}

export class NoteLayout {
  data() {
    return {
      layout: 'base',
    };
  }

  render(data: NoteLayoutData) {
    const note = data.note;
    const slug = typeof note?.slug === 'string' ? note.slug : '';
    const sidebarSelectedId = note?.noteKind === 'directory-index' ? `${slug}/__index__` : slug;
    const heading = escapeAttr(note?.title ?? '');
    const published = note?.date ? ` published="${escapeAttr(note.date)}"` : '';
    const updated = note?.updated ? ` updated="${escapeAttr(note.updated)}"` : '';
    const status = note?.status ? ` status="${escapeAttr(note.status)}"` : '';
    const source = note?.source ? ` source="${escapeAttr(note.source)}"` : '';
    const license = note?.license ? ` license="${escapeAttr(note.license)}"` : '';
    const genres = Array.isArray(note?.genre)
      ? note.genre.map((item) => item.trim()).filter((item) => item.length > 0)
      : [];
    const headings = normalizeHeadings(note?.tocHeadings);
    const sidebarRoot = typeof note?.sidebarRoot === 'string' ? note.sidebarRoot : '';
    const sidebarNotes = mergeCurrentNoteIntoSidebarNotes(note, data.notes);
    const sidebarTree = buildSidebarTree(sidebarNotes, sidebarRoot);

    const dataIdBase = toSafeDataId(slug.length > 0 ? slug : 'note');
    const sidebarSourceId = `sidebar-source-${dataIdBase}`;
    const tocSourceId = `toc-source-${dataIdBase}`;
    const contentRootId = `note-content-${dataIdBase}`;
    const articleHeaderTags =
      genres.length > 0 ? ` data-tags="${escapeAttr(JSON.stringify(genres))}"` : '';
    const sidebarItemsJson = escapeAttr(JSON.stringify(sidebarTree));
    const tocHeadingsJson = escapeAttr(JSON.stringify(headings));
    const pagefindTitle = note?.title ? escapeHtml(note.title) : '';
    const pagefindDescription = note?.description ? escapeHtml(note.description) : '';
    const pagefindTokenizedTitle = buildTokenizedPagefindText(note?.title);
    const pagefindTokenizedDescription = buildTokenizedPagefindText(note?.description);
    const pagefindDateValue = note?.updated ?? note?.date ?? '';
    const pagefindDate = pagefindDateValue ? escapeHtml(pagefindDateValue) : '';
    const pagefindSortDate = escapeAttr(normalizePagefindSortDate(note?.updated ?? note?.date));
    const pagefindGenreFilters = genres
      .map((genre) => `<span data-pagefind-filter="genre:${escapeAttr(genre)}"></span>`)
      .join('');

    return `
      <section class="note-shell" data-hydration-scope="note-shell">
        <aside
          class="layout-sidebar-col"
          aria-label="ナビゲーション"
          data-hydration-scope="note-sidebar"
        >
          <layout-sidebar
            source-id="${escapeAttr(sidebarSourceId)}"
            selected-id="${escapeAttr(sidebarSelectedId)}"
            items-json="${sidebarItemsJson}"
            heading="ナビゲーション"
            fixed-breakpoint="768"
            data-hydration-capability="interactive"
            data-hydration-trigger="initial"
          ></layout-sidebar>
        </aside>

        <article
          class="layout-main-col container-reading"
          data-pagefind-body
          data-pagefind-sort="date:${pagefindSortDate}"
          data-hydration-scope="note-content"
        >
          <div class="sr-only" aria-hidden="true" data-pagefind-ignore>
            <span data-pagefind-meta="title">${pagefindTitle}</span>
            <span data-pagefind-meta="description">${pagefindDescription}</span>
            <span data-pagefind-meta="date">${pagefindDate}</span>
            ${pagefindGenreFilters}
          </div>
          <div class="sr-only" aria-hidden="true">
            ${pagefindTitle.length > 0 ? `<span data-pagefind-weight="10">${pagefindTitle}</span>` : ''}
            ${pagefindTokenizedTitle.length > 0 ? `<span data-pagefind-weight="8">${pagefindTokenizedTitle}</span>` : ''}
            ${pagefindDescription.length > 0 ? `<span data-pagefind-weight="5">${pagefindDescription}</span>` : ''}
            ${pagefindTokenizedDescription.length > 0 ? `<span data-pagefind-weight="3">${pagefindTokenizedDescription}</span>` : ''}
          </div>
          <ui-article-header
            heading="${heading}"${published}${updated}${status}${source}${license}${articleHeaderTags}
            ${genres.length > 0 ? 'data-hydration-capability="progressive" data-hydration-trigger="post-commit"' : ''}
          ></ui-article-header>
          <div id="${escapeAttr(contentRootId)}" class="prose">
            ${data.content}
          </div>
        </article>

        <aside
          class="layout-toc-col"
          aria-label="目次"
          data-hydration-scope="note-toc"
        >
          <layout-toc
            source-id="${escapeAttr(tocSourceId)}"
            headings-json="${tocHeadingsJson}"
            content-root-id="${escapeAttr(contentRootId)}"
            home-href="/"
            data-hydration-capability="interactive"
            data-hydration-trigger="initial"
          ></layout-toc>
        </aside>
      </section>

      <script type="application/json" id="${escapeAttr(sidebarSourceId)}">
${escapeJsonForScript(sidebarTree)}
      </script>
      <script type="application/json" id="${escapeAttr(tocSourceId)}">
${escapeJsonForScript(headings)}
      </script>
    `.trim();
  }
}

export default NoteLayout;
