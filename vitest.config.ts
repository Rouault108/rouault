import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Vitest Configuration for Storybook Testing
 *
 * このプロジェクトでは2つのテスト戦略を採用:
 * 1. WTR (Web Test Runner): ロジックテスト (router, error-handler 等)
 * 2. Vitest + Storybook: コンポーネントの BDD テスト (*.stories.ts)
 *
 * この設定は Storybook のストーリーを Vitest テストとして実行するためのものです。
 */
export default defineConfig({
  test: {
    // Vitest 3.2+ では projects を使用
    projects: [
      {
        test: {
          name: 'ssr',
          environment: 'node',
          include: ['test/ssr/**/*.test.ts'],
        },
      },
      {
        // 既存の設定を継承
        extends: true,

        plugins: [
          storybookTest({
            // Storybook の設定ディレクトリ
            configDir: path.join(dirname, '.storybook'),
            // Storybook 起動スクリプト (--no-open でブラウザを開かない)
            storybookScript: 'pnpm storybook --no-open',
          }),
        ],

        test: {
          // プロジェクト名 (テスト結果で識別用)
          name: 'storybook',
          // Firefox のセッション接続タイムアウトを避けるため、重い Story を直列寄りに実行する
          fileParallelism: false,

          // ブラウザモードを有効化 (Shadow DOM の完全なサポートのため)
          browser: {
            enabled: true,
            connectTimeout: 180_000,
            // Playwright を使用
            provider: playwright({
              launchOptions: {
                timeout: 120_000,
              },
            }),
            // ヘッドレスでCI/自動テストに最適化
            headless: true,
            instances: [{ browser: 'chromium' }, { browser: 'firefox' }, { browser: 'webkit' }]
          },

          // Storybook の設定を Vitest に適用するセットアップファイル
          setupFiles: ['./.storybook/vitest.setup.ts'],
        },
      },
    ],
  },
});
