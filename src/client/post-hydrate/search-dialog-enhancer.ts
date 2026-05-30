import { dispatchSearchDialogEvent } from '../../search/search-dialog-events.js';
import {
  createSearchDialogDomController,
  type SearchDialogDomController,
} from './search-dialog-dom-controller.js';

interface ActiveEnhancement {
  readonly generation: number;
  readonly listenerController: AbortController;
  readonly controller: SearchDialogDomController | null;
}

let enhancementGeneration = 0;
let activeEnhancement: ActiveEnhancement | null = null;

const queryWithinInvocationRoot = <ElementType extends Element>(
  root: ParentNode,
  selector: string,
): ElementType[] => {
  const elements = [...root.querySelectorAll<ElementType>(selector)];
  if (root instanceof Element && root.matches(selector)) elements.unshift(root as ElementType);
  return elements;
};

const findValidDialog = (root: ParentNode): HTMLDialogElement | null =>
  queryWithinInvocationRoot<Element>(root, '[data-search-dialog-root]').find(
    (element): element is HTMLDialogElement =>
      element instanceof HTMLDialogElement &&
      element.isConnected &&
      element.ownerDocument === document,
  ) ?? null;

const cleanupEnhancement = (enhancement: ActiveEnhancement): void => {
  enhancement.listenerController.abort();
  enhancement.controller?.dispose();
};

export const enhanceSearchDialog = (root: ParentNode = document, signal?: AbortSignal): void => {
  if (signal?.aborted === true) return;

  enhancementGeneration += 1;
  const generation = enhancementGeneration;
  if (activeEnhancement !== null) cleanupEnhancement(activeEnhancement);

  const listenerController = new AbortController();
  const controller = (() => {
    const dialog = findValidDialog(root);
    return dialog === null ? null : createSearchDialogDomController(dialog);
  })();
  const enhancement: ActiveEnhancement = { generation, listenerController, controller };
  activeEnhancement = enhancement;

  for (const trigger of queryWithinInvocationRoot<HTMLElement>(
    root,
    '[data-search-dialog-trigger]',
  )) {
    trigger.addEventListener(
      'click',
      () => {
        dispatchSearchDialogEvent('search-dialog:open-request', {
          trigger,
          modality: 'pointer',
        });
      },
      { signal: listenerController.signal },
    );
  }

  signal?.addEventListener(
    'abort',
    () => {
      if (activeEnhancement?.generation !== generation) return;
      cleanupEnhancement(enhancement);
      activeEnhancement = null;
    },
    { once: true },
  );
};
