export const MEDIA_MANIFEST_SCHEMA_VERSION = 2;
export const MEDIA_STORAGE_CONTRACT_VERSION = 'media-v2';
export const MEDIA_VARIANTS = ['thumb', 'reading', 'full'] as const;
export const MEDIA_FORMATS = ['avif', 'webp', 'jpeg'] as const;

export type MediaVariant = (typeof MEDIA_VARIANTS)[number];
export type MediaFormat = (typeof MEDIA_FORMATS)[number];

export interface MediaObjectContract {
  readonly mediaItemId: string;
  readonly variant: MediaVariant;
  readonly format: MediaFormat;
  readonly objectKey: string;
  readonly contentSha256: string;
  readonly byteSize: number;
  readonly contentType: string;
  readonly publicUrl: string;
}

export interface MediaVariantEntry {
  readonly outputs: readonly MediaObjectContract[];
}

export interface MediaManifestItem {
  readonly mediaItemId: string;
  readonly hash: string;
  readonly width: number;
  readonly height: number;
  readonly placeholder?: {
    readonly kind: 'dominant-color';
    readonly value: string;
  };
  readonly variants: Record<MediaVariant, MediaVariantEntry>;
}

export interface MediaManifest {
  readonly schemaVersion: typeof MEDIA_MANIFEST_SCHEMA_VERSION;
  readonly generatorVersion: string;
  readonly variantSetVersion: 'reading-v1';
  readonly items: Record<string, MediaManifestItem>;
}

const CONTENT_SHA256_PATTERN = /^[0-9a-f]{64}$/u;
const ASCII_DNS_LABEL_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/u;

export const MEDIA_FORMAT_EXTENSION: Record<MediaFormat, string> = {
  avif: 'avif',
  webp: 'webp',
  jpeg: 'jpg',
};

export const MEDIA_FORMAT_CONTENT_TYPE: Record<MediaFormat, string> = {
  avif: 'image/avif',
  webp: 'image/webp',
  jpeg: 'image/jpeg',
};

export const isMediaVariant = (value: unknown): value is MediaVariant =>
  typeof value === 'string' && (MEDIA_VARIANTS as readonly string[]).includes(value);

export const isMediaFormat = (value: unknown): value is MediaFormat =>
  typeof value === 'string' && (MEDIA_FORMATS as readonly string[]).includes(value);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const assertRecord = (value: unknown, label: string): Record<string, unknown> => {
  if (!isRecord(value)) {
    throw new Error(`[media] ${label} が不正です`);
  }
  return value;
};

const assertString = (value: unknown, label: string): string => {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`[media] ${label} が不正です`);
  }
  return value;
};

const assertCanonicalSha256 = (value: unknown, label: string): string => {
  const sha256 = assertString(value, label);
  if (!CONTENT_SHA256_PATTERN.test(sha256)) {
    throw new Error(`[media] ${label} は lowercase SHA-256 である必要があります`);
  }
  return sha256;
};

const assertPositiveInteger = (value: unknown, label: string): number => {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`[media] ${label} が不正です`);
  }
  return value;
};

const containsAsciiControl = (value: string): boolean =>
  [...value].some((character) => {
    const codePoint = character.codePointAt(0);
    return codePoint !== undefined && (codePoint <= 0x1f || codePoint === 0x7f);
  });

const containsNonAscii = (value: string): boolean =>
  [...value].some((character) => {
    const codePoint = character.codePointAt(0);
    return codePoint !== undefined && codePoint > 0x7f;
  });

