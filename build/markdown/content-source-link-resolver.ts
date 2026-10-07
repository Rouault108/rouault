import path from 'node:path';
import { lstatSync, existsSync } from 'node:fs';
import {
  parseRawHref,
  resolveNoteSourceLink,
  type ResolveNoteSourceLinkInput,
  type ResolveNoteSourceLinkOptions,
} from './note-source-link-resolver.js';
import { resolveContentSourceLocation } from '../content/content-collections.js';
import { buildPublicationRouteRegistry } from '../content/publication-snapshot.js';
export const resolveContentSourceLink = (
  input: ResolveNoteSourceLinkInput,
  options: ResolveNoteSourceLinkOptions = {},
) => {
  if (options.sourceRootPaths) return resolveNoteSourceLink(input, options);
  const location = resolveContentSourceLocation(input.sourceFilePath);
  if (location.collection.schema === 'note') return resolveNoteSourceLink(input, options);
  const parsed = parseRawHref(input.href);
  if (parsed.kind !== 'relative-path' || !parsed.pathname.endsWith('.md'))
    return { kind: 'unchanged' as const, href: input.href };
  const root = path.resolve(location.sourceRoot);
  const target = path.resolve(path.dirname(input.sourceFilePath), parsed.pathname);
  const relative = path.relative(root, target).split(path.sep).join('/');
  if (!relative || relative.startsWith('../') || path.isAbsolute(relative))
    throw new Error('[links] target outside collection');
  let current = root;
  for (const segment of relative.split('/')) {
    current = path.join(current, segment);
    if (!existsSync(current) || lstatSync(current).isSymbolicLink())
      throw new Error('[links] missing or unsafe target');
  }
  const route = buildPublicationRouteRegistry({
    fixtureOnly: location.sourceRoot.startsWith('test/fixtures/'),
  }).get({ collectionId: location.collection.id, sourceRelativePath: relative });
  return {
    kind: 'resolved' as const,
    href: `${route.canonicalPathname}${parsed.search}${parsed.hash}`,
  };
};
