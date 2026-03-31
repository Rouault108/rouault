import { defineConfig } from 'eslint/config';
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import lit from 'eslint-plugin-lit';
import litA11y from 'eslint-plugin-lit-a11y';
import wc from 'eslint-plugin-wc';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

const litRecommendedConfig = lit.configs?.['flat/recommended'];
const wcRecommendedConfig = wc.configs?.['flat/recommended'];

if (!litRecommendedConfig || !wcRecommendedConfig) {
  throw new Error('ESLint plugin recommended config could not be resolved.');
}

export default defineConfig(
  {
    ignores: [
      'dist/',
      '.velite/',
      '.generated/',
      'node_modules/',
      'storybook-static/',
      '*.config.js',
      '*.config.ts',
      '*.config.mjs',
    ],
  },

  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  litRecommendedConfig,
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
    plugins: { 'lit-a11y': litA11y },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'lit/no-legacy-template-syntax': 'error',
      'lit/no-value-attribute': 'error',
      'lit/attribute-value-entities': 'error',
      'lit/no-invalid-html': 'error',
      eqeqeq: ['error', 'always'],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
      'lit/binding-positions': 'error',
      'wc/tag-name-matches-class': 'error',
      'wc/no-constructor-attributes': 'error',
      'wc/no-invalid-element-name': 'error',
      'lit-a11y/alt-text': 'error',
      'lit-a11y/anchor-is-valid': 'error',
      'lit-a11y/aria-activedescendant-has-tabindex': 'error',
      'lit-a11y/aria-attr-valid-value': 'error',
      'lit-a11y/aria-attrs': 'error',
      'lit-a11y/aria-unsupported-elements': 'error',
      'lit-a11y/autocomplete-valid': 'error',
      'lit-a11y/click-events-have-key-events': 'error',
      'lit-a11y/iframe-title': 'error',
      'lit-a11y/img-redundant-alt': 'error',
      'lit-a11y/mouse-events-have-key-events': 'error',
      'lit-a11y/no-access-key': 'error',
      'lit-a11y/no-autofocus': 'error',
      'lit-a11y/no-distracting-elements': 'error',
      'lit-a11y/no-redundant-role': 'error',
      'lit-a11y/role-has-required-aria-attrs': 'error',
      'lit-a11y/scope': 'error',
      'lit-a11y/tabindex-no-positive': 'error',
      'lit-a11y/valid-lang': 'error',
    },
  },

  {
    files: [
      'eleventy.config.ts',
      'scripts/**/*.ts',
      'lib/**/*.ts',
      'src/data/**/*.ts',
      'test/ssr/**/*.ts',
      'web-test-runner.config.ts',
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
    files: ['lib/content/**/*.ts', 'lib/rehype/**/*.ts', 'lib/remark/**/*.ts'],
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
