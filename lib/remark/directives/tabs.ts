import type { DirectiveHandler, MdastNode, VFileLike } from './types';
import { TABS_ORIENTATIONS } from './shared/constants';
import { assertAllowedAttributes, pickOptional } from './shared/attributes';
import { parseBooleanAttribute } from './shared/attribute-parsers';
import { toError } from './shared/errors';

export const applyTabsAttributes = (
  attrs: Record<string, string>,
  node: MdastNode,
  file?: VFileLike,
): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  const allowedKeys = new Set([
    'selected-value',
    'default-selected-value',
    'orientation',
    'automatic-activation',
    'url-sync',
  ]);
  assertAllowedAttributes(attrs, allowedKeys, node, file, 'tabs');

  const selectedValue = pickOptional(attrs['selected-value']);
  if (selectedValue) {
    result['selected-value'] = selectedValue;
  }

  const defaultSelectedValue = pickOptional(attrs['default-selected-value']);
  if (defaultSelectedValue) {
    result['default-selected-value'] = defaultSelectedValue;
  }

  const orientation = pickOptional(attrs['orientation'])?.toLowerCase();
  if (orientation) {
    if (!TABS_ORIENTATIONS.has(orientation)) {
      throw toError(file, node, 'tabs の orientation は horizontal/vertical のみ指定可能です');
    }
    result['orientation'] = orientation;
  }

  const automaticActivation = parseBooleanAttribute(
    attrs['automatic-activation'],
    node,
    file,
    'tabs',
    'automatic-activation',
  );
  if (automaticActivation === true) {
    result['automatic-activation'] = true;
  }

  const urlSync = parseBooleanAttribute(attrs['url-sync'], node, file, 'tabs', 'url-sync');
  if (urlSync === true) {
    result['url-sync'] = true;
  }

  return result;
};

export const applyTabSlotAttributes = (
  attrs: Record<string, string>,
  node: MdastNode,
  file?: VFileLike,
): Record<string, unknown> => {
  const result: Record<string, unknown> = { slot: 'tab' };
  const allowedKeys = new Set(['value']);
  assertAllowedAttributes(attrs, allowedKeys, node, file, 'tab');

  const value = pickOptional(attrs['value']);
  if (value) {
    result['value'] = value;
  }

  return result;
};

export const applyPanelSlotAttributes = (
  attrs: Record<string, string>,
  node: MdastNode,
  file?: VFileLike,
): Record<string, unknown> => {
  const allowedKeys = new Set<string>();
  assertAllowedAttributes(attrs, allowedKeys, node, file, 'panel');
  return { slot: 'panel' };
};

export const tabsHandler: DirectiveHandler = {
  name: 'tabs',
  toNode(marker, children, attrs, file) {
    return {
      type: 'rouaultDirectiveTabs',
      data: {
        hName: 'ui-tabs',
        hProperties: applyTabsAttributes(attrs, marker.node, file),
      },
      children,
    };
  },
};

export const tabSlotHandler: DirectiveHandler = {
  name: 'tab',
  toNode(marker, children, attrs, file) {
    return {
      type: 'rouaultDirectiveTabSlot',
      data: {
        hName: 'div',
        hProperties: applyTabSlotAttributes(attrs, marker.node, file),
      },
      children,
    };
  },
};

export const panelSlotHandler: DirectiveHandler = {
  name: 'panel',
  toNode(marker, children, attrs, file) {
    return {
      type: 'rouaultDirectivePanelSlot',
      data: {
        hName: 'div',
        hProperties: applyPanelSlotAttributes(attrs, marker.node, file),
      },
      children,
    };
  },
};
