import type { NotePolicyContext } from './note-policy-context.js';

export const getSandboxJavaScriptRestrictionMessage = (
  context: NotePolicyContext,
): string | null => {
  if (context.allowsSandboxJavaScript) {
    return null;
  }

  if (context.isReaderFacing) {
    return 'reader note では allow-js="true" を使用できません';
  }

  return 'testing/sandbox 以外では allow-js="true" を使用できません';
};
