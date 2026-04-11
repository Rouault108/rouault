import path from 'node:path';
import { copyFile } from 'node:fs/promises';
import type { UserConfig } from '@11ty/eleventy';
import EleventyVitePlugin from '@11ty/eleventy-plugin-vite';
import type { Connect, ViteDevServer } from 'vite';
import { build } from 'velite';

import { loadNotesData } from './src/data/notes.js';
import { loadHomeData } from './src/data/home.js';
import { loadClientBundleData } from './src/data/clientBundle.js';
import { loadBuildMetadataData } from './src/data/buildMetadata.js';
import { createStaticDirectoryMiddleware } from './build/dev/dev-static-directory.js';
import { renderSearchCatalogArtifact } from './build/search/emit-search-artifacts.js';
import { hasExternalMediaBaseUrl } from './build/media/media-base-url.js';
import { resolveBuildLabel } from './build/metadata/build-metadata.js';
import { resolveTrailingSlashRewrite } from './shared/navigation/trailing-slash-rewrite.js';

let veliteWatchStartupPromise: Promise<void> | null = null;

const formatErrorForConsole = (error: unknown): string => {
  if (error instanceof Error) {
    return error.stack ?? `${error.name}: ${error.message}`;
  }

  if (typeof error === 'string') {
    return error;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
};

const ensureVeliteBuild = async (isServing: boolean): Promise<void> => {
  if (!isServing) {
    await build({
      clean: true,
      watch: false,
    });
    return;
  }

  if (veliteWatchStartupPromise === null) {
    veliteWatchStartupPromise = build({
      clean: false,
      watch: true,
    })
      .then(() => undefined)
      .catch((error: unknown) => {
        veliteWatchStartupPromise = null;
        throw error;
      });
  }

  await veliteWatchStartupPromise;
};

const registerTrailingSlashRewrite = (server: ViteDevServer): void => {
  const middleware: Connect.NextHandleFunction = (req, _res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      next();
      return;
    }

    if (typeof req.url === 'string') {
      const rewrittenUrl = resolveTrailingSlashRewrite(req.url);
      if (rewrittenUrl !== null) {
        req.url = rewrittenUrl;
      }
    }

    next();
  };

  server.middlewares.use(middleware);
};

const registerDevelopmentStaticDirectories = (server: ViteDevServer): void => {
  server.middlewares.use(
    createStaticDirectoryMiddleware(
      '/media/',
      path.resolve(process.cwd(), '.generated', 'media', 'assets'),
    ),
  );
  server.middlewares.use(
    createStaticDirectoryMiddleware(
      '/content-assets/',
      path.resolve(process.cwd(), 'content', '_assets'),
    ),
  );
  server.middlewares.use(
    createStaticDirectoryMiddleware(
      '/example-assets/',
      path.resolve(process.cwd(), 'examples', 'media'),
    ),
  );
};

const registerSearchCatalogMiddleware = (server: ViteDevServer): void => {
  server.middlewares.use((req, res, next) => {
    if (req.url !== '/search-catalog.json') {
      next();
      return;
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(renderSearchCatalogArtifact(loadNotesData()));
  });
};

const copyStaticHostingArtifacts = async (): Promise<void> => {
  const distDir = path.resolve(process.cwd(), 'dist');

  await Promise.all([
    copyFile(path.resolve(process.cwd(), '_headers'), path.join(distDir, '_headers')),
    copyFile(path.resolve(process.cwd(), '_redirects'), path.join(distDir, '_redirects')),
  ]);
};

/**
 * Velite と Vite を組み合わせた 11ty の設定。
 */
export default function configureEleventy(eleventyConfig: UserConfig) {
  const isServing = process.argv.includes('--serve');

  eleventyConfig.addExtension('11ty.ts', {
    key: '11ty.js',
  });

  eleventyConfig.addGlobalData('notes', () => loadNotesData());
  eleventyConfig.addGlobalData('home', () => loadHomeData());
  eleventyConfig.addGlobalData('clientBundle', () => loadClientBundleData());
  eleventyConfig.addGlobalData('buildMetadata', () => loadBuildMetadataData(resolveBuildLabel()));

  eleventyConfig.addGlobalData('tagPages', async () => {
    const tagPagesModule = await import('./src/data/tagPages.js');
    return tagPagesModule.loadTagPagesData();
  });

  eleventyConfig.addGlobalData('corpusPages', async () => {
    const corpusPagesModule = await import('./src/data/corpusPages.js');
    return corpusPagesModule.loadCorpusPagesData();
  });

  eleventyConfig.addPassthroughCopy({ 'src/assets': 'assets' });
  eleventyConfig.addPassthroughCopy({
    'node_modules/@fontsource-variable/noto-sans-jp/files': 'assets/fonts/noto-sans-jp',
  });
  if (!hasExternalMediaBaseUrl()) {
    eleventyConfig.addPassthroughCopy({ '.generated/media/assets': 'media' });
  }
  eleventyConfig.addPassthroughCopy({ 'examples/media': 'example-assets' });

  if (!isServing) {
    eleventyConfig.addPassthroughCopy({ '.generated/client/client-assets': 'client-assets' });
  }

  // src 外にあるコンテンツを開発時の監視対象へ追加する。
  eleventyConfig.addWatchTarget?.('./content/**/*');

  eleventyConfig.addLayoutAlias('base', 'BaseLayout.11ty.ts');
  eleventyConfig.addLayoutAlias('note', 'NoteLayout.11ty.ts');

  eleventyConfig.on('eleventy.before', async () => {
    try {
      await ensureVeliteBuild(isServing);
    } catch (error: unknown) {
      console.error(`❌ Velite build failed:\n${formatErrorForConsole(error)}`);

      if (!isServing) {
        console.error('Exiting due to build failure in production mode.');
        process.exit(1);
      }

      console.warn('⚠️  Continuing in development mode despite errors.');
    }
  });

  eleventyConfig.on('eleventy.after', async () => {
    await copyStaticHostingArtifacts();
  });

  if (isServing) {
    eleventyConfig.addPlugin(EleventyVitePlugin, {
      viteOptions: {
        clearScreen: false,
        plugins: [
          {
            name: 'rouault-trailing-slash-rewrite',
            configureServer(server: ViteDevServer) {
              registerDevelopmentStaticDirectories(server);
              registerSearchCatalogMiddleware(server);
              registerTrailingSlashRewrite(server);
            },
            configurePreviewServer(server: ViteDevServer) {
              registerDevelopmentStaticDirectories(server);
              registerSearchCatalogMiddleware(server);
              registerTrailingSlashRewrite(server);
            },
          },
        ],
        server: {
          mode: 'development',
          middlewareMode: true,
        },
        build: {
          mode: 'production',
          target: 'es2022',
        },
        resolve: {
          alias: {
            '/src': path.resolve(process.cwd(), 'src'),
            '@': path.resolve(process.cwd(), 'src'),
          },
        },
      },
    });
  }

  return {
    dir: {
      input: 'src',
      output: 'dist',
      includes: 'components',
      layouts: 'layouts',
      data: 'data',
    },
    templateFormats: ['md', 'njk', 'html', '11ty.ts'],
  };
}
