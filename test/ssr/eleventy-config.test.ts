import { existsSync, readFileSync } from 'node:fs';
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import type { UserConfig } from '@11ty/eleventy';
import { describe, expect, it, vi } from 'vitest';

type GlobalData = () => unknown;
type EleventyHook = () => unknown | Promise<unknown>;
interface EleventyConfigModule {
  default: (config: UserConfig) => unknown;
}

const noop = (): void => {
  return;
};

const createConfigCapture = () => {
  const passthroughCopies: unknown[] = [];
  const globalData = new Map<string, GlobalData>();
  const afterHooks: EleventyHook[] = [];

  const config = {
    addExtension() {
      return;
    },
    addGlobalData(name: string, callback: GlobalData) {
      globalData.set(name, callback);
    },
    addPassthroughCopy(value: unknown) {
      passthroughCopies.push(value);
    },
    addLayoutAlias: noop,
    on(eventName: string, callback: EleventyHook) {
      if (eventName === 'eleventy.after') {
        afterHooks.push(callback);
      }
    },
    addPlugin: noop,
  } satisfies Partial<UserConfig>;

  return {
    afterHooks,
    config,
    globalData,
    passthroughCopies,
  };
};

describe('eleventy config', () => {
  it('開発時の Velite は Eleventy 側の watch に委譲し、内部 watch を起動しないこと', () => {
    const configPath = new URL('../../eleventy.config.ts', import.meta.url);
    const source = readFileSync(configPath, 'utf8');

    expect(source).toContain('watch: false,');
    expect(source).not.toContain('watch: true,');
    expect(source).toContain(
      '開発時の再実行は Eleventy 側の watch と eleventy.before に委譲する。',
    );
  });

  it('tagPages グローバルデータを遅延 import で登録できること', async () => {
    vi.doMock('../../src/data/tagPages.js', () => ({
      loadTagPagesData: vi.fn(() => []),
    }));

    const { config, globalData, passthroughCopies } = createConfigCapture();

    const moduleUrl = new URL('../../eleventy.config.ts', import.meta.url).href;
    const { default: configureEleventy } = (await import(moduleUrl)) as EleventyConfigModule;
    configureEleventy(config as unknown as UserConfig);

    const loadTagPages = globalData.get('tagPages');
    const loadHome = globalData.get('home');

    expect(typeof loadTagPages).toBe('function');
    expect(loadTagPages).toBeDefined();
    if (!loadTagPages) {
      throw new Error('tagPages が登録されていません');
    }
    await expect(loadTagPages()).resolves.toEqual([]);

    expect(typeof loadHome).toBe('function');
    expect(loadHome).toBeDefined();
    if (!loadHome) {
      throw new Error('home が登録されていません');
    }
    const homeResult = loadHome();
    expect(typeof homeResult).toBe('object');
    if (typeof homeResult !== 'object' || homeResult === null) {
      throw new Error('home の戻り値がオブジェクトではありません');
    }

    const home = homeResult as {
      publicNoteCount: number;
      latestUpdatedDate: string | null;
      notes: unknown[];
    };

    expect(typeof home.publicNoteCount).toBe('number');
    expect(Array.isArray(home.notes)).toBe(true);
    expect(home.latestUpdatedDate === null || typeof home.latestUpdatedDate === 'string').toBe(
      true,
    );

    expect(passthroughCopies).toContainEqual({ 'src/assets': 'assets' });
    expect(passthroughCopies).toContainEqual({ '.generated/media/assets': 'media' });
    expect(passthroughCopies).toContainEqual({ 'examples/media': 'example-assets' });
  }, 10_000);

  it('buildMetadata グローバルデータを buildId / buildLabel / generatedAt 付きで登録できること', async () => {
    const previousBuildId = process.env['ROUAULT_BUILD_ID'];
    const previousBuildLabel = process.env['ROUAULT_BUILD_LABEL'];
    const previousGeneratedAt = process.env['ROUAULT_GENERATED_AT'];
    process.env['ROUAULT_BUILD_ID'] = 'eleventy-test-build';
    process.env['ROUAULT_BUILD_LABEL'] = 'eleventy test build';
    process.env['ROUAULT_GENERATED_AT'] = '2026-05-12T00:00:00.000Z';

    try {
      const { config, globalData } = createConfigCapture();
      const moduleUrl = new URL('../../eleventy.config.ts', import.meta.url).href;
      const { default: configureEleventy } = (await import(moduleUrl)) as EleventyConfigModule;
      configureEleventy(config as unknown as UserConfig);

      const loadBuildMetadata = globalData.get('buildMetadata');
      expect(typeof loadBuildMetadata).toBe('function');
      if (!loadBuildMetadata) {
        throw new Error('buildMetadata が登録されていません');
      }

      const metadata = loadBuildMetadata() as {
        buildId: string;
        buildLabel: string;
        generatedAt: string;
      };
      expect(metadata.buildId).toBe('eleventy-test-build');
      expect(metadata.buildLabel).toBe('eleventy test build');
      expect(metadata.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u);
    } finally {
      if (previousBuildId === undefined) {
        delete process.env['ROUAULT_BUILD_ID'];
      } else {
        process.env['ROUAULT_BUILD_ID'] = previousBuildId;
      }
      if (previousBuildLabel === undefined) {
        delete process.env['ROUAULT_BUILD_LABEL'];
      } else {
        process.env['ROUAULT_BUILD_LABEL'] = previousBuildLabel;
      }
      if (previousGeneratedAt === undefined) {
        delete process.env['ROUAULT_GENERATED_AT'];
      } else {
        process.env['ROUAULT_GENERATED_AT'] = previousGeneratedAt;
      }
    }
  });

  it('ROUAULT_MEDIA_BASE_URL が設定されている場合は .generated/media/assets の passthrough copy を省くこと', async () => {
    const previousBaseUrl = process.env['ROUAULT_MEDIA_BASE_URL'];
    process.env['ROUAULT_MEDIA_BASE_URL'] = 'https://media.example.com/';

    try {
      const { config, passthroughCopies } = createConfigCapture();
      const moduleUrl = new URL('../../eleventy.config.ts', import.meta.url).href;
      const { default: configureEleventy } = (await import(moduleUrl)) as EleventyConfigModule;
      configureEleventy(config as unknown as UserConfig);

      expect(passthroughCopies).toContainEqual({ 'src/assets': 'assets' });
      expect(passthroughCopies).not.toContainEqual({ '.generated/media/assets': 'media' });
      expect(passthroughCopies).toContainEqual({ 'examples/media': 'example-assets' });
    } finally {
      if (previousBaseUrl === undefined) {
        delete process.env['ROUAULT_MEDIA_BASE_URL'];
      } else {
        process.env['ROUAULT_MEDIA_BASE_URL'] = previousBaseUrl;
      }
    }
  });

  it('eleventy.after で _headers と _redirects を dist にコピーすること', async () => {
    const distDir = path.resolve(process.cwd(), 'dist');
    await rm(distDir, { recursive: true, force: true });
    await mkdir(distDir, { recursive: true });

    try {
      const { config, afterHooks } = createConfigCapture();
      const moduleUrl = new URL('../../eleventy.config.ts', import.meta.url).href;
      const { default: configureEleventy } = (await import(moduleUrl)) as EleventyConfigModule;
      configureEleventy(config as unknown as UserConfig);

      expect(afterHooks).toHaveLength(1);
      await afterHooks[0]?.();

      expect(existsSync(path.join(distDir, '_redirects'))).toBe(true);
      expect(existsSync(path.join(distDir, '_headers'))).toBe(true);
    } finally {
      await rm(distDir, { recursive: true, force: true });
    }
  });
});
