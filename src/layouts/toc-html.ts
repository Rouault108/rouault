import type { NotePageProjection } from '../../build/projections/note-page-projection.js';
import { createHydrationMarkerAttributes } from '../../shared/hydration/hydration-markers.js';
import { buildHashHrefFromId } from '../router/url-hash.js';
import { escapeHtmlAttribute, escapeHtmlText, serializeHtmlAttributes } from './html-output.js';

type TocProjection = NotePageProjection['toc'];

const readMinimumLevel = (headings: TocProjection['headings']): number =>
  headings.reduce((minimum, heading) => Math.min(minimum, heading.level), Number.POSITIVE_INFINITY);

const renderHeadingItems = (headings: TocProjection['headings']): string => {
  if (headings.length === 0) {
    return '';
  }

  const minimumLevel = readMinimumLevel(headings);

  return headings
    .map((heading) => {
      const depth = Math.max(0, heading.level - minimumLevel);
      const headingId = escapeHtmlAttribute(heading.id);
      const headingHref = escapeHtmlAttribute(buildHashHrefFromId(heading.id));
      const headingTitle = escapeHtmlAttribute(heading.text);
      const headingLabel = escapeHtmlText(heading.text);
      return `
        <li
          class="layout-toc__item"
          data-heading-id="${headingId}"
          data-heading-level="${String(heading.level)}"
          data-heading-depth="${String(depth)}"
          style="--level: ${String(depth)}"
        >
          <a
            class="layout-toc__link"
            href="${headingHref}"
            data-toc-link
            data-heading-id="${headingId}"
            data-heading-level="${String(heading.level)}"
            data-heading-depth="${String(depth)}"
            title="${headingTitle}"
          >
            <span class="layout-toc__link-label">${headingLabel}</span>
          </a>
        </li>
      `.trim();
    })
    .join('');
};

export const renderTocHtml = (toc: TocProjection): string => {
  const ownerId = (toc.ownerId ?? toc.sourceId).trim();
  const controllerAttributes = serializeHtmlAttributes([
    { name: 'source-id', value: toc.sourceId },
    { name: 'toc-runtime-id', value: toc.sourceId },
    { name: 'toc-owner-id', value: ownerId },
    { name: 'data-toc-trigger-reserved', value: 'false' },
    { name: 'capabilities-json', value: toc.capabilities, kind: 'json' },
    { name: 'content-root-id', value: toc.contentRootId },
    {
      name: 'data-hydration-capability',
      value: toc.shouldHydrate ? 'interactive' : undefined,
    },
    {
      name: 'data-hydration-trigger',
      value: toc.shouldHydrate ? 'initial' : undefined,
    },
  ]);
  const rootMarkerAttributes = serializeHtmlAttributes(
    Object.entries(
      createHydrationMarkerAttributes({
        marker: 'toc-owner',
        ownerId,
        scopeId: 'note-toc',
      }),
    ).map(([name, value]) => ({ name, value })),
  );

  return `
    <aside
      class="layout-toc-col"
      aria-label="目次"
      data-layout-toc-root
      ${rootMarkerAttributes.trim()}
    >
      <nav class="layout-toc" aria-label="目次" data-layout-toc-nav>
        <ol class="layout-toc__list">${renderHeadingItems(toc.headings)}</ol>
      </nav>
      <layout-toc-controller${controllerAttributes}></layout-toc-controller>
    </aside>
  `.trim();
};
