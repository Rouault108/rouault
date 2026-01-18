import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import lit from 'eslint-plugin-lit';
import litA11y from 'eslint-plugin-lit-a11y';
import wc from 'eslint-plugin-wc';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  // 1. 無視設定
  {
    ignores: ['dist/', '.velite/', 'node_modules/', '*.config.js', '*.config.ts'],
  },

  // 2. 基本的な推奨設定
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  lit.configs['flat/recommended'],
  litA11y.configs['flat/recommended'],
  wc.configs['flat/recommended'],

  // 3. 言語・パーサー設定
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        project: './tsconfig.json',
        // 【堅牢性向上】実行環境に左右されないパス解決
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // 4. カスタムルール
  {
    files: ['src/**/*.ts', 'test/**/*.ts'],
    rules: {
      // 未使用変数の厳格な管理
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      
      // Lit関連の厳格化
      'lit/no-legacy-template-syntax': 'error',
      'lit/no-value-attribute': 'error',
      'lit/attribute-value-entities': 'error',
      'lit/no-invalid-html': 'error',
      
      // 堅牢性を高める一般ルール
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'eqeqeq': ['error', 'always'],
      
      // TypeScript 厳格化の念押し
      '@typescript-eslint/no-explicit-any': 'error',
      
      // 不必要な型キャストを禁止し、型の安全性を高める
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
      
      // Litのプロパティ定義での不整合を防ぐ
      'lit/binding-positions': 'error',

      // WC関連の厳格化
      'wc/tag-name-matches-class': 'error',
      'wc/no-constructor-attributes': 'error',
      'wc/no-invalid-element-name': 'error',
    },
  },

  // 5. 整形
  prettier
);