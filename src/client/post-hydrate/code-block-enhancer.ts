const TOOLBAR_ATTRIBUTE = 'data-code-block-toolbar';
const ENHANCED_ATTRIBUTE = 'data-code-block-enhanced';
const OVERFLOWING_ATTRIBUTE = 'data-code-overflowing';

const getCodeText = (pre: HTMLElement): string => {
  const explicit = pre.getAttribute('data-code-raw');
  if (typeof explicit === 'string' && explicit.length > 0) {
    return explicit;
  }

  const code = pre.querySelector('code');
  return (code?.textContent ?? '').replace(/\r\n?/g, '\n').trimEnd();
};

const getMetaLabel = (pre: HTMLElement): string => {
  const filename = pre.getAttribute('data-code-filename')?.trim() ?? '';
  if (filename.length > 0) {
    return filename;
  }

  const label = pre.getAttribute('data-code-label')?.trim() ?? '';
  if (label.length > 0) {
    return label;
  }

  return pre.getAttribute('data-code-language')?.trim() ?? '';
};

const updateOverflowState = (pre: HTMLElement, hint: HTMLElement): void => {
  const isOverflowing = pre.scrollWidth > pre.clientWidth + 1;
  pre.toggleAttribute(OVERFLOWING_ATTRIBUTE, isOverflowing);
  hint.hidden = !isOverflowing;

  if (isOverflowing) {
    pre.tabIndex = 0;
  } else if (pre.getAttribute('tabindex') === '0') {
    pre.removeAttribute('tabindex');
  }
};

export const activateCodeBlockEnhancer = (element: HTMLElement): void => {
  if (element.tagName.toLowerCase() !== 'pre' || element.hasAttribute(ENHANCED_ATTRIBUTE)) {
    return;
  }

  const pre = element;
  const parent = pre.parentElement;
  if (!parent) {
    return;
  }

  pre.setAttribute(ENHANCED_ATTRIBUTE, '');

  const toolbar = document.createElement('div');
  toolbar.setAttribute(TOOLBAR_ATTRIBUTE, '');

  const meta = document.createElement('div');
  meta.setAttribute('data-code-block-meta', '');
  meta.textContent = getMetaLabel(pre);

  const actions = document.createElement('div');
  actions.setAttribute('data-code-block-actions', '');

  const hint = document.createElement('span');
  hint.setAttribute('data-code-overflow-hint', '');
  hint.textContent = 'Scroll';
  hint.hidden = true;
  actions.append(hint);

  const copyMode = pre.getAttribute('data-code-copy-mode')?.trim().toLowerCase() ?? 'auto';
  const copyable = pre.getAttribute('data-code-copyable')?.trim().toLowerCase() !== 'false';
  if (copyMode !== 'hidden' && copyable) {
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('data-code-copy-button', '');
    button.setAttribute('aria-label', 'コードをコピー');
    button.textContent = 'Copy';
    button.addEventListener('click', async () => {
      const codeText = getCodeText(pre);
      if (codeText.length === 0) {
        return;
      }

      try {
        await navigator.clipboard.writeText(codeText);
        button.textContent = 'Copied';
      } catch {
        button.textContent = 'Failed';
      }

      window.setTimeout(() => {
        button.textContent = 'Copy';
      }, 1500);
    });
    actions.prepend(button);
  }

  toolbar.append(meta, actions);
  parent.insertBefore(toolbar, pre);

  updateOverflowState(pre, hint);
  if (typeof ResizeObserver === 'function') {
    const observer = new ResizeObserver(() => {
      updateOverflowState(pre, hint);
    });
    observer.observe(pre);
  }
};
