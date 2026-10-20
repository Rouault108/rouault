import { execFile } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import type { UserConfig } from '@11ty/eleventy';
import { parse, type DefaultTreeAdapterMap } from 'parse5';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../build/content/generate-content.js', () => ({
  generateContent: vi.fn(async () => ({ contexts: new Map() })),
}));

type GlobalData = () => unknown;
type EleventyHook = (event?: object) => unknown | Promise<unknown>;
interface EleventyConfigModule {
  default: (config: UserConfig) => unknown;
}

const noop = (): void => {
  return;
};

const runFile = promisify(execFile);

const collectFaviconHrefs = (node: DefaultTreeAdapterMap['node']): string[] => {
  if (
    'tagName' in node &&
    node.tagName === 'link' &&
    node.attrs.some(
      ({ name, value }) => name === 'rel' && value.split(/[\t\n\f\r ]+/u).includes('icon'),
    )
  ) {
    return [node.attrs.find(({ name }) => name === 'href')?.value ?? ''];
  }
  return 'childNodes' in node ? node.childNodes.flatMap(collectFaviconHrefs) : [];
};

const createConfigCapture = () => {
  const passthroughCopies: Record<string, string>[] = [];
  const globalData = new Map<string, GlobalData>();
  const afterHooks: EleventyHook[] = [];
  const beforeHooks: EleventyHook[] = [];

  const config = {
    addExtension() {
      return;
    },
    addGlobalData(name: string, callback: GlobalData) {
      globalData.set(name, callback);
    },
    addPassthroughCopy(value: Record<string, string>) {
      passthroughCopies.push(value);
    },
    addLayoutAlias: noop,
    on(eventName: string, callback: EleventyHook) {
      if (eventName === 'eleventy.before') beforeHooks.push(callback);
      if (eventName === 'eleventy.after') {
        afterHooks.push(callback);
      }
    },
    addPlugin: noop,
  } satisfies Partial<UserConfig>;

  return {
    afterHooks,
    beforeHooks,
    config,
    globalData,
    passthroughCopies,
  };
};

