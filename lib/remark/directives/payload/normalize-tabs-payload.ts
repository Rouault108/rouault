import type { MdastNode, VFileLike } from '../types.js';
import { TABS_ORIENTATIONS } from '../shared/constants.js';
import { pickOptional } from '../parser-core/parse-attributes.js';
import { toError } from '../shared/errors.js';
import { parseBooleanAttribute } from './normalize-helpers.js';
import type { PanelPayload, TabPayload, TabsPayload } from './payload-types.js';

export const normalizeTabsPayload = (
  attrs: Record<string, string>,
  node: MdastNode,
  file?: VFileLike,
): TabsPayload => {
  const orientation = pickOptional(attrs['orientation'])?.toLowerCase();
  if (orientation && !TABS_ORIENTATIONS.has(orientation)) {
    throw toError(file, node, 'tabs の orientation は horizontal/vertical のみ指定可能です');
  }

  return {
    kind: 'tabs',
    ...(pickOptional(attrs['selected-value'])
      ? { selectedValue: pickOptional(attrs['selected-value']) }
      : {}),
    ...(pickOptional(attrs['default-selected-value'])
      ? { defaultSelectedValue: pickOptional(attrs['default-selected-value']) }
      : {}),
    ...(orientation ? { orientation: orientation as TabsPayload['orientation'] } : {}),
    automaticActivation:
      parseBooleanAttribute(
        attrs['automatic-activation'],
        node,
        file,
        'tabs',
        'automatic-activation',
      ) === true,
    urlSync: parseBooleanAttribute(attrs['url-sync'], node, file, 'tabs', 'url-sync') === true,
  };
};

export const normalizeTabPayload = (attrs: Record<string, string>): TabPayload => ({
  kind: 'tab',
  ...(pickOptional(attrs['value']) ? { value: pickOptional(attrs['value']) } : {}),
});

export const normalizePanelPayload = (): PanelPayload => ({
  kind: 'panel',
});
