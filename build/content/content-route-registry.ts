import { getContentCollection } from './content-collections.js';
import {
  assertSafeContentPath,
  contentIdentityKey,
  type ContentIdentity,
} from './content-record.js';
export interface ContentRoute {
  identity: ContentIdentity;
  rawSlug: string;
  slug: string;
  canonicalPathname: string;
  outputPath: string;
}
export const resolveContentRoute = (identity: ContentIdentity): ContentRoute => {
  assertSafeContentPath(identity.sourceRelativePath);
  if (!identity.sourceRelativePath.endsWith('.md')) throw new Error('[routes] Markdown required');
  const rawSlug = identity.sourceRelativePath.slice(0, -3);
  if (rawSlug === 'index') throw new Error('[routes] root index conflicts with collection index');
  const slug = rawSlug.replace(/\/index$/u, '');
  const urlPrefix = getContentCollection(identity.collectionId).urlPrefix;
  const canonicalPathname = `${urlPrefix}/${slug.split('/').map(encodeURIComponent).join('/')}`;
  return {
    identity,
    rawSlug,
    slug,
    canonicalPathname,
    outputPath: `${urlPrefix.slice(1)}/${slug}/index.html`,
  };
};
export class ContentRouteRegistry {
  readonly byIdentity = new Map<string, ContentRoute>();
  readonly byPathname = new Map<string, ContentRoute>();
  constructor(identities: readonly ContentIdentity[], reservedPaths: readonly string[] = []) {
    const compatible = new Set(reservedPaths.map((value) => value.normalize('NFC').toLowerCase()));
    for (const identity of identities) {
      const route = resolveContentRoute(identity);
      const key = contentIdentityKey(identity);
      const compatibilityKey = `/${route.outputPath.slice(0, -'/index.html'.length)}`
        .normalize('NFC')
        .toLowerCase();
      if (this.byIdentity.has(key) || compatible.has(compatibilityKey))
        throw new Error('[routes] source or route collision');
      compatible.add(compatibilityKey);
      this.byIdentity.set(key, route);
      this.byPathname.set(route.canonicalPathname, route);
    }
  }
  get(identity: ContentIdentity): ContentRoute {
    const route = this.byIdentity.get(contentIdentityKey(identity));
    if (!route) throw new Error('[routes] source is not adopted');
    return route;
  }
}