describe('eleventy config', () => {
  it.each(['', '/nested'])(
    'basePath=%s の生成 HTML が参照する favicon を実際の passthrough copy で配置すること',
    async (basePath) => {
      const fixtureRoot = await mkdtemp(path.join(tmpdir(), 'rouault-favicon-'));
      const inputDir = path.join(fixtureRoot, 'input');
      const outputDir = path.join(fixtureRoot, 'output');
      const configPath = path.join(fixtureRoot, 'eleventy.config.cjs');

      try {
        const { config, passthroughCopies } = createConfigCapture();
        const moduleUrl = new URL('../../eleventy.config.ts', import.meta.url).href;
        const { default: configureEleventy } = (await import(moduleUrl)) as EleventyConfigModule;
        configureEleventy(config as unknown as UserConfig);
        const faviconCopies = passthroughCopies.map((copy) =>
          Object.fromEntries(
            Object.entries(copy).filter(([, target]) =>
              ['assets', 'favicon.ico', 'assets/favicon-32.png', 'assets/favicon.svg'].includes(
                target,
              ),
            ),
          ),
        );

        // コピー契約だけを実際の Eleventy で検証し、並列 SSR テストの生成物と共有しない。
        await mkdir(inputDir);
        await writeFile(
          configPath,
          `module.exports = (config) => {
            for (const copy of ${JSON.stringify(faviconCopies)}) config.addPassthroughCopy(copy);
            return { templateFormats: ['11ty.js'] };
          };`,
        );
        const layoutUrl = new URL('../../src/layouts/BaseLayout.11ty.ts', import.meta.url).href;
        const layoutData = {
          content: '<p>Favicon build fixture</p>',
          page: { url: '/' },
          buildMetadata: {
            buildId: 'favicon-test',
            buildLabel: 'favicon test',
            generatedAt: '2026-01-01T00:00:00.000Z',
          },
          siteUrlContext: { siteOrigin: 'https://example.com', basePath },
        };
        await writeFile(
          path.join(inputDir, 'index.11ty.cjs'),
          `module.exports = async () => {
            const { BaseLayout } = await import(${JSON.stringify(layoutUrl)});
            return new BaseLayout().render(${JSON.stringify(layoutData)});
          };`,
        );
        await runFile(
          process.execPath,
          [
            '--import',
            import.meta.resolve('tsx'),
            path.resolve('node_modules/@11ty/eleventy/cmd.cjs'),
            `--config=${configPath}`,
            `--input=${inputDir}`,
            `--output=${outputDir}`,
            '--quiet',
          ],
          { timeout: 30_000 },
        );

        const html = await readFile(path.join(outputDir, 'index.html'), 'utf8');
        const hrefs = collectFaviconHrefs(parse(html));
        expect(hrefs).toEqual([
          `${basePath}/favicon.ico`,
          `${basePath}/assets/favicon-32.png`,
          `${basePath}/assets/favicon.svg`,
        ]);
        for (const href of hrefs) {
          const outputPath = path.join(outputDir, href.slice(basePath.length + 1));
          const sourcePath = path.resolve('src/assets', path.basename(href));
          const [copied, source] = await Promise.all([readFile(outputPath), readFile(sourcePath)]);
          expect(source.byteLength, sourcePath).toBeGreaterThan(0);
          expect(copied, outputPath).toEqual(source);
        }
      } finally {
        await rm(fixtureRoot, { recursive: true, force: true });
      }
    },
    45_000,
  );

  it('共通生成入口をawaitする既存watchを使い、独自watcherを追加しないこと', () => {
    const source = readFileSync(new URL('../../eleventy.config.ts', import.meta.url), 'utf8');
    expect(source).toContain("eleventyConfig.on('eleventy.before', lifecycle.before)");
    expect(source).toContain("eleventyConfig.on('eleventy.after', lifecycle.after)");
    expect(source).toContain('await generateContent()');
    expect(source).not.toContain("from 'velite'");
    expect(source).not.toContain('beforeWatch');
    expect(source).not.toContain('Continuing in development');
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
  }, 60_000);

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
  }, 20_000);

  it('siteUrlContext グローバルデータを検証済み siteOrigin / basePath 付きで登録できること', async () => {
    const previousSiteOrigin = process.env['ROUAULT_SITE_ORIGIN'];
    const previousBasePath = process.env['ROUAULT_BASE_PATH'];
    const previousBuildLabel = process.env['ROUAULT_BUILD_LABEL'];
    process.env['ROUAULT_SITE_ORIGIN'] = 'https://example.com/';
    process.env['ROUAULT_BASE_PATH'] = '/rouault/';
    process.env['ROUAULT_BUILD_LABEL'] = 'eleventy site context test';

    try {
      const { config, globalData } = createConfigCapture();
      const moduleUrl = new URL('../../eleventy.config.ts', import.meta.url).href;
      const { default: configureEleventy } = (await import(moduleUrl)) as EleventyConfigModule;
      configureEleventy(config as unknown as UserConfig);

      const loadSiteUrlContext = globalData.get('siteUrlContext');
      expect(typeof loadSiteUrlContext).toBe('function');
      if (!loadSiteUrlContext) {
        throw new Error('siteUrlContext が登録されていません');
      }

      expect(loadSiteUrlContext()).toEqual({
        siteOrigin: 'https://example.com',
        basePath: '/rouault',
      });
    } finally {
      if (previousSiteOrigin === undefined) {
        delete process.env['ROUAULT_SITE_ORIGIN'];
      } else {
        process.env['ROUAULT_SITE_ORIGIN'] = previousSiteOrigin;
      }
      if (previousBasePath === undefined) {
        delete process.env['ROUAULT_BASE_PATH'];
      } else {
        process.env['ROUAULT_BASE_PATH'] = previousBasePath;
      }
      if (previousBuildLabel === undefined) {
        delete process.env['ROUAULT_BUILD_LABEL'];
      } else {
        process.env['ROUAULT_BUILD_LABEL'] = previousBuildLabel;
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

  it.each(['', '/nested'])(
    'eleventy.after は配信prefix %s にcache policyを合わせること',
    async (basePath) => {
      vi.stubEnv('ROUAULT_BASE_PATH', basePath);
      const distDir = path.resolve(process.cwd(), 'dist');
      await rm(distDir, { recursive: true, force: true });
      await mkdir(distDir, { recursive: true });

      try {
        const { config, beforeHooks, afterHooks } = createConfigCapture();
        const moduleUrl = new URL('../../eleventy.config.ts', import.meta.url).href;
        const { default: configureEleventy } = (await import(moduleUrl)) as EleventyConfigModule;
        configureEleventy(config as unknown as UserConfig);

        expect(afterHooks).toHaveLength(1);
        const event = {};
        await beforeHooks[0]?.(event);
        await afterHooks[0]?.(event);

        expect(existsSync(path.join(distDir, '_redirects'))).toBe(true);
        expect(existsSync(path.join(distDir, '_headers'))).toBe(true);
        const headers = readFileSync(path.join(distDir, '_headers'), 'utf8').replace(/\r\n/g, '\n');
        expect(headers).toContain(
          `${basePath}/search/manifest.json\n  Cache-Control: public, max-age=0, must-revalidate`,
        );
        expect(headers).toContain(
          `${basePath}/search/document.*\n  Cache-Control: public, max-age=31536000, immutable`,
        );
      } finally {
        vi.unstubAllEnvs();
        await rm(distDir, { recursive: true, force: true });
      }
    },
  );
});
