export type HastProperties = Record<string, unknown>;

export type HastNode = {
  type?: string;
  tagName?: string;
  properties?: HastProperties;
  children?: HastNode[];
};

export type VFileLike = {
  path?: string;
};

export const toInteger = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
};

export const getDigits = (value: number): number => Math.abs(value).toString().length;

export const getOrCreateProperties = (node: HastNode): HastProperties => {
  if (!node.properties) {
    node.properties = {};
  }
  return node.properties;
};

export const setStyleCustomProperty = (
  properties: HastProperties,
  name: string,
  value: string,
): void => {
  const styleMap = new Map<string, string>();
  const rawStyle = properties.style;

  if (typeof rawStyle === 'string') {
    const declarations = rawStyle.split(';');
    for (const declaration of declarations) {
      const [rawKey, ...rawValue] = declaration.split(':');
      const key = rawKey?.trim();
      if (!key) continue;
      const normalizedValue = rawValue.join(':').trim();
      styleMap.set(key, normalizedValue);
    }
  }

  styleMap.set(name, value);
  properties.style = [...styleMap.entries()].map(([key, itemValue]) => `${key}: ${itemValue}`).join('; ');
};
