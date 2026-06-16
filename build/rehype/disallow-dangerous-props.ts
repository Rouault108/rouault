import { parseRelTokens } from '../../shared/link/rel-tokens.js';
import { detectUnsafeHref } from '../../shared/link/unsafe-href-detector.js';
import {
  validateMediaUrl,
  sanitizeImageSrcset,
} from '../../shared/media/media-source-attributes.js';
import {
  RehypeLinkContractError,
  type RehypeLinkContractErrorReason,
} from './link-contract-error.js';
import { type HastNode, type VFileLike } from './hast-utils.js';

type UrlAttributePolicy = 'link' | 'media' | 'media-srcset' | 'cite' | 'forbidden';

const URL_ATTRIBUTE_POLICIES = new Map<string, UrlAttributePolicy>([
  ['a:href', 'link'],
  ['area:href', 'forbidden'],
  ['img:src', 'media'],
  ['img:srcset', 'media-srcset'],
  ['video:src', 'media'],
  ['video:poster', 'media'],
  ['audio:src', 'media'],
  ['source:src', 'media'],
  ['source:srcset', 'media-srcset'],
  ['track:src', 'media'],
  ['blockquote:cite', 'cite'],
  ['q:cite', 'cite'],
  ['del:cite', 'cite'],
  ['ins:cite', 'cite'],
  ['form:action', 'forbidden'],
  ['button:formaction', 'forbidden'],
  ['input:formaction', 'forbidden'],
]);

const ALWAYS_FORBIDDEN_ELEMENTS = new Set(['iframe', 'object', 'embed', 'base', 'link', 'script']);
const ALWAYS_FORBIDDEN_ATTRIBUTES = new Set(['srcdoc']);
const SVG_MATH_URL_ATTRIBUTES = new Set([
  'href',
  'xlink:href',
  'src',
  'data',
  'poster',
  'action',
  'formaction',
]);
const SVG_MATH_ELEMENTS = new Set(['svg', 'math']);
const ALLOWED_STYLE_PROPERTIES = new Set([
  '--ui-ol-counter-reset',
  '--ui-ol-counter-step',
  '--ui-ol-counter-set',
]);

const getSourceLabel = (file?: VFileLike): string => file?.path ?? 'unknown file';

const throwContractError = (
  file: VFileLike | undefined,
  reason: RehypeLinkContractErrorReason,
  message: string,
): never => {
  throw new RehypeLinkContractError({ reason, sourceLabel: getSourceLabel(file), message });
};

const getClassList = (value: unknown): string[] => {
  if (typeof value === 'string') return value.split(/\s+/u).filter(Boolean);
  if (Array.isArray(value))
    return value.filter((item): item is string => typeof item === 'string' && item.length > 0);
  return [];
};

const getNodeClassList = (node: HastNode): string[] =>
  getClassList(node.properties?.['className'] ?? node.properties?.['class']);

const isWithinKatex = (node: HastNode, parentWithinKatex: boolean): boolean =>
  parentWithinKatex ||
  getNodeClassList(node).some(
    (className) => className === 'katex' || className.startsWith('katex-'),
  );

const isWithinShiki = (node: HastNode, parentWithinShiki: boolean): boolean =>
  parentWithinShiki ||
  getNodeClassList(node).some(
    (className) =>
      className === 'shiki' || className === 'shiki-themes' || className.startsWith('shiki-'),
  );

const getStylePropertyNames = (styleValue: string): string[] => {
  const propertyNames: string[] = [];
  for (const declaration of styleValue.split(';')) {
    const trimmed = declaration.trim();
    if (trimmed.length === 0) continue;
    const separator = trimmed.indexOf(':');
    if (separator <= 0) return [];
    const name = trimmed.slice(0, separator).trim().toLowerCase();
    if (name.length === 0) return [];
    propertyNames.push(name);
  }
  return propertyNames;
};

const getStringProperty = (value: unknown): string | null =>
  typeof value === 'string' ? value : null;

const validateLinkHref = (value: string, file: VFileLike | undefined): void => {
  const unsafe = detectUnsafeHref(value);
  if (!unsafe.ok) {
    throwContractError(
      file,
      unsafe.reason === 'url-with-credentials' ? 'url-with-credentials' : 'unsafe-link-href',
      `unsafe link href is forbidden (${unsafe.reason})`,
    );
  }
};

const validateMediaAttribute = (value: string, file: VFileLike | undefined): void => {
  const result = validateMediaUrl(value, { allowDataImage: true });
  if (!result.ok) {
    throwContractError(
      file,
      'unsafe-url-bearing-attribute',
      `unsafe media URL attribute is forbidden (${result.reason})`,
    );
  }
};

const validateSrcsetAttribute = (value: string, file: VFileLike | undefined): void => {
  if (sanitizeImageSrcset(value) === undefined) {
    throwContractError(
      file,
      'unsafe-url-bearing-attribute',
      'unsafe srcset URL attribute is forbidden',
    );
  }
};

const validateCiteAttribute = (value: string, file: VFileLike | undefined): void => {
  const unsafe = detectUnsafeHref(value);
  if (!unsafe.ok) {
    throwContractError(
      file,
      unsafe.reason === 'url-with-credentials'
        ? 'url-with-credentials'
        : 'unsafe-url-bearing-attribute',
      `unsafe cite URL is forbidden (${unsafe.reason})`,
    );
  }
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return throwContractError(
      file,
      'unsafe-url-bearing-attribute',
      'cite must be an absolute http(s) URL',
    );
  }
  if (
    (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') ||
    parsed.username.length > 0 ||
    parsed.password.length > 0
  ) {
    throwContractError(
      file,
      'unsafe-url-bearing-attribute',
      'cite must be an absolute http(s) URL without credentials',
    );
  }
};

