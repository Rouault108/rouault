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

          // ブラウザモードを有効化 (Shadow DOM の完全なサポートのため)
          browser: {
            enabled: true,
            // Playwright を使用 (既にプロジェクトに導入済み)
            provider: playwright({}),
            // ヘッドレスでCI/自動テストに最適化
            headless: true,
            // Chromium のみで実行 (必要に応じて firefox, webkit を追加可能)
            instances: [{ browser: 'chromium' }],
          },

          // Storybook の設定を Vitest に適用するセットアップファイル
          setupFiles: ['./.storybook/vitest.setup.ts'],

          // stories ファイルをテスト対象に含める
          include: ['src/**/*.stories.ts'],
        },
      },
    ],
  },
});
