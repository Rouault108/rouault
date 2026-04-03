const LOCAL_MEDIA_ROUTE = '/media';

const normalizeTrailingSlash = (value: string): string => value.trim().replace(/\/+$/, '');

const normalizePathSegment = (value: string): string => value.trim().replace(/^\/+/, '');

export const getMediaBaseUrl = (): string | undefined => {
  const normalized = normalizeTrailingSlash(process.env['ROUAULT_MEDIA_BASE_URL'] ?? '');
  return normalized.length > 0 ? normalized : undefined;
};

export const hasExternalMediaBaseUrl = (): boolean => getMediaBaseUrl() !== undefined;

export const resolveMediaAssetUrl = (
  hash: string,
  fileName: string,
  baseUrl: string | undefined = getMediaBaseUrl(),
): string => {
  const normalizedHash = normalizePathSegment(hash);
  const normalizedFileName = normalizePathSegment(fileName);

  if (normalizedHash.length === 0 || normalizedFileName.length === 0) {
    throw new Error('[media] invalid media asset path');
  }

  const prefix = baseUrl ?? LOCAL_MEDIA_ROUTE;
  return `${prefix}/${normalizedHash}/${normalizedFileName}`;
};
