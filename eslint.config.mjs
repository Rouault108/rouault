import { defineConfig } from 'eslint/config';
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import wc from 'eslint-plugin-wc';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

const wcRecommendedConfig = wc.configs?.['flat/recommended'];

if (!wcRecommendedConfig) {
  throw new Error('ESLint plugin recommended config could not be resolved.');
}

export default defineConfig(
  {
    ignores: [
      'dist/',
      '.velite/',
      '.generated/',
      'node_modules/',
      '*.config.js',
      '*.config.ts',
      '*.config.mjs',
    ],
  },

  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  wcRecommendedConfig,

  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        project: './tsconfig.json',
      },
    },
  },

  {
    files: ['src/**/*.ts', 'test/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      eqeqeq: ['error', 'always'],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
      'wc/tag-name-matches-class': 'error',
      'wc/no-constructor-attributes': 'error',
      'wc/no-invalid-element-name': 'error',
    },
  },

  {
    files: [
      'eleventy.config.ts',
      'scripts/**/*.ts',
      'src/data/**/*.ts',
      'tools/**/*.ts',
      'test/ssr/**/*.ts',
      'cem.config.ts',
    ],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.node.json',
      },
    },
  },

  {
    files: ['build/**/*.ts', 'shared/**/*.ts', 'test/**/*.ts'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: {
      parserOptions: {
        project: false,
      },
    },
  },

  {
    files: ['**/*.js', '**/*.mjs', '**/*.cjs'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: {
      parserOptions: {
        project: false,
      },
    },
  },

  {
    files: ['test/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unused-expressions': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
    },
  },

  prettier,
);
