import { existsSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

import { buildImageManifest, isDirectCliInvocation } from '../../scripts/build-images.js';
import { MEDIA_FORMATS, MEDIA_VARIANTS } from '../../shared/media/media-object-contract.js';

const GENERATED_MEDIA_ROOT = path.resolve(process.cwd(), '.generated', 'media');
const BUILD_IMAGES_SCRIPT_PATH = fileURLToPath(
  new URL('../../scripts/build-images.ts', import.meta.url),
);
const BUILD_IMAGES_SCRIPT_URL = new URL('../../scripts/build-images.ts', import.meta.url).href;

describe('build-images', () => {
  afterEach(async () => {
    delete process.env['ROUAULT_MEDIA_BASE_URL'];
    await rm(GENERATED_MEDIA_ROOT, { recursive: true, force: true });
  });

  it('content/_assets と examples/media 原本から image manifest と variant assets を生成すること', async () => {
    const manifest = await buildImageManifest();
    const hero = manifest.items['examples/media/testing/test-hero.jpg'];

    expect(hero).toBeDefined();
    if (!hero) {
      throw new Error('hero の image manifest が見つかりません');
    }

    const reading = hero.variants.reading;
    const full = hero.variants.full;

    expect(reading.outputs).toHaveLength(3);
    expect(MEDIA_VARIANTS.flatMap((variant) => hero.variants[variant].outputs)).toHaveLength(9);
    const firstFullOutput = full.outputs[0];
    if (!firstFullOutput) {
      throw new Error('hero の full variant output が見つかりません');
    }

    expect(firstFullOutput.publicUrl).toContain('/media/');
    expect(firstFullOutput.objectKey).toMatch(/^media-v2\/[0-9a-f]{64}\/full\.(avif|webp|jpg)$/u);
    expect(firstFullOutput.contentSha256).toMatch(/^[0-9a-f]{64}$/u);
    expect(existsSync(path.join(GENERATED_MEDIA_ROOT, 'image-manifest.json'))).toBe(true);
  }, 15000);

  it('ROUAULT_MEDIA_BASE_URL が設定されている場合は external URL を書き出すこと', async () => {
    process.env['ROUAULT_MEDIA_BASE_URL'] = 'https://media.example.com/';

    const manifest = await buildImageManifest();
    const hero = manifest.items['examples/media/testing/test-hero.jpg'];

    expect(hero).toBeDefined();
    if (!hero) {
      throw new Error('hero の image manifest が見つかりません');
    }

    const full = hero.variants.full;

    const firstFullOutput = full.outputs[0];
    if (!firstFullOutput) {
      throw new Error('hero の full variant output が見つかりません');
    }

    expect(firstFullOutput.publicUrl).toBe(
      `https://media.example.com/${firstFullOutput.objectKey}`,
    );
    expect(firstFullOutput.publicUrl).not.toContain('/media/');
    expect(
      MEDIA_FORMATS.every((format) => full.outputs.some((output) => output.format === format)),
    ).toBe(true);
  }, 15000);

  it('CLI entrypoint 判定は file URL と OS native path の表現差を吸収すること', () => {
    expect(isDirectCliInvocation(BUILD_IMAGES_SCRIPT_PATH, BUILD_IMAGES_SCRIPT_URL)).toBe(true);
    expect(isDirectCliInvocation(undefined, BUILD_IMAGES_SCRIPT_URL)).toBe(false);
    expect(
      isDirectCliInvocation(
        path.join(process.cwd(), 'scripts', 'other.ts'),
        BUILD_IMAGES_SCRIPT_URL,
      ),
    ).toBe(false);
  });
});
