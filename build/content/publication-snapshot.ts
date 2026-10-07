import { existsSync, lstatSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { load } from 'js-yaml';
import {
  contentCollections,
  getAdoptedContentRoots,
  type ContentCollectionConfig,
  type ContentAdoptionOptions,
} from './content-collections.js';
import { ContentRouteRegistry } from './content-route-registry.js';
import type { ContentIdentity } from './content-record.js';
export interface AdoptedContentSource {
  identity: ContentIdentity;
  sourceFilePath: string;
  collection: ContentCollectionConfig;
}
export const collectAdoptedContentSources = (
  options: ContentAdoptionOptions & { cwd?: string } = {},
): AdoptedContentSource[] => {
  const result: AdoptedContentSource[] = [];
  for (const collection of contentCollections) {
    const roots = getAdoptedContentRoots(collection.id, options);
    for (const root of roots) {
      const directory = path.resolve(options.cwd ?? process.cwd(), root);
      if (!existsSync(directory)) continue;
      const walk = (current: string): void => {
        if (lstatSync(current).isSymbolicLink()) throw new Error('[snapshot] symlink is forbidden');
        for (const entry of readdirSync(current, { withFileTypes: true })) {
          const file = path.join(current, entry.name);
          if (entry.isSymbolicLink()) throw new Error('[snapshot] symlink is forbidden');
          if (entry.isDirectory()) walk(file);
          else if (entry.isFile() && entry.name.endsWith('.md')) {
            const source = readFileSync(file, 'utf8');
            const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/u.exec(source);
            const metadata: unknown = frontmatter ? load(frontmatter[1] ?? '') : {};
            if (
              collection.schema === 'note' &&
              typeof metadata === 'object' &&
              metadata !== null &&
              'status' in metadata &&
              metadata.status === 'draft'
            )
              continue;
            result.push({
              identity: {
                collectionId: collection.id,
                sourceRelativePath: path.relative(directory, file).split(path.sep).join('/'),
              },
              sourceFilePath: file,
              collection,
            });
          }
        }
      };
      walk(directory);
    }
  }
  return result;
};
export const buildPublicationRouteRegistry = (
  options: ContentAdoptionOptions & { cwd?: string } = {},
): ContentRouteRegistry =>
  new ContentRouteRegistry(
    collectAdoptedContentSources(options).map((source) => source.identity),
    ['/memos/', '/search/', '/about/', '/corpora/'],
  );
