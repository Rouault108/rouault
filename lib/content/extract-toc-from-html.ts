export interface TocHeading {
  id: string;
  text: string;
  level: number;
}

const HEADING_PATTERN = /<h([2-6])\b([^>]*)>([\s\S]*?)<\/h\1>/gi;
const TAG_PATTERN = /<[^>]+>/g;
const WHITESPACE_PATTERN = /\s+/g;

const decodeHtmlEntities = (value: string): string => {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) =>
      String.fromCodePoint(Number.parseInt(hex, 16)),
    )
    .replace(/&#([0-9]+);/g, (_, decimal: string) =>
      String.fromCodePoint(Number.parseInt(decimal, 10)),
    );
};

const stripTags = (value: string): string => value.replace(TAG_PATTERN, '');

const normalizeText = (value: string): string =>
  decodeHtmlEntities(stripTags(value)).replace(WHITESPACE_PATTERN, ' ').trim();

const extractId = (attributes: string): string | null => {
  const idMatch = attributes.match(/\sid=(?:"([^"]+)"|'([^']+)'|([^\s>]+))/i);
  if (!idMatch) {
    return null;
  }
  const id = (idMatch[1] ?? idMatch[2] ?? idMatch[3] ?? '').trim();
  return id.length > 0 ? decodeHtmlEntities(id) : null;
};

export const extractTocFromHtml = (html: string): TocHeading[] => {
  const source = typeof html === 'string' ? html : '';
  if (source.length === 0) {
    return [];
  }

  const headings: TocHeading[] = [];
  const matches = source.matchAll(HEADING_PATTERN);

  for (const match of matches) {
    const rawLevel = match[1];
    const rawAttributes = match[2] ?? '';
    const rawInner = match[3] ?? '';
    const id = extractId(rawAttributes);
    if (!id) {
      continue;
    }

    const text = normalizeText(rawInner);
    if (text.length === 0) {
      continue;
    }

    const level = Number.parseInt(rawLevel ?? '', 10);
    if (!Number.isFinite(level) || level < 2 || level > 6) {
      continue;
    }

    headings.push({
      id,
      text,
      level,
    });
  }

  return headings;
};
