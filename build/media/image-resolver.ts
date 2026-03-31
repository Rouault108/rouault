import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

export interface MediaVariantOutput {
  readonly format: 'avif' | 'webp' | 'jpeg';
  readonly mediaType: string;
  readonly byteSize: number;
  readonly url: string;
}

export interface MediaVariantEntry {
  readonly outputs: readonly MediaVariantOutput[];
}

export interface MediaManifestItem {
  readonly hash: string;
  readonly width: number;
  readonly height: number;
  readonly placeholder?: {
    readonly kind: 'dominant-color';
    readonly value: string;
  };
  readonly variants: {
    readonly thumb?: MediaVariantEntry;
    readonly reading?: MediaVariantEntry;
    readonly full?: MediaVariantEntry;
  };
}

export interface MediaManifest {
  readonly schemaVersion: 1;
  readonly generatorVersion: string;
  readonly variantSetVersion: 'reading-v1';
  readonly items: Record<string, MediaManifestItem>;
}

export interface MediaSourceDescriptor {
  readonly type: string;
  readonly srcset: string;
  readonly sizes?: string;
}

export interface ResolvedPictureSourceSet {
  readonly src: string;
  readonly srcset?: string;
  readonly sizes?: string;
  readonly sources: readonly MediaSourceDescriptor[];
}

export interface ResolvedImageAsset {
  readonly sourcePath: string;
  readonly width?: number;
  readonly height?: number;
  readonly placeholder?: string;
  readonly inline: ResolvedPictureSourceSet;
  readonly lightbox: ResolvedPictureSourceSet;
}

export interface LinkCardThumbnailCache {
  readonly version: 1;
  readonly generatedAt?: string;
  readonly entries: Record<string, { readonly sourcePath: string }>;
}

interface ResolveImageAssetOptions {
  readonly inlineVariant?: 'thumb' | 'reading' | 'full';
  readonly lightboxVariant?: 'thumb' | 'reading' | 'full';
  readonly inlineSizes?: string;
  readonly lightboxSizes?: string;
  readonly strict?: boolean;
}

const IMAGE_MANIFEST_PATH = path.resolve(process.cwd(), '.generated/media/image-manifest.json');
const LINK_CARD_THUMBNAIL_CACHE_PATH = path.resolve(
  process.cwd(),
  'content/_generated/link-card-thumbnails.json',
);
const LOCAL_CONTENT_ASSET_ROUTE = '/content-assets/';
const EXAMPLE_MEDIA_ASSET_ROUTE = '/example-assets/';
const EXPECTED_SCHEMA_VERSION = 1;
const EXPECTED_VARIANT_SET_VERSION = 'reading-v1';

let cachedManifestPath: string | null = null;
let cachedManifestMtimeMs = -1;
let cachedManifest: MediaManifest | null = null;

let cachedThumbnailCacheMtimeMs = -1;
let cachedThumbnailCache: LinkCardThumbnailCache | null = null;

const pickOptionalString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const normalizeContentAssetPath = (value: string): string => {
  const trimmed = value.trim().replace(/^\/+/, '');
  return path.posix.normalize(trimmed);
};

const isHttpUrl = (value: string): boolean => /^https?:\/\//i.test(value);

const buildError = (message: string): Error => new Error(`[markdown] ${message}`);

export const isStrictMediaMode = (): boolean =>
  process.env['ROUAULT_MEDIA_STRICT'] === '1' || process.env['npm_lifecycle_event'] === 'build';

const isContentAssetPath = (value: string): boolean =>
  normalizeContentAssetPath(value).startsWith('content/_assets/');

const isExampleMediaAssetPath = (value: string): boolean =>
  normalizeContentAssetPath(value).startsWith('examples/media/');

export const isLocalContentAssetPath = (value: string): boolean =>
  isContentAssetPath(value) || isExampleMediaAssetPath(value);

const assertManifestShape = (value: unknown): MediaManifest => {
  if (!isRecord(value)) {
    throw buildError('image manifest JSON が不正です');
  }

  if (value['schemaVersion'] !== EXPECTED_SCHEMA_VERSION) {
    throw buildError('image manifest の schemaVersion が未対応です');
  }

  if (value['variantSetVersion'] !== EXPECTED_VARIANT_SET_VERSION) {
    throw buildError('image manifest の variantSetVersion が未対応です');
  }

  if (!isRecord(value['items'])) {
    throw buildError('image manifest の items が不正です');
  }

  return value as unknown as MediaManifest;
};

