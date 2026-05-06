import { normalizeTocHeadings, type TocHeading } from './toc-headings.js';

export interface TocJsonSourceScript {
  readonly sourceId: string;
  readonly ownerId: string;
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
  const sourceId = readTrimmedAttribute(script, 'id');
  const ownerId = readTrimmedAttribute(script, 'data-toc-owner-id');
  if (sourceId === null || ownerId === null) {
    return null;
  }

  return {
    sourceId,
    ownerId,
    headingCount: readTocJsonSourceScriptHeadings(script).length,
  };
};

export const readTocJsonSourceScriptHeadings = (script: HTMLScriptElement): TocHeading[] => {
  try {
    return normalizeTocHeadings(JSON.parse(script.textContent || '[]') as unknown);
  } catch {
    return [];
  }
};
