const CODE_BLOCK_SELECTOR = 'pre[data-code-block]';
const CODE_BLOCK_ROOT_ATTRIBUTE = 'data-code-block-root';
const COPY_RESET_DELAY_MS = 1200;

const pickOptionalString = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const getIntentLabel = (intent: string | null): string | null => {
  switch (intent) {
    case 'valid':
      return '正しい例';
    case 'invalid':
      return '誤り例';
    default:
      return null;
  }
};

const shouldShowCopyButton = (pre: HTMLElement): boolean => {
  const mode = pre.dataset['codeCopyMode'] ?? 'auto';
  if (mode === 'hidden') {
    return false;
  }

  if (pre.dataset['codeCopyable'] === 'false') {
    return false;
  }

  const value = pickOptionalString(pre.dataset['codeRaw']);
  if (mode === 'always') {
    return true;
  }

  return value !== null;
};

const getCopyButtonLabel = (pre: HTMLElement): string =>
  pickOptionalString(pre.dataset['codeCopyLabel']) ?? 'コピー';

const createCopyButton = (pre: HTMLElement): HTMLButtonElement => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'code-surface-copy-button';

  const baseLabel = getCopyButtonLabel(pre);
  button.textContent = baseLabel;
  button.setAttribute('aria-label', baseLabel);

  const copyValue = pickOptionalString(pre.dataset['codeRaw']);
  if (!copyValue || pre.dataset['codeCopyable'] === 'false') {
    button.disabled = true;
    return button;
  }

  button.addEventListener('click', () => {
    void (async () => {
      try {
        await navigator.clipboard.writeText(copyValue);
        button.dataset['state'] = 'copied';
        button.textContent = 'コピー済み';
        window.setTimeout(() => {
          button.dataset['state'] = 'idle';
          button.textContent = baseLabel;
        }, COPY_RESET_DELAY_MS);
      } catch {
        button.dataset['state'] = 'failed';
        button.textContent = '失敗';
        window.setTimeout(() => {
          button.dataset['state'] = 'idle';
          button.textContent = baseLabel;
        }, COPY_RESET_DELAY_MS);
      }
    })();
  });

  return button;
};

const appendChip = (parent: HTMLElement, className: string, value: string | null): void => {
  if (!value) {
    return;
  }

  const chip = document.createElement('span');
  chip.className = className;
  chip.textContent = value;
  parent.append(chip);
};

const buildCaptionMain = (pre: HTMLElement): HTMLDivElement | null => {
  const filename = pickOptionalString(pre.dataset['codeFilename']);
  const label = pickOptionalString(pre.dataset['codeLabel']);
  const intentLabel = getIntentLabel(pre.dataset['codeIntent'] ?? null);

  if (!filename && !label && !intentLabel) {
    return null;
  }

  const main = document.createElement('div');
  main.className = 'code-surface-caption-main';

  if (filename) {
    const filenameNode = document.createElement('span');
    filenameNode.className = 'code-surface-filename';
    filenameNode.textContent = filename;
    main.append(filenameNode);
  }

  appendChip(main, 'code-surface-label', label);
  appendChip(main, 'code-surface-intent', intentLabel);

  return main.childNodes.length > 0 ? main : null;
};

const enhanceCodeBlock = (pre: HTMLElement): void => {
  if (pre.parentElement?.hasAttribute(CODE_BLOCK_ROOT_ATTRIBUTE)) {
    return;
  }

  const parent = pre.parentElement;
  if (!parent) {
    return;
  }

  const wrapper = document.createElement('div');
  wrapper.setAttribute(CODE_BLOCK_ROOT_ATTRIBUTE, 'true');
  wrapper.className = 'code-surface-root';

  const header = document.createElement('div');
  header.className = 'code-surface-caption';

  const captionMain = buildCaptionMain(pre);
  const copyButton = shouldShowCopyButton(pre) ? createCopyButton(pre) : null;

  const shouldRenderHeader = captionMain !== null || copyButton !== null;

  parent.insertBefore(wrapper, pre);
  wrapper.append(pre);

  if (shouldRenderHeader) {
    if (captionMain) {
      header.append(captionMain);
    }
    if (copyButton) {
      header.append(copyButton);
    }
    wrapper.insertBefore(header, pre);
  }

  pre.dataset['codeEnhanced'] = 'true';
};

export const enhanceCodeBlocks = (root: ParentNode): void => {
  const codeBlocks = root.querySelectorAll<HTMLElement>(CODE_BLOCK_SELECTOR);
  for (const codeBlock of codeBlocks) {
    enhanceCodeBlock(codeBlock);
  }
};
