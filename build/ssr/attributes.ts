export interface SsrAttribute {
  name: string;
  value: string;
}

export const getAttributeValue = (
  attributes: readonly SsrAttribute[],
  name: string,
): string | undefined => attributes.find((attribute) => attribute.name === name)?.value;

export const parseBooleanLikeAttribute = (
  value: string | undefined,
  defaultValue: boolean,
): boolean => {
  if (value === undefined) {
    return defaultValue;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === '' || normalized === 'true' || normalized === '1' || normalized === 'on') {
    return true;
  }
  if (normalized === 'false' || normalized === '0' || normalized === 'off' || normalized === 'no') {
    return false;
  }

  return defaultValue;
};

export const parsePositiveIntegerAttribute = (value: string | undefined): number | undefined => {
  if (value === undefined || value.trim() === '') {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
};

export const escapeAttributeValue = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const serializeAttributes = (attributes: readonly SsrAttribute[]): string =>
  attributes
    .map((attribute) => ` ${attribute.name}="${escapeAttributeValue(attribute.value)}"`)
    .join('');