import type { HighlightPart, SearchDialogItem } from './search-dialog-types.js';

const escapeHtmlText = (value: string): string =>
  value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

export function resolveSearchDialogItemPath(
  item: SearchDialogItem,
  baseHref = window.location.href,
): string {
  if (typeof item.path === 'string' && item.path.trim() !== '') {
    return item.path.trim();
  }

  try {
    const url = new URL(item.renderHref, baseHref);
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return item.renderHref;
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

export function renderSearchDialogHighlightedText(value: string, query: string): string {
  const parts = splitSearchDialogHighlightParts(value, query);
  const hasMatch = parts.some((part) => part.matched);
  if (!hasMatch) {
    return escapeHtmlText(value);
  }

  return parts
    .map((part) =>
      part.matched
        ? `<mark data-highlight="true">${escapeHtmlText(part.text)}</mark>`
        : escapeHtmlText(part.text),
    )
    .join('');
}
