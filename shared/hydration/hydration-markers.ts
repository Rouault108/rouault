import { HYDRATION_SCOPE_ATTRIBUTE } from './hydration-directives.js';

export const HYDRATION_MARKER_NAMES = ['toc-owner', 'toc-source', 'reading-shell'] as const;
export type HydrationMarkerName = (typeof HYDRATION_MARKER_NAMES)[number];

export interface HydrationMarker {
  readonly marker: HydrationMarkerName;
  readonly ownerId: string;
  readonly scopeId: string;
}

export const HYDRATION_MARKER_ATTRIBUTE = 'data-hydration-marker';
export const HYDRATION_MARKER_OWNER_ATTRIBUTE = 'data-hydration-owner-id';
export const HYDRATION_MARKER_SCOPE_ATTRIBUTE = HYDRATION_SCOPE_ATTRIBUTE;

export type HydrationMarkerReadIssueCode =
  | 'invalid-marker-name'
  | 'missing-marker-owner'
  | 'missing-marker-scope';

export interface HydrationMarkerReadIssue {
  readonly code: HydrationMarkerReadIssueCode;
  readonly attribute: string;
  readonly value?: string;
}

export type HydrationMarkerReadResult =
  | { readonly status: 'absent' }
  | { readonly status: 'valid'; readonly marker: HydrationMarker }
  | { readonly status: 'malformed'; readonly issues: readonly HydrationMarkerReadIssue[] };

export type DomHydrationMarkerReadResult = HydrationMarkerReadResult;
export type Parse5HydrationMarkerReadResult = HydrationMarkerReadResult;

export const createHydrationMarkerAttributes = (marker: HydrationMarker): Record<string, string> => ({
  [HYDRATION_MARKER_SCOPE_ATTRIBUTE]: marker.scopeId,
  [HYDRATION_MARKER_ATTRIBUTE]: marker.marker,
  [HYDRATION_MARKER_OWNER_ATTRIBUTE]: marker.ownerId,
});

export const isHydrationMarkerName = (value: unknown): value is HydrationMarkerName =>
  typeof value === 'string' && (HYDRATION_MARKER_NAMES as readonly string[]).includes(value);
