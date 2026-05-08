import {
  HYDRATION_MARKER_ATTRIBUTE,
  HYDRATION_MARKER_OWNER_ATTRIBUTE,
  HYDRATION_MARKER_SCOPE_ATTRIBUTE,
  type HydrationMarkerReadIssue,
  type Parse5HydrationMarkerReadResult,
  isHydrationMarkerName,
  type HydrationMarker,
} from '../../shared/hydration/hydration-markers.js';

export interface Parse5HydrationMarkerElement {
  readonly attrs: readonly { readonly name: string; readonly value: string }[];
}

const getAttribute = (element: Parse5HydrationMarkerElement, name: string): string | null =>
  element.attrs.find((attribute) => attribute.name === name)?.value ?? null;

const readTrimmedAttribute = (
  element: Parse5HydrationMarkerElement,
  name: string,
): string | null => {
  const value = getAttribute(element, name)?.trim();
  return value && value.length > 0 ? value : null;
};

export const readParse5HydrationMarker = (
  element: Parse5HydrationMarkerElement,
): HydrationMarker | null => {
  const result = readParse5HydrationMarkerResult(element);
  return result.status === 'valid' ? result.marker : null;
};

export const readParse5HydrationMarkerResult = (
  element: Parse5HydrationMarkerElement,
): Parse5HydrationMarkerReadResult => {
  const marker = readTrimmedAttribute(element, HYDRATION_MARKER_ATTRIBUTE);
  if (marker === null) {
    return { status: 'absent' };
  }

  const ownerId = readTrimmedAttribute(element, HYDRATION_MARKER_OWNER_ATTRIBUTE);
  const scopeId = readTrimmedAttribute(element, HYDRATION_MARKER_SCOPE_ATTRIBUTE);
  const issues: HydrationMarkerReadIssue[] = [];

  if (!isHydrationMarkerName(marker)) {
    issues.push({
      code: 'invalid-marker-name',
      attribute: HYDRATION_MARKER_ATTRIBUTE,
      value: marker,
    });
  }

  if (ownerId === null) {
    issues.push({
      code: 'missing-marker-owner',
      attribute: HYDRATION_MARKER_OWNER_ATTRIBUTE,
    });
  }

  if (scopeId === null) {
    issues.push({
      code: 'missing-marker-scope',
      attribute: HYDRATION_MARKER_SCOPE_ATTRIBUTE,
    });
  }

  if (issues.length > 0) {
    return { status: 'malformed', issues };
  }

  if (!isHydrationMarkerName(marker) || ownerId === null || scopeId === null) {
    return { status: 'malformed', issues };
  }

  return { status: 'valid', marker: { marker, ownerId, scopeId } };
};
