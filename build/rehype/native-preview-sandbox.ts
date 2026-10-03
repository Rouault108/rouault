import { setStyleCustomProperty, type HastNode, type HastProperties } from './hast-utils.js';
import { normalizePreviewSandboxContentLayout } from '../../shared/preview-sandbox/content-layout.js';
import {
  booleanProperty,
  enhancerProperties,
  nativeElement,
  nativeRootProperties,
  nativeText,
  stringProperty,
} from './native-note-hast.js';

export const lowerNativePreviewSandbox = (node: HastNode, documentUrl: string): void => {
  const activationInput = stringProperty(node, 'activation-policy');
  const activation = ['eager', 'visible', 'manual'].includes(activationInput)
    ? activationInput
    : 'visible';
  const heightModeInput = stringProperty(node, 'height-mode');
  const heightMode = ['fixed', 'auto', 'bounded-auto'].includes(heightModeInput)
    ? heightModeInput
    : 'auto';
  let baseUrl: string;
  try {
    baseUrl = new URL(stringProperty(node, 'base-url')).href;
  } catch {
    baseUrl = new URL(documentUrl).href;
  }
  const positiveNumber = (name: string): number | undefined => {
    const number = Number(node.properties?.[name]);
    return Number.isFinite(number) && number > 0 ? Math.ceil(number) : undefined;
  };
  const properties: HastProperties = {
    ...nativeRootProperties(node),
    'data-preview-sandbox-root': '',
    'data-sandbox-iframe-title':
      stringProperty(node, 'iframe-title').trim() || 'プレビュー sandbox',
    'data-sandbox-base-url': baseUrl,
    'data-sandbox-height': String(positiveNumber('height') ?? 160),
    'data-sandbox-height-mode': heightMode,
    'data-sandbox-content-layout': normalizePreviewSandboxContentLayout(
      stringProperty(node, 'content-layout'),
    ),
    'data-activation-policy': activation,
    ...enhancerProperties(
      'preview-sandbox-enhancer',
      activation === 'eager' ? 'initial' : activation === 'manual' ? 'interaction' : 'visible',
      'sandboxed',
    ),
  };
  const maximum = positiveNumber('max-height');
  if (maximum !== undefined) properties['data-sandbox-max-height'] = String(maximum);
  for (const name of [
    'allow-js',
    'allow-forms',
    'allow-downloads',
    'allow-pointer-lock',
    'allow-popups',
  ]) {
    if (booleanProperty(node, name)) properties[`data-sandbox-${name}`] = '';
  }
  setStyleCustomProperty(
    properties,
    '--_note-preview-sandbox-min-height',
    `${properties['data-sandbox-height']}px`,
  );
  const action = [
    'allow-js',
    'allow-forms',
    'allow-downloads',
    'allow-pointer-lock',
    'allow-popups',
  ].some((name) => booleanProperty(node, name))
    ? 'プレビューを実行'
    : 'プレビューを表示';
  const placeholder = nativeElement(
    'div',
    { 'data-preview-sandbox-placeholder': '', 'data-search-exclude': '' },
    [
      nativeElement('p', {}, [nativeText('プレビューの実行にはJavaScriptが必要です。')]),
      ...(activation === 'manual'
        ? [
            nativeElement(
              'button',
              {
                type: 'button',
                'aria-label': `${action}: ${properties['data-sandbox-iframe-title']}`,
              },
              [nativeText(action)],
            ),
          ]
        : []),
    ],
  );
  Object.assign(node, nativeElement('div', properties, [placeholder, ...(node.children ?? [])]));
};
