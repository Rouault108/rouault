import '../../components/ui/copy-button/copy-button.js';
import {
  getCodeCopyValue,
  getIntentLabel,
  isCodeCopyDisabled,
  pickOptionalString,
  resolveStandaloneCopyButtonLabel,
  shouldRenderCodeCopyButton,
} from './code-surface-shared.js';

const CODE_BLOCK_SELECTOR = 'pre[data-code-block]';
const CODE_BLOCK_ROOT_ATTRIBUTE = 'data-code-block-root';

interface CopyButtonElement extends HTMLElement {
  disabled: boolean;
  label: string;
  size: 'sm' | 'md';
  value: string;
}

const isOwnedByCodeGroup = (pre: HTMLElement): boolean => pre.closest('section[data-code-group]') !== null;

const syncCopyButton = (button: CopyButtonElement, pre: HTMLElement): void => {
  button.size = 'sm';
  button.label = resolveStandaloneCopyButtonLabel(pre);
  button.value = getCodeCopyValue(pre) ?? '';
  button.disabled = isCodeCopyDisabled(pre);
};

const createCopyButton = (pre: HTMLElement): CopyButtonElement => {
  const button = document.createElement('ui-copy-button') as CopyButtonElement;
  syncCopyButton(button, pre);
  return button;
};

const buildCaptionMain = (pre: HTMLElement): HTMLDivElement | null => {
  const filename = pickOptionalString(pre.dataset['codeFilename']);
  const intentLabel = getIntentLabel(pre.dataset['codeIntent'] ?? null);

  if (!filename && !intentLabel) {
    return null;
  }

  const main = document.createElement('div');
  main.className = 'code-surface-caption-main';

  if (filename) {
    const filenameNode = document.createElement('span');
    filenameNode.className = 'code-surface-filename';
    filenameNode.textContent = filename;
    filenameNode.title = filename;
    main.append(filenameNode);
  }

  if (intentLabel) {
    const intentNode = document.createElement('span');
    intentNode.className = 'code-surface-intent';
    intentNode.textContent = intentLabel;
    main.append(intentNode);
  }

  return main.childNodes.length > 0 ? main : null;
};

const enhanceStandaloneCodeBlock = (pre: HTMLElement): void => {
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

  const captionMain = buildCaptionMain(pre);
  const shouldRenderCopyButton = shouldRenderCodeCopyButton(pre);
  const copyButton = shouldRenderCopyButton ? createCopyButton(pre) : null;
  const shouldRenderHeader = captionMain !== null || copyButton !== null;

  parent.insertBefore(wrapper, pre);
  wrapper.append(pre);

  if (shouldRenderHeader) {
    const header = document.createElement('div');
    header.className = 'code-surface-caption';

    if (captionMain) {
      header.append(captionMain);
    }

    if (copyButton) {
      const copyShell = document.createElement('div');
      copyShell.className = 'code-surface-copy-button-shell';
      copyShell.append(copyButton);
      header.append(copyShell);
    }

    if (captionMain === null) {
      wrapper.classList.add('code-surface-root--overlay');
    }

    wrapper.insertBefore(header, pre);
  }

  pre.dataset['codeEnhanced'] = 'true';
};

const enhanceCodeBlock = (pre: HTMLElement): void => {
  if (isOwnedByCodeGroup(pre)) {
    pre.dataset['codeEnhanced'] = 'true';
    return;
  }

  enhanceStandaloneCodeBlock(pre);
};

export const enhanceCodeBlocks = (root: ParentNode): void => {
  const codeBlocks = Array.from(root.querySelectorAll<HTMLElement>(CODE_BLOCK_SELECTOR));
  for (const codeBlock of codeBlocks) {
    enhanceCodeBlock(codeBlock);
  }
};