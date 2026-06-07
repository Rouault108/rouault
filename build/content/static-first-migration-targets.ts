export type StaticFirstMigrationStatus =
  | 'absorbed-locally'
  | 'contract-reduced'
  | 'native-equivalent'
  | 'static-helper';

export type StaticFirstFunctionalCompatibility = 'partial' | 'reduced';

export interface StaticFirstMigrationTarget {
  readonly tag: string;
  readonly formerImplementationPaths: readonly string[];
  readonly status: StaticFirstMigrationStatus;
  readonly functionalCompatibility: StaticFirstFunctionalCompatibility;
  readonly notes: string;
}

export const STATIC_FIRST_MIGRATION_TARGETS = [
  {
    tag: 'ui-pagination',
    formerImplementationPaths: ['src/components/ui/pagination/pagination.ts'],
    status: 'absorbed-locally',
    functionalCompatibility: 'reduced',
    notes:
      '旧資料由来: standalone pagination component was absorbed into local static ui-list pagination markup.',
  },
  {
    tag: 'ui-skeleton',
    formerImplementationPaths: ['src/components/ui/skeleton/skeleton.ts'],
    status: 'contract-reduced',
    functionalCompatibility: 'partial',
    notes:
      '旧資料由来: former component API is reduced to visual skeleton utility and local static skeleton markup.',
  },
  {
    tag: 'ui-select',
    formerImplementationPaths: ['src/components/ui/select/select.ts'],
    status: 'native-equivalent',
    functionalCompatibility: 'reduced',
    notes: '旧資料由来: former custom select surface is reduced to native select markup.',
  },
  {
    tag: 'ui-icon',
    formerImplementationPaths: ['src/components/ui/icon/icon.ts'],
    status: 'static-helper',
    functionalCompatibility: 'partial',
    notes: '旧資料由来: former icon component is reduced to static SVG helper output.',
  },
  {
    tag: 'ui-empty-state',
    formerImplementationPaths: ['src/components/ui/empty-state/empty-state.ts'],
    status: 'static-helper',
    functionalCompatibility: 'partial',
    notes:
      '旧資料由来: former empty-state component is reduced to page-local static empty hint markup.',
  },
  {
    tag: 'ui-kbd',
    formerImplementationPaths: ['src/components/ui/kbd/kbd.ts'],
    status: 'native-equivalent',
    functionalCompatibility: 'reduced',
    notes: '旧資料由来: former keyboard component is reduced to native kbd markup.',
  },
] as const satisfies readonly StaticFirstMigrationTarget[];
