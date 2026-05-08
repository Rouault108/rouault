import {
  HYDRATION_MARKER_ATTRIBUTE,
  HYDRATION_MARKER_OWNER_ATTRIBUTE,
  HYDRATION_MARKER_SCOPE_ATTRIBUTE,
} from '../../shared/hydration/hydration-markers.js';
import { parseTocHeadingsJson, type TocHeading } from './toc-headings.js';

export interface TocJsonSourceScript {
  readonly sourceId: string;
  readonly ownerId: string;
  readonly hydrationOwnerId: string;
  readonly scopeId: string;
  readonly marker: 'toc-source';
  readonly headingCount: number;
}

export const TOC_JSON_SOURCE_SCRIPT_TYPE = 'application/json';

const readTrimmedAttribute = (element: Element, name: string): string | null => {
  const value = element.getAttribute(name)?.trim();
  return value && value.length > 0 ? value : null;
};

export const readTocJsonSourceScriptContract = (
  script: HTMLScriptElement,
): TocJsonSourceScript | null => {
  if (script.type !== TOC_JSON_SOURCE_SCRIPT_TYPE) {
    return null;
  }

  const sourceId = readTrimmedAttribute(script, 'id');
  const ownerId = readTrimmedAttribute(script, 'data-toc-owner-id');
  const hydrationOwnerId = readTrimmedAttribute(script, HYDRATION_MARKER_OWNER_ATTRIBUTE);
  const scopeId = readTrimmedAttribute(script, HYDRATION_MARKER_SCOPE_ATTRIBUTE);
  const marker = readTrimmedAttribute(script, HYDRATION_MARKER_ATTRIBUTE);
  if (
    sourceId === null ||
    ownerId === null ||
    hydrationOwnerId === null ||
    scopeId === null ||
    marker !== 'toc-source' ||
    ownerId !== hydrationOwnerId
  ) {
    return null;
  }

  return {
    sourceId,
    ownerId,
    hydrationOwnerId,
    scopeId,
    marker,
    headingCount: readTocJsonSourceScriptHeadings(script).length,
  };
};

export const readTocJsonSourceScriptHeadings = (script: HTMLScriptElement): TocHeading[] => {
  const result = parseTocHeadingsJson(script.text);
  return result === null ? [] : [...result];
};
