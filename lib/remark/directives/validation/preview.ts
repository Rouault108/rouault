import { readSourceNoteMetadata } from '../../../content/source-note-metadata.js';
import { toError } from '../shared/errors';
import type { DirectiveValidator } from './types';

export const previewSandboxValidator: DirectiveValidator = {
  name: 'preview-sandbox',
  validate(node, context) {
    const file = context.file;
    const sourceMetadata = readSourceNoteMetadata(file?.path);
    const children = node.children ?? [];
    let htmlCount = 0;
    let cssCount = 0;
    let jsCount = 0;

    for (const child of children) {
      if (child.type !== 'code') {
        throw toError(file, child, 'preview-sandbox には fenced code block のみ配置できます');
      }

      const language = child.lang?.trim().toLowerCase() ?? '';
      if (language === 'preview-html') {
        htmlCount += 1;
      } else if (language === 'preview-css') {
        cssCount += 1;
      } else if (language === 'preview-js') {
        jsCount += 1;
      }
    }

    if (htmlCount === 0) {
      throw toError(file, node, 'preview-sandbox には preview-html が必須です');
    }

    if (htmlCount > 1) {
      throw toError(file, node, 'preview-sandbox の preview-html は 1 つだけ指定できます');
    }

    if (cssCount > 1) {
      throw toError(file, node, 'preview-sandbox の preview-css は 1 つだけ指定できます');
    }

    if (jsCount > 1) {
      throw toError(file, node, 'preview-sandbox の preview-js は 1 つだけ指定できます');
    }

    const allowJs = node.data?.hProperties?.['allow-js'] === true;
    if (jsCount > 0 && !allowJs) {
      throw toError(
        file,
        node,
        'preview-js を使う場合、preview-sandbox の allow-js="true" が必要です',
      );
    }

    if (sourceMetadata.kind === 'reader') {
      throw toError(file, node, 'reader note では preview-sandbox を使用できません');
    }

    if (sourceMetadata.kind === 'testing' && sourceMetadata.testingArea !== 'sandbox') {
      throw toError(file, node, 'testing/sandbox 以外では preview-sandbox を使用できません');
    }

    if (allowJs && sourceMetadata.kind === 'testing' && sourceMetadata.testingArea !== 'sandbox') {
      throw toError(file, node, 'testing/sandbox 以外では allow-js="true" を使用できません');
    }
  },
};

export const codePreviewValidator: DirectiveValidator = {
  name: 'code-preview',
  validate(node, context) {
    const file = context.file;
    const sourceMetadata = readSourceNoteMetadata(file?.path);
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

    const controls = typeof node.data?.hProperties?.['controls'] === 'string'
      ? node.data.hProperties['controls'].trim()
      : '';
    if (sourceMetadata.kind === 'reader' && controls.length > 0) {
      throw toError(file, node, 'reader note の code-preview では controls を使用できません');
    }

    const hasToolbar = children.some((child) => child.type === 'rouaultDirectiveToolbarSlot');
    if (sourceMetadata.kind === 'reader' && hasToolbar) {
      throw toError(file, node, 'reader note の code-preview では toolbar slot を使用できません');
    }
  },
};
