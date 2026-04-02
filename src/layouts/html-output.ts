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

export const escapeInlineScriptText = (value: string): string =>
  value
    .replace(/&/g, '\\u0026')
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');

export const serializeJsonForHtmlAttribute = (value: unknown): string =>
  escapeHtmlAttribute(stringifyJson(value));

export const serializeJsonForScriptTag = (value: unknown): string =>
  escapeInlineScriptText(stringifyJson(value));

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
