import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

import type {
  MediaManifest,
  MediaManifestItem,
  MediaObjectContract,
  MediaVariantEntry,
  MediaVariant,
} from '../shared/media/media-object-contract.js';
import {
  buildMediaObjectKey,
  MEDIA_FORMAT_CONTENT_TYPE,
  MEDIA_FORMAT_EXTENSION,
  MEDIA_FORMATS,
  MEDIA_MANIFEST_SCHEMA_VERSION,
  MEDIA_VARIANTS,
} from '../shared/media/media-object-contract.js';
import { getMediaBaseUrl, resolveMediaAssetUrl } from '../build/media/media-base-url.js';

const CONTENT_ROOT = path.resolve(process.cwd(), 'content');
const EXAMPLES_ROOT = path.resolve(process.cwd(), 'examples');
const GENERATED_ROOT = path.resolve(process.cwd(), '.generated', 'media');
const GENERATED_ASSET_ROOT = path.join(GENERATED_ROOT, 'assets');
const MANIFEST_PATH = path.join(GENERATED_ROOT, 'image-manifest.json');
const LINK_CARD_THUMBNAIL_CACHE_PATH = path.join(
  CONTENT_ROOT,
  '_generated',
  'link-card-thumbnails.json',
);
const GENERATOR_VERSION = '1.0.0';
const VARIANT_SET_VERSION = 'reading-v1';

interface VariantDefinition {
  readonly width: number;
}

interface LinkCardThumbnailCache {
  readonly entries?: Record<string, { readonly sourcePath?: string }>;
}

const VARIANT_DEFINITIONS: Record<MediaVariant, VariantDefinition> = {
  thumb: {
    width: 320,
  },
  reading: {
    width: 1200,
  },
  full: {
    width: 2000,
  },
};

const pickOptionalString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const normalizeContentAssetPath = (value: string): string =>
  path.posix.normalize(value.trim().replace(/^\/+/, ''));

const isLocalContentAssetPath = (value: string): boolean =>
  ['content/_assets/', 'examples/media/'].some((prefix) =>
    normalizeContentAssetPath(value).startsWith(prefix),
  );

const collectMarkdownFiles = async (directory: string): Promise<string[]> => {
  const entries = await readdir(directory, { withFileTypes: true });
  const results: string[] = [];

  for (const entry of entries) {
    if (entry.name === '_generated' || entry.name === '_assets') {
      if (entry.name === '_assets') {
        continue;
      }
    }

    const resolvedPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '_generated') {
        continue;
      }
      results.push(...(await collectMarkdownFiles(resolvedPath)));
      continue;
    }

    if (entry.isFile() && (resolvedPath.endsWith('.md') || resolvedPath.endsWith('.mdx'))) {
      results.push(resolvedPath);
    }
  }

  return results;
};

const extractFrontmatter = (source: string): string | null => {
  const matched = /^---\n([\s\S]*?)\n---\n?/u.exec(source);
  return matched?.[1] ?? null;
};

const parseLinkCardAttributes = (source: string): Record<string, string> => {
  const attrs: Record<string, string> = {};
  const pattern = /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

  for (const matched of source.matchAll(pattern)) {
    const key = (matched[1] ?? '').toLowerCase();
    if (!key) {
      continue;
    }
    attrs[key] = matched[2] ?? matched[3] ?? matched[4] ?? '';
  }

  return attrs;
};

const extractLocalAssetPathsFromMarkdown = (source: string): string[] => {
  const paths = new Set<string>();

  const frontmatter = extractFrontmatter(source);
  if (frontmatter) {
    const coverMatch = /^\s*cover:\s*['"]?([^'"\n]+)['"]?\s*$/m.exec(frontmatter);
    const cover = coverMatch?.[1]?.trim();
    if (cover && isLocalContentAssetPath(cover)) {
      paths.add(normalizeContentAssetPath(cover));
    }
  }

  for (const matched of source.matchAll(/!\[[^\]]*]\(([^)\s]+)(?:\s+['"][^'"]*['"])?\)/g)) {
    const candidate = pickOptionalString(matched[1]);
    if (candidate && isLocalContentAssetPath(candidate)) {
      paths.add(normalizeContentAssetPath(candidate));
    }
  }

  for (const matched of source.matchAll(/::link-card\{([\s\S]*?)\}/g)) {
    const attrs = parseLinkCardAttributes(matched[1] ?? '');
    const image = pickOptionalString(attrs['image']);
    if (image && isLocalContentAssetPath(image)) {
      paths.add(normalizeContentAssetPath(image));
    }
  }

  return [...paths];
};

const loadLinkCardThumbnailSourcePaths = async (): Promise<string[]> => {
  try {
    const raw = await readFile(LINK_CARD_THUMBNAIL_CACHE_PATH, 'utf8');
    const parsed = JSON.parse(raw) as LinkCardThumbnailCache;
    const entries = parsed.entries ?? {};
    return Object.values(entries)
      .map((entry) => pickOptionalString(entry.sourcePath))
      .filter((entry): entry is string => typeof entry === 'string')
      .map((entry) => normalizeContentAssetPath(entry));
  } catch {
    return [];
  }
};

