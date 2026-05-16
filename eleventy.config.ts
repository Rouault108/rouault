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
import { loadSiteUrlContextData } from './src/data/siteUrlContext.js';
import { createStaticDirectoryMiddleware } from './build/dev/dev-static-directory.js';
import { createDevelopmentRouterArtifactMiddleware } from './build/dev/dev-router-artifact-middleware.js';
import { createDevelopmentInternalDocumentRouteManifestMiddleware } from './build/dev/dev-internal-document-route-manifest-middleware.js';
import { createDevelopmentHtmlSiteUrlContextMiddleware } from './build/dev/dev-html-site-url-context-middleware.js';
import { devBuildMetadata } from './build/dev/dev-build-metadata.js';
import { renderSearchCatalogArtifact } from './build/search/emit-search-artifacts.js';
import { hasExternalMediaBaseUrl } from './build/media/media-base-url.js';
import { resolveProductionBuildMetadata } from './build/metadata/build-metadata.js';
import {
  resolveDevelopmentSiteUrlContext,
  resolveProductionSiteUrlContext,
} from './build/site/site-url-context.js';
import { validateNoteSourceLinks } from './build/content/validate-note-source-links.js';
import { resolveTrailingSlashRewrite } from './shared/navigation/trailing-slash-rewrite.js';

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
  await build({
    clean: !isServing,
    // Velite 0.3.1 は watch 時に root 全体を再帰監視するため、
    // root='.' では node_modules 配下まで監視して EMFILE を起こしやすい。
    // 開発時の再実行は Eleventy 側の watch と eleventy.before に委譲する。
    watch: false,
  });
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

const registerDevelopmentSiteUrlContext = (server: ViteDevServer): void => {
  server.middlewares.use(
    createDevelopmentHtmlSiteUrlContextMiddleware({
      siteUrlContext: resolveDevelopmentSiteUrlContext(),
      buildMetadata: devBuildMetadata,
    }),
  );
};

const registerDevelopmentRouteManifest = (server: ViteDevServer): void => {
  server.middlewares.use(
    createDevelopmentInternalDocumentRouteManifestMiddleware({
      siteUrlContext: resolveDevelopmentSiteUrlContext(),
      buildMetadata: devBuildMetadata,
    }),
  );
};

const registerDevelopmentRouterArtifacts = (server: ViteDevServer): void => {
  server.middlewares.use(
    createDevelopmentRouterArtifactMiddleware({
      outputDirectory: path.resolve(process.cwd(), 'dist'),
      buildId: devBuildMetadata.buildId,
      generatedAt: devBuildMetadata.generatedAt,
    }),
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
  eleventyConfig.addGlobalData('buildMetadata', () => {
    const metadata = isServing ? devBuildMetadata : resolveProductionBuildMetadata();
    return loadBuildMetadataData({
      buildId: metadata.buildId,
      buildLabel: metadata.buildLabel,
      generatedAt: metadata.generatedAt,
      sourceLabel: isServing ? 'eleventy-dev' : 'eleventy-build',
    });
  });

  eleventyConfig.addGlobalData('siteUrlContext', () => {
    const siteUrlContext = isServing
      ? resolveDevelopmentSiteUrlContext()
      : resolveProductionSiteUrlContext();
    return loadSiteUrlContextData({
      siteOrigin: siteUrlContext.siteOrigin,
      basePath: siteUrlContext.basePath,
      sourceLabel: isServing ? 'eleventy-dev' : 'eleventy-build',
    });
  });

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
  eleventyConfig.addWatchTarget?.('./test/fixtures/content/**/*');

  eleventyConfig.addLayoutAlias('base', 'BaseLayout.11ty.ts');
  eleventyConfig.addLayoutAlias('note', 'NoteLayout.11ty.ts');

  eleventyConfig.on('eleventy.before', async () => {
    try {
      await ensureVeliteBuild(isServing);
      await validateNoteSourceLinks();
    } catch (error: unknown) {
      console.error(`❌ Content validation failed:\n${formatErrorForConsole(error)}`);

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
              registerDevelopmentSiteUrlContext(server);
              registerDevelopmentStaticDirectories(server);
              registerSearchCatalogMiddleware(server);
              registerDevelopmentRouteManifest(server);
              registerDevelopmentRouterArtifacts(server);
              registerTrailingSlashRewrite(server);
            },
            configurePreviewServer(server: ViteDevServer) {
              registerDevelopmentSiteUrlContext(server);
              registerDevelopmentStaticDirectories(server);
              registerSearchCatalogMiddleware(server);
              registerDevelopmentRouteManifest(server);
              registerDevelopmentRouterArtifacts(server);
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
