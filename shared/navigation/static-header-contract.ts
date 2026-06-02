export const STATIC_HEADER_ROOT_SELECTOR = 'header[data-layout-header]' as const;

export const STATIC_HEADER_ALLOWED_ELEMENTS = new Set([
  'header',
  'div',
  'span',
  'a',
  'button',
  'details',
  'summary',
  'nav',
  'ul',
  'ol',
  'li',
  'svg',
  'g',
  'path',
  'circle',
  'line',
  'polyline',
  'rect',
]);

export const STATIC_HEADER_ALLOWED_GLOBAL_ATTRIBUTES = new Set([
  'class',
  'id',
  'hidden',
  'inert',
  'type',
  'disabled',
  'open',
  'title',
  'role',
  'href',
  'viewBox',
  'viewbox',
  'width',
  'height',
  'fill',
  'stroke',
  'stroke-width',
  'stroke-linecap',
  'stroke-linejoin',
  'd',
  'cx',
  'cy',
  'r',
  'x',
  'y',
  'x1',
  'y1',
  'x2',
  'y2',
  'rx',
  'ry',
  'points',
  'xmlns',
  'aria-hidden',
  'focusable',
]);

export const STATIC_HEADER_ALLOWED_DATA_ATTRIBUTES = [
  /^data-[a-z0-9._:-]+$/u,
];

export const STATIC_HEADER_ALLOWED_ARIA_ATTRIBUTES = [
  /^aria-[a-z0-9._:-]+$/u,
];

export const STATIC_HEADER_FORBIDDEN_ELEMENTS = new Set([
  'layout-header',
  'ui-header',
  'script',
  'style',
  'slot',
  'template',
  'iframe',
  'object',
  'embed',
  'link',
  'base',
  'meta',
  'form',
  'input',
  'textarea',
  'select',
]);

export const isStaticHeaderAllowedAttribute = (name: string): boolean => {
  if (
    name === 'style' ||
    name === 'slot' ||
    name === 'srcdoc' ||
    name === 'data-hydration-key' ||
    /^on/i.test(name)
  ) {
    return false;
  }
  return (
    STATIC_HEADER_ALLOWED_GLOBAL_ATTRIBUTES.has(name) ||
    STATIC_HEADER_ALLOWED_DATA_ATTRIBUTES.some((pattern) => pattern.test(name)) ||
    STATIC_HEADER_ALLOWED_ARIA_ATTRIBUTES.some((pattern) => pattern.test(name))
  );
};
