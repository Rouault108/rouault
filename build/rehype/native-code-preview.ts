import type { StaticRenderIdContext } from '../../shared/static-render-id-context.js';
import type { IconName } from '../../shared/icons/icon-paths.js';
import type { HastNode, HastProperties } from './hast-utils.js';
import { createStaticIconHast } from './static-icon-hast.js';
import {
  enhancerProperties,
  nativeElement,
  nativeRootProperties,
  nativeText,
  stringProperty,
} from './native-note-hast.js';

const options: Record<string, readonly (readonly [string, string, IconName])[]> = {
  theme: [
    ['page', 'Page', 'monitor'],
    ['light', 'Light', 'sun'],
    ['dark', 'Dark', 'moon'],
  ],
  surface: [
    ['surface', 'Surface', 'layers-3'],
    ['canvas', 'Canvas', 'square'],
    ['muted', 'Muted', 'blend'],
  ],
  viewport: [
    ['full', 'Full', 'monitor'],
    ['tablet', 'Tablet', 'tablet'],
    ['mobile', 'Mobile', 'smartphone'],
  ],
};

export const lowerNativeCodePreview = (
  node: HastNode,
  ids: StaticRenderIdContext,
  profile: 'reader' | 'demo',
): void => {
  const children = node.children ?? [];
  const heading = stringProperty(node, 'heading').trim();
  const controls = stringProperty(node, 'controls').trim().split(/\s+/u).filter(Boolean);
  if (controls.some((name) => !Object.hasOwn(options, name))) {
    throw new Error('[code-preview] validation 済み controls が必要です');
  }
  const toolbar = children.filter(
    (child) => child.type === 'element' && stringProperty(child, 'slot') === 'toolbar',
  );
  const preview = children.filter((child) => stringProperty(child, 'slot') === 'preview');
  const code = children.filter((child) => !stringProperty(child, 'slot'));
  const properties: HastProperties = {
    ...nativeRootProperties(node),
    'data-code-preview-root': '',
    'data-preview-profile': profile,
    'aria-label': heading || 'コード プレビュー',
  };
  for (const [name, values, fallback] of [
    ['padding', ['normal', 'compact', 'none'], 'normal'],
    ['align', ['center', 'start', 'stretch'], 'center'],
    ['theme', ['page', 'light', 'dark'], 'page'],
    ['surface', ['surface', 'canvas', 'muted'], 'surface'],
    ['viewport', ['full', 'tablet', 'mobile'], 'full'],
  ] as const) {
    const value = stringProperty(node, `preview-${name}`);
    properties[`data-preview-${name}`] = (values as readonly string[]).includes(value)
      ? value
      : fallback;
  }
  if (controls.length || toolbar.length)
    Object.assign(properties, enhancerProperties('code-preview-enhancer', 'visible'));
  const menus =
    profile === 'demo'
      ? Object.entries(options)
          .filter(([name]) => controls.includes(name))
          .map(([name, choices]) => {
            const panelId = ids.nextId('command-menu');
            const triggerId = ids.nextId('command-menu');
            return nativeElement(
              'div',
              {
                'data-command-menu': '',
                'data-code-preview-control': name,
                'data-search-exclude': '',
                hidden: true,
              },
              [
                nativeElement(
                  'button',
                  {
                    type: 'button',
                    id: triggerId,
                    className: ['note-control'],
                    'data-command-menu-trigger': '',
                    'aria-haspopup': 'menu',
                    'aria-expanded': 'false',
                    'aria-controls': panelId,
                  },
                  choices.map(([value, label, icon]) =>
                    nativeElement(
                      'span',
                      {
                        'data-command-menu-label': value,
                        hidden: value !== properties[`data-preview-${name}`],
                      },
                      [createStaticIconHast(icon), nativeText(label)],
                    ),
                  ),
                ),
                nativeElement(
                  'div',
                  {
                    id: panelId,
                    role: 'menu',
                    'aria-labelledby': triggerId,
                    'data-command-menu-panel': '',
                    hidden: true,
                  },
                  choices.map(([value, label, icon]) =>
                    nativeElement(
                      'button',
                      {
                        type: 'button',
                        role: 'menuitem',
                        'data-command-menu-value': value,
                        tabIndex: -1,
                      },
                      [createStaticIconHast(icon), nativeText(label)],
                    ),
                  ),
                ),
              ],
            );
          })
      : [];
  for (const child of toolbar) {
    child.properties ??= {};
    delete child.properties['slot'];
    child.properties['data-preview-toolbar'] = '';
  }
  for (const child of preview) {
    child.properties ??= {};
    delete child.properties['slot'];
    child.properties['data-preview-content'] = '';
  }
  const header =
    heading || menus.length || (profile === 'demo' && toolbar.length)
      ? [
          nativeElement('header', { 'data-code-preview-header': '', className: ['header'] }, [
            ...(heading
              ? [nativeElement('span', { className: ['header-heading'] }, [nativeText(heading)])]
              : []),
            nativeElement('div', { className: ['header-tools'] }, [
              ...menus,
              ...(profile === 'demo' ? toolbar : []),
            ]),
          ]),
        ]
      : [];
  Object.assign(
    node,
    nativeElement('figure', properties, [
      ...header,
      nativeElement('div', { 'data-code-preview-surface': '', className: ['preview-area'] }, [
        nativeElement('div', { className: ['preview-frame'] }, preview),
      ]),
      nativeElement('div', { 'data-code-preview-code': '', className: ['code-area'] }, code),
    ]),
  );
};
