declare const internalDocumentNormalizedUrlBrand: unique symbol;

export type InternalDocumentNormalizedUrl = string & {
  readonly [internalDocumentNormalizedUrlBrand]: 'InternalDocumentNormalizedUrl';
};

export const toInternalDocumentNormalizedUrl = (value: string): InternalDocumentNormalizedUrl => {
  if (!value.startsWith('/')) {
    throw new Error('internal document normalized URL must be root-relative');
  }
  if (/^[a-z][a-z0-9+.-]*:/iu.test(value) || value.startsWith('//')) {
    throw new Error('internal document normalized URL must not be absolute');
  }
  if (/[\u0000-\u001f\u007f]/u.test(value)) {
    throw new Error('internal document normalized URL must not contain control characters');
  }
  return value as InternalDocumentNormalizedUrl;
};
