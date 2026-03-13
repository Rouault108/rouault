import path from 'node:path';
import { copyFile } from 'node:fs/promises';
import type { UserConfig } from '@11ty/eleventy';
import EleventyVitePlugin from '@11ty/eleventy-plugin-vite';
import type { Connect, ViteDevServer } from 'vite';
import { build } from 'velite';

import { loadNotesData } from './src/data/notes.js';
import { createStaticDirectoryMiddleware } from './src/lib/dev-static-directory.js';
import { resolveTrailingSlashRewrite } from './src/lib/trailing-slash-rewrite.js';
import { buildPagefindIndex } from './scripts/build-pagefind.js';

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
  // 開発サーバーでは dist/pagefind を明示的に配信しないと dynamic import が 404 になる。
  server.middlewares.use(
    createStaticDirectoryMiddleware('/pagefind/', path.resolve(process.cwd(), 'dist', 'pagefind')),
  );
};

/**
 * Velite と Vite を組み合わせた 11ty の設定。
 */
export default function configureEleventy(eleventyConfig: UserConfig) {
  const isServing = process.argv.includes('--serve');

  // 11ty.ts を 11ty.js エンジンで処理するようにマッピングする。
  eleventyConfig.addExtension('11ty.ts', {
    key: '11ty.js',
  });

  // TypeScript 化したグローバルデータを明示登録する。
  eleventyConfig.addGlobalData('notes', () => loadNotesData());
  eleventyConfig.addGlobalData('tagPages', async () => {
    const tagPagesModule = await import('./src/data/tagPages.js');
    return tagPagesModule.loadTagPagesData();
  });

  // 静的アセットをコピーする。
  eleventyConfig.addPassthroughCopy({ 'src/assets': 'assets' });

  // Layout Aliases
  eleventyConfig.addLayoutAlias('base', 'BaseLayout.11ty.ts');
  eleventyConfig.addLayoutAlias('note', 'NoteLayout.11ty.ts');

  // Velite リソース管理。
  eleventyConfig.on('eleventy.before', async () => {
    try {
      await build({
        clean: !isServing,
        watch: isServing,
      });
    } catch (error: unknown) {
      console.error('❌ Velite build failed:', error);

      // 本番ビルド時は失敗させる。
      if (!isServing) {
        console.error('Exiting due to build failure in production mode.');
        process.exit(1);
      }

      // 開発時は警告のみで継続する。
      console.warn('⚠️  Continuing in development mode despite errors.');
    }
  });

  eleventyConfig.on('eleventy.after', async () => {
    // Cloudflare Pages 用の rewrite ルールを出力ディレクトリへ明示コピーする。
    await copyFile(path.resolve(process.cwd(), '_redirects'), path.resolve(process.cwd(), 'dist/_redirects'));

    // 開発サーバーでは pagefind を都度再生成して検索候補を維持する。
    if (isServing) {
      await buildPagefindIndex();
    }
  });

  // Vite バンドルと開発サーバーの使用。
  eleventyConfig.addPlugin(EleventyVitePlugin, {
    viteOptions: {
      clearScreen: false,
      plugins: [
        {
          name: 'rouault-trailing-slash-rewrite',
          configureServer(server: ViteDevServer) {
            registerDevelopmentStaticDirectories(server);
            registerTrailingSlashRewrite(server);
          },
          configurePreviewServer(server: ViteDevServer) {
            return () => {
              registerDevelopmentStaticDirectories(server);
              registerTrailingSlashRewrite(server);
            };
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
          // "/src" へのアクセスを、実際の src ディレクトリへ転送する。
          '/src': path.resolve(process.cwd(), 'src'),
          '@': path.resolve(process.cwd(), 'src'),
          '@lit-labs/ssr-client': path.resolve(
            process.cwd(),
            'node_modules/.pnpm/node_modules/@lit-labs/ssr-client',
          ),
        },
      },
    },
  });

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