export const canonicalizeMediaBaseUrl = (value: string): string => {
  if (value.length === 0) {
    throw new Error('[media] mediaBaseUrl host が空です');
  }
  if (value !== value.trim()) {
    throw new Error('[media] mediaBaseUrl に前後空白は使用できません');
  }
  if (containsAsciiControl(value)) {
    throw new Error('[media] mediaBaseUrl に制御文字は使用できません');
  }
  if (value.includes('\\')) {
    throw new Error('[media] mediaBaseUrl に backslash は使用できません');
  }
  const authority = /^https:\/\/([^/?#]*)/u.exec(value)?.[1] ?? '';
  if (authority.includes(':') && !authority.includes('@')) {
    throw new Error('[media] mediaBaseUrl に port は使用できません');
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error('[media] mediaBaseUrl は https://<ascii-dns-host>/ 形式である必要があります');
  }

  if (parsed.protocol !== 'https:') {
    throw new Error('[media] mediaBaseUrl は https scheme である必要があります');
  }
  if (parsed.username !== '' || parsed.password !== '') {
    throw new Error('[media] mediaBaseUrl に credentials は使用できません');
  }
  if (parsed.port !== '') {
    throw new Error('[media] mediaBaseUrl に port は使用できません');
  }
  if (parsed.pathname !== '/') {
    throw new Error('[media] mediaBaseUrl に path prefix は使用できません');
  }
  if (parsed.search !== '') {
    throw new Error('[media] mediaBaseUrl に query は使用できません');
  }
  if (parsed.hash !== '') {
    throw new Error('[media] mediaBaseUrl に fragment は使用できません');
  }

  const host = parsed.hostname;
  if (host.length === 0) {
    throw new Error('[media] mediaBaseUrl host が空です');
  }
  if (containsNonAscii(host) || host.includes('xn--')) {
    throw new Error('[media] mediaBaseUrl host はASCII DNS hostである必要があります');
  }

  const labels = host.split('.');
  if (
    labels.length < 2 ||
    labels.some((label) => !ASCII_DNS_LABEL_PATTERN.test(label)) ||
    labels.at(-1)?.match(/^[0-9]+$/u)
  ) {
    throw new Error('[media] mediaBaseUrl host はASCII DNS hostである必要があります');
  }

  return `https://${host}/`;
};

export const buildMediaObjectKey = (
  contentSha256: string,
  variant: MediaVariant,
  format: MediaFormat,
): string => {
  if (!CONTENT_SHA256_PATTERN.test(contentSha256)) {
    throw new Error('[media] contentSha256 は lowercase SHA-256 である必要があります');
  }
  return `${MEDIA_STORAGE_CONTRACT_VERSION}/${contentSha256}/${variant}.${MEDIA_FORMAT_EXTENSION[format]}`;
};

export const buildMediaPublicUrl = (mediaBaseUrl: string, objectKey: string): string => {
  const canonicalBaseUrl = canonicalizeMediaBaseUrl(mediaBaseUrl);
  if (objectKey.length === 0 || objectKey.startsWith('/') || objectKey.includes('\\')) {
    throw new Error('[media] objectKey が不正です');
  }
  return new URL(objectKey, canonicalBaseUrl).href;
};

export const buildLocalMediaPublicUrl = (objectKey: string): string => {
  if (objectKey.length === 0 || objectKey.startsWith('/') || objectKey.includes('\\')) {
    throw new Error('[media] objectKey が不正です');
  }
  return `/media/${objectKey}`;
};

export const assertMediaObjectContract = (value: unknown): MediaObjectContract => {
  const object = assertRecord(value, 'media object');
  const mediaItemId = assertString(object['mediaItemId'], 'mediaItemId');
  const variant = object['variant'];
  const format = object['format'];
  if (!isMediaVariant(variant)) {
    throw new Error('[media] media object variant が不正です');
  }
  if (!isMediaFormat(format)) {
    throw new Error('[media] media object format が不正です');
  }

  const contentSha256 = assertCanonicalSha256(object['contentSha256'], 'contentSha256');
  const objectKey = assertString(object['objectKey'], 'objectKey');
  const expectedObjectKey = buildMediaObjectKey(contentSha256, variant, format);
  if (objectKey !== expectedObjectKey) {
    throw new Error('[media] media object objectKey が canonical grammar と一致しません');
  }

  const contentType = assertString(object['contentType'], 'contentType');
  if (contentType !== MEDIA_FORMAT_CONTENT_TYPE[format]) {
    throw new Error('[media] media object contentType が format と一致しません');
  }

  const publicUrl = assertString(object['publicUrl'], 'publicUrl');
  if (!publicUrl.endsWith(`/${objectKey}`)) {
    throw new Error('[media] media object publicUrl が objectKey と一致しません');
  }

  return {
    mediaItemId,
    variant,
    format,
    objectKey,
    contentSha256,
    byteSize: assertPositiveInteger(object['byteSize'], 'byteSize'),
    contentType,
    publicUrl,
  };
};

export const assertMediaManifestContract = (value: unknown): MediaManifest => {
  const manifest = assertRecord(value, 'image manifest JSON');
  if (manifest['schemaVersion'] !== MEDIA_MANIFEST_SCHEMA_VERSION) {
    throw new Error('[media] image manifest の schemaVersion が未対応です');
  }
  if (manifest['variantSetVersion'] !== 'reading-v1') {
    throw new Error('[media] image manifest の variantSetVersion が未対応です');
  }

  const items = assertRecord(manifest['items'], 'image manifest items');
  const normalizedItems: Record<string, MediaManifestItem> = {};

  for (const [sourcePath, rawItem] of Object.entries(items)) {
    const item = assertRecord(rawItem, `image manifest item ${sourcePath}`);
    const mediaItemId = assertString(item['mediaItemId'], 'mediaItemId');
    const variants = assertRecord(item['variants'], `image manifest item ${sourcePath} variants`);
    const normalizedVariants = {} as Record<MediaVariant, MediaVariantEntry>;
    const objectIdentities = new Set<string>();

    for (const variant of MEDIA_VARIANTS) {
      const entry = assertRecord(variants[variant], `${variant} variant`);
      const outputs = entry['outputs'];
      if (!Array.isArray(outputs)) {
        throw new Error(`[media] ${variant} variant outputs が不正です`);
      }

      const outputsByFormat = new Map<MediaFormat, MediaObjectContract>();
      for (const output of outputs) {
        const normalizedOutput = assertMediaObjectContract(output);
        if (normalizedOutput.mediaItemId !== mediaItemId) {
          throw new Error('[media] media object mediaItemId が item と一致しません');
        }
        if (normalizedOutput.variant !== variant) {
          throw new Error('[media] media object variant が variant entry と一致しません');
        }
        if (outputsByFormat.has(normalizedOutput.format)) {
          throw new Error('[media] media object format が重複しています');
        }
        outputsByFormat.set(normalizedOutput.format, normalizedOutput);
        objectIdentities.add(`${normalizedOutput.variant}:${normalizedOutput.format}`);
      }

      for (const format of MEDIA_FORMATS) {
        if (!outputsByFormat.has(format)) {
          throw new Error(`[media] ${variant} variant に ${format} format がありません`);
        }
      }
      normalizedVariants[variant] = {
        outputs: MEDIA_FORMATS.map((format) => {
          const output = outputsByFormat.get(format);
          if (output === undefined) {
            throw new Error(`[media] ${variant} variant に ${format} format がありません`);
          }
          return output;
        }),
      };
    }

    if (objectIdentities.size !== MEDIA_VARIANTS.length * MEDIA_FORMATS.length) {
      throw new Error('[media] media item は variant × format の9件を持つ必要があります');
    }

    normalizedItems[sourcePath] = {
      mediaItemId,
      hash: assertString(item['hash'], 'hash'),
      width: assertPositiveInteger(item['width'], 'width'),
      height: assertPositiveInteger(item['height'], 'height'),
      ...(isRecord(item['placeholder']) &&
      item['placeholder']['kind'] === 'dominant-color' &&
      typeof item['placeholder']['value'] === 'string'
        ? {
            placeholder: {
              kind: 'dominant-color',
              value: item['placeholder']['value'],
            },
          }
        : {}),
      variants: normalizedVariants,
    };
  }

  return {
    schemaVersion: MEDIA_MANIFEST_SCHEMA_VERSION,
    generatorVersion: assertString(manifest['generatorVersion'], 'generatorVersion'),
    variantSetVersion: 'reading-v1',
    items: normalizedItems,
  };
};
