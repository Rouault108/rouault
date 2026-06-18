import {
  createSearchDialogDomController,
  type SearchDialogDomController,
} from './search-dialog-dom-controller.js';
import {
  isPlainPrimaryAnchorActivation,
  resolveAnchorFromActivationEvent,
} from '../../router/plain-primary-anchor-activation.js';

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

const findValidDialog = (): HTMLDialogElement | null =>
  queryWithinInvocationRoot<Element>(document, '[data-search-dialog-root]').find(
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
  void root;
  if (signal?.aborted === true) return;

  enhancementGeneration += 1;
  const generation = enhancementGeneration;
  if (activeEnhancement !== null) cleanupEnhancement(activeEnhancement);

  const listenerController = new AbortController();
  const controller = (() => {
    const dialog = findValidDialog();
    return dialog === null ? null : createSearchDialogDomController(dialog);
  })();
  const enhancement: ActiveEnhancement = { generation, listenerController, controller };
  activeEnhancement = enhancement;

  document.addEventListener(
    'click',
    (event) => {
      const anchor = resolveAnchorFromActivationEvent(event);
      if (
        !(anchor instanceof HTMLAnchorElement) ||
        !anchor.hasAttribute('data-search-dialog-trigger') ||
        !isPlainPrimaryAnchorActivation(event, anchor)
      ) {
        return;
      }
      const modality =
        event instanceof MouseEvent ? (event.detail === 0 ? 'keyboard' : 'pointer') : undefined;
      const opened =
        modality === undefined
          ? activeEnhancement?.controller?.tryOpen({ trigger: anchor }) === true
          : activeEnhancement?.controller?.tryOpen({ trigger: anchor, modality }) === true;
      if (opened) {
        event.preventDefault();
      }
    },
    { signal: listenerController.signal },
  );

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
