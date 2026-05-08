import { enhanceCodeBlocks } from '../post-hydrate/code-block-enhancer.js';
import { enhanceCodeGroups } from '../post-hydrate/code-group-enhancer.js';
import { enhanceFootnotePopovers } from '../post-hydrate/footnote-popover-enhancer.js';
import { enhanceImageLightboxes } from '../post-hydrate/image-lightbox-enhancer.js';
import type { HydrationActivationContext, HydrationRegistryEntry } from './types.js';

interface ActivatableElement extends HTMLElement {
  activateHydration?: () => void | Promise<void>;
}

const activateElementMethod = ({ element }: HydrationActivationContext): void | Promise<void> => {
  return (element as ActivatableElement).activateHydration?.();
};

const activateCodeBlocks = ({ root }: HydrationActivationContext): void => {
  enhanceCodeBlocks(root);
};

const activateCodeGroups = ({ root }: HydrationActivationContext): void => {
  enhanceCodeGroups(root);
};

const activateImageLightboxes = ({ root }: HydrationActivationContext): void => {
  enhanceImageLightboxes(root);
};

const activateFootnotePopovers = ({ root }: HydrationActivationContext): void => {
  enhanceFootnotePopovers(root);
};

const activateLayoutSidebar = ({ element }: HydrationActivationContext): void => {
  if (!element.isConnected) {
    return;
  }
};

const activateLayoutTocController = async ({
  element,
  signal,
}: HydrationActivationContext) => {
  if (signal.aborted) {
    return;
  }

  if (element.getAttribute('data-toc-trigger-reserved') === 'true') {
    return;
  }

  const module = await import('../../components/layout/layout-toc-controller.js');
  return module.activateLayoutTocController(element);
};

export const HYDRATION_REGISTRY = [
  {
    tag: 'ui-skip-link',
    kind: 'custom-element',
    loader: () => import('../../components/ui/skip-link/skip-link.js'),
  },
  {
    tag: 'layout-header',
    kind: 'custom-element',
    loader: () => import('../../components/layout/layout-header.js'),
  },
  {
    tag: 'app-router',
    kind: 'custom-element',
    loader: () => import('../../components/app/app-router.js'),
  },
  {
    tag: 'layout-footer',
    kind: 'custom-element',
    loader: () => import('../../components/layout/layout-footer.js'),
  },
  {
    tag: 'ui-search-dialog',
    kind: 'custom-element',
    loader: () => import('../../components/ui/search-dialog/search-dialog.js'),
  },
  {
    tag: 'ui-card',
    kind: 'custom-element',
    loader: () => import('../../components/ui/card/card.js'),
  },
  {
    tag: 'search-page',
    kind: 'custom-element',
    loader: () => import('../../components/search/search-page.js'),
  },
  {
    tag: 'tag-page',
    kind: 'custom-element',
    loader: () => import('../../components/tag/tag-page.js'),
  },
  {
    tag: 'corpus-page',
    kind: 'custom-element',
    loader: () => import('../../components/corpus/corpus-page.js'),
  },
  {
    tag: 'corpora-overview-page',
    kind: 'custom-element',
    loader: () => import('../../components/corpus/corpora-overview-page.js'),
  },
  {
    tag: 'not-found-page',
    kind: 'custom-element',
    loader: () => import('../../components/not-found/not-found-page.js'),
  },
  {
    tag: 'layout-sidebar',
    kind: 'custom-element',
    loader: () => import('../../components/layout/layout-sidebar.js'),
    preload: {
      when: 'planned',
      scopes: ['shell'],
    },
    bootMarker: {
      attribute: 'data-sidebar-boot-state',
      value: 'ssr',
      remove: 'after-activation',
    },
    activate: activateLayoutSidebar,
  },
  {
    tag: 'layout-toc-controller',
    kind: 'custom-element',
    loader: () => import('../../components/layout/layout-toc-controller.js'),
    activate: activateLayoutTocController,
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
    tag: 'ui-checkbox',
    kind: 'custom-element',
    loader: () => import('../../components/ui/checkbox/checkbox.js'),
  },
  {
    tag: 'ui-code-preview',
    kind: 'custom-element',
    loader: () => import('../../components/ui/code-preview/code-preview.js'),
  },
  {
    tag: 'ui-preview-sandbox',
    kind: 'custom-element',
    loader: () => import('../../components/ui/preview-sandbox/preview-sandbox.js'),
    activate: activateElementMethod,
  },
  {
    tag: 'ui-details',
    kind: 'custom-element',
    loader: () => import('../../components/ui/details/details.js'),
  },
  {
    tag: 'footnote-popover-enhancer',
    kind: 'enhancer',
    loader: () => Promise.resolve(undefined),
    activate: activateFootnotePopovers,
  },
  {
    tag: 'ui-highlight',
    kind: 'custom-element',
    loader: () => import('../../components/ui/highlight/highlight.js'),
  },
  {
    tag: 'image-lightbox-enhancer',
    kind: 'enhancer',
    loader: () => Promise.resolve(undefined),
    activate: activateImageLightboxes,
  },
  {
    tag: 'ui-score',
    kind: 'custom-element',
    loader: () => import('../../components/ui/score/score.js'),
    activate: activateElementMethod,
  },
  {
    tag: 'ui-syntax-card',
    kind: 'custom-element',
    loader: () => import('../../components/ui/syntax-card/syntax-card.js'),
  },
  {
    tag: 'ui-syntax-section',
    kind: 'custom-element',
    loader: () => import('../../components/ui/syntax-card/syntax-section.js'),
  },
  {
    tag: 'ui-syntax-field',
    kind: 'custom-element',
    loader: () => import('../../components/ui/syntax-field/syntax-field.js'),
  },
  {
    tag: 'ui-tabs',
    kind: 'custom-element',
    loader: () => import('../../components/ui/tabs/tabs.js'),
  },
  {
    tag: 'ui-translation',
    kind: 'custom-element',
    loader: () => import('../../components/ui/translation/translation.js'),
    activate: activateElementMethod,
  },
] as const satisfies readonly HydrationRegistryEntry[];

export const HYDRATION_REGISTRY_BY_TAG: ReadonlyMap<string, HydrationRegistryEntry> = new Map(
  HYDRATION_REGISTRY.map((entry) => [entry.tag, entry] as const),
);
