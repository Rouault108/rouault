import { describe, expect, it } from 'vitest';
import { buildSearchStaticBaselineProjection } from '../../build/projections/search-static-baseline-projection.js';
import type { TagPageEntry } from '../../build/projections/tag-page-projection.js';
import { createSiteUrlContext } from '../../shared/site/site-url-context.js';

describe('Search Static Baseline projection', () => {
  it.each(['', '/rouault'])(
    '上流tagのidentity / count / 順序とbasePath %sを保持する',
    (basePath) => {
      const tags: TagPageEntry[] = ['日本語 / A', 'Z', 'music'].map((tag, index) => ({
        tag,
        noteCount: index + 2,
        searchHref: '/search/?q=unused',
        searchRenderHref: '/wrong-search-href',
        notes: [],
      }));
      const projection = buildSearchStaticBaselineProjection(
        tags,
        createSiteUrlContext({
          siteOrigin: 'https://example.com',
          basePath,
        }),
      );
      expect(projection).toEqual({
        tags: tags.map(({ tag, noteCount }) => ({
          label: tag,
          href: `${basePath}/tags/${encodeURIComponent(tag)}/`,
          noteCount,
        })),
        corporaHref: `${basePath}/corpora/`,
      });
      expect(Object.keys(projection)).toEqual(['tags', 'corporaHref']);
      for (const tag of projection.tags)
        expect(Object.keys(tag)).toEqual(['label', 'href', 'noteCount']);
    },
  );
});
