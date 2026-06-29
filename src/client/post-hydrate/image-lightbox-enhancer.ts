import { parseMediaSourcesAttribute } from '../../../shared/media/media-source-attributes.js';
import { renderStaticIconHtml } from '../../../shared/icons/render-static-icon-html.js';

const IMAGE_SELECTOR = 'figure[data-image][data-image-zoomable="true"]';
const TRIGGER_SELECTOR = 'button[data-image-zoom-trigger]';
const PREVIEW_IMAGE_SELECTOR = ':scope > [data-image-preview-frame] > img, :scope > img';
const DIALOG_SELECTOR = 'dialog[data-image-lightbox-dialog]';
const SURFACE_SELECTOR = '[data-image-lightbox-surface]';
const CLOSE_SELECTOR = '[data-image-lightbox-close]';
const LIGHTBOX_IMAGE_SELECTOR = 'img.image-lightbox-image';

const createSourceElements = (serialized: string | null): HTMLSourceElement[] => {
  return parseMediaSourcesAttribute(serialized).map((source) => {
    const element = document.createElement('source');
    element.type = source.type;
    element.srcset = source.srcset;
    if (source.sizes) {
      element.sizes = source.sizes;
    }
    return element;
  });
};

const moveDialogBeforeCaption = (figure: HTMLElement, dialog: HTMLDialogElement): void => {
  const caption = figure.querySelector<HTMLElement>(':scope > figcaption');
  if (caption) {
    figure.insertBefore(dialog, caption);
    return;
  }

  figure.append(dialog);
};

const isCanonicalDialog = (dialog: HTMLDialogElement): boolean => {
  return (
    dialog.querySelector<HTMLElement>(SURFACE_SELECTOR) !== null &&
    dialog.querySelector<HTMLButtonElement>(CLOSE_SELECTOR) !== null &&
    dialog.querySelector<HTMLImageElement>(LIGHTBOX_IMAGE_SELECTOR) !== null
  );
};

const createDialog = (figure: HTMLElement, inlineImage: HTMLImageElement): HTMLDialogElement => {
  const captionText = figure.querySelector(':scope > figcaption')?.textContent?.trim() ?? '';

  const dialog = document.createElement('dialog');
  dialog.setAttribute('data-image-lightbox-dialog', 'true');
  dialog.className = 'image-lightbox-dialog';
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-label', '拡大画像');

  const surface = document.createElement('div');
  surface.className = 'image-lightbox-surface';
  surface.setAttribute('data-image-lightbox-surface', 'true');

  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.className = 'image-lightbox-close';
  closeButton.setAttribute('data-image-lightbox-close', 'true');
  closeButton.setAttribute('aria-label', '拡大画像を閉じる');
  closeButton.insertAdjacentHTML(
    'beforeend',
    renderStaticIconHtml('x', 'image-lightbox-close__icon'),
  );

  const picture = document.createElement('picture');
  for (const source of createSourceElements(figure.getAttribute('data-image-lightbox-sources'))) {
    picture.append(source);
  }

  const img = document.createElement('img');
  img.className = 'image-lightbox-image';
  img.alt = inlineImage.getAttribute('alt') ?? '';
  img.src = figure.getAttribute('data-image-lightbox-src') ?? inlineImage.getAttribute('src') ?? '';
  const srcset = figure.getAttribute('data-image-lightbox-srcset');
  const sizes = figure.getAttribute('data-image-lightbox-sizes');
  if (srcset) {
    img.srcset = srcset;
  }
  if (sizes) {
    img.sizes = sizes;
  }

  picture.append(img);
  surface.append(closeButton);
  surface.append(picture);

  if (captionText.length > 0) {
    const caption = document.createElement('p');
    caption.className = 'image-lightbox-caption';
    caption.textContent = captionText;
    surface.append(caption);
  }

  dialog.append(surface);
  return dialog;
};

const ensureDialog = (
  figure: HTMLElement,
  inlineImage: HTMLImageElement,
): HTMLDialogElement | null => {
  const existingDialog = figure.querySelector<HTMLDialogElement>(DIALOG_SELECTOR);
  if (existingDialog) {
    existingDialog.setAttribute('aria-modal', 'true');
    existingDialog.setAttribute('aria-label', '拡大画像');
    if (isCanonicalDialog(existingDialog)) {
      moveDialogBeforeCaption(figure, existingDialog);
      return existingDialog;
    }
    if (existingDialog.open) {
      return null;
    }
    existingDialog.remove();
  }

  const dialog = createDialog(figure, inlineImage);
  moveDialogBeforeCaption(figure, dialog);
  return isCanonicalDialog(dialog) ? dialog : null;
};

let scrollLockCount = 0;

const lockScroll = (): void => {
  if (scrollLockCount === 0) {
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
  }
  scrollLockCount += 1;
};

const unlockScroll = (): void => {
  scrollLockCount = Math.max(0, scrollLockCount - 1);
  if (scrollLockCount === 0) {
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
  }
};

const enhanceFigure = (figure: HTMLElement): void => {
  if (figure.dataset['imageEnhanced'] === 'true') {
    return;
  }

  const trigger = figure.querySelector<HTMLButtonElement>(TRIGGER_SELECTOR);
  if (!trigger) {
    return;
  }

  const inlineImage = figure.querySelector<HTMLImageElement>(PREVIEW_IMAGE_SELECTOR);
  if (!inlineImage) {
    return;
  }

  const dialog = ensureDialog(figure, inlineImage);
  if (!dialog || typeof dialog.showModal !== 'function') {
    return;
  }

  const surface = dialog.querySelector<HTMLElement>(SURFACE_SELECTOR);
  const closeButton = dialog.querySelector<HTMLButtonElement>(CLOSE_SELECTOR);
  const lightboxImage = dialog.querySelector<HTMLImageElement>(LIGHTBOX_IMAGE_SELECTOR);
  if (!surface || !closeButton || !lightboxImage) {
    return;
  }

  let returnFocusTo: HTMLElement | null = null;

  const closeDialog = (): void => {
    if (dialog.open) {
      dialog.close();
    }
  };

  trigger.addEventListener('click', () => {
    returnFocusTo = trigger;
    lockScroll();
    try {
      dialog.showModal();
    } catch {
      unlockScroll();
      returnFocusTo = null;
      trigger.hidden = true;
    }
  });

  dialog.addEventListener('click', (event) => {
    if (event.target === dialog || event.target === surface) {
      closeDialog();
    }
  });

  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    closeDialog();
  });

  dialog.addEventListener('close', () => {
    unlockScroll();
    if (returnFocusTo?.isConnected === true && !returnFocusTo.hidden) {
      returnFocusTo.focus();
    }
    returnFocusTo = null;
  });

  closeButton.addEventListener('click', () => {
    closeDialog();
  });

  figure.dataset['imageEnhanced'] = 'true';
  trigger.hidden = false;
};

export const enhanceImageLightboxes = (root: ParentNode): void => {
  const figures = Array.from(root.querySelectorAll<HTMLElement>(IMAGE_SELECTOR));
  for (const figure of figures) {
    enhanceFigure(figure);
  }
};
