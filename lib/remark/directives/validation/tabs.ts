import { toError } from '../shared/errors';
import { getDirectiveNameFromNode } from '../shared/directive-metadata';
import type { DirectiveValidator } from './types';

const getChildDirectiveName = (child: unknown): string | null => {
  if (!child || typeof child !== 'object') {
    return null;
  }

  return getDirectiveNameFromNode(child as Parameters<typeof getDirectiveNameFromNode>[0]);
};

export const tabsValidator: DirectiveValidator = {
  name: 'tabs',
  validate(node, context) {
    const file = context.file;
    const children = node.children ?? [];

    const tabChildren = children.filter((child) => getChildDirectiveName(child) === 'tab');
    const panelChildren = children.filter((child) => getChildDirectiveName(child) === 'panel');

    for (const child of children) {
      const directiveName = getChildDirectiveName(child);
      if (!directiveName) {
        continue;
      }

      if (directiveName !== 'tab' && directiveName !== 'panel') {
        throw toError(file, child, 'tabs の直下には tab または panel のみ配置できます');
      }
    }

    if (tabChildren.length === 0) {
      throw toError(file, node, 'tabs には少なくとも 1 つの tab が必要です');
    }

    if (panelChildren.length === 0) {
      throw toError(file, node, 'tabs には少なくとも 1 つの panel が必要です');
    }

    if (tabChildren.length !== panelChildren.length) {
      throw toError(file, node, 'tabs 直下の tab と panel の個数は一致している必要があります');
    }

    const seenValues = new Set<string>();

    for (const tabNode of tabChildren) {
      const value = tabNode.data?.hProperties?.['value'];
      if (typeof value !== 'string' || value.trim().length === 0) {
        throw toError(file, tabNode, 'tab には value 属性が必須です');
      }

      if (seenValues.has(value)) {
        throw toError(file, tabNode, `tab の value "${value}" が重複しています`);
      }

      seenValues.add(value);
    }

    const selectedValue = node.data?.hProperties?.['selected-value'];
    if (typeof selectedValue === 'string' && !seenValues.has(selectedValue)) {
      throw toError(
        file,
        node,
        `tabs の selected-value "${selectedValue}" に対応する tab.value が存在しません`,
      );
    }

    const defaultSelectedValue = node.data?.hProperties?.['default-selected-value'];
    if (typeof defaultSelectedValue === 'string' && !seenValues.has(defaultSelectedValue)) {
      throw toError(
        file,
        node,
        `tabs の default-selected-value "${defaultSelectedValue}" に対応する tab.value が存在しません`,
      );
    }
  },
};

export const tabValidator: DirectiveValidator = {
  name: 'tab',
  validate(node, context) {
    const file = context.file;
    const value = node.data?.hProperties?.['value'];

    if (typeof value !== 'string' || value.trim().length === 0) {
      throw toError(file, node, 'tab には value 属性が必須です');
    }
  },
};

export const panelValidator: DirectiveValidator = {
  name: 'panel',
  validate() {
    // 現時点では parent 制約は metadata 側で検証済み。
    // panel 固有の追加ルールが必要になったときの拡張点として残す。
  },
};
