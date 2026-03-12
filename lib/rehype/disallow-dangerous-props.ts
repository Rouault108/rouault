import { type HastNode, type VFileLike } from './hast-utils.js';

const URL_ATTRIBUTE_NAMES = new Set(['href', 'src', 'xlink:href', 'action', 'formaction', 'poster']);
const DANGEROUS_ATTRIBUTE_NAMES = new Set(['srcdoc']);
const ALLOWED_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:']);
const ALLOWED_STYLE_PROPERTIES = new Set([
  '--ui-ol-counter-reset',
  '--ui-ol-counter-step',
  '--ui-ol-counter-set',
]);

const getSourcePath = (file?: VFileLike): string => file?.path ?? 'unknown file';

const toError = (file: VFileLike | undefined, message: string): Error =>
  new Error(`[markdown] ${message}: ${getSourcePath(file)}`);

const getClassList = (value: unknown): string[] => {
  if (typeof value === 'string') {
    return value.split(/\s+/).filter((item) => item.length > 0);
  }
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string' && item.length > 0);
  }
  return [];
};

const getNodeClassList = (node: HastNode): string[] =>
  getClassList(node.properties?.['className'] ?? node.properties?.['class']);

const isWithinKatex = (node: HastNode, parentWithinKatex: boolean): boolean => {
  if (parentWithinKatex) {
    return true;
  }
  const classList = getNodeClassList(node);
  return classList.some((className) => className === 'katex' || className.startsWith('katex-'));
};

const isWithinShiki = (node: HastNode, parentWithinShiki: boolean): boolean => {
  if (parentWithinShiki) {
    return true;
  }
  const classList = getNodeClassList(node);
  return classList.some(
    (className) =>
      className === 'shiki' || className === 'shiki-themes' || className.startsWith('shiki-'),
  );
};

const removeControlCharacters = (value: string): string => {
  let result = '';
  for (const char of value) {
    const code = char.charCodeAt(0);
    if ((code >= 0x20 && code !== 0x7f) || char === '\t') {
      result += char;
    }
  }
  return result;
};

const isSafeUrlValue = (value: string): boolean => {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return true;
  }

  const normalized = removeControlCharacters(trimmed);
  const compact = normalized.replace(/\s+/g, '').toLowerCase();
  if (
    compact.startsWith('javascript:') ||
    compact.startsWith('vbscript:') ||
    compact.startsWith('data:')
  ) {
    return false;
  }

  const schemeMatch = /^[a-zA-Z][a-zA-Z\d+.-]*:/.exec(normalized);
  if (!schemeMatch) {
    return true;
  }

  try {
    const parsed = new URL(normalized, 'https://rouault.local');
    return ALLOWED_PROTOCOLS.has(parsed.protocol.toLowerCase());
  } catch {
    return false;
  }
};

const getStylePropertyNames = (styleValue: string): string[] => {
  const propertyNames: string[] = [];
  const declarations = styleValue.split(';');
  for (const declaration of declarations) {
    const trimmed = declaration.trim();
    if (trimmed.length === 0) {
      continue;
    }
    const separator = trimmed.indexOf(':');
    if (separator <= 0) {
      return [];
    }
    const name = trimmed.slice(0, separator).trim().toLowerCase();
    if (name.length === 0) {
      return [];
    }
    propertyNames.push(name);
  }
  return propertyNames;
};

/**
 * 属性ベースの攻撃ベクトルをビルド時に遮断する。
 * - on* 属性
 * - 危険URLスキーム
 * - 許可外 style（KaTeX 配下と ordered-list のカスタム変数を除く）
 */
export function rehypeDisallowDangerousProps() {
  return (tree: unknown, file?: VFileLike) => {
    const visit = (
      node: unknown,
      parentWithinKatex = false,
      parentWithinShiki = false,
    ): void => {
      if (!node || typeof node !== 'object') {
        return;
      }

      const current = node as HastNode;
      const currentWithinKatex = isWithinKatex(current, parentWithinKatex);
      const currentWithinShiki = isWithinShiki(current, parentWithinShiki);

      if (current.type === 'element' && current.properties) {
        for (const [rawName, rawValue] of Object.entries(current.properties)) {
          const name = rawName.trim();
          const normalizedName = name.toLowerCase();

          if (/^on/i.test(name)) {
            throw toError(file, `危険な属性 "${normalizedName}" は使用できません`);
          }

          if (DANGEROUS_ATTRIBUTE_NAMES.has(normalizedName)) {
            throw toError(file, `危険な属性 "${normalizedName}" は使用できません`);
          }

          if (URL_ATTRIBUTE_NAMES.has(normalizedName)) {
            if (typeof rawValue !== 'string' || !isSafeUrlValue(rawValue)) {
              throw toError(file, `危険なURL属性 "${normalizedName}" は使用できません`);
            }
            continue;
          }

          if (normalizedName !== 'style') {
            continue;
          }
          if (typeof rawValue !== 'string') {
            throw toError(file, 'style 属性は文字列で指定してください');
          }

          const styleNames = getStylePropertyNames(rawValue);
          if (styleNames.length === 0) {
            throw toError(file, '空の style 属性は使用できません');
          }

          if (currentWithinKatex || currentWithinShiki) {
            continue;
          }

          for (const styleName of styleNames) {
            if (!ALLOWED_STYLE_PROPERTIES.has(styleName)) {
              throw toError(file, `許可されていない style 属性 "${styleName}" は使用できません`);
            }
          }
        }
      }

      if (!Array.isArray(current.children)) {
        return;
      }

      for (const child of current.children) {
        visit(child, currentWithinKatex, currentWithinShiki);
      }
    };

    visit(tree);
  };
}
