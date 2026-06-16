import {
  buildLocalMediaPublicUrl,
  buildMediaPublicUrl,
  canonicalizeMediaBaseUrl,
} from '../../shared/media/media-object-contract.js';

export const getMediaBaseUrl = (): string | undefined => {
  const raw = process.env['ROUAULT_MEDIA_BASE_URL'];
  if (raw === undefined || raw.length === 0) {
    return undefined;
  }
  return canonicalizeMediaBaseUrl(raw);
};

export const hasExternalMediaBaseUrl = (): boolean => getMediaBaseUrl() !== undefined;

export const resolveMediaAssetUrl = (
  objectKey: string,
  baseUrl: string | undefined = getMediaBaseUrl(),
): string => {
  if (baseUrl === undefined) {
    return buildLocalMediaPublicUrl(objectKey);
  }
  return buildMediaPublicUrl(baseUrl, objectKey);
};
