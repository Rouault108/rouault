import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  assertMediaManifestContract,
  buildMediaObjectKey,
  buildMediaPublicUrl,
  canonicalizeMediaBaseUrl,
  MEDIA_FORMAT_CONTENT_TYPE,
  MEDIA_FORMAT_EXTENSION,
  MEDIA_FORMATS,
  MEDIA_MANIFEST_SCHEMA_VERSION,
  MEDIA_VARIANTS,
  type MediaFormat,
  type MediaManifest,
  type MediaObjectContract,
  type MediaVariant,
} from '../../shared/media/media-object-contract.js';

const SHA_A = 'a'.repeat(64);
const SHA_B = 'b'.repeat(64);

const buildObject = (
  mediaItemId: string,
  variant: MediaVariant,
  format: MediaFormat,
  contentSha256 = SHA_A,
): MediaObjectContract => {
  const objectKey = buildMediaObjectKey(contentSha256, variant, format);
  return {
    mediaItemId,
    variant,
    format,
    objectKey,
    contentSha256,
    byteSize: 10,
    contentType: MEDIA_FORMAT_CONTENT_TYPE[format],
    publicUrl: buildMediaPublicUrl('https://media.example.com/', objectKey),
  };
};

const buildVariants = (
  mediaItemId: string,
  contentSha256: string,
): MediaManifest['items'][string]['variants'] => {
  const variants = Object.fromEntries(
    MEDIA_VARIANTS.map((variant) => [
      variant,
      {
        outputs: MEDIA_FORMATS.map((format) =>
          buildObject(mediaItemId, variant, format, contentSha256),
        ),
      },
    ]),
  );
  return variants as unknown as MediaManifest['items'][string]['variants'];
};

const buildManifest = (mediaItemIds: readonly string[]): MediaManifest => ({
  schemaVersion: MEDIA_MANIFEST_SCHEMA_VERSION,
  generatorVersion: 'test',
  variantSetVersion: 'reading-v1',
  items: Object.fromEntries(
    mediaItemIds.map((mediaItemId, index) => [
      mediaItemId,
      {
        mediaItemId,
        hash: `hash-${String(index)}`,
        width: 10,
        height: 10,
        variants: buildVariants(mediaItemId, index === 0 ? SHA_A : SHA_B),
      },
    ]),
  ),
});

const getManifestItem = (
  manifest: MediaManifest,
  mediaItemId: string,
): MediaManifest['items'][string] => {
  const item = manifest.items[mediaItemId];
  if (item === undefined) {
    throw new Error(`fixture item missing: ${mediaItemId}`);
  }
  return item;
};

describe('media object contract', () => {
  it('valid https://media.example.com/ をcanonical化できること', () => {
    expect(canonicalizeMediaBaseUrl('https://media.example.com/')).toBe(
      'https://media.example.com/',
    );
  });

  it('不正な mediaBaseUrl を拒否すること', () => {
    const invalidValues = [
      'https://user:pass@media.example.com/',
      'https://media.example.com:8443/',
      'https://media.example.com:443/',
      'https://media.example.com/prefix/',
      'https://media.example.com/?x=1',
      'https://media.example.com/#fragment',
      'https://メディア.example.com/',
      ' https://media.example.com/',
      'https://media.example.com/ ',
      'https://media.example.com\\path',
      'http://media.example.com/',
      'https:///',
    ];

    for (const value of invalidValues) {
      expect(() => canonicalizeMediaBaseUrl(value), value).toThrow();
    }
  });

  it('1 media itemで9 objectを受理すること', () => {
    const manifest = assertMediaManifestContract(buildManifest(['content/_assets/a.jpg']));
    expect(
      Object.values(manifest.items).flatMap((item) =>
        MEDIA_VARIANTS.flatMap((variant) => item.variants[variant].outputs),
      ),
    ).toHaveLength(9);
  });

  it('2 media itemで18 objectを受理すること', () => {
    const manifest = assertMediaManifestContract(
      buildManifest(['content/_assets/a.jpg', 'content/_assets/b.jpg']),
    );
    expect(
      Object.values(manifest.items).flatMap((item) =>
        MEDIA_VARIANTS.flatMap((variant) => item.variants[variant].outputs),
      ),
    ).toHaveLength(18);
  });

  it('variant欠落を拒否すること', () => {
    const manifest = buildManifest(['content/_assets/a.jpg']);
    delete (
      manifest.items['content/_assets/a.jpg']?.variants as Partial<Record<MediaVariant, unknown>>
    ).full;
    expect(() => assertMediaManifestContract(manifest)).toThrow(/full variant/u);
  });

  it('format欠落を拒否すること', () => {
    const manifest = buildManifest(['content/_assets/a.jpg']);
    const item = getManifestItem(manifest, 'content/_assets/a.jpg');
    const outputs = item.variants.reading.outputs;
    manifest.items['content/_assets/a.jpg'] = {
      ...item,
      variants: {
        ...item.variants,
        reading: {
          outputs: outputs.filter((output) => output.format !== 'webp'),
        },
      },
    };

    expect(() => assertMediaManifestContract(manifest)).toThrow(/webp format/u);
  });

  it('extension / contentType mismatchを拒否すること', () => {
    const manifest = buildManifest(['content/_assets/a.jpg']);
    const item = getManifestItem(manifest, 'content/_assets/a.jpg');
    const firstOutput = item.variants.reading.outputs[0];
    if (!firstOutput) {
      throw new Error('fixture output missing');
    }
    manifest.items['content/_assets/a.jpg'] = {
      ...item,
      variants: {
        ...item.variants,
        reading: {
          outputs: [
            {
              ...firstOutput,
              objectKey: `media-v2/${firstOutput.contentSha256}/reading.${MEDIA_FORMAT_EXTENSION.jpeg}`,
            },
            ...item.variants.reading.outputs.slice(1),
          ],
        },
      },
    };
    expect(() => assertMediaManifestContract(manifest)).toThrow(/objectKey/u);

    const contentTypeMismatch = buildManifest(['content/_assets/a.jpg']);
    const contentTypeMismatchItem = getManifestItem(
      contentTypeMismatch,
      'content/_assets/a.jpg',
    );
    const output = contentTypeMismatchItem.variants.reading.outputs[0];
    if (!output) {
      throw new Error('fixture output missing');
    }
    contentTypeMismatch.items['content/_assets/a.jpg'] = {
      ...contentTypeMismatchItem,
      variants: {
        ...contentTypeMismatchItem.variants,
        reading: {
          outputs: [
            {
              ...output,
              contentType: 'image/jpeg',
            },
            ...contentTypeMismatchItem.variants.reading.outputs.slice(1),
          ],
        },
      },
    };
    expect(() => assertMediaManifestContract(contentTypeMismatch)).toThrow(/contentType/u);
  });

  it('objectKeyとpublicUrlがcanonical mediaBaseUrlから決定されること', () => {
    const objectKey = buildMediaObjectKey(SHA_A, 'reading', 'jpeg');
    expect(objectKey).toBe(`media-v2/${SHA_A}/reading.jpg`);
    expect(buildMediaPublicUrl('https://media.example.com/', objectKey)).toBe(
      `https://media.example.com/${objectKey}`,
    );
  });

  it('publicUrlからobjectKeyを逆算しないsource contractを固定すること', () => {
    const resolverSource = readFileSync(
      path.resolve(process.cwd(), 'build/media/image-resolver.ts'),
      'utf8',
    );
    expect(resolverSource).not.toMatch(/new URL\([^)]*publicUrl/u);
    expect(resolverSource).not.toMatch(/publicUrl[^;\n]*\.pathname/u);
  });
});
