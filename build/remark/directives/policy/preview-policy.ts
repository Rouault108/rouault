import type { NotePolicyContext } from './note-policy-context.js';

export const getPreviewSandboxRestrictionMessage = (context: NotePolicyContext): string | null => {
  if (context.isReaderFacing) {
    return 'reader note では preview-sandbox を使用できません';
  }

  if (context.kind === 'testing' && context.testingArea !== 'sandbox') {
    return 'testing/sandbox 以外では preview-sandbox を使用できません';
  }

  return null;
};

export const getCodePreviewControlsRestrictionMessage = (
  context: NotePolicyContext,
): string | null =>
  context.allowsCodePreviewControls
    ? null
    : 'reader note の code-preview では controls を使用できません';

export const getCodePreviewToolbarRestrictionMessage = (
  context: NotePolicyContext,
): string | null =>
  context.allowsCodePreviewToolbar
    ? null
    : 'reader note の code-preview では toolbar slot を使用できません';
