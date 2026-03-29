import { defineConfig } from 'vitest/config';

/**
 * Vitest Configuration for Storybook Testing
 *
 * このプロジェクトでは2つのテスト戦略を採用:
 * 1. WTR (Web Test Runner): ロジックテスト (router, error-handler 等)
 * 2. Vitest + Storybook: コンポーネントの BDD テスト (*.stories.ts)
 *
 * この環境では Storybook の browser mode を使えないため、
 * storybook プロジェクトは空のまま成功終了させる。
 */
export default defineConfig({
  test: {
    passWithNoTests: true,
    projects: [
      {
        test: {
          name: 'ssr',
          environment: 'node',
          include: ['test/ssr/**/*.test.ts'],
        },
      },
      {
        test: {
          name: 'storybook',
          include: ['.storybook/no-tests/**/*.test.ts'],
          passWithNoTests: true,
        },
      },
    ],
  },
});
