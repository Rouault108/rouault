import { html, nothing, type TemplateResult } from 'lit';
import type { HighlightPart, UiSearchDialogItem } from '../search-dialog.types';

export type SearchDialogHighlightRenderValue =
  | string
  | typeof nothing
  | (string | typeof nothing | TemplateResult)[];

export function resolveSearchDialogItemPath(
  item: UiSearchDialogItem,
  baseHref = window.location.href,
): string {
  if (typeof item.path === 'string' && item.path.trim() !== '') {
    return item.path.trim();
  }

  try {
    const url = new URL(item.url, baseHref);
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return item.url;
  }
}

export function splitSearchDialogHighlightParts(value: string, query: string): HighlightPart[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (normalizedQuery === '') {
    return [{ text: value, matched: false }];
  }

  const normalizedValue = value.toLowerCase();
  const parts: HighlightPart[] = [];
  let cursor = 0;

  while (cursor < value.length) {
    const matchIndex = normalizedValue.indexOf(normalizedQuery, cursor);
    if (matchIndex === -1) {
      const trailingText = value.slice(cursor);
      if (trailingText !== '') {
        parts.push({ text: trailingText, matched: false });
      }
      break;
    }

    if (matchIndex > cursor) {
      parts.push({ text: value.slice(cursor, matchIndex), matched: false });
    }

    const matchEnd = matchIndex + normalizedQuery.length;
    parts.push({ text: value.slice(matchIndex, matchEnd), matched: true });
    cursor = matchEnd;
  }

  return parts.length > 0 ? parts : [{ text: value, matched: false }];
}

export function renderSearchDialogHighlightedText(
  value: string,
  query: string,
): SearchDialogHighlightRenderValue {
  const parts = splitSearchDialogHighlightParts(value, query);
  const hasMatch = parts.some((part) => part.matched);
  if (!hasMatch) {
    return value;
  }

  return parts.map((part) =>
    part.matched
      ? html`<ui-search-highlight origin="search" .text=${part.text}></ui-search-highlight>`
      : part.text || nothing,
  );
}
