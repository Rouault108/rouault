export const TOC_HYDRATION_STATES = ['unhydrated', 'hydrating', 'hydrated', 'disposed'] as const;

export type TocHydrationState = (typeof TOC_HYDRATION_STATES)[number];

export const resolveTocHydrationState = (input: {
  readonly ready: boolean;
  readonly disposed?: boolean;
}): TocHydrationState => {
  if (input.disposed === true) {
    return 'disposed';
  }

  return input.ready ? 'hydrated' : 'hydrating';
};
