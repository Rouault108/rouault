import { type HastNode } from './hast-utils.js';
import type { IconName } from '../../shared/icons/icon-paths.js';

const createElement = (
  tagName: string,
  properties: Record<string, unknown>,
  children: HastNode[] = [],
): HastNode => ({
  type: 'element',
  tagName,
  properties,
  children,
});

const createLinkIconChildren = (): HastNode[] => [
  createElement(
    'g',
    {
      fill: 'none',
      stroke: 'currentColor',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      'stroke-width': '2',
    },
    [
      createElement('path', {
        d: 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71',
      }),
      createElement('path', {
        d: 'M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71',
      }),
    ],
  ),
];

const createCopyIconChildren = (): HastNode[] => [
  createElement(
    'g',
    {
      fill: 'none',
      stroke: 'currentColor',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      'stroke-width': '2',
    },
    [
      createElement('rect', { width: '14', height: '14', x: '8', y: '8', rx: '2', ry: '2' }),
      createElement('path', {
        d: 'M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2',
      }),
    ],
  ),
];

const createIconChildren = (name: IconName): HastNode[] => {
  if (name === 'link') return createLinkIconChildren();
  if (name === 'copy') return createCopyIconChildren();
  throw new Error(`Static HAST icon is not registered: "${name}".`);
};

export const createStaticIconHast = (
  name: IconName,
  properties: Record<string, unknown> = {},
): HastNode => {
  const children = createIconChildren(name);

  return createElement(
    'svg',
    {
      viewBox: '0 0 24 24',
      'aria-hidden': 'true',
      focusable: 'false',
      'data-icon': name,
      ...properties,
    },
    children,
  );
};