const loadManifest = (): MediaManifest | null => {
  if (!existsSync(IMAGE_MANIFEST_PATH)) {
    cachedManifest = null;
    cachedManifestPath = IMAGE_MANIFEST_PATH;
    cachedManifestMtimeMs = -1;
    return null;
  }

  const stat = statSync(IMAGE_MANIFEST_PATH);
  if (
    cachedManifestPath === IMAGE_MANIFEST_PATH &&
    cachedManifestMtimeMs === stat.mtimeMs &&
    cachedManifest !== null
  ) {
    return cachedManifest;
  }

  const parsed = JSON.parse(readFileSync(IMAGE_MANIFEST_PATH, 'utf8')) as unknown;
  const manifest = assertManifestShape(parsed);
  cachedManifestPath = IMAGE_MANIFEST_PATH;
  cachedManifestMtimeMs = stat.mtimeMs;
  cachedManifest = manifest;
  return manifest;
};

const loadLinkCardThumbnailCache = (): LinkCardThumbnailCache | null => {
  if (!existsSync(LINK_CARD_THUMBNAIL_CACHE_PATH)) {
    cachedThumbnailCache = null;
    cachedThumbnailCacheMtimeMs = -1;
    return null;
  }

  const stat = statSync(LINK_CARD_THUMBNAIL_CACHE_PATH);
  if (cachedThumbnailCacheMtimeMs === stat.mtimeMs && cachedThumbnailCache !== null) {
    return cachedThumbnailCache;
  }

  const parsed = JSON.parse(readFileSync(LINK_CARD_THUMBNAIL_CACHE_PATH, 'utf8')) as unknown;
  if (
    !isRecord(parsed) ||
    parsed['version'] !== 1 ||
    !isRecord(parsed['entries'])
  ) {
    throw buildError('link-card thumbnail cache JSON が不正です');
  }

  const cache = parsed as unknown as LinkCardThumbnailCache;
  cachedThumbnailCache = cache;
  cachedThumbnailCacheMtimeMs = stat.mtimeMs;
  return cache;
};

const buildDevelopmentAssetRoute = (sourcePath: string): string => {
  const normalized = normalizeContentAssetPath(sourcePath);
  if (normalized.startsWith('content/_assets/')) {
    return `${LOCAL_CONTENT_ASSET_ROUTE}${normalized.slice('content/_assets/'.length)}`;
  }

  if (normalized.startsWith('examples/media/')) {
    return `${EXAMPLE_MEDIA_ASSET_ROUTE}${normalized.slice('examples/media/'.length)}`;
  }

  throw buildError(`ローカル画像 path "${normalized}" は未対応です`);
};

const buildPictureSourceSet = (
  outputs: readonly MediaVariantOutput[],
  sizes: string | undefined,
): ResolvedPictureSourceSet => {
  const fallback =
    outputs.find((output) => output.format === 'jpeg') ??
    outputs.find((output) => output.format === 'webp') ??
    outputs[0];

  if (!fallback) {
    throw buildError('image manifest variant outputs が空です');
  }

  return {
    src: fallback.url,
    ...(sizes ? { sizes } : {}),
    sources: outputs
      .map((output) => ({
        type: output.mediaType,
        srcset: output.url,
        ...(sizes ? { sizes } : {}),
      }))
      .filter((entry, index, list) => list.findIndex((item) => item.type === entry.type) === index),
  };
};

const resolveManifestBackedAsset = (
  manifest: MediaManifest,
  sourcePath: string,
  options: ResolveImageAssetOptions,
): ResolvedImageAsset => {
  const normalizedSourcePath = normalizeContentAssetPath(sourcePath);
  const item = manifest.items[normalizedSourcePath];
  if (!item) {
    throw buildError(`image manifest に "${normalizedSourcePath}" が存在しません`);
  }

  const inlineVariant = options.inlineVariant ?? 'reading';
  const lightboxVariant = options.lightboxVariant ?? 'full';
  const inlineEntry = item.variants[inlineVariant];
  const lightboxEntry = item.variants[lightboxVariant];

  if (!inlineEntry) {
    throw buildError(`image manifest に "${normalizedSourcePath}" の ${inlineVariant} variant がありません`);
  }
  if (!lightboxEntry) {
    throw buildError(`image manifest に "${normalizedSourcePath}" の ${lightboxVariant} variant がありません`);
  }

  return {
    sourcePath: normalizedSourcePath,
    width: item.width,
    height: item.height,
    ...(item.placeholder?.value ? { placeholder: item.placeholder.value } : {}),
    inline: buildPictureSourceSet(inlineEntry.outputs, options.inlineSizes),
    lightbox: buildPictureSourceSet(lightboxEntry.outputs, options.lightboxSizes),
  };
};

