import { describe, expect, it } from 'vitest';

import {
  resolveNoteLinkClassificationContext,
} from '../../build/content/resolve-note-current-url.js';
import { classifyLinkHref } from '../../shared/link/link-annotation.js';

const siteUrlContext = { siteOrigin: 'https://rouault.invalid', basePath: '' } as const;

describe('resolve note current URL', () => {
  it(
    'build-time note context では current document hash を internal-fragment として分類できること',
    () => {
      const context = resolveNoteLinkClassificationContext({
        sourceFilePath: 'content/testing/sidebar-scroll/group-01/source.md',
        siteUrlContext,
      });

      const classified = classifyLinkHref({
        href: '#sidebar-scroll-source',
        surface: 'structural',
        siteUrlContext,
        currentUrl: context.currentUrl,
        routeClassificationMode: context.routeClassificationMode,
      });

      expect(context.currentUrl).to.equal(
        'https://rouault.invalid/notes/testing/sidebar-scroll/group-01/source',
      );
      expect(classified.kind).to.equal('internal-fragment');
    },
  );

  it(
    'basePath 付きの build-time note context でも currentUrl と route mode が整合すること',
    () => {
      const basePathSiteUrlContext = {
        siteOrigin: 'https://rouault.invalid',
        basePath: '/rouault',
      } as const;
      const context = resolveNoteLinkClassificationContext({
        sourceFilePath: 'content/testing/sidebar-scroll/group-01/source.md',
        siteUrlContext: basePathSiteUrlContext,
      });

      const classified = classifyLinkHref({
        href: '#sidebar-scroll-source',
        surface: 'structural',
        siteUrlContext: basePathSiteUrlContext,
        currentUrl: context.currentUrl,
        routeClassificationMode: context.routeClassificationMode,
      });

      expect(context.currentUrl).to.equal(
        'https://rouault.invalid/rouault/notes/testing/sidebar-scroll/group-01/source',
      );
      expect(classified.kind).to.equal('internal-fragment');
    },
  );
});
