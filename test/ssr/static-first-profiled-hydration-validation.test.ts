import { describe, expect, it } from 'vitest';

import {
  STATIC_FIRST_NOTE_DENYLIST_TAGS,
  STATIC_FIRST_PAGE_COMPONENT_DENYLIST_TAGS,
  STATIC_FIRST_PAGE_DENYLIST_TAGS,
  STATIC_FIRST_SHELL_DENYLIST_TAGS,
} from '../../build/content/static-first-tags.js';
import { validateStaticFirstProfiledHydration } from '../../build/content/static-first-profiled-hydration-validation.js';
import { HYDRATION_REGISTRY } from '../../src/client/hydration/registry.js';
import {
  SSR_LAYOUT_TARGET_TAGS,
  SSR_NOTE_TARGET_TAGS,
  SSR_PAGE_TARGET_TAGS,
  SSR_SHELL_TARGET_TAGS,
} from '../../build/ssr/targets.js';

describe('static-first profiled hydration validation', () => {
  it('validates note hydration roots without treating layout entries as note static surface violations', () => {
    const result = validateStaticFirstProfiledHydration({
      profile: 'note',
      html: `
        <article class="prose" data-note-static-surface>
          <div data-hydration-key="note-static-surface-enhancer"></div>
          <figure data-code-block-root data-hydration-key="code-block-enhancer"></figure>
          <section data-code-group data-hydration-key="code-group-enhancer"></section>
          <a data-footnote-ref="true" data-hydration-key="footnote-popover-enhancer"></a>
          <figure data-image data-hydration-key="image-lightbox-enhancer"></figure>
          <div data-score data-hydration-key="score-scroll-enhancer"></div>
          <ui-tabs></ui-tabs>
        </article>
      `,
      registry: HYDRATION_REGISTRY,
      denylistTags: STATIC_FIRST_NOTE_DENYLIST_TAGS,
      ssrTargetTags: SSR_NOTE_TARGET_TAGS,
    });

    expect(result.errors).toEqual([]);
    expect(result.hydrationKeys).toEqual([
      'code-block-enhancer',
      'code-group-enhancer',
      'footnote-popover-enhancer',
      'image-lightbox-enhancer',
      'note-static-surface-enhancer',
      'score-scroll-enhancer',
    ]);
  });

  it('validates layout hydration roots and SSR targets through the layout profile', () => {
    const result = validateStaticFirstProfiledHydration({
      profile: 'layout',
      html: `
        <layout-sidebar data-hydration-key="layout-sidebar"></layout-sidebar>
        <layout-toc-controller data-hydration-key="layout-toc-controller"></layout-toc-controller>
      `,
      registry: HYDRATION_REGISTRY,
      ssrTargetTags: SSR_LAYOUT_TARGET_TAGS,
    });

    expect(result.errors).toEqual([]);
    expect(SSR_LAYOUT_TARGET_TAGS).toContain('layout-sidebar');
    expect(SSR_LAYOUT_TARGET_TAGS).toContain('layout-toc');
  });

  it('validates page and shell hydration roots with profile-specific denylists', () => {
    const page = validateStaticFirstProfiledHydration({
      profile: 'page',
      html: '<main data-hydration-key="search-page-enhancer"></main>',
      registry: HYDRATION_REGISTRY,
      denylistTags: [
        ...STATIC_FIRST_PAGE_DENYLIST_TAGS,
        ...STATIC_FIRST_PAGE_COMPONENT_DENYLIST_TAGS,
      ],
      ssrTargetTags: SSR_PAGE_TARGET_TAGS,
    });
    const shell = validateStaticFirstProfiledHydration({
      profile: 'shell',
      html: '<div data-hydration-key="search-dialog-enhancer"></div><span data-hydration-key="layout-header-enhancer"></span><header data-layout-header="true"></header>',
      registry: HYDRATION_REGISTRY,
      denylistTags: STATIC_FIRST_SHELL_DENYLIST_TAGS,
      ssrTargetTags: SSR_SHELL_TARGET_TAGS,
    });

    expect(page.errors).toEqual([]);
    expect(shell.errors).toEqual([]);
  });

  it('does not inspect unrelated global registry entries for a profile violation', () => {
    const result = validateStaticFirstProfiledHydration({
      profile: 'page',
      html: '<main data-hydration-key="search-page-enhancer"></main>',
      registry: HYDRATION_REGISTRY,
      denylistTags: [
        ...STATIC_FIRST_PAGE_DENYLIST_TAGS,
        ...STATIC_FIRST_PAGE_COMPONENT_DENYLIST_TAGS,
      ],
      ssrTargetTags: SSR_PAGE_TARGET_TAGS,
    });

    expect(result.errors).toEqual([]);
    expect(HYDRATION_REGISTRY.some((entry) => entry.tag === 'ui-tabs')).toBe(true);
    expect(HYDRATION_REGISTRY.some((entry) => entry.tag === 'layout-sidebar')).toBe(true);
  });
});
