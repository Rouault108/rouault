import type { StorybookConfig } from '@storybook/web-components-vite';

const config: StorybookConfig = {
  // 1. Storyファイルの検索パターン
  stories: ['../src/**/*.md', '../src/**/*.stories.@(js|ts)'],

  // 2. アドオンの登録
  addons: [
    // '@storybook/addon-essentials',   // すべての基本アドオン (v10では個別導入推奨のため削除)
    '@storybook/addon-a11y',         // アクセシビリティ検証
    '@storybook/addon-themes',       // テーマ切り替え（Lion UIのダークモード対応等に便利）
    '@storybook/addon-interactions', // BDD用インタラクション
    '@storybook/addon-vitest',       // Vitest統合
  ],

  // 3. フレームワークの設定
  framework: {
    name: '@storybook/web-components-vite',
    options: {},
  },

  // 4. Vite固有のカスタマイズ
  async viteFinal(config) {
    return {
        ...config,
    };
  },
};

export default config;