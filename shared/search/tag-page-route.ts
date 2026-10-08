export interface TagPageDocumentRoute {
  readonly tag: string;
  readonly canonicalPathname: string;
  readonly outputPath: string;
}

const hasAsciiControlOrDelete = (value: string): boolean =>
  Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0);
    return codePoint !== undefined && (codePoint <= 0x1f || codePoint === 0x7f);
  });

const normalizeTag = (value: string): string => {
  const tag = value.trim();
  if (tag.length === 0) {
    throw new Error('[tag-page-route] tag must not be empty.');
  }
  return tag;
};

const normalizeTagPageOutputSegment = (value: string): string => {
  const tag = normalizeTag(value);
  if (
    tag === '.' ||
    tag === '..' ||
    tag.includes('/') ||
    tag.includes('\\') ||
    hasAsciiControlOrDelete(tag)
  ) {
    throw new Error('[tag-page-route] tag must be a safe single filesystem segment.');
  }
  return tag;
};

export const buildTagPageDocumentRoute = (value: string): TagPageDocumentRoute => {
  const tag = normalizeTagPageOutputSegment(value);
  return {
    tag,
    canonicalPathname: `/tags/${encodeURIComponent(tag)}/`,
    outputPath: `tags/${tag}/index.html`,
  };
};

export const buildTagPageCanonicalPathname = (tag: string): string =>
  `/tags/${encodeURIComponent(normalizeTag(tag))}/`;

export const buildTagPageOutputPath = (tag: string): string =>
  buildTagPageDocumentRoute(tag).outputPath;
