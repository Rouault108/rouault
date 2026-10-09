import { enhanceCodeBlocks } from '../post-hydrate/code-block-enhancer.js';
import { enhanceCodeGroups } from '../post-hydrate/code-group-enhancer.js';
import { enhanceFootnotePopovers } from '../post-hydrate/footnote-popover-enhancer.js';
import { enhanceImageLightboxes } from '../post-hydrate/image-lightbox-enhancer.js';
import { enhanceScoreScroll } from '../post-hydrate/score-scroll-enhancer.js';
import { enhanceSearchDialog } from '../post-hydrate/search-dialog-enhancer.js';
import { enhanceSearchPage } from '../post-hydrate/search-page-enhancer.js';
import { enhanceLayoutHeader } from '../post-hydrate/layout-header-enhancer.js';
import { enhanceLayoutSidebar } from '../post-hydrate/layout-sidebar-enhancer.js';
import { enhanceNoteStaticSurface } from '../post-hydrate/note-static-surface-enhancer.js';
import type { HydrationActivationContext, HydrationRegistryEntry } from './types.js';

const activateCodeBlocks = ({ root, signal }: HydrationActivationContext): void => {
  enhanceCodeBlocks(root, signal);
};

const activateCodeGroups = ({ root }: HydrationActivationContext): void => {
  enhanceCodeGroups(root);
};

const activateNoteStaticSurface = ({ element, signal }: HydrationActivationContext): void => {
  enhanceNoteStaticSurface(element, signal);
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

const activateLayoutHeader = ({ root, signal }: HydrationActivationContext): void => {
  enhanceLayoutHeader(root, signal);
};

const activateScoreScroll = ({ element, signal }: HydrationActivationContext): void => {
  enhanceScoreScroll(element, signal);
};

const activateLayoutSidebar = ({ element, signal }: HydrationActivationContext): void => {
  enhanceLayoutSidebar(element, signal);
};

const isActivationCurrent = (context: HydrationActivationContext): boolean =>
  !context.signal.aborted && context.isCurrent();
const isElementConnected = (element: HTMLElement): boolean => element.isConnected;

const activateLayoutTocController = async (context: HydrationActivationContext) => {
  const { element } = context;
  if (!isActivationCurrent(context)) return { status: 'aborted' };
  if (!isElementConnected(element)) return { status: 'skipped', reason: 'element-disconnected' };

  if (element.getAttribute('data-toc-trigger-reserved') === 'true') {
    return;
  }

  const module = await import('../../components/layout/layout-toc-controller.js');
  if (!isActivationCurrent(context)) return { status: 'aborted' };
  if (!isElementConnected(element)) return { status: 'skipped', reason: 'element-disconnected' };
  return module.activateLayoutTocController(element);
};

export const HYDRATION_REGISTRY = [
  {
    tag: 'layout-header-enhancer',
    kind: 'enhancer',
    profiles: ['shell'],
    loader: () => Promise.resolve(undefined),
    activate: activateLayoutHeader,
  },
  {
    tag: 'router-document-host',
    kind: 'custom-element',
    profiles: ['shell'],
    loader: () => import('../../components/app/router-document-host.js'),
  },
  {
    tag: 'search-dialog-enhancer',
    kind: 'enhancer',
    profiles: ['shell'],
    loader: () => Promise.resolve(undefined),
    activate: activateSearchDialog,
  },
  {
    tag: 'search-page-enhancer',
    kind: 'enhancer',
    profiles: ['page'],
    loader: () => Promise.resolve(undefined),
    activate: activateSearchPage,
  },
  {
    tag: 'score-scroll-enhancer',
    kind: 'enhancer',
    profiles: ['note'],
    loader: () => Promise.resolve(undefined),
    activate: activateScoreScroll,
  },
  {
    tag: 'layout-sidebar-enhancer',
    kind: 'enhancer',
    profiles: ['shell'],
    loader: () => Promise.resolve(undefined),
    activate: activateLayoutSidebar,
  },
  {
    tag: 'layout-toc-controller',
    kind: 'custom-element',
    profiles: ['layout'],
    loader: () => import('../../components/layout/layout-toc-controller.js'),
    activate: activateLayoutTocController,
  },
  {
    tag: 'code-block-enhancer',
    kind: 'enhancer',
    profiles: ['note'],
    loader: () => Promise.resolve(undefined),
    activate: activateCodeBlocks,
  },
  {
    tag: 'code-group-enhancer',
    kind: 'enhancer',
    profiles: ['note'],
    loader: () => Promise.resolve(undefined),
    activate: activateCodeGroups,
  },
  {
    tag: 'note-static-surface-enhancer',
    kind: 'enhancer',
    profiles: ['note'],
    loader: () => Promise.resolve(undefined),
    activate: activateNoteStaticSurface,
  },
  {
    tag: 'code-preview-enhancer',
    kind: 'enhancer',
    profiles: ['note'],
    loader: () => import('../post-hydrate/code-preview-enhancer.js'),
    activate: async ({ element, signal }: HydrationActivationContext) => {
      const module = await import('../post-hydrate/code-preview-enhancer.js');
      return module.activateCodePreview(element, signal);
    },
  },
  {
    tag: 'preview-sandbox-enhancer',
    kind: 'enhancer',
    profiles: ['note'],
    loader: () => import('../post-hydrate/preview-sandbox-enhancer.js'),
    activate: async ({ element, signal }: HydrationActivationContext) => {
      const module = await import('../post-hydrate/preview-sandbox-enhancer.js');
      return module.activatePreviewSandbox(element, signal);
    },
  },
  {
    tag: 'footnote-popover-enhancer',
    kind: 'enhancer',
    profiles: ['note'],
    loader: () => Promise.resolve(undefined),
    activate: activateFootnotePopovers,
  },
  {
    tag: 'image-lightbox-enhancer',
    kind: 'enhancer',
    profiles: ['note'],
    loader: () => Promise.resolve(undefined),
    activate: activateImageLightboxes,
  },
  {
    tag: 'tabs-enhancer',
    kind: 'enhancer',
    profiles: ['note'],
    loader: () => import('../post-hydrate/tabs-enhancer.js'),
    activate: async ({ element, signal }: HydrationActivationContext) => {
      const module = await import('../post-hydrate/tabs-enhancer.js');
      return module.activateTabs(element, signal);
    },
  },
  {
    tag: 'translation-overlay-enhancer',
    kind: 'enhancer',
    profiles: ['note'],
    loader: () => import('../post-hydrate/translation-overlay-enhancer.js'),
    activate: async ({ element, signal }: HydrationActivationContext) => {
      const module = await import('../post-hydrate/translation-overlay-enhancer.js');
      return module.activateTranslationOverlay(element, signal);
    },
  },
  {
    tag: 'video-enhancer',
    kind: 'enhancer',
    profiles: ['note'],
    loader: () => import('../post-hydrate/video-enhancer.js'),
    activate: async ({ element, signal }: HydrationActivationContext) => {
      const module = await import('../post-hydrate/video-enhancer.js');
      return module.activateVideo(element, signal);
    },
  },
] as const satisfies readonly HydrationRegistryEntry[];

export const HYDRATION_REGISTRY_BY_TAG: ReadonlyMap<string, HydrationRegistryEntry> = new Map(
  HYDRATION_REGISTRY.map((entry) => [entry.tag, entry] as const),
);
