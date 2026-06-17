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
    tag: 'ui-pagination',
    formerImplementationPaths: ['src/components/ui/pagination/pagination.ts'],
    status: 'absorbed-locally',
    functionalCompatibility: 'reduced',
    replacementContract:
      'ui-list renders local nav.ui-pagination[data-pagination] markup for previous, current status, and next controls.',
    retainedDesignContract:
      'Pagination remains a quiet local list navigation affordance with clear current-page status.',
    removedDesignContract: [
      'standalone ui-pagination custom element',
      'numbered page item API',
      'ellipsis pagination API',
      'regular/compact/page variants',
    ],
    notes:
      '旧資料由来: standalone pagination component was absorbed into local static ui-list pagination markup.',
  },
  {
    tag: 'ui-skeleton',
    formerImplementationPaths: ['src/components/ui/skeleton/skeleton.ts'],
    status: 'contract-reduced',
    functionalCompatibility: 'partial',
    replacementContract:
      'Skeleton rendering is limited to existing visual CSS utility usage and ui-file-tree internal loading markup.',
    retainedDesignContract:
      'Skeleton surfaces remain visual-only loading placeholders without becoming a reusable public component API.',
    removedDesignContract: [
      'standalone ui-skeleton custom element',
      'variant property',
      'width property',
      'height property',
      'animated property',
    ],
    notes:
      '旧資料由来: former component API is reduced to visual skeleton utility and local static skeleton markup.',
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
      'Corpus pages render empty-hint[data-empty-state] through static empty-state HTML for the supported page-local variants.',
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
