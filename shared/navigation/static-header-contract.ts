export const STATIC_HEADER_ROOT_SELECTOR = 'header[data-layout-header]' as const;

export const STATIC_HEADER_SEARCH_TRIGGER_CONTRACT = {
  className: 'search-trigger',
  iconClassName: 'search-trigger__icon',
  placeholderClassName: 'search-trigger__placeholder',
  visibleLabel: '検索...',
  accessibleName: '検索ダイアログを開く',
  ariaHasPopup: 'dialog',
  initialAriaExpanded: 'false',
  dialogTrigger: 'true',
  noRouter: 'true',
  linkKind: 'internal-document',
  linkSurface: 'header',
} as const;

export const STATIC_HEADER_SEARCH_TRIGGER_REQUIRED_ATTRIBUTES = [
  'href',
  'data-search-dialog-trigger',
  'data-no-router',
  'data-link-kind',
  'data-link-surface',
  'aria-haspopup',
  'aria-controls',
  'aria-expanded',
  'aria-label',
] as const;

export class StaticHeaderRootAttributeContractError extends Error {
  override readonly name = 'StaticHeaderRootAttributeContractError';
}

export interface StaticHeaderRootAttributeReader {
  readonly sourceLabel: string;
  readonly readAttribute: (name: string) => string | null;
}

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

export const STATIC_HEADER_ALLOWED_DATA_ATTRIBUTES = [/^data-[a-z0-9._:-]+$/u];

export const STATIC_HEADER_ALLOWED_ARIA_ATTRIBUTES = [/^aria-[a-z0-9._:-]+$/u];

const STATIC_HEADER_ALLOWED_ATTRIBUTES_BY_ELEMENT: Readonly<Record<string, ReadonlySet<string>>> = {
  header: new Set(['class']),
  div: new Set(['class', 'id', 'role']),
  span: new Set(['class']),
  a: new Set(['class', 'href', 'title', 'hidden']),
  button: new Set(['class', 'type', 'title', 'disabled']),
  details: new Set(['class', 'open']),
  summary: new Set(['class', 'id', 'title']),
  nav: new Set(['class', 'id']),
  ul: new Set(['class']),
  ol: new Set(['class']),
  li: new Set(['class']),
  svg: new Set([
    'viewBox',
    'viewbox',
    'width',
    'height',
    'fill',
    'stroke',
    'stroke-width',
    'stroke-linecap',
    'stroke-linejoin',
    'focusable',
    'xmlns',
  ]),
  g: new Set(['fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin']),
  path: new Set(['d', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin']),
  circle: new Set(['cx', 'cy', 'r', 'fill', 'stroke', 'stroke-width']),
  line: new Set(['x1', 'y1', 'x2', 'y2', 'stroke', 'stroke-width', 'stroke-linecap']),
  polyline: new Set([
    'points',
    'fill',
    'stroke',
    'stroke-width',
    'stroke-linecap',
    'stroke-linejoin',
  ]),
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

const STATIC_HEADER_BOOLEAN_ROOT_ATTRIBUTES = [
  'data-note-layout',
  'data-sidebar-enabled',
  'data-toc-trigger-reserved',
] as const;

const failRootAttributeContract = (sourceLabel: string, message: string): never => {
  throw new StaticHeaderRootAttributeContractError(`[${sourceLabel}] ${message}`);
};

const requireRootAttribute = (options: StaticHeaderRootAttributeReader, name: string): string => {
  const value = options.readAttribute(name);
  if (value === null || value.trim().length === 0) {
    failRootAttributeContract(options.sourceLabel, `${name} is required.`);
  }
  return value ?? '';
};

const requireBooleanRootAttribute = (
  options: StaticHeaderRootAttributeReader,
  name: (typeof STATIC_HEADER_BOOLEAN_ROOT_ATTRIBUTES)[number],
): void => {
  const value = requireRootAttribute(options, name);
  if (value !== 'true' && value !== 'false') {
    failRootAttributeContract(options.sourceLabel, `${name} must be "true" or "false".`);
  }
};

export const validateStaticHeaderRootAttributes = (
  options: StaticHeaderRootAttributeReader,
): void => {
  const marker = options.readAttribute('data-layout-header');
  if (marker === null || (marker !== '' && marker !== 'true')) {
    failRootAttributeContract(options.sourceLabel, 'data-layout-header must be empty or "true".');
  }

  for (const name of STATIC_HEADER_BOOLEAN_ROOT_ATTRIBUTES) {
    requireBooleanRootAttribute(options, name);
  }

  requireRootAttribute(options, 'data-sidebar-id');
  requireRootAttribute(options, 'data-current-corpus-key');

  const tocPresence = requireRootAttribute(options, 'data-toc-presence');
  if (tocPresence !== 'present' && tocPresence !== 'absent') {
    failRootAttributeContract(
      options.sourceLabel,
      'data-toc-presence must be "present" or "absent".',
    );
  }

  const tocRuntimeId = options.readAttribute('data-toc-runtime-id');
  const tocOwnerId = options.readAttribute('data-toc-owner-id');
  if (tocPresence === 'present') {
    if (tocRuntimeId === null || tocRuntimeId.trim().length === 0) {
      failRootAttributeContract(
        options.sourceLabel,
        'data-toc-runtime-id is required when TOC is present.',
      );
    }
    if (tocOwnerId === null || tocOwnerId.trim().length === 0) {
      failRootAttributeContract(
        options.sourceLabel,
        'data-toc-owner-id is required when TOC is present.',
      );
    }
    return;
  }

  if (tocRuntimeId !== null || tocOwnerId !== null) {
    failRootAttributeContract(
      options.sourceLabel,
      'data-toc-runtime-id and data-toc-owner-id must be absent when TOC is absent.',
    );
  }
};
