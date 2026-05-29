import * as parse5 from 'parse5';
import type { DefaultTreeAdapterMap } from 'parse5';

import { type HastNode } from './hast-utils.js';
import {
  resolveStaticIconBody,
  STATIC_ICON_VIEWBOX,
  type IconName,
} from '../../shared/icons/icon-paths.js';

type Parse5Node = DefaultTreeAdapterMap['node'];
type Parse5Element = DefaultTreeAdapterMap['element'];

const isParse5Element = (node: Parse5Node): node is Parse5Element =>
  'tagName' in node && typeof node.tagName === 'string';

const parse5NodeToHast = (node: Parse5Node): HastNode | null => {
  if ('nodeName' in node && node.nodeName === '#text' && 'value' in node) {
    return { type: 'text', value: String(node.value ?? '') };
  }

  if (!('tagName' in node) || typeof node.tagName !== 'string') {
    return null;
  }

  const properties = Object.fromEntries(
    node.attrs.map((attribute) => [attribute.name, attribute.value]),
  );
  const children =
    'childNodes' in node && Array.isArray(node.childNodes)
      ? node.childNodes
          .map((child) => parse5NodeToHast(child))
          .filter((child): child is HastNode => child !== null)
      : [];

  return createElement(node.tagName, properties, children);
};

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

const createIconChildren = (name: IconName): HastNode[] => {
  const fragment = parse5.parseFragment(`<svg>${resolveStaticIconBody(name)}</svg>`, {
    sourceCodeLocationInfo: false,
  });

  const svg = fragment.childNodes.find(
    (node): node is Parse5Element => isParse5Element(node) && node.tagName === 'svg',
  );

  if (svg === undefined) {
    throw new Error(`Static icon SVG body parse failed: "${name}".`);
  }

  return svg.childNodes
    .map((child) => parse5NodeToHast(child))
    .filter((child): child is HastNode => child !== null);
};

export const createStaticIconHast = (
  name: IconName,
  properties: Record<string, unknown> = {},
): HastNode => {
  const children = createIconChildren(name);

  return createElement(
    'svg',
    {
      viewBox: STATIC_ICON_VIEWBOX,
      'aria-hidden': 'true',
      focusable: 'false',
      'data-icon': name,
      ...properties,
    },
    children,
  );
};
