import { build } from 'velite';
import EleventyVitePlugin from '@11ty/eleventy-plugin-vite';
import path from "node:path";

import type { UserConfig } from '@11ty/eleventy';

/**
 * VeliteとViteを組み合わせた11tyの設定
 * @param eleventyConfig 11tyの設定オブジェクト
*/
export default function (eleventyConfig: UserConfig) {
    // 11ty.ts を 11ty.js エンジンで処理するようにマッピング
    eleventyConfig.addExtension("11ty.ts", {
        key: "11ty.js",
    });

    // 静的アセットのコピー
    eleventyConfig.addPassthroughCopy({ 'src/assets': 'assets' });

    // Layout Aliases
    eleventyConfig.addLayoutAlias('base', 'BaseLayout.11ty.ts');

    // Veliteリソース管理
    eleventyConfig.on('eleventy.before', async () => {
        const isServing = process.argv.includes('--serve');

        try {
            await build({
                clean: !isServing,
                watch: isServing,
            });
        } catch (err) {
            console.error('❌ Velite build failed:', err);

            // 本番ビルド時は失敗させる（CI/CDで検知するため）
            if (!isServing) {
                console.error('Exiting due to build failure in production mode.');
                process.exit(1);
            }

            // 開発時は警告のみで継続（部分的なエラーを許容）
            console.warn('⚠️  Continuing in development mode despite errors.');
        }
    });

    // Viteバンドルと開発サーバーの使用
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
                    // "/src" へのアクセスを、実際の src ディレクトリへ転送する
                    "/src": path.resolve(process.cwd(), "src"),
                },
            },
        }
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
};