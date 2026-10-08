import type { CollectionId, PublicationSurfaces } from './content-collections.js';
export interface ContentIdentity {
  collectionId: CollectionId;
  sourceRelativePath: string;
}
export const contentIdentityKey = (identity: ContentIdentity): string =>
  JSON.stringify([identity.collectionId, identity.sourceRelativePath]);
export const contentIdentityDomKey = (identity: ContentIdentity): string =>
  `content-${Array.from(contentIdentityKey(identity))
    .map((character) => character.codePointAt(0)?.toString(16))
    .join('-')}`;
export const assertSafeContentPath = (value: string): void => {
  if (
    !value ||
    Array.from(value).some(
      (character) =>
        character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127 || character === '\\',
    ) ||
    value.startsWith('/') ||
    /^[a-z]:/iu.test(value) ||
    value.split('/').some((part) => !part || part === '.' || part === '..')
  ) {
    throw new Error('[content] unsafe source path');
  }
};
export interface PublishedContentRecord {
  identity: ContentIdentity;
  rawSlug: string;
  slug: string;
  canonicalPathname: string;
  outputPath: string;
  title: string;
  contentHtml: string;
  surfaces: PublicationSurfaces;
  chrome: 'reader' | 'memo';
}
