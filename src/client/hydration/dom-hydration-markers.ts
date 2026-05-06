import {
  HYDRATION_MARKER_ATTRIBUTE,
  HYDRATION_MARKER_OWNER_ATTRIBUTE,
  HYDRATION_MARKER_SCOPE_ATTRIBUTE,
  isHydrationMarkerName,
  type HydrationMarker,
} from '../../../shared/hydration/hydration-markers.js';

const readTrimmedAttribute = (element: Element, name: string): string | null => {
  const value = element.getAttribute(name)?.trim();
  return value && value.length > 0 ? value : null;
};

export const readDomHydrationMarker = (element: Element): HydrationMarker | null => {
  const marker = readTrimmedAttribute(element, HYDRATION_MARKER_ATTRIBUTE);
  const ownerId = readTrimmedAttribute(element, HYDRATION_MARKER_OWNER_ATTRIBUTE);
  const scopeId =
    readTrimmedAttribute(element, HYDRATION_MARKER_SCOPE_ATTRIBUTE) ??
    readTrimmedAttribute(element.closest(`[${HYDRATION_MARKER_SCOPE_ATTRIBUTE}]`) ?? element, HYDRATION_MARKER_SCOPE_ATTRIBUTE);

  if (!isHydrationMarkerName(marker) || ownerId === null || scopeId === null) {
    return null;
  }

  return { marker, ownerId, scopeId };
};
