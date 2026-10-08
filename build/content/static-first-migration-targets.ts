export type StaticFirstMigrationStatus =
  | 'absorbed-locally'
  | 'contract-reduced'
  | 'intentionally-removed'
  | 'native-equivalent'
  | 'static-equivalent'
  | 'static-helper';

export type StaticFirstFunctionalCompatibility =
  | 'equivalent'
  | 'mostly-equivalent'
  | 'none'
  | 'partial'
  | 'reduced';

export interface StaticFirstMigrationTarget {
  readonly tag: string;
  readonly formerImplementationPaths: readonly string[];
  readonly status: StaticFirstMigrationStatus;
  readonly functionalCompatibility: StaticFirstFunctionalCompatibility;
  readonly replacementContract: string;
  readonly retainedDesignContract: string;
  readonly removedDesignContract: readonly string[];
  readonly notes: string;
}

export const STATIC_FIRST_MIGRATION_TARGETS = [
  {
    tag: 'layout-sidebar',
    formerImplementationPaths: ['src/components/layout/layout-sidebar.ts'],
    status: 'absorbed-locally',
    functionalCompatibility: 'reduced',
    replacementContract: 'static aside[data-layout-sidebar-root] and shell sidebar enhancer',
    retainedDesignContract: 'Retained production surface owns its contract.',
    removedDesignContract: ['layout-sidebar custom element API'],
    notes: 'Phase 3A: legacy component source/API removed.',
  },
  {
    tag: 'layout-sidebar-surface',
    formerImplementationPaths: ['src/components/layout/layout-sidebar-surface.ts'],
    status: 'absorbed-locally',
    functionalCompatibility: 'reduced',
    replacementContract: 'static aside[data-layout-sidebar-root] and shell sidebar enhancer',
    retainedDesignContract: 'Retained production surface owns its contract.',
    removedDesignContract: ['layout-sidebar-surface custom element API'],
    notes: 'Phase 3A: legacy component source/API removed.',
  },
  {
    tag: 'ui-sidebar',
    formerImplementationPaths: ['src/components/ui/sidebar/sidebar.ts'],
    status: 'absorbed-locally',
    functionalCompatibility: 'reduced',
    replacementContract: 'static aside[data-layout-sidebar-root] and shell sidebar enhancer',
    retainedDesignContract: 'Retained production surface owns its contract.',
    removedDesignContract: ['ui-sidebar custom element API'],
    notes: 'Phase 3A: legacy component source/API removed.',
  },
  {
    tag: 'ui-sidebar-shell',
    formerImplementationPaths: ['src/components/ui/sidebar-shell/sidebar-shell.ts'],
    status: 'absorbed-locally',
    functionalCompatibility: 'reduced',
    replacementContract: 'static aside[data-layout-sidebar-root] and shell sidebar enhancer',
    retainedDesignContract: 'Retained production surface owns its contract.',
    removedDesignContract: ['ui-sidebar-shell custom element API'],
    notes: 'Phase 3A: legacy component source/API removed.',
  },
  {
    tag: 'layout-toc',
    formerImplementationPaths: ['src/components/layout/layout-toc.ts'],
    status: 'absorbed-locally',
    functionalCompatibility: 'reduced',
    replacementContract: 'static TOC navigation and layout-toc-controller',
    retainedDesignContract: 'Retained production surface owns its contract.',
    removedDesignContract: ['layout-toc custom element API'],
    notes: 'Phase 3A: legacy component source/API removed.',
  },
  {
    tag: 'ui-toc',
    formerImplementationPaths: ['src/components/ui/toc/toc.ts'],
    status: 'absorbed-locally',
    functionalCompatibility: 'reduced',
    replacementContract: 'static TOC navigation and layout-toc-controller',
    retainedDesignContract: 'Retained production surface owns its contract.',
    removedDesignContract: ['ui-toc custom element API'],
    notes: 'Phase 3A: legacy component source/API removed.',
  },
  {
    tag: 'ui-skip-link',
    formerImplementationPaths: ['src/components/ui/skip-link/skip-link.ts'],
    status: 'absorbed-locally',
    functionalCompatibility: 'reduced',
    replacementContract: 'native skip link in BaseLayout.11ty.ts',
    retainedDesignContract: 'Retained production surface owns its contract.',
    removedDesignContract: ['ui-skip-link custom element API'],
    notes: 'Phase 3A: legacy component source/API removed.',
  },
  {
    tag: 'ui-menu-link',
    formerImplementationPaths: ['src/components/ui/dropdown/dropdown.ts'],
    status: 'intentionally-removed',
    functionalCompatibility: 'none',
    replacementContract: 'none; production dropdown retains command items only',
    retainedDesignContract: 'Retained production surface owns its contract.',
    removedDesignContract: ['ui-menu-link custom element API'],
    notes: 'Phase 3A: legacy component source/API removed.',
  },
  {
    tag: 'ui-menu-separator',
    formerImplementationPaths: ['src/components/ui/dropdown/dropdown.ts'],
    status: 'intentionally-removed',
    functionalCompatibility: 'none',
    replacementContract: 'none; production dropdown retains command items only',
    retainedDesignContract: 'Retained production surface owns its contract.',
    removedDesignContract: ['ui-menu-separator custom element API'],
    notes: 'Phase 3A: legacy component source/API removed.',
  },
  {
    tag: 'ui-pagination',
    formerImplementationPaths: ['src/components/ui/pagination/pagination.ts'],
    status: 'intentionally-removed',
    functionalCompatibility: 'none',
    replacementContract: 'none',
    retainedDesignContract: 'none',
    removedDesignContract: [
      'standalone ui-pagination custom element',
      'numbered page item API',
      'ellipsis pagination API',
      'regular/compact/page variants',
    ],
    notes: '旧資料由来: Phase 3B removed the final Design System-only owner.',
  },
  {
    tag: 'ui-skeleton',
    formerImplementationPaths: ['src/components/ui/skeleton/skeleton.ts'],
    status: 'intentionally-removed',
    functionalCompatibility: 'none',
    replacementContract: 'none',
    retainedDesignContract: 'none',
    removedDesignContract: [
      'standalone ui-skeleton custom element',
      'variant property',
      'width property',
      'height property',
      'animated property',
    ],
    notes: '旧資料由来: Phase 3B removed the final Design System-only owner.',
  },
  {
    tag: 'ui-select',
    formerImplementationPaths: ['src/components/ui/select/select.ts'],
    status: 'native-equivalent',
    functionalCompatibility: 'reduced',
    replacementContract:
      'Form selection surfaces use native select markup with explicit label association, name, and selected option state.',
    retainedDesignContract:
      'Select controls keep native form semantics and page-local styling without recreating the former custom listbox.',
    removedDesignContract: [
      'standalone ui-select custom element',
      'custom listbox role surface',
      'custom option role surface',
      'readonly select output',
      'former custom select API',
    ],
    notes: '旧資料由来: former custom select surface is reduced to native select markup.',
  },
  {
    tag: 'ui-icon',
    formerImplementationPaths: ['src/components/ui/icon/icon.ts'],
    status: 'static-helper',
    functionalCompatibility: 'partial',
    replacementContract:
      'Icons are emitted through renderStaticIconHtml() as static SVG, decorative by default with explicit semantic labeling support.',
    retainedDesignContract:
      'Icon output remains static, escaped, and independent from runtime custom element registration.',
    removedDesignContract: [
      'standalone ui-icon custom element',
      'iconify-icon runtime element output',
      'implicit semantic icon labeling',
    ],
    notes: '旧資料由来: former icon component is reduced to static SVG helper output.',
  },
  {
    tag: 'ui-empty-state',
    formerImplementationPaths: ['src/components/ui/empty-state/empty-state.ts'],
    status: 'static-helper',
    functionalCompatibility: 'partial',
    replacementContract:
      'Corpus pages and the memo index render empty-hint[data-empty-state] through static empty-state HTML for the supported page-local variants.',
    retainedDesignContract:
      'Empty states stay calm, page-local reading aids with escaped heading and description content.',
    removedDesignContract: [
      'standalone ui-empty-state custom element',
      'search empty state helper generalization',
      'trusted static HTML fields',
      'role="status" output from the helper',
    ],
    notes:
      '旧資料由来: former empty-state component is reduced to page-local static empty hint markup.',
  },
  {
    tag: 'ui-kbd',
    formerImplementationPaths: ['src/components/ui/kbd/kbd.ts'],
    status: 'native-equivalent',
    functionalCompatibility: 'reduced',
    replacementContract:
      'Keyboard hints use native kbd markup where needed, without a shared helper or custom element wrapper.',
    retainedDesignContract:
      'Keyboard notation keeps native inline semantics and page-local presentation.',
    removedDesignContract: [
      'standalone ui-kbd custom element',
      'tokens property',
      'component-level composite shortcut rendering',
      'key reading normalization',
      'sr-only reading support',
      'slot fallback API',
    ],
    notes: '旧資料由来: former keyboard component is reduced to native kbd markup.',
  },
] as const satisfies readonly StaticFirstMigrationTarget[];
