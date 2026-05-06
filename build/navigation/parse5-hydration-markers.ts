import {
  HYDRATION_MARKER_ATTRIBUTE,
  HYDRATION_MARKER_OWNER_ATTRIBUTE,
  HYDRATION_MARKER_SCOPE_ATTRIBUTE,
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
  const marker = readTrimmedAttribute(element, HYDRATION_MARKER_ATTRIBUTE);
  const ownerId = readTrimmedAttribute(element, HYDRATION_MARKER_OWNER_ATTRIBUTE);
  const scopeId = readTrimmedAttribute(element, HYDRATION_MARKER_SCOPE_ATTRIBUTE);

  if (!isHydrationMarkerName(marker) || ownerId === null || scopeId === null) {
    return null;
  }

  return { marker, ownerId, scopeId };
};
