import { activateStaticCopyButtons } from './static-copy-button-enhancer.js';

export const enhanceNoteStaticSurface = (root: ParentNode): void => {
  activateStaticCopyButtons(root);
};
