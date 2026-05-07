export const TOC_SOURCE_CLEANUP_DIRECTIVES = [
  'none',
  'cleanup-stale-source',
  'refresh-panel-content',
  'assert-css-artifact',
] as const;

export type TocSourceCleanupDirective = (typeof TOC_SOURCE_CLEANUP_DIRECTIVES)[number];

export interface TocSourceCleanupDecision {
  readonly directive: TocSourceCleanupDirective;
  readonly sourceId: string | null;
  readonly allowedDuringHydration: boolean;
}

export const createTocSourceCleanupDecision = (
  sourceId: string | null,
  directive: TocSourceCleanupDirective = 'cleanup-stale-source',
): TocSourceCleanupDecision => ({
  directive,
  sourceId,
  allowedDuringHydration: directive === 'none',
});
