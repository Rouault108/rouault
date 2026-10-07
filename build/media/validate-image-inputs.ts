import sharp from 'sharp';
export interface ImageInputGuards {
  maxBlobBytes: number;
  maxPushBytes: number;
  maxPixels: number;
  memoryBytes: number;
  timeoutMs: number;
  hostingEvidence: string;
  environmentEvidence: string;
}
export const validateImageGuards = (guards: ImageInputGuards): void => {
  for (const value of [
    guards.maxBlobBytes,
    guards.maxPushBytes,
    guards.maxPixels,
    guards.memoryBytes,
    guards.timeoutMs,
  ]) {
    if (!Number.isSafeInteger(value) || value <= 0)
      throw new Error('[images] verified resource guards required');
  }
  if (!guards.hostingEvidence.trim() || !guards.environmentEvidence.trim())
    throw new Error('[images] guard evidence required');
};
export const validateImageInput = async (
  bytes: Uint8Array,
  extension: string,
  guards: ImageInputGuards,
) => {
  validateImageGuards(guards);
  if (bytes.length > guards.maxBlobBytes) throw new Error('[images] blob limit exceeded');
  const image = sharp(bytes, { limitInputPixels: guards.maxPixels, animated: true }).timeout({
    seconds: Math.max(1, Math.floor(guards.timeoutMs / 1000)),
  });
  const metadata = await image.metadata();
  const formats: Record<string, string> = {
    png: 'png',
    jpg: 'jpeg',
    jpeg: 'jpeg',
    webp: 'webp',
    avif: 'heif',
  };
  if (
    !formats[extension] ||
    metadata.format !== formats[extension] ||
    (extension === 'avif' && metadata.compression !== 'av1')
  )
    throw new Error('[images] unsupported or spoofed format');
  if ((metadata.pages ?? 1) !== 1 || !metadata.width || !metadata.height)
    throw new Error('[images] static image required');
  const pixels = metadata.width * metadata.height;
  if (pixels > guards.maxPixels || pixels * (metadata.channels ?? 4) * 3 > guards.memoryBytes)
    throw new Error('[images] decode budget exceeded');
  // 実decodeを行い、headerだけの成功を公開許可にしない。
  const decoded = await image.raw().toBuffer();
  return { metadata, decoded };
};
export const validatePushInput = (
  blobs: readonly Uint8Array[],
  encodedRequestBytes: number,
  guards: ImageInputGuards,
): void => {
  validateImageGuards(guards);
  if (
    blobs.some((blob) => blob.length > guards.maxBlobBytes) ||
    !Number.isSafeInteger(encodedRequestBytes) ||
    encodedRequestBytes < blobs.reduce((sum, blob) => sum + blob.length, 0) ||
    encodedRequestBytes > guards.maxPushBytes
  )
    throw new Error('[images] push route limit exceeded');
};
