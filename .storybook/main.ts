import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { StorybookConfig } from '@storybook/web-components-vite';
import { mergeConfig, type UserConfig } from 'vite';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(js|ts)'],

  addons: [
    '@storybook/addon-a11y',
    '@storybook/addon-themes',
    '@storybook/addon-vitest',
  ],

  framework: {
    name: '@storybook/web-components-vite',
    options: {},
  },

  viteFinal(config) {
    return mergeConfig(
      config,
      {
        resolve: {
          alias: {
            '@': path.resolve(projectRoot, 'src'),
          },
          dedupe: ['lit', 'lit-html', '@lit/reactive-element'],
        },
        optimizeDeps: {
          include: ['lit', 'lit-html', '@lit/reactive-element'],
        },
      } satisfies UserConfig,
    );
  },
};

export default config;
