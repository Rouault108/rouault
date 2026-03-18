import { toError } from '../shared/errors';
import type { DirectiveValidator } from './types';

export const previewSandboxValidator: DirectiveValidator = {
  name: 'preview-sandbox',
  validate(node, context) {
    const file = context.file;
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
  },
};