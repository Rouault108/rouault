const MAX_SCORE_SVG_BYTES = 256 * 1024;

const UNSAFE_ELEMENT_PATTERN = /<(script|foreignObject|symbol|use)\b[\s\S]*?<\/\1\s*>|<(script|foreignObject|symbol|use)\b[^>]*\/?>/giu;
const UNSAFE_EVENT_ATTRIBUTE_PATTERN = /\s+on[a-z0-9_-]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/giu;
const HREF_ATTRIBUTE_PATTERN = /\s+(?:xlink:)?href\s*=\s*(["'])(.*?)\1/giu;
const STYLE_ATTRIBUTE_PATTERN = /\s+style\s*=\s*(["'])(.*?)\1/giu;

const hasUnsafeHref = (value: string): boolean => {
  const normalized = value.trim().toLowerCase();
  return (
    normalized.startsWith('javascript:') ||
    normalized.startsWith('data:') ||
    normalized.startsWith('http:') ||
    normalized.startsWith('https:')
  );
};

const removeUnsafeHrefAttributes = (svg: string): string =>
  svg.replace(HREF_ATTRIBUTE_PATTERN, (match: string, _quote: string, value: string) =>
    hasUnsafeHref(value) ? '' : match,
  );

const removeUnsafeStyleAttributes = (svg: string): string =>
  svg.replace(STYLE_ATTRIBUTE_PATTERN, (match: string, _quote: string, value: string) =>
    /url\s*\(/iu.test(value) ? '' : match,
  );

const isEffectivelyEmptySvg = (svg: string): boolean => {
  const withoutSvgTags = svg
    .replace(/<svg\b[^>]*>/iu, '')
    .replace(/<\/svg\s*>/iu, '')
    .replace(/<!--[\s\S]*?-->/gu, '')
    .trim();
  return withoutSvgTags.length === 0;
};

export const sanitizeScoreSvg = (svg: string, sourceLabel = 'score SVG'): string => {
  const byteLength = new TextEncoder().encode(svg).byteLength;
  if (byteLength > MAX_SCORE_SVG_BYTES) {
    throw new Error(`[markdown] ${sourceLabel} のサイズが上限を超えています`);
  }

  const svgMatch = /<svg\b[\s\S]*?<\/svg\s*>/iu.exec(svg);
  if (!svgMatch) {
    throw new Error(`[markdown] ${sourceLabel} は svg root を持つ必要があります`);
  }

  let sanitized = svgMatch[0];
  if (!/\sviewBox\s*=/u.test(sanitized) && !/\sviewbox\s*=/u.test(sanitized)) {
    throw new Error(`[markdown] ${sourceLabel} は viewBox を持つ必要があります`);
  }

  sanitized = sanitized
    .replace(UNSAFE_ELEMENT_PATTERN, '')
    .replace(UNSAFE_EVENT_ATTRIBUTE_PATTERN, '');
  sanitized = removeUnsafeHrefAttributes(sanitized);
  sanitized = removeUnsafeStyleAttributes(sanitized);

  if (isEffectivelyEmptySvg(sanitized)) {
    throw new Error(`[markdown] ${sourceLabel} は sanitize 後に空です`);
  }

  return sanitized;
};
