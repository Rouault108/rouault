export type SearchViewState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'ready' }
  | { readonly kind: 'unavailable'; readonly reason: 'all-sources-unavailable' | 'search-runtime-unavailable' };
