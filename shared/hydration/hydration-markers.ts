export type HydrationMarkerName = 'toc-owner' | 'toc-source' | 'toc-trigger' | 'reading-shell';

export interface HydrationMarker {
  readonly marker: HydrationMarkerName;
  readonly ownerId: string;
  readonly scopeId: string;
}

export const HYDRATION_MARKER_ATTRIBUTE = 'data-hydration-marker';
export const HYDRATION_MARKER_OWNER_ATTRIBUTE = 'data-hydration-owner-id';
export const HYDRATION_MARKER_SCOPE_ATTRIBUTE = 'data-hydration-scope';

export const createHydrationMarkerAttributes = (marker: HydrationMarker): Record<string, string> => ({
  [HYDRATION_MARKER_SCOPE_ATTRIBUTE]: marker.scopeId,
  [HYDRATION_MARKER_ATTRIBUTE]: marker.marker,
  [HYDRATION_MARKER_OWNER_ATTRIBUTE]: marker.ownerId,
});

export const isHydrationMarkerName = (value: unknown): value is HydrationMarkerName =>
  value === 'toc-owner' ||
  value === 'toc-source' ||
  value === 'toc-trigger' ||
  value === 'reading-shell';
