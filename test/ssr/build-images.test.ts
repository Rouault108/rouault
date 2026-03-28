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

  it('content/_assets 原本から image manifest と variant assets を生成すること', async () => {
    const manifest = await buildImageManifest();
    const hero = manifest.items['content/_assets/testing/test-hero.jpg'];

    expect(hero).toBeDefined();
    expect(hero?.variants.reading?.outputs).toHaveLength(3);
    expect(hero?.variants.full?.outputs?.[0]?.url).toContain('/media/');
    expect(existsSync(path.join(GENERATED_MEDIA_ROOT, 'image-manifest.json'))).toBe(true);
  }, 15000);
});
