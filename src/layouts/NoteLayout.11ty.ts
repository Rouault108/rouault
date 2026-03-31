/**
 * ノート用レイアウト。
 *
 * BaseLayout を layout chain で継承し、
 * サイドバー + 本文 + TOC の3カラム構成を提供する。
 */

import type { NotePageProjection } from '../../build/projections/note-page-projection.js';

interface NoteLayoutData {
  notePage?: NotePageProjection;
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

export class NoteLayout {
  data() {
    return {
      layout: 'base',
    };
  }

  render(data: NoteLayoutData) {
    const notePage = data.notePage;
    if (!notePage) {
      return '';
    }

    const articleHeader = notePage.articleHeader;
    const sidebar = notePage.sidebar;
    const toc = notePage.toc;
    const pagefind = notePage.pagefind;
    const heading = escapeAttr(articleHeader.heading);
    const published = articleHeader.published
      ? ` published="${escapeAttr(articleHeader.published)}"`
      : '';
    const updated = articleHeader.updated
      ? ` updated="${escapeAttr(articleHeader.updated)}"`
      : '';
    const status = articleHeader.status ? ` status="${escapeAttr(articleHeader.status)}"` : '';
    const source = articleHeader.source ? ` source="${escapeAttr(articleHeader.source)}"` : '';
    const license = articleHeader.license ? ` license="${escapeAttr(articleHeader.license)}"` : '';
    const articleHeaderTags =
      articleHeader.genres.length > 0
        ? ` data-tags="${escapeAttr(JSON.stringify(articleHeader.genres))}"`
        : '';
    const sidebarItemsJson = escapeAttr(JSON.stringify(sidebar?.items ?? []));
    const tocHeadingsJson = escapeAttr(JSON.stringify(toc.headings));
    const tocCapabilitiesJson = escapeAttr(JSON.stringify(toc.capabilities));
    const pagefindTitle = escapeHtml(pagefind?.title ?? '');
    const pagefindDescription = escapeHtml(pagefind?.description ?? '');
    const pagefindTokenizedTitle = escapeHtml(pagefind?.tokenizedTitle ?? '');
    const pagefindTokenizedDescription = escapeHtml(pagefind?.tokenizedDescription ?? '');
    const pagefindDate = pagefind?.date ? escapeHtml(pagefind.date) : '';
    const pagefindSortDate = escapeAttr(pagefind?.sortDate ?? '0000-00-00');
    const pagefindGenreFilters = (pagefind?.tags ?? [])
      .map((genre) => `<span data-pagefind-filter="genre:${escapeAttr(genre)}"></span>`)
      .join('');

    return `
      <section
        class="note-shell"
        data-hydration-scope="note-shell"
        data-note-kind="${escapeAttr(notePage.noteKind)}"
        data-sidebar-presence="${escapeAttr(notePage.noteShellSidebarPresence)}"
        ${pagefind ? '' : 'data-pagefind-ignore'}
      >
        ${notePage.showSidebar && sidebar
          ? `
            <aside
              class="layout-sidebar-col"
              aria-label="ナビゲーション"
              data-hydration-scope="note-sidebar"
            >
              <layout-sidebar
                source-id="${escapeAttr(sidebar.sourceId)}"
                selected-id="${escapeAttr(sidebar.selectedId)}"
                items-json="${sidebarItemsJson}"
                heading="${escapeAttr(sidebar.heading)}"
                fixed-breakpoint="${escapeAttr(sidebar.fixedBreakpoint)}"
                data-hydration-capability="interactive"
                data-hydration-trigger="initial"
              ></layout-sidebar>
            </aside>
          `
          : ''}

        <article
          class="layout-main-col container-reading"
          ${pagefind ? 'data-pagefind-body' : 'data-pagefind-ignore'}
          ${pagefind ? `data-pagefind-sort="date:${pagefindSortDate}"` : ''}
          data-hydration-scope="note-content"
        >
          ${pagefind
            ? `
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
            `
            : ''}
          <ui-article-header
            heading="${heading}"${published}${updated}${status}${source}${license}${articleHeaderTags}
            ${articleHeader.shouldHydrateTags ? 'data-hydration-capability="progressive" data-hydration-trigger="post-commit"' : ''}
          ></ui-article-header>
          <div id="${escapeAttr(toc.contentRootId)}" class="prose">
            ${notePage.contentHtml}
          </div>
        </article>

        <aside
          class="layout-toc-col"
          aria-label="目次"
          data-hydration-scope="note-toc"
        >
          <layout-toc
            source-id="${escapeAttr(toc.sourceId)}"
            headings-json="${tocHeadingsJson}"
            capabilities-json="${tocCapabilitiesJson}"
            content-root-id="${escapeAttr(toc.contentRootId)}"
            home-href="${escapeAttr(toc.homeHref)}"
            ${toc.shouldHydrate
              ? 'data-hydration-capability="interactive" data-hydration-trigger="initial"'
              : ''}
          ></layout-toc>
        </aside>
      </section>

      ${sidebar
        ? `
      <script type="application/json" id="${escapeAttr(sidebar.sourceId)}">
${escapeJsonForScript(sidebar.items)}
      </script>
      `
        : ''}
      <script type="application/json" id="${escapeAttr(toc.sourceId)}">
${escapeJsonForScript(toc.headings)}
      </script>
    `.trim();
  }
}

export default NoteLayout;
