import { type HastNode } from './hast-utils.js';

type StaticIconName = 'link';

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

export const createStaticIconHast = (
  name: StaticIconName,
  properties: Record<string, unknown> = {},
): HastNode => {
  const children = name === 'link' ? createLinkIconChildren() : [];

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
