import { createHydrationMarkerAttributes } from '../../shared/hydration/hydration-markers.js';
import type { TocChromeProjection, TocHeading } from '../../shared/toc/toc-chrome-projection.js';
import { serializeTocHeadingsForSourceScript } from '../../shared/toc/toc-normalization.js';
import { buildHashHrefFromId } from '../router/url-hash.js';
import { resolveTocDensityTier } from '../toc/toc-density-tier.js';
import { escapeHtmlAttribute, escapeHtmlText, serializeHtmlAttributes } from './html-output.js';

const readMinimumLevel = (headings: readonly TocHeading[]): number =>
  headings.reduce((minimum, heading) => Math.min(minimum, heading.level), Number.POSITIVE_INFINITY);

const renderHeadingItems = (headings: readonly TocHeading[]): string => {
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

export const renderTocJsonSourceScript = (toc: TocChromeProjection): string => {
  const sourceAttributes = serializeHtmlAttributes([
    { name: 'id', value: toc.sourceId },
    { name: 'type', value: 'application/json' },
    { name: 'data-toc-owner-id', value: toc.ownerId },
    ...Object.entries(
      createHydrationMarkerAttributes({
        marker: 'toc-source',
        ownerId: toc.ownerId,
        scopeId: toc.scopeId,
      }),
    ).map(([name, value]) => ({ name, value })),
  ]);

  return `
    <script${sourceAttributes}>
${serializeTocHeadingsForSourceScript(toc.headings)}
    </script>
  `.trim();
};

export const renderTocChromeHtml = (toc: TocChromeProjection): string => {
  const densityTier = resolveTocDensityTier(toc.headings);
  const controllerAttributes = serializeHtmlAttributes([
    { name: 'source-id', value: toc.sourceId },
    { name: 'toc-runtime-id', value: toc.runtimeId },
    { name: 'toc-owner-id', value: toc.ownerId },
    { name: 'data-toc-trigger-reserved', value: 'false' },
    { name: 'capabilities-json', value: toc.capabilities, kind: 'json' },
    { name: 'content-root-id', value: toc.contentRootId },
    { name: 'data-hydration-scope', value: toc.scopeId },
    { name: 'data-hydration-deferred', value: 'toc-trigger' },
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
        ownerId: toc.ownerId,
        scopeId: toc.scopeId,
      }),
    ).map(([name, value]) => ({ name, value })),
  );

  return `
    <aside
      class="layout-toc-col"
      aria-label="目次"
      data-density-tier="${densityTier}"
      data-layout-toc-root
      ${rootMarkerAttributes.trim()}
    >
      <nav class="layout-toc" aria-label="目次" data-layout-toc-nav>
        <ol class="layout-toc__list">${renderHeadingItems(toc.headings)}</ol>
      </nav>
      ${toc.shouldHydrate ? renderTocJsonSourceScript(toc) : ''}
      ${toc.shouldHydrate ? `<layout-toc-controller${controllerAttributes}></layout-toc-controller>` : ''}
    </aside>
  `.trim();
};

export const renderTocHtml = renderTocChromeHtml;