const collectReferencedSourcePaths = async (): Promise<string[]> => {
  const markdownFiles = [
    ...(await collectMarkdownFiles(CONTENT_ROOT)),
    ...(await collectMarkdownFiles(EXAMPLES_ROOT)),
  ];
  const references = new Set<string>();

  for (const markdownFile of markdownFiles) {
    const source = await readFile(markdownFile, 'utf8');
    for (const assetPath of extractLocalAssetPathsFromMarkdown(source)) {
      references.add(assetPath);
    }
  }

  for (const thumbnailSourcePath of await loadLinkCardThumbnailSourcePaths()) {
    references.add(thumbnailSourcePath);
  }

  return [...references].sort();
};

const buildPlaceholder = async (fileBuffer: Buffer): Promise<string | undefined> => {
  const pixel = await sharp(fileBuffer).resize(1, 1, { fit: 'cover' }).raw().toBuffer();
  if (pixel.length < 3) {
    return undefined;
  }

  const [red, green, blue] = pixel;
  return `rgb(${String(red)} ${String(green)} ${String(blue)})`;
};

const createVariantOutputs = async (
  fileBuffer: Buffer,
  mediaItemId: string,
  variantName: MediaVariant,
  definition: VariantDefinition,
  mediaBaseUrl: string | undefined,
): Promise<MediaObjectContract[]> => {
  const outputs: MediaObjectContract[] = [];
  const variantDirectory = path.join(GENERATED_ASSET_ROOT, mediaItemId);
  await mkdir(variantDirectory, { recursive: true });

  for (const format of MEDIA_FORMATS) {
    const outputFileName = `${variantName}.${MEDIA_FORMAT_EXTENSION[format]}`;
    const outputPath = path.join(variantDirectory, outputFileName);
    const pipeline = sharp(fileBuffer).rotate().resize({
      width: definition.width,
      withoutEnlargement: true,
    });

    if (format === 'avif') {
      await pipeline.avif({ quality: 50, effort: 0 }).toFile(outputPath);
    } else if (format === 'webp') {
      await pipeline.webp({ quality: 72, effort: 0 }).toFile(outputPath);
    } else {
      await pipeline.jpeg({ quality: 80 }).toFile(outputPath);
    }

    const outputStat = await stat(outputPath);
    const outputBuffer = await readFile(outputPath);
    const contentSha256 = createHash('sha256').update(outputBuffer).digest('hex');
    const objectKey = buildMediaObjectKey(contentSha256, variantName, format);
    outputs.push({
      mediaItemId,
      variant: variantName,
      format,
      objectKey,
      contentSha256,
      byteSize: outputStat.size,
      contentType: MEDIA_FORMAT_CONTENT_TYPE[format],
      publicUrl: resolveMediaAssetUrl(objectKey, mediaBaseUrl),
    });
  }

  return outputs;
};

const buildManifestItem = async (
  sourcePath: string,
  mediaBaseUrl: string | undefined,
): Promise<MediaManifestItem> => {
  const absolutePath = path.resolve(process.cwd(), sourcePath);
  const fileBuffer = await readFile(absolutePath);
  const hash = createHash('sha256').update(fileBuffer).digest('hex').slice(0, 12);
  const mediaItemId = normalizeContentAssetPath(sourcePath);
  const metadata = await sharp(fileBuffer).metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error(`[media] 画像サイズを取得できません: ${sourcePath}`);
  }

  const placeholder = await buildPlaceholder(fileBuffer);
  const variants = await Promise.all(
    MEDIA_VARIANTS.map(
      async (variantName): Promise<[MediaVariant, MediaVariantEntry]> => [
        variantName,
        {
          outputs: await createVariantOutputs(
            fileBuffer,
            mediaItemId,
            variantName,
            VARIANT_DEFINITIONS[variantName],
            mediaBaseUrl,
          ),
        },
      ],
    ),
  );

  return {
    mediaItemId,
    hash,
    width: metadata.width,
    height: metadata.height,
    ...(placeholder
      ? {
          placeholder: {
            kind: 'dominant-color',
            value: placeholder,
          },
        }
      : {}),
    variants: Object.fromEntries(variants) as Record<MediaVariant, MediaVariantEntry>,
  };
};

export const buildImageManifest = async (): Promise<MediaManifest> => {
  const mediaBaseUrl = getMediaBaseUrl();
  const referencedSourcePaths = await collectReferencedSourcePaths();

  await rm(GENERATED_ASSET_ROOT, { recursive: true, force: true });
  await mkdir(GENERATED_ROOT, { recursive: true });

  const items = Object.fromEntries(
    await Promise.all(
      referencedSourcePaths.map(
        async (sourcePath): Promise<[string, MediaManifestItem]> => [
          sourcePath,
          await buildManifestItem(sourcePath, mediaBaseUrl),
        ],
      ),
    ),
  ) as Record<string, MediaManifestItem>;

  const manifest: MediaManifest = {
    schemaVersion: MEDIA_MANIFEST_SCHEMA_VERSION,
    generatorVersion: GENERATOR_VERSION,
    variantSetVersion: VARIANT_SET_VERSION,
    items,
  };

  await writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  return manifest;
};

export const isDirectCliInvocation = (
  entryPoint: string | undefined,
  moduleUrl: string,
): boolean => {
  if (entryPoint === undefined) {
    return false;
  }

  return path.resolve(entryPoint) === path.resolve(fileURLToPath(moduleUrl));
};

const run = async (): Promise<void> => {
  const manifest = await buildImageManifest();
  console.log(
    `[media] generated ${String(Object.keys(manifest.items).length)} media item(s) at ${MANIFEST_PATH}`,
  );
};

if (isDirectCliInvocation(process.argv[1], import.meta.url)) {
  void run();
}
