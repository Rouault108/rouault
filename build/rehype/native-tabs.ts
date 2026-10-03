import type { StaticRenderIdContext } from '../../shared/static-render-id-context.js';
import type { HastNode, HastProperties } from './hast-utils.js';
import {
  booleanProperty,
  enhancerProperties,
  nativeElement,
  nativeRootProperties,
  stringProperty,
} from './native-note-hast.js';

const assertNonInteractive = (node: HastNode): void => {
  const properties = node.properties ?? {};
  if (
    [
      'a',
      'button',
      'input',
      'select',
      'textarea',
      'details',
      'summary',
      'iframe',
      'embed',
      'label',
    ].includes(node.tagName ?? '') ||
    ((node.tagName === 'audio' || node.tagName === 'video') && booleanProperty(node, 'controls')) ||
    properties['tabindex'] !== undefined ||
    properties['tabIndex'] !== undefined ||
    properties['contenteditable'] !== undefined ||
    properties['contentEditable'] !== undefined
  ) {
    throw new Error('[tabs] native tab label に interactive descendant が残っています');
  }
  for (const child of node.children ?? []) assertNonInteractive(child);
};

export const lowerNativeTabs = (node: HastNode, ids: StaticRenderIdContext): void => {
  const children = node.children ?? [];
  const tabs = children.filter((child) => stringProperty(child, 'slot') === 'tab');
  const panels = children.filter((child) => stringProperty(child, 'slot') === 'panel');
  if (!tabs.length || tabs.length !== panels.length) {
    throw new Error('[tabs] native output には対応する tab / panel が必要です');
  }
  const root: HastProperties = {
    ...nativeRootProperties(node),
    'data-tabs-root': '',
    'data-tabs-orientation':
      stringProperty(node, 'orientation') === 'vertical' ? 'vertical' : 'horizontal',
    ...enhancerProperties('tabs-enhancer', 'initial'),
  };
  for (const [source, target] of [
    ['selected-value', 'data-tabs-initial-selected-value'],
    ['default-selected-value', 'data-tabs-default-selected-value'],
  ] as const) {
    const value = stringProperty(node, source);
    if (value) root[target] = value;
  }
  for (const name of ['automatic-activation', 'url-sync']) {
    if (booleanProperty(node, name)) root[`data-tabs-${name}`] = '';
  }
  const nav: HastProperties = { 'data-tabs-static-nav': '', 'data-search-exclude': '' };
  for (const name of ['aria-label', 'aria-labelledby']) {
    const value = stringProperty(node, name);
    if (value) nav[name] = value;
  }
  const values = new Set<string>();
  const links = tabs.map((tab, index) => {
    for (const child of tab.children ?? []) assertNonInteractive(child);
    const value = stringProperty(tab, 'value').trim();
    const panel = panels[index];
    if (!value || values.has(value) || !panel)
      throw new Error('[tabs] tab value は一意でなければなりません');
    values.add(value);
    const tabId = ids.reserveId('tabs-tab', stringProperty(tab, 'id') || undefined);
    const panelId = ids.reserveId('tabs-panel', stringProperty(panel, 'id') || undefined);
    Object.assign(
      panel,
      nativeElement(
        'section',
        {
          ...nativeRootProperties(panel),
          id: panelId,
          'data-tab-panel': '',
          'data-tab-value': value,
          'aria-labelledby': tabId,
        },
        panel.children ?? [],
      ),
    );
    delete panel.properties?.['slot'];
    return nativeElement(
      'a',
      {
        id: tabId,
        'data-tab': '',
        'data-tab-value': value,
        href: `#${panelId}`,
      },
      tab.children ?? [],
    );
  });
  Object.assign(
    node,
    nativeElement('section', root, [
      nativeElement('nav', nav, [
        ...links,
        nativeElement('span', { 'data-tabs-indicator': '', 'aria-hidden': 'true' }),
      ]),
      ...panels,
    ]),
  );
};
