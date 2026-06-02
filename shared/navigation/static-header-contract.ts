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

export const STATIC_HEADER_ALLOWED_DATA_ATTRIBUTES = [
  /^data-[a-z0-9._:-]+$/u,
];

export const STATIC_HEADER_ALLOWED_ARIA_ATTRIBUTES = [
  /^aria-[a-z0-9._:-]+$/u,
];

const STATIC_HEADER_ALLOWED_ATTRIBUTES_BY_ELEMENT: Readonly<Record<string, ReadonlySet<string>>> = {
  header: new Set(['class']),
  div: new Set(['class', 'role']),
  span: new Set(['class']),
  a: new Set(['class', 'href', 'title', 'hidden']),
  button: new Set(['class', 'type', 'title', 'disabled']),
  details: new Set(['class', 'open']),
  summary: new Set(['class', 'title']),
  nav: new Set(['class']),
  ul: new Set(['class']),
  ol: new Set(['class']),
  li: new Set(['class']),
  svg: new Set(['viewBox', 'viewbox', 'width', 'height', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'focusable', 'xmlns']),
  g: new Set(['fill', 'stroke']),
  path: new Set(['d', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin']),
  circle: new Set(['cx', 'cy', 'r', 'fill', 'stroke', 'stroke-width']),
  line: new Set(['x1', 'y1', 'x2', 'y2', 'stroke', 'stroke-width', 'stroke-linecap']),
  polyline: new Set(['points', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin']),
  rect: new Set(['x', 'y', 'width', 'height', 'rx', 'ry', 'fill', 'stroke', 'stroke-width']),
};

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

export const isStaticHeaderAllowedAttribute = (tagName: string, name: string): boolean => {
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
    STATIC_HEADER_ALLOWED_ATTRIBUTES_BY_ELEMENT[tagName]?.has(name) === true ||
    STATIC_HEADER_ALLOWED_DATA_ATTRIBUTES.some((pattern) => pattern.test(name)) ||
    STATIC_HEADER_ALLOWED_ARIA_ATTRIBUTES.some((pattern) => pattern.test(name))
  );
};
