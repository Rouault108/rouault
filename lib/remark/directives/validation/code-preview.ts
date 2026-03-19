import { toError } from '../shared/errors';
import type { DirectiveValidator } from './types';

export const codePreviewValidator: DirectiveValidator = {
  name: 'code-preview',
  validate(node, context) {
    const file = context.file;
    const children = node.children ?? [];
    const sandboxChildren = children.filter(
      (child) => child.type === 'rouaultDirectivePreviewSandbox',
    );

    if (sandboxChildren.length === 0) {
      return;
    }

    const hasManualCodeArea = children.some(
      (child) =>
        child.type !== 'rouaultDirectivePreviewSandbox' &&
        child.type !== 'rouaultDirectivePreviewSlot' &&
        child.type !== 'rouaultDirectiveToolbarSlot',
    );

    if (hasManualCodeArea) {
      throw toError(
        file,
        node,
        'preview-sandbox を使う code-preview では手書きの code area を併用できません',
      );
    }
  },
};
