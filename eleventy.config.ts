import path from 'node:path';
import type { UserConfig } from '@11ty/eleventy';
import EleventyVitePlugin from '@11ty/eleventy-plugin-vite';
import { build } from 'velite';

import { loadNotesData } from './src/data/notes.js';
import { loadSearchGenresData } from './src/data/searchGenres.js';

/**
 * Velite と Vite を組み合わせた 11ty の設定。
 */
export default function configureEleventy(eleventyConfig: UserConfig) {
  // 11ty.ts を 11ty.js エンジンで処理するようにマッピングする。
  eleventyConfig.addExtension('11ty.ts', {
    key: '11ty.js',
  });

  // TypeScript 化したグローバルデータを明示登録する。
  eleventyConfig.addGlobalData('notes', () => loadNotesData());
  eleventyConfig.addGlobalData('searchGenres', () => loadSearchGenresData());

  // 静的アセットをコピーする。
  eleventyConfig.addPassthroughCopy({ 'src/assets': 'assets' });

  // Layout Aliases
  eleventyConfig.addLayoutAlias('base', 'BaseLayout.11ty.ts');
  eleventyConfig.addLayoutAlias('note', 'NoteLayout.11ty.ts');

  // Velite リソース管理。
  eleventyConfig.on('eleventy.before', async () => {
    const isServing = process.argv.includes('--serve');

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

  // Vite バンドルと開発サーバーの使用。
  eleventyConfig.addPlugin(EleventyVitePlugin, {
    viteOptions: {
      clearScreen: false,
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
