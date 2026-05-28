const CODE_BLOCK_ROOT_SELECTOR = '[data-code-block-root]:not([data-code-group-owned="true"])';

const enhanceStandaloneCodeBlock = (root: HTMLElement): void => {
  if (root.dataset['codeBlockEnhanced'] === 'true') {
    return;
  }

  root.dataset['codeBlockEnhanced'] = 'true';
};

export const enhanceCodeBlocks = (root: ParentNode): void => {
  const codeBlockRoots = Array.from(root.querySelectorAll<HTMLElement>(CODE_BLOCK_ROOT_SELECTOR));
  for (const codeBlockRoot of codeBlockRoots) {
    enhanceStandaloneCodeBlock(codeBlockRoot);
  }
};
