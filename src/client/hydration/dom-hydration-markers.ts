import {
  HYDRATION_MARKER_ATTRIBUTE,
  HYDRATION_MARKER_OWNER_ATTRIBUTE,
  HYDRATION_MARKER_SCOPE_ATTRIBUTE,
  type DomHydrationMarkerReadResult,
  isHydrationMarkerName,
  type HydrationMarker,
} from '../../../shared/hydration/hydration-markers.js';

const readTrimmedAttribute = (element: Element, name: string): string | null => {
  const value = element.getAttribute(name)?.trim();
  return value && value.length > 0 ? value : null;
};

export const readDomHydrationMarker = (element: Element): HydrationMarker | null => {
  const result = readDomHydrationMarkerResult(element);
  return result.status === 'valid' ? result.marker : null;
};

export const readDomHydrationMarkerResult = (element: Element): DomHydrationMarkerReadResult => {
  const marker = readTrimmedAttribute(element, HYDRATION_MARKER_ATTRIBUTE);
  if (marker === null) {
    return { status: 'absent' };
  }

  const ownerId = readTrimmedAttribute(element, HYDRATION_MARKER_OWNER_ATTRIBUTE);
  const scopeId = readTrimmedAttribute(element, HYDRATION_MARKER_SCOPE_ATTRIBUTE);
  const issues: {
    readonly code: 'invalid-marker-name' | 'missing-marker-owner' | 'missing-marker-scope';
    readonly attribute: string;
    readonly value?: string;
  }[] = [];

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
