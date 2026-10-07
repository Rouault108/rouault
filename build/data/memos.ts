import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { prepareTocHtml } from '../content/extract-toc-from-html.js';
import {
  getContentCollection,
  resolveContentSourceLocation,
} from '../content/content-collections.js';
import { ContentRouteRegistry } from '../content/content-route-registry.js';
import type { ContentIdentity, PublishedContentRecord } from '../content/content-record.js';
import type { TocChromeProjection } from '../../shared/toc/toc-chrome-projection.js';
export interface MemoRecord extends PublishedContentRecord {
  permalink: string;
  sourceRoot: string;
  date?: string;
  updated?: string;
  license: string;
  tocHeadings: TocChromeProjection['headings'];
  tocCapabilities: TocChromeProjection['capabilities'];
}
export interface SourceMemo {
  sourcePath: string;
  title: string;
  content: string;
  date?: string;
  updated?: string;
  license: string;
}
export const buildMemosCollection = (sources: readonly SourceMemo[]): MemoRecord[] => {
  const identities: ContentIdentity[] = sources.map((source) => ({
    collectionId: 'memos',
    sourceRelativePath: resolveContentSourceLocation(source.sourcePath).sourceRelativePath,
  }));
  const registry = new ContentRouteRegistry(identities);
  const collection = getContentCollection('memos');
  return sources.map((source, index) => {
    const identity = identities[index];
    if (!identity) throw new Error('[memos] missing identity');
    const route = registry.get(identity);
    const prepared = prepareTocHtml(source.content);
    return {
      identity,
      rawSlug: route.rawSlug,
      slug: route.slug,
      canonicalPathname: route.canonicalPathname,
      permalink: route.canonicalPathname,
      sourceRoot: resolveContentSourceLocation(source.sourcePath).sourceRoot,
      title: source.title,
      contentHtml: prepared.html,
      surfaces: collection.surfaces,
      chrome: collection.chrome,
      license: source.license,
      ...(source.date ? { date: source.date } : {}),
      ...(source.updated ? { updated: source.updated } : {}),
      tocHeadings: prepared.headings,
      tocCapabilities: {
        activeTracking: prepared.headings.length > 0,
        dynamicScopes: false,
        mobilePanel: prepared.headings.length > 0,
      },
    };
  });
};
export const loadMemosData = (): MemoRecord[] => {
  const file = path.join(process.cwd(), '.velite/memos.json');
  if (!existsSync(file)) return [];
  const sources: SourceMemo[] = JSON.parse(readFileSync(file, 'utf8'));
  return buildMemosCollection(sources);
};