const validateTargetAndRel = (node: HastNode, file: VFileLike | undefined): void => {
  const target = getStringProperty(node.properties?.['target']);
  if (target !== null && target !== '_blank' && target !== '_self') {
    throwContractError(file, 'invalid-target', 'anchor target must be _blank or _self');
  }
  const relTokens = parseRelTokens(getStringProperty(node.properties?.['rel']) ?? undefined);
  if (relTokens.includes('opener')) {
    throwContractError(file, 'forbidden-rel-token', 'rel opener is forbidden');
  }
  if (target === '_blank' && !relTokens.includes('noopener')) {
    throwContractError(file, 'missing-rel-noopener', 'target _blank requires rel noopener');
  }
};

const validateUrlBearingAttribute = (
  tagName: string,
  attributeName: string,
  rawValue: unknown,
  file: VFileLike | undefined,
  withinSvgMath = false,
): void => {
  const normalizedTag = tagName.toLowerCase();
  const normalizedAttribute = attributeName.toLowerCase();
  const policy = URL_ATTRIBUTE_POLICIES.get(`${normalizedTag}:${normalizedAttribute}`);

  if (withinSvgMath && SVG_MATH_URL_ATTRIBUTES.has(normalizedAttribute)) {
    throwContractError(
      file,
      'unsafe-url-bearing-attribute',
      `SVG/MathML attribute ${normalizedAttribute} is not allowed in note HTML`,
    );
  }

  if (policy === undefined) {
    return;
  }

  if (policy === 'forbidden') {
    throwContractError(
      file,
      'unsafe-url-bearing-attribute',
      `${normalizedTag}[${normalizedAttribute}] is not allowed in note HTML`,
    );
  }

  if (typeof rawValue !== 'string') {
    return throwContractError(
      file,
      'unsafe-url-bearing-attribute',
      `${normalizedTag}[${normalizedAttribute}] must be a string`,
    );
  }

  if (policy === 'link') validateLinkHref(rawValue, file);
  else if (policy === 'media') validateMediaAttribute(rawValue, file);
  else if (policy === 'media-srcset') validateSrcsetAttribute(rawValue, file);
  else if (policy === 'cite') validateCiteAttribute(rawValue, file);
};

/**
 * 属性ベースの攻撃ベクトルをビルド時に遮断する。
 * - on* 属性
 * - URL-bearing attribute exact list
 * - 許可外 style（KaTeX / Shiki 配下と ordered-list のカスタム変数を除く）
 */
export function rehypeDisallowDangerousProps() {
  return (tree: unknown, file?: VFileLike) => {
    const visit = (
      node: unknown,
      parentWithinKatex = false,
      parentWithinShiki = false,
      parentWithinSvgMath = false,
    ): void => {
      if (!node || typeof node !== 'object') return;

      const current = node as HastNode;
      const currentWithinKatex = isWithinKatex(current, parentWithinKatex);
      const currentWithinShiki = isWithinShiki(current, parentWithinShiki);
      const tagName = current.type === 'element' ? String(current.tagName ?? '').toLowerCase() : '';
      const currentWithinSvgMath = parentWithinSvgMath || SVG_MATH_ELEMENTS.has(tagName);

      if (current.type === 'element' && current.properties) {
        if (ALWAYS_FORBIDDEN_ELEMENTS.has(tagName)) {
          throwContractError(
            file,
            'unsafe-url-bearing-attribute',
            `${tagName} is not allowed in note HTML`,
          );
        }

        validateTargetAndRel(current, file);

        for (const [rawName, rawValue] of Object.entries(current.properties)) {
          const normalizedName = rawName.trim().toLowerCase();

          if (/^on/u.test(normalizedName)) {
            throwContractError(
              file,
              'unsafe-url-bearing-attribute',
              `event handler attribute ${normalizedName} is not allowed`,
            );
          }

          if (ALWAYS_FORBIDDEN_ATTRIBUTES.has(normalizedName)) {
            throwContractError(
              file,
              'unsafe-url-bearing-attribute',
              `${normalizedName} is not allowed`,
            );
          }

          validateUrlBearingAttribute(
            tagName,
            normalizedName,
            rawValue,
            file,
            currentWithinSvgMath,
          );

          if (normalizedName !== 'style') continue;
          if (typeof rawValue !== 'string') {
            return throwContractError(
              file,
              'unsafe-url-bearing-attribute',
              'style attribute must be a string',
            );
          }
          const styleNames = getStylePropertyNames(rawValue);
          if (styleNames.length === 0) {
            throwContractError(
              file,
              'unsafe-url-bearing-attribute',
              'empty style attribute is not allowed',
            );
          }
          if (currentWithinKatex || currentWithinShiki) continue;
          for (const styleName of styleNames) {
            if (!ALLOWED_STYLE_PROPERTIES.has(styleName)) {
              throwContractError(
                file,
                'unsafe-url-bearing-attribute',
                `style property ${styleName} is not allowed`,
              );
            }
          }
        }
      }

      if (!Array.isArray(current.children)) return;
      for (const child of current.children) {
        visit(child, currentWithinKatex, currentWithinShiki, currentWithinSvgMath);
      }
    };

    visit(tree);
  };
}
