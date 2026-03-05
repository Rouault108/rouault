/**
 * @typedef {object} TocHeading
 * @property {string} id
 * @property {string} text
 * @property {number} level
 */

const HEADING_PATTERN = /<h([2-6])\b([^>]*)>([\s\S]*?)<\/h\1>/gi;
const TAG_PATTERN = /<[^>]+>/g;
const WHITESPACE_PATTERN = /\s+/g;

/**
 * @param {string} value
 * @returns {string}
 */
function decodeHtmlEntities(value) {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCodePoint(Number.parseInt(hex, 16)),
    )
    .replace(/&#([0-9]+);/g, (_, decimal) =>
      String.fromCodePoint(Number.parseInt(decimal, 10)),
    );
}

/**
 * @param {string} value
 * @returns {string}
 */
function stripTags(value) {
  return value.replace(TAG_PATTERN, '');
}

/**
 * @param {string} value
 * @returns {string}
 */
function normalizeText(value) {
  return decodeHtmlEntities(stripTags(value)).replace(WHITESPACE_PATTERN, ' ').trim();
}

/**
 * @param {string} attributes
 * @returns {string|null}
 */
function extractId(attributes) {
  const idMatch = attributes.match(/\sid=(?:"([^"]+)"|'([^']+)'|([^\s>]+))/i);
  if (!idMatch) {
    return null;
  }
  const id = (idMatch[1] ?? idMatch[2] ?? idMatch[3] ?? '').trim();
  return id.length > 0 ? decodeHtmlEntities(id) : null;
}

/**
 * HTML本文からTOC配列を抽出する。
 * @param {string} html
 * @returns {TocHeading[]}
 */
export function extractTocFromHtml(html) {
  const source = typeof html === 'string' ? html : '';
  if (source.length === 0) {
    return [];
  }

  /** @type {TocHeading[]} */
  const headings = [];
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

    headings.push({ id, text, level });
  }

  return headings;
}
