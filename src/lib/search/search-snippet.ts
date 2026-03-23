import type { SearchSnippet, SearchSnippetSegment } from './search-types.js';

const MAX_SNIPPET_LENGTH = 180;
const MAX_MATCH_SEGMENTS = 3;

function stripTags(value: string): string {
  return value.replace(/<[^>]+>/g, '');
}

function mergeSegments(segments: SearchSnippetSegment[]): SearchSnippetSegment[] {
  const merged: SearchSnippetSegment[] = [];

  for (const segment of segments) {
    if (segment.text.length === 0) {
      continue;
    }

    const previous = merged.at(-1);
    if (previous && previous.matched === segment.matched) {
      previous.text += segment.text;
      continue;
    }

    merged.push({ ...segment });
  }

  return merged;
}

function clampSnippet(text: string): string {
  if (text.length <= MAX_SNIPPET_LENGTH) {
    return text;
  }

  return `${text.slice(0, MAX_SNIPPET_LENGTH - 1)}…`;
}

export function snippetFromExcerptHtml(value: string): SearchSnippet | null {
  const normalized = value.trim();
  if (normalized.length === 0) {
    return null;
  }

  const parts = normalized.split(/(<\/?mark>)/i);
  let insideMark = false;
  let matchSegmentCount = 0;
  const segments: SearchSnippetSegment[] = [];

  for (const part of parts) {
    const lower = part.toLowerCase();
    if (lower === '<mark>') {
      insideMark = matchSegmentCount < MAX_MATCH_SEGMENTS;
      continue;
    }

    if (lower === '</mark>') {
      if (insideMark) {
        matchSegmentCount += 1;
      }
      insideMark = false;
      continue;
    }

    const text = stripTags(part);
    if (text.length === 0) {
      continue;
    }

    segments.push({
      text,
      matched: insideMark,
    });
  }

  const merged = mergeSegments(segments);
  if (merged.length === 0) {
    return null;
  }

  const totalLength = merged.reduce((sum, segment) => sum + segment.text.length, 0);
  if (totalLength <= MAX_SNIPPET_LENGTH) {
    return { segments: merged };
  }

  const clampedText = clampSnippet(merged.map((segment) => segment.text).join(''));
  return {
    segments: [{ text: clampedText, matched: false }],
  };
}

export function snippetFromDescription(value: string): SearchSnippet | null {
  const normalized = clampSnippet(value.trim());
  if (normalized.length === 0) {
    return null;
  }

  return {
    segments: [{ text: normalized, matched: false }],
  };
}
