import { enhanceCodeBlocks } from '../post-hydrate/code-block-enhancer.js';
import { enhanceCodeGroups } from '../post-hydrate/code-group-enhancer.js';
import { enhanceFootnotePopovers } from '../post-hydrate/footnote-popover-enhancer.js';
import { enhanceImageLightboxes } from '../post-hydrate/image-lightbox-enhancer.js';
import { enhanceScoreScroll } from '../post-hydrate/score-scroll-enhancer.js';
import { enhanceSearchDialog } from '../post-hydrate/search-dialog-enhancer.js';
import { enhanceSearchPage } from '../post-hydrate/search-page-enhancer.js';
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

const activateSearchDialog = ({ root, signal }: HydrationActivationContext): void => {
  enhanceSearchDialog(root, signal);
};

const activateSearchPage = ({ root, signal }: HydrationActivationContext): void => {
  enhanceSearchPage(root, signal);
};

const activateScoreScroll = ({ element, signal }: HydrationActivationContext): void => {
  enhanceScoreScroll(element, signal);
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
    tag: 'search-dialog-enhancer',
    kind: 'enhancer',
    loader: () => Promise.resolve(undefined),
    activate: activateSearchDialog,
  },
  {
    tag: 'search-page-enhancer',
    kind: 'enhancer',
    loader: () => Promise.resolve(undefined),
    activate: activateSearchPage,
  },
  {
    tag: 'score-scroll-enhancer',
    kind: 'enhancer',
    loader: () => Promise.resolve(undefined),
    activate: activateScoreScroll,
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
    tag: 'footnote-popover-enhancer',
    kind: 'enhancer',
    loader: () => Promise.resolve(undefined),
    activate: activateFootnotePopovers,
  },
  {
    tag: 'image-lightbox-enhancer',
    kind: 'enhancer',
    loader: () => Promise.resolve(undefined),
    activate: activateImageLightboxes,
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