const resolveDevelopmentFallbackAsset = (
  sourcePath: string,
  options: ResolveImageAssetOptions,
): ResolvedImageAsset => {
  const route = buildDevelopmentAssetRoute(sourcePath);
  return {
    sourcePath: normalizeContentAssetPath(sourcePath),
    inline: {
      src: route,
      ...(options.inlineSizes ? { sizes: options.inlineSizes } : {}),
      sources: [],
    },
    lightbox: {
      src: route,
      ...(options.lightboxSizes ? { sizes: options.lightboxSizes } : {}),
      sources: [],
    },
  };
};

export const assertLocalMediaSourcePath = (value: string, label: string): string => {
  const normalized = normalizeContentAssetPath(value);
  if (!isLocalContentAssetPath(normalized)) {
    throw buildError(
      `${label} は content/_assets または examples/media 配下のローカル path のみ指定できます`,
    );
  }
  return normalized;
};

export const resolveImageAsset = (
  sourcePath: string,
  options: ResolveImageAssetOptions = {},
): ResolvedImageAsset => {
  const normalizedSourcePath = assertLocalMediaSourcePath(sourcePath, '画像パス');
  const manifest = loadManifest();
  const strict = options.strict ?? isStrictMediaMode();

  if (manifest) {
    if (!manifest.items[normalizedSourcePath]) {
      if (strict) {
        throw buildError(`image manifest に "${normalizedSourcePath}" が存在しません`);
      }

      return resolveDevelopmentFallbackAsset(normalizedSourcePath, options);
    }

    return resolveManifestBackedAsset(manifest, normalizedSourcePath, options);
  }

  if (strict) {
    throw buildError('image manifest が見つかりません');
  }

  return resolveDevelopmentFallbackAsset(normalizedSourcePath, options);
};

export const resolveCoverAsset = (
  sourcePath: string,
  options: Omit<ResolveImageAssetOptions, 'inlineVariant' | 'lightboxVariant'> = {},
): ResolvedImageAsset =>
  resolveImageAsset(sourcePath, {
    inlineVariant: 'reading',
    lightboxVariant: 'full',
    ...(options.inlineSizes !== undefined ? { inlineSizes: options.inlineSizes } : {}),
    ...(options.lightboxSizes !== undefined ? { lightboxSizes: options.lightboxSizes } : {}),
    ...(options.strict !== undefined ? { strict: options.strict } : {}),
  });

export const resolveLinkCardImage = (imageValue: string | undefined): string | undefined => {
  const trimmed = pickOptionalString(imageValue);
  if (!trimmed) {
    return undefined;
  }

  if (isLocalContentAssetPath(trimmed)) {
    return resolveImageAsset(trimmed, {
      inlineVariant: 'thumb',
      lightboxVariant: 'thumb',
      inlineSizes: '156px',
      lightboxSizes: '156px',
    }).inline.src;
  }

  if (!isHttpUrl(trimmed)) {
    return undefined;
  }

  const cache = loadLinkCardThumbnailCache();
  const mappedSourcePath = cache?.entries[trimmed]?.sourcePath;
  if (!mappedSourcePath) {
    if (isStrictMediaMode()) {
      throw buildError(`link-card 画像 "${trimmed}" の thumbnail cache が存在しません`);
    }
    return undefined;
  }

  return resolveImageAsset(mappedSourcePath, {
    inlineVariant: 'thumb',
    lightboxVariant: 'thumb',
    inlineSizes: '156px',
    lightboxSizes: '156px',
  }).inline.src;
};

export const serializeMediaSources = (sources: readonly MediaSourceDescriptor[]): string =>
  JSON.stringify(sources);

export const parseMediaSourcesAttribute = (value: string | null): MediaSourceDescriptor[] => {
  if (value === null || value.trim() === '') {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.flatMap((entry) => {
      if (!isRecord(entry)) {
        return [];
      }

      const type = pickOptionalString(entry['type']);
      const srcset = pickOptionalString(entry['srcset']);
      const sizes = pickOptionalString(entry['sizes']);

      if (!type || !srcset) {
        return [];
      }

      return [{ type, srcset, ...(sizes ? { sizes } : {}) }];
    });
  } catch {
    return [];
  }
};
