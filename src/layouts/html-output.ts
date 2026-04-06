export type HtmlAttributeKind = 'text' | 'json' | 'boolean';

export interface HtmlAttributeDescriptor {
  name: string;
  value: unknown;
  kind?: HtmlAttributeKind;
}

const stringifyJson = (value: unknown): string => {
  return JSON.stringify(value);
};

export const escapeHtmlText = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const escapeHtmlAttribute = (value: string): string =>
  escapeHtmlText(value).replace(/"/g, '&quot;');

/**
 * 実行用 inline script 向け。
 * JavaScript の演算子や arrow function を壊さないことを最優先にする。
 */
export const escapeInlineExecutableScriptText = (value: string): string =>
  value
    .replace(/<\/script/gi, '<\\/script')
    .replace(/<!--/g, '<\\!--')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');

/**
 * application/json script 向け。
 * こちらは JSON 文字列として安全であることを優先する。
 */
export const escapeInlineJsonScriptText = (value: string): string =>
  value
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');

export const serializeJsonForHtmlAttribute = (value: unknown): string =>
  escapeHtmlAttribute(stringifyJson(value));

export const serializeJsonForScriptTag = (value: unknown): string =>
  escapeInlineJsonScriptText(stringifyJson(value));

const serializeHtmlAttribute = ({
  name,
  value,
  kind = 'text',
}: HtmlAttributeDescriptor): string => {
  if (kind === 'boolean') {
    return value ? ` ${name}` : '';
  }

  if (value === undefined || value === null) {
    return '';
  }

  const serializedValue =
    kind === 'json'
      ? serializeJsonForHtmlAttribute(value)
      : escapeHtmlAttribute(typeof value === 'string' ? value : stringifyJson(value));

  return ` ${name}="${serializedValue}"`;
};

export const serializeHtmlAttributes = (attributes: readonly HtmlAttributeDescriptor[]): string =>
  attributes.map((attribute) => serializeHtmlAttribute(attribute)).join('');

export const renderJsonScriptElement = (id: string, value: unknown): string =>
  `
<script type="application/json"${serializeHtmlAttributes([{ name: 'id', value: id }])}>
${serializeJsonForScriptTag(value)}
</script>
`.trim();