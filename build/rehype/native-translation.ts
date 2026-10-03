import type { HastNode } from './hast-utils.js';
import {
  enhancerProperties,
  nativeElement,
  nativeRootProperties,
  nativeText,
  stringProperty,
} from './native-note-hast.js';

export const lowerNativeTranslation = (node: HastNode): void => {
  const original = stringProperty(node, 'original').trim() || '翻訳を表示';
  const translated = stringProperty(node, 'translated').trim();
  const lang = stringProperty(node, 'lang');
  if (!translated) {
    Object.assign(node, nativeElement('span', nativeRootProperties(node), [nativeText(original)]));
    return;
  }
  Object.assign(
    node,
    nativeElement(
      'details',
      {
        ...nativeRootProperties(node),
        'data-translation-overlay': '',
        'data-surface': stringProperty(node, 'surface') === 'drawer' ? 'drawer' : 'popover',
        ...enhancerProperties('translation-overlay-enhancer', 'visible'),
      },
      [
        nativeElement('summary', lang ? { lang } : {}, [nativeText(original)]),
        nativeElement(
          'div',
          {
            'data-translation-content': '',
            lang: stringProperty(node, 'target-lang').trim() || 'ja',
          },
          [nativeText(translated)],
        ),
      ],
    ),
  );
};
