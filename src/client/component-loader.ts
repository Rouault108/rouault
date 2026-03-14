import {
  SSR_ALWAYS_LOAD_TAGS,
  SSR_NOTE_TARGET_TAGS,
  SSR_SEARCH_TARGET_TAGS,
  type SsrTargetTag,
} from '../ssr/targets.js';

let shellModulesPromise: Promise<void> | null = null;
let noteModulesPromise: Promise<void> | null = null;
let searchModulesPromise: Promise<void> | null = null;

type ComponentModuleLoader = () => Promise<unknown>;

const TAG_MODULE_LOADERS: Record<SsrTargetTag, ComponentModuleLoader> = {
  'ui-skip-link': () => import('../components/ui/skip-link/skip-link.js'),
  'layout-header': () => import('../components/layout/layout-header.js'),
  'app-router': () => import('../components/app/app-router.js'),
  'layout-footer': () => import('../components/layout/layout-footer.js'),
  'ui-search-dialog': () => import('../components/ui/search-dialog/search-dialog.js'),
  'ui-card': () => import('../components/ui/card/card.js'),
  'search-page': () => import('../components/search/search-page.js'),
  'tag-page': () => import('../components/tag/tag-page.js'),
  'ui-article-header': () => import('../components/ui/article-header/article-header.js'),
  'layout-sidebar': () => import('../components/layout/layout-sidebar.js'),
  'layout-toc': () => import('../components/layout/layout-toc.js'),
  'ui-table': () => import('../components/ui/table/table.js'),
  'ui-code-block': () => import('../components/ui/codeblock/codeblock.js'),
  'ui-blockquote': () => import('../components/ui/blockquote/blockquote.js'),
};

const matchesAnyTag = (root: ParentNode, selectors: readonly string[]): boolean =>
  selectors.some((selector) => root.querySelector(selector) !== null);

const loadModulesForTags = async (tagNames: readonly SsrTargetTag[]): Promise<void> => {
  const uniqueLoaders = new Set<ComponentModuleLoader>();

  for (const tagName of tagNames) {
    uniqueLoaders.add(TAG_MODULE_LOADERS[tagName]);
  }

  await Promise.all(
    [...uniqueLoaders].map(async (loadModule) => {
      await loadModule();
    }),
  );
};

export const loadShellModules = async (): Promise<void> => {
  shellModulesPromise ??= (async () => {
    await loadModulesForTags(SSR_ALWAYS_LOAD_TAGS);
  })();

  await shellModulesPromise;
};

export const loadNoteModules = async (): Promise<void> => {
  noteModulesPromise ??= (async () => {
    await loadModulesForTags(SSR_NOTE_TARGET_TAGS);
  })();

  await noteModulesPromise;
};

export const loadSearchModules = async (): Promise<void> => {
  searchModulesPromise ??= (async () => {
    await loadModulesForTags(SSR_SEARCH_TARGET_TAGS);
  })();

  await searchModulesPromise;
};

export const loadModulesForDocument = async (root: ParentNode = document): Promise<void> => {
  await loadShellModules();

  const pendingLoads: Promise<void>[] = [];

  if (matchesAnyTag(root, SSR_NOTE_TARGET_TAGS)) {
    pendingLoads.push(loadNoteModules());
  }

  if (matchesAnyTag(root, SSR_SEARCH_TARGET_TAGS)) {
    pendingLoads.push(loadSearchModules());
  }

  if (pendingLoads.length > 0) {
    await Promise.all(pendingLoads);
  }
};
