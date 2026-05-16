export const ALLOWED_DATA_IMAGE_MEDIA_TYPES = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
] as const;

export type AllowedDataImageMediaType = (typeof ALLOWED_DATA_IMAGE_MEDIA_TYPES)[number];

export type DataImageUrlValidationReason =
  | 'non-string-data-image-url'
  | 'invalid-data-image-url'
  | 'unsupported-data-image-media-type'
  | 'invalid-data-image-parameters'
  | 'invalid-data-image-base64'
  | 'data-image-too-large';

export type DataImageUrlValidationResult =
  | {
      readonly ok: true;
      readonly url: string;
      readonly mediaType: AllowedDataImageMediaType;
      readonly decodedByteLength: number;
    }
  | {
      readonly ok: false;
      readonly reason: DataImageUrlValidationReason;
    };

const MAX_DATA_IMAGE_BYTES = 32 * 1024;
const BASE64_RE = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u;

const isAllowedMediaType = (value: string): value is AllowedDataImageMediaType =>
  (ALLOWED_DATA_IMAGE_MEDIA_TYPES as readonly string[]).includes(value);

const getBase64DecodedByteLength = (payload: string): number | null => {
  if (payload.length === 0 || payload.length % 4 === 1 || !BASE64_RE.test(payload)) {
    return null;
  }

  const padding = payload.endsWith('==') ? 2 : payload.endsWith('=') ? 1 : 0;
  return payload.length === 0 ? 0 : Math.floor((payload.length * 3) / 4) - padding;
};

export const validateDataImageUrl = (value: unknown): DataImageUrlValidationResult => {
  if (typeof value !== 'string') {
    return { ok: false, reason: 'non-string-data-image-url' };
  }

  const trimmed = value.trim();
  const commaIndex = trimmed.indexOf(',');
  if (!trimmed.startsWith('data:') || commaIndex < 0) {
    return { ok: false, reason: 'invalid-data-image-url' };
  }

  const metadata = trimmed.slice('data:'.length, commaIndex);
  const payload = trimmed.slice(commaIndex + 1);
  const metadataParts = metadata.split(';').map((part) => part.trim().toLowerCase());
  const mediaType = metadataParts[0] ?? '';
  const parameters = metadataParts.slice(1);

  if (!isAllowedMediaType(mediaType)) {
    return { ok: false, reason: 'unsupported-data-image-media-type' };
  }

  if (parameters.length !== 1 || parameters[0] !== 'base64') {
    return { ok: false, reason: 'invalid-data-image-parameters' };
  }

  const decodedByteLength = getBase64DecodedByteLength(payload);
  if (decodedByteLength === null) {
    return { ok: false, reason: 'invalid-data-image-base64' };
  }

  if (decodedByteLength > MAX_DATA_IMAGE_BYTES) {
    return { ok: false, reason: 'data-image-too-large' };
  }

  return {
    ok: true,
    url: trimmed,
    mediaType,
    decodedByteLength,
  };
};

export const isAllowedDataImageUrl = (value: unknown): value is string =>
  validateDataImageUrl(value).ok;
