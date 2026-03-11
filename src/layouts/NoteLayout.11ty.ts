/**
 * ノート用レイアウト。
 *
 * BaseLayout を layout chain で継承し、
 * サイドバー + 本文 + TOC の3カラム構成を提供する。
 */

import { buildSidebarTree, type SidebarSourceNote } from '../../lib/content/build-sidebar-tree.js';

interface TocHeading {
  id?: string;
  text?: string;
  level?: number;
}

interface NoteData extends SidebarSourceNote {
  description?: string;
  date?: string;
  updated?: string;
  genre?: string[];
  license?: string;
  licenseNote?: string;
  draft?: boolean;
  tocHeadings?: TocHeading[];
}

interface NoteLayoutData {
  content: string;
  note?: NoteData;
  notes?: SidebarSourceNote[];
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
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
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

function normalizeHeadings(value: TocHeading[] | undefined): { id: string; text: string; level: number }[] {
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

export class NoteLayout {
  data() {
    return {
      layout: 'base',
    };
  }

  render(data: NoteLayoutData) {
    const note = data.note;
    const slug = typeof note?.slug === 'string' ? note.slug : '';
    const heading = escapeAttr(note?.title ?? '');
    const published = note?.date ? ` published="${escapeAttr(note.date)}"` : '';
    const updated = note?.updated
      ? ` updated="${escapeAttr(note.updated)}"`
      : '';
    const status = note?.draft ? ' status="draft"' : '';
    const license = note?.license
      ? ` license="${escapeAttr(note.license)}"`
      : '';
    const genres = Array.isArray(note?.genre)
      ? note.genre.map((item) => item.trim()).filter((item) => item.length > 0)
      : [];
    const headings = normalizeHeadings(note?.tocHeadings);
    const sidebarTree = buildSidebarTree(data.notes ?? [], slug);

    const dataIdBase = toSafeDataId(slug.length > 0 ? slug : 'note');
    const sidebarSourceId = `sidebar-source-${dataIdBase}`;
    const tocSourceId = `toc-source-${dataIdBase}`;
    const tagsJson = escapeAttr(JSON.stringify(genres));
    const pagefindTitle = note?.title ? escapeHtml(note.title) : '';
    const pagefindDescription = note?.description ? escapeHtml(note.description) : '';
    const pagefindDateValue = note?.updated ?? note?.date ?? '';
    const pagefindDate = pagefindDateValue ? escapeHtml(pagefindDateValue) : '';
    const pagefindGenreFilters = genres
      .map((genre) => `<span data-pagefind-filter="genre:${escapeAttr(genre)}"></span>`)
      .join('');

    return `
      <section class="note-shell">
        <aside class="layout-sidebar-col" aria-label="ナビゲーション">
          <layout-sidebar
            source-id="${escapeAttr(sidebarSourceId)}"
            active-id="${escapeAttr(slug)}"
            heading="ナビゲーション"
            fixed-breakpoint="768"
          ></layout-sidebar>
        </aside>

        <article class="layout-main-col container-reading" data-pagefind-body>
          <div class="sr-only" aria-hidden="true" data-pagefind-ignore>
            <span data-pagefind-meta="title">${pagefindTitle}</span>
            <span data-pagefind-meta="description">${pagefindDescription}</span>
            <span data-pagefind-meta="date">${pagefindDate}</span>
            ${pagefindGenreFilters}
          </div>
          <ui-article-header
            heading="${heading}"${published}${updated}${status}${license}
            tags-json="${tagsJson}"
          ></ui-article-header>
          <div class="prose">
            ${data.content}
          </div>
        </article>

        <aside class="layout-toc-col" aria-label="目次">
          <layout-toc
            source-id="${escapeAttr(tocSourceId)}"
            home-href="/"
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
