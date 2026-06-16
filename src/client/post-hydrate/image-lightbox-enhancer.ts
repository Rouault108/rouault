import { parseMediaSourcesAttribute } from '../../../shared/media/media-source-attributes.js';
import { renderStaticIconHtml } from '../../../shared/icons/render-static-icon-html.js';

const IMAGE_SELECTOR = 'figure[data-image][data-image-zoomable="true"]';
const TRIGGER_SELECTOR = 'button[data-image-zoom-trigger]';

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

const ensureDialog = (figure: HTMLElement): HTMLDialogElement | null => {
  let dialog = figure.querySelector<HTMLDialogElement>('dialog[data-image-lightbox-dialog]');
  if (dialog) {
    return dialog;
  }

  dialog = document.createElement('dialog');
  dialog.setAttribute('data-image-lightbox-dialog', 'true');
  dialog.className = 'image-lightbox-dialog';
  dialog.setAttribute('aria-modal', 'true');

  const surface = document.createElement('div');
  surface.className = 'image-lightbox-surface';

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
  img.alt = figure.querySelector('img')?.getAttribute('alt') ?? '';
  img.src =
    figure.getAttribute('data-image-lightbox-src') ??
    figure.querySelector('img')?.getAttribute('src') ??
    '';
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

  const captionText = figure.querySelector('figcaption')?.textContent.trim() ?? '';
  if (captionText.length > 0) {
    const caption = document.createElement('p');
    caption.className = 'image-lightbox-caption';
    caption.textContent = captionText;
    surface.append(caption);
  }

  dialog.append(surface);
  figure.append(dialog);
  return dialog;
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

  const dialog = ensureDialog(figure);
  if (!dialog || typeof dialog.showModal !== 'function') {
    trigger.hidden = true;
    return;
  }

  let returnFocusTo: HTMLElement | null = null;

  const closeDialog = (): void => {
    if (dialog.open) {
      dialog.close();
    }
    unlockScroll();
    returnFocusTo?.focus();
    returnFocusTo = null;
  };

  trigger.addEventListener('click', () => {
    returnFocusTo = trigger;
    lockScroll();
    dialog.showModal();
  });

  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) {
      closeDialog();
    }
  });

  dialog.addEventListener('close', () => {
    unlockScroll();
    returnFocusTo?.focus();
    returnFocusTo = null;
  });

  dialog
    .querySelector<HTMLButtonElement>('[data-image-lightbox-close]')
    ?.addEventListener('click', () => {
      closeDialog();
    });

  figure.dataset['imageEnhanced'] = 'true';
};

export const enhanceImageLightboxes = (root: ParentNode): void => {
  const figures = Array.from(root.querySelectorAll<HTMLElement>(IMAGE_SELECTOR));
  for (const figure of figures) {
    enhanceFigure(figure);
  }
};
