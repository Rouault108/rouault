export const tocSideEffectDirectives = [
  'none',
  'cleanup-stale-source',
  'refresh-panel-content',
  'assert-css-artifact',
] as const;

export type TocSideEffectDirective = (typeof tocSideEffectDirectives)[number];

export interface TocSourceSideEffect {
  readonly directive: TocSideEffectDirective;
  readonly sourceId: string | null;
  readonly allowedDuringHydration: boolean;
}

export const createTocSourceSideEffect = (
  sourceId: string | null,
  directive: TocSideEffectDirective,
  options: { readonly allowedDuringHydration?: boolean } = {},
): TocSourceSideEffect => ({
  directive,
  sourceId,
  allowedDuringHydration: options.allowedDuringHydration ?? directive !== 'assert-css-artifact',
});
