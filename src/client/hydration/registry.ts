import { hydrateArticleHeaderTags } from '../post-hydrate/article-header-tags.js';
import { enhanceCodeBlocks } from '../post-hydrate/code-block-enhancer.js';
import { enhanceCodeGroups } from '../post-hydrate/code-group-enhancer.js';

export interface HydrationActivationContext {
  readonly element: HTMLElement;
  readonly root: ParentNode;
  readonly signal: AbortSignal;
}

export interface HydrationRegistryEntry {
  readonly tag: string;
  readonly kind?: 'custom-element' | 'enhancer';
  readonly loader: () => Promise<unknown>;
  readonly activate?: (context: HydrationActivationContext) => void | Promise<void>;
}

interface ActivatableElement extends HTMLElement {
  activateHydration?: () => void | Promise<void>;
}

const activateElementMethod = ({ element }: HydrationActivationContext): void | Promise<void> => {
  return (element as ActivatableElement).activateHydration?.();
};

const activateArticleHeaderTags = ({ root, element }: HydrationActivationContext): void => {
  if (!root.contains(element)) {
    return;
  }

  hydrateArticleHeaderTags(root);
};

const activateCodeBlocks = ({ root }: HydrationActivationContext): void => {
  enhanceCodeBlocks(root);
};

const activateCodeGroups = ({ root }: HydrationActivationContext): void => {
  enhanceCodeGroups(root);
};

export const HYDRATION_REGISTRY = [
  {
    tag: 'ui-skip-link',
    loader: () => import('../../components/ui/skip-link/skip-link.js'),
  },
  {
    tag: 'layout-header',
    loader: () => import('../../components/layout/layout-header.js'),
  },
  {
    tag: 'app-router',
    loader: () => import('../../components/app/app-router.js'),
  },
  {
    tag: 'layout-footer',
    loader: () => import('../../components/layout/layout-footer.js'),
  },
  {
    tag: 'ui-search-dialog',
    loader: () => import('../../components/ui/search-dialog/search-dialog.js'),
  },
  {
    tag: 'ui-card',
    loader: () => import('../../components/ui/card/card.js'),
  },
  {
    tag: 'about-page',
    loader: () => import('../../components/about/about-page.js'),
  },
  {
    tag: 'search-page',
    loader: () => import('../../components/search/search-page.js'),
  },
  {
    tag: 'tag-page',
    loader: () => import('../../components/tag/tag-page.js'),
  },
  {
    tag: 'corpus-page',
    loader: () => import('../../components/corpus/corpus-page.js'),
  },
  {
    tag: 'corpora-overview-page',
    loader: () => import('../../components/corpus/corpora-overview-page.js'),
  },
  {
    tag: 'not-found-page',
    loader: () => import('../../components/not-found/not-found-page.js'),
  },
  {
    tag: 'ui-article-header',
    loader: () => import('../../components/ui/article-header/article-header.js'),
    activate: activateArticleHeaderTags,
  },
  {
    tag: 'layout-sidebar',
    loader: () => import('../../components/layout/layout-sidebar.js'),
  },
  {
    tag: 'layout-toc',
    loader: () => import('../../components/layout/layout-toc.js'),
    activate: activateElementMethod,
  },
  {
    tag: 'code-block-enhancer',
    kind: 'enhancer',
    loader: () => Promise.resolve(undefined),
    activate: activateCodeBlocks,
  },
  {
    tag: 'code-group-enhancer',
    kind: 'enhancer',
    loader: () => Promise.resolve(undefined),
    activate: activateCodeGroups,
  },
  {
    tag: 'ui-callout',
    loader: () => import('../../components/ui/callout/callout.js'),
  },
  {
    tag: 'ui-checkbox',
    loader: () => import('../../components/ui/checkbox/checkbox.js'),
  },
  {
    tag: 'ui-code-preview',
    loader: () => import('../../components/ui/code-preview/code-preview.js'),
  },
  {
    tag: 'ui-preview-sandbox',
    loader: () => import('../../components/ui/preview-sandbox/preview-sandbox.js'),
    activate: activateElementMethod,
  },
  {
    tag: 'ui-table',
    loader: () => import('../../components/ui/table/table.js'),
  },
  {
    tag: 'ui-blockquote',
    loader: () => import('../../components/ui/blockquote/blockquote.js'),
  },
  {
    tag: 'ui-details',
    loader: () => import('../../components/ui/details/details.js'),
  },
  {
    tag: 'ui-divider',
    loader: () => import('../../components/ui/divider/divider.js'),
  },
  {
    tag: 'ui-footnote',
    loader: () => import('../../components/ui/footnote/footnote.js'),
  },
  {
    tag: 'ui-highlight',
    loader: () => import('../../components/ui/highlight/highlight.js'),
  },
  {
    tag: 'ui-image',
    loader: () => import('../../components/ui/image/image.js'),
  },
  {
    tag: 'ui-info-box',
    loader: () => import('../../components/ui/info-box/info-box.js'),
  },
  {
    tag: 'ui-score',
    loader: () => import('../../components/ui/score/score.js'),
    activate: activateElementMethod,
  },
  {
    tag: 'ui-tabs',
    loader: () => import('../../components/ui/tabs/tabs.js'),
  },
  {
    tag: 'ui-translation',
    loader: () => import('../../components/ui/translation/translation.js'),
    activate: activateElementMethod,
  },
] as const satisfies readonly HydrationRegistryEntry[];

export const HYDRATION_REGISTRY_BY_TAG: ReadonlyMap<string, HydrationRegistryEntry> = new Map(
  HYDRATION_REGISTRY.map((entry) => [entry.tag, entry] as const),
);

export const HYDRATION_FALLBACK_SELECTOR = HYDRATION_REGISTRY.map((entry) => entry.tag).join(',');
