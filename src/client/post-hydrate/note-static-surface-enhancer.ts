import { activateStaticCopyButtons } from './static-copy-button-enhancer.js';
import { enhanceTableScroll } from './table-scroll-enhancer.js';

export const enhanceNoteStaticSurface = (root: ParentNode, signal?: AbortSignal): void => {
  activateStaticCopyButtons(root);
  enhanceTableScroll(root, signal);
};
