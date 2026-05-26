const CODE_BLOCK_SELECTOR = 'pre[data-code-block]';

const isOwnedByCodeGroup = (pre: HTMLElement): boolean =>
  pre.closest('section[data-code-group]') !== null;

const enhanceStandaloneCodeBlock = (pre: HTMLElement): void => {
  const root = pre.closest<HTMLElement>('[data-code-block-root]');
  if (!root) {
    return;
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
