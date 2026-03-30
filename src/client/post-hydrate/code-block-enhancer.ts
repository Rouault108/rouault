const CODE_BLOCK_SELECTOR = 'pre[data-code-block]';
const CODE_BLOCK_ROOT_ATTRIBUTE = 'data-code-block-root';
const GROUP_PANEL_SELECTOR = '[data-code-group-panel]';
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

const createCopyButton = (pre: HTMLElement): HTMLButtonElement => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'code-surface-copy-button';
  button.textContent = 'コピー';

  const copyValue = pickOptionalString(pre.dataset['codeRaw']);
  if (!copyValue || pre.dataset['codeCopyable'] === 'false') {
    button.disabled = true;
    return button;
  }

  button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(copyValue);
      button.dataset['state'] = 'copied';
      button.textContent = 'コピー済み';
      window.setTimeout(() => {
        button.dataset['state'] = 'idle';
        button.textContent = 'コピー';
      }, COPY_RESET_DELAY_MS);
    } catch {
      button.dataset['state'] = 'failed';
      button.textContent = '失敗';
      window.setTimeout(() => {
        button.dataset['state'] = 'idle';
        button.textContent = 'コピー';
      }, COPY_RESET_DELAY_MS);
    }
  });

  return button;
};

const enhanceStandaloneCodeBlock = (pre: HTMLElement): void => {
  if (pre.closest(GROUP_PANEL_SELECTOR)) {
    return;
  }

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

  const headerMain = document.createElement('div');
  headerMain.className = 'code-surface-caption-main';

  const filename = pickOptionalString(pre.dataset['codeFilename']);
  if (filename) {
    const filenameNode = document.createElement('span');
    filenameNode.className = 'code-surface-filename';
    filenameNode.textContent = filename;
    headerMain.append(filenameNode);
  }

  const intentLabel = getIntentLabel(pre.dataset['codeIntent'] ?? null);
  if (intentLabel) {
    const intentNode = document.createElement('span');
    intentNode.className = 'code-surface-intent';
    intentNode.textContent = intentLabel;
    headerMain.append(intentNode);
  }

  const shouldRenderHeader = headerMain.childNodes.length > 0 || shouldShowCopyButton(pre);
  if (headerMain.childNodes.length > 0) {
    header.append(headerMain);
  }

  if (shouldShowCopyButton(pre)) {
    header.append(createCopyButton(pre));
  }

  parent.insertBefore(wrapper, pre);
  wrapper.append(pre);

  if (shouldRenderHeader) {
    wrapper.insertBefore(header, pre);
  }

  pre.dataset['codeEnhanced'] = 'true';
};

export const enhanceCodeBlocks = (root: ParentNode): void => {
  const codeBlocks = root.querySelectorAll<HTMLElement>(CODE_BLOCK_SELECTOR);
  for (const codeBlock of codeBlocks) {
    enhanceStandaloneCodeBlock(codeBlock);
  }
};