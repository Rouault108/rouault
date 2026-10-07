export type CollectionId = 'notes' | 'memos';
export interface PublicationSurfaces {
  home: boolean;
  tags: boolean;
  corpora: boolean;
  search: boolean;
}
export interface ContentCollectionConfig {
  id: CollectionId;
  sourceRoot: string;
  fixtureRoot: string;
  urlPrefix: string;
  schema: 'note' | 'imported-memo';
  chrome: 'reader' | 'memo';
  surfaces: PublicationSurfaces;
  archivePolicy: 'existing-notes-contract' | 'none';
}
export const contentCollections = [
  {
    id: 'notes',
    sourceRoot: 'content/notes',
    fixtureRoot: 'test/fixtures/content/notes',
    urlPrefix: '/notes',
    schema: 'note',
    chrome: 'reader',
    surfaces: { home: true, tags: true, corpora: true, search: true },
    archivePolicy: 'existing-notes-contract',
  },
  {
    id: 'memos',
    sourceRoot: 'content/memos',
    fixtureRoot: 'test/fixtures/content/memos',
    urlPrefix: '/memos',
    schema: 'imported-memo',
    chrome: 'memo',
    surfaces: { home: false, tags: false, corpora: false, search: false },
    archivePolicy: 'none',
  },
] as const satisfies readonly ContentCollectionConfig[];
export const getContentCollection = (id: CollectionId): ContentCollectionConfig => {
  const collection = contentCollections.find((item) => item.id === id);
  if (!collection) throw new Error('[collections] unregistered collection');
  return collection;
};
export interface ContentAdoptionOptions {
  fixtureOnly?: boolean;
}
export const getAdoptedContentRoots = (
  id: CollectionId,
  options: ContentAdoptionOptions = {},
): readonly string[] => {
  const collection = getContentCollection(id);
  if (options.fixtureOnly) return [collection.fixtureRoot];
  // notesの既存fixture契約を保ち、新設memo fixtureは検証入口が明示した時だけ採用する。
  return [
    collection.sourceRoot,
    ...(id === 'notes' || process.env['ROUAULT_MEMO_FIXTURES'] === '1'
      ? [collection.fixtureRoot]
      : []),
  ];
};
export const resolveContentSourceLocation = (value: string) => {
  const normalized = value.replace(/\\/gu, '/').replace(/^\.\//u, '');
  const roots = contentCollections
    .flatMap((collection) =>
      [collection.sourceRoot, collection.fixtureRoot].map((sourceRoot) => ({
        collection,
        sourceRoot,
      })),
    )
    .sort((a, b) => b.sourceRoot.length - a.sourceRoot.length);
  for (const { collection, sourceRoot } of roots) {
    const prefix = `${sourceRoot}/`;
    const index = normalized.startsWith(prefix) ? 0 : normalized.indexOf(`/${prefix}`) + 1;
    if (index >= 0 && normalized.slice(index).startsWith(prefix)) {
      return {
        collection,
        sourceRoot,
        sourceRelativePath: normalized.slice(index + prefix.length),
      };
    }
  }
  throw new Error('[collections] unsupported source root');
};
