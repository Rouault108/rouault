import { existsSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { buildImageManifest } from '../../scripts/build-images.js';

const GENERATED_MEDIA_ROOT = path.resolve(process.cwd(), '.generated', 'media');

describe('build-images', () => {
  afterEach(async () => {
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
    if (!reading || !full) {
      throw new Error('hero の image variants が見つかりません');
    }

    expect(reading.outputs).toHaveLength(3);
    const firstFullOutput = full.outputs[0];
    if (!firstFullOutput) {
      throw new Error('hero の full variant output が見つかりません');
    }

    expect(firstFullOutput.url).toContain('/media/');
    expect(existsSync(path.join(GENERATED_MEDIA_ROOT, 'image-manifest.json'))).toBe(true);
  }, 15000);
});
