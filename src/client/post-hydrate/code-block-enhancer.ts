import '../../components/ui/copy-button/copy-button.js';
import {
  getCodeCopyValue,
  isCodeCopyDisabled,
  resolveStandaloneCopyButtonLabel,
} from './code-surface-shared.js';

const CODE_BLOCK_SELECTOR = 'pre[data-code-block]';

interface CopyButtonElement extends HTMLElement {
  disabled: boolean;
  label: string;
  size: 'sm' | 'md';
  value: string;
}

const isOwnedByCodeGroup = (pre: HTMLElement): boolean =>
  pre.closest('section[data-code-group]') !== null;

const syncCopyButton = (button: CopyButtonElement, pre: HTMLElement): void => {
  button.size = 'sm';
  button.label = resolveStandaloneCopyButtonLabel(pre);
  button.value = getCodeCopyValue(pre) ?? '';
  button.disabled = isCodeCopyDisabled(pre);
};

const enhanceStandaloneCodeBlock = (pre: HTMLElement): void => {
  const root = pre.closest<HTMLElement>('[data-code-block-root]');
  if (!root) {
    return;
  }

  const copyButton = root.querySelector<CopyButtonElement>(
    '.code-surface-copy-button-shell > ui-copy-button',
  );
  if (copyButton) {
    syncCopyButton(copyButton, pre);
  }

  root.dataset['enhanced'] = 'true';
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
